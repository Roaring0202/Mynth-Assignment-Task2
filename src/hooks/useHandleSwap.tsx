import axios from "axios";
import { useCardano } from "mynth-use-cardano";
import { useState } from "react";
import TronWebOriginal from "tronweb";
import { useTronlink } from "../contexts/ConnectTronWalletContext";
import useDecimals from "../hooks/useDecimals";
import config from "../libs/Config";
import {
  getAddressUrl,
  getEnvConfig,
  getTransactionUrl,
  mapAssetsToRequestFormat,
} from "../libs/Functions";
import { balance, build, sign } from "../libs/TronWeb";
import { useGetValidationErrorsQuery } from "../store/errorMessages/validationErrors";
import useHandleApiError from "./useHandleApiErrors";
import useProcessModal from "./useProcessModal";

declare module "@tronweb3/tronwallet-adapter-tronlink" {
  export interface TronWeb extends TronWebOriginal {}
}

export type SwapInput = {
  sender: {
    amount: string;
    ticker: string;
    blockchain: string;
  };
  receiver: {
    address: string;
    amount: string;
    ticker: string;
    blockchain: string;
  };
};

const BACKEND_BASE_URL = config.get("backend.uri");
const CARDANO = "cardano"
const MESSAGE_CONNECT_WALLET = "Connect your Wallet"
const MESSAGE_INSUFFICIENT_UTXOS = "Insufficient UTXOs"
const MESSAGE_CANNOT_ASSEMBLE = "Cannot assemble transaction"
const MESSAGE_MUST_CONNECT_TRON = "Tron wallet must be connected"

enum showProcessModalStatus {
    GENERATING = "generating",
    BUILDING = "building",
    SIGNING = "signing",
    SUBMITTING = "submitting"
}

const status: showProcessModalStatus = showProcessModalStatus.FAILED;

const useHandleSwap = () => {
    const { handleApiError } = useHandleApiError();
    const { toCardanoTokens } = useDecimals();
    const { lucid, account } = useCardano();
    const { address } = useTronlink();

  const [isSwapLoading, setSwapLoading] = useState(false);
  const { data: errorMessages } = useGetValidationErrorsQuery();
  const { swapProcessStatus, showProcessModal, showSuccessModal } = useProcessModal();

  const handleSwap = async (data: SwapInput) => {
    if (data.sender.blockchain === CARDANO) {
      return await handleSwapFromCardanoWallet(data);
    } else {
      return await handleSwapFromTronLinkWallet(data);
    }
  };

  const handleSwapFromCardanoWallet = async (data: SwapInput) => {
    if (isSwapLoading) return;
    setSwapLoading(true);

    const userAddress = account?.address;

    if (!lucid || !userAddress) {
      showProcessModal("failed", MESSAGE_CONNECT_WALLET, errorMessages?.walletUnconnected ?? "Error");
      setSwapLoading(false);
      return;
    }

    showProcessModal(showProcessModalStatus.GENERATING);

    const utxos = await lucid.wallet.getUtxos();
    if (!utxos || !utxos.length) {
      setSwapLoading(false);
      showProcessModal("failed", MESSAGE_INSUFFICIENT_UTXOS, errorMessages?.insufficientUtxos ?? "Error");
      return;
    }

    showProcessModal(showProcessModalStatus.BUILDING);

    const mappedUtxos = utxos.map((item) => ({...item, assets: mapAssetsToRequestFormat(item.assets)}));

    let swapBuildUrl: string;
    let swapBuildData = {};
    let swapRequireSignature = true;

    const {ticker: tokenToSwap, amount, blockchain: senderBlockchain} = data.sender;
    const {ticker: tokenToReceive, address: receiverAddress, blockchain: receiverBlockchain} = data.receiver;

    if (tokenToSwap === "ADA" && tokenToReceive === "MyUSD") {
      swapRequireSignature = false;
      swapBuildUrl = `${BACKEND_BASE_URL}/swap-ada/build`;
      swapBuildData = {
        address: userAddress,
        utxos: mappedUtxos,
        adaAmount: toCardanoTokens(amount),
      };
    } else if (tokenToSwap === "MyUSD" && tokenToReceive === "ADA") {
      swapRequireSignature = false;
      swapBuildUrl = `${BACKEND_BASE_URL}/swap-myusd-ada/build`;
      swapBuildData = {
        address: userAddress,
        utxos: mappedUtxos,
        amount: toCardanoTokens(amount),
      };
    } else if (
      (tokenToSwap === "MyUSD" || tokenToSwap === "IAG") &&
      (tokenToReceive === "USDT" || tokenToReceive === "USDC")
    ) {
      swapBuildUrl = `${BACKEND_BASE_URL}/swap/build`;
      swapBuildData = {
        address: userAddress,
        utxos: mappedUtxos,
        amountToSwap: toCardanoTokens(amount),
        destinationAddress: data.receiver.address,
        tokenToSwap,
        tokenToReceive,
      };
    } else {
      setSwapLoading(false);
      showProcessModal("failed", "Unavailable swap", `Swap of ${tokenToSwap} to ${tokenToReceive} is not available at this time, try again later`);

      return;
    }

    try {
      const txFromSwapBuildApi = await axios.post(swapBuildUrl, swapBuildData)
        .then((response) => {
          return response.data;
        })
        .catch((error) => {
          // If the error is from mynth-tx then `error.response` contains the error object
          // If its a wallet error, `error` contains the error object
          const errorToSend = error.response ?? error;
          customErrorHandle(errorToSend, MESSAGE_CANNOT_ASSEMBLE)
        });

      if (!txFromSwapBuildApi || !txFromSwapBuildApi.tx) return;

      showProcessModal(showProcessModalStatus.SIGNING);
      
      if(swapRequireSignature && !txFromSwapBuildApi.signature) return;
      
      let signedTx;
      const lucidTx = lucid.fromTx(txFromSwapBuildApi.tx);
      
        try {
            if (!swapRequireSignature) {
                signedTx = await lucidTx.sign().complete();
            } else {
                const lucidTx = lucid.fromTx(txFromSwapBuildApi.tx);
                signedTx = await lucidTx
                    .sign()
                    .assemble([txFromSwapBuildApi.signature])
                    .complete();
            }
        } catch (error) {
            return customErrorHandle(error, MESSAGE_CANNOT_ASSEMBLE)
        }

      showProcessModal(showProcessModalStatus.SUBMITTING);

      const transactionID = await signedTx.submit();

      showSuccessModal(
        getTransactionUrl(senderBlockchain, transactionID),
        getAddressUrl(receiverBlockchain, receiverAddress)
      );
    } catch (error) {
        customErrorHandle(error)
    } finally {
      setSwapLoading(false);
    }
  };

  const handleSwapFromTronLinkWallet = async (data: SwapInput) => {
    if (isSwapLoading) return;
    setSwapLoading(true);

    const {address : userAddress, blockchain: userBlockchain} = data.receiver;
    const {amount, ticker, blockchain: senderBlockchain} = data.sender;

    showProcessModal(showProcessModalStatus.BUILDING);

    if (!address) {
      showProcessModal("failed", MESSAGE_CONNECT_WALLET, errorMessages?.walletUnconnected ?? "Error");
      setSwapLoading(false);
      return;
    }

    try {
      const usdtContractAddress = getEnvConfig<string>("tron.usdt.contract_address");
      const usdcContractAddress = getEnvConfig<string>("tron.usdc.contract_address");
      const usdtDestination = getEnvConfig<string>("tron.usdt.destination");
      const usdcDestination = getEnvConfig<string>("tron.usdc.destination");

      const contractAddress = ticker === "USDT" ? usdtContractAddress : usdcContractAddress;
      const destination = ticker === "USDT" ? usdtDestination : usdcDestination;
      const amountToSend = toCardanoTokens(amount);

      if (!window.tron ||!window.tron.tronWeb || !window.tron.tronWeb.defaultAddress) throw new Error(MESSAGE_MUST_CONNECT_TRON);

      const { transactionBuilder, defaultAddress, trx } = window.tron.tronWeb;

      const balanceCheck = async (address: { hex: false | string; base58: false | string; name: string; }, trx: typeof TronWebOriginal.trx) => {
        try {
          const response = await balance(address, trx);
          return response;
        } catch (error) {
          const errorToSend = typeof error === "string" ? { info: error } : error;
          customErrorHandle(errorToSend)
          throw error;
        }
      };

      const userBalance = await balanceCheck(
        defaultAddress,
        trx as typeof TronWebOriginal.trx
      );

      if (!userBalance) return;

      const minbalance = parseInt(getEnvConfig<string>("tron.minimumBalance"));

      if (parseInt(userBalance) < minbalance * 1000000) {
        // 1000000 SUN = 1 TRX
        const errorToSend = {
          info: `Minimum Required balance is ${minbalance} TRX`,
        };
        customErrorHandle(errorToSend)
        return;
      }

      const txFromTronBuildApi = await build(
        window.tron.tronWeb.defaultAddress,
        transactionBuilder,
        contractAddress,
        BigInt(amountToSend),
        destination,
        userAddress
      )
        .then((response) => {
          if (response.ok) {
            return response.data;
          } else {
            const error = response.error;
            const errorToSend = typeof error === "string" ? { info: response.error } : response.error;
            customErrorHandle(errorToSend)
          }
        })
        .catch((error) => {
          const errorToSend = typeof error === "string" ? { info: error } : error;
           customErrorHandle(errorToSend, "")
        });

      if (!txFromTronBuildApi) return;

      showProcessModal(showProcessModalStatus.SIGNING);

      await sign(
        window.tron.tronWeb.trx as typeof TronWebOriginal.trx,
        transactionBuilder,
        userAddress,
        txFromTronBuildApi
      )
        .then((response) => {
          if (!response.ok) {
            const {error} = response;
            const errorToSend = typeof error === "string" ? { info: error } : error;
            customErrorHandle(errorToSend);
          } else {
            showSuccessModal(
              getTransactionUrl(senderBlockchain, response.data),
              getAddressUrl(userBlockchain, userAddress)
            );
          }
        })
        .catch((error) => {
          const errorToSend = typeof error === "string" ? { info: error } : error;
          customErrorHandle(errorToSend)
        });
    } catch (error) {
      handleApiError(error, showProcessModal);
    } finally {
      setSwapLoading(false);
    }
  };

  const customErrorHandle = (e: any, message?: string) => {
    setSwapLoading(false);

    if(message) {
        console.log(message, e)
    }
    return handleApiError(e, showProcessModal)
  }

  return {
    handleSwap,
    isSwapLoading,
    swapProcessStatus,
  };
};

export default useHandleSwap;