import { renderHook, act } from '@testing-library/react-hooks';
import useHandleSwap from '../hooks/useHandleSwap';
import axios from 'axios';
import { useCardano } from 'mynth-use-cardano';
import { useTronlink } from '../contexts/ConnectTronWalletContext';
import useDecimals from '../hooks/useDecimals';
import useProcessModal from './useProcessModal';
import useHandleApiError from './useHandleApiErrors';

// Mock external dependencies
jest.mock('axios');
jest.mock('mynth-use-cardano', () => ({
  useCardano: jest.fn(),
}));
jest.mock('../contexts/ConnectTronWalletContext', () => ({
  useTronlink: jest.fn(),
}));
jest.mock('../hooks/useDecimals', () => ({
  useDecimals: jest.fn(),
}));
jest.mock('./useProcessModal', () => ({
  useProcessModal: jest.fn(),
}));
jest.mock('./useHandleApiErrors', () => ({
  useHandleApiError: jest.fn(),
}));

describe('useHandleSwap', () => {
  let handleSwap;
  let isSwapLoading;
  let swapProcessStatus;

  beforeEach(() => {
    // Mock hooks and states
    useCardano.mockReturnValue({
      lucid: { wallet: { getUtxos: jest.fn() }, fromTx: jest.fn() },
      account: { address: 'cardano-address' },
    });
    useTronlink.mockReturnValue({ address: 'tron-address' });
    useDecimals.mockReturnValue({ toCardanoTokens: jest.fn(amount => amount) });
    useProcessModal.mockReturnValue({
      showProcessModal: jest.fn(),
      showSuccessModal: jest.fn(),
      swapProcessStatus: 'idle',
    });
    useHandleApiError.mockReturnValue({
      handleApiError: jest.fn(),
    });

    // Render the hook
    const { result } = renderHook(() => useHandleSwap());
    handleSwap = result.current.handleSwap;
    isSwapLoading = result.current.isSwapLoading;
    swapProcessStatus = result.current.swapProcessStatus;
  });

  it('should handle Cardano swap correctly', async () => {
    // Arrange
    const swapData = {
      sender: { amount: '10', ticker: 'ADA', blockchain: 'cardano' },
      receiver: { address: 'receiver-address', amount: '10', ticker: 'MyUSD', blockchain: 'cardano' },
    };

    // Mock Cardano UTXO data
    const mockUtxos = [{ assets: [{ ticker: 'ADA', amount: '10' }] }];
    useCardano().lucid.wallet.getUtxos.mockResolvedValue(mockUtxos);

    // Act
    await act(async () => {
      await handleSwap(swapData);
    });

    // Assert
    expect(useProcessModal().showProcessModal).toHaveBeenCalledWith('generating');
    expect(axios.post).toHaveBeenCalledWith(
      'http://backend.uri/swap-ada/build',
      expect.objectContaining({
        address: 'cardano-address',
        utxos: expect.arrayContaining([
          expect.objectContaining({ assets: expect.arrayContaining([{ ticker: 'ADA' }]) }),
        ]),
        adaAmount: '10',
      })
    );
    expect(useProcessModal().showProcessModal).toHaveBeenCalledWith('building');
    expect(useProcessModal().showSuccessModal).toHaveBeenCalled();
  });

  it('should handle Tron swap correctly', async () => {
    // Arrange
    const swapData = {
      sender: { amount: '10', ticker: 'USDT', blockchain: 'tron' },
      receiver: { address: 'receiver-address', amount: '10', ticker: 'MyUSD', blockchain: 'tron' },
    };

    // Mock Tron balance
    window.tron = {
      tronWeb: {
        defaultAddress: 'tron-address',
        trx: { balance: jest.fn().mockResolvedValue('10000000') },
        transactionBuilder: {},
      },
    };

    // Act
    await act(async () => {
      await handleSwap(swapData);
    });

    // Assert
    expect(window.tron.tronWeb.trx.balance).toHaveBeenCalledWith('tron-address');
    expect(useProcessModal().showProcessModal).toHaveBeenCalledWith('building');
    expect(axios.post).toHaveBeenCalled();
    expect(useProcessModal().showSuccessModal).toHaveBeenCalled();
  });

  it('should handle insufficient funds error', async () => {
    // Arrange
    const swapData = {
      sender: { amount: '10', ticker: 'USDT', blockchain: 'tron' },
      receiver: { address: 'receiver-address', amount: '10', ticker: 'MyUSD', blockchain: 'tron' },
    };

    // Mock Tron balance to be insufficient
    window.tron = {
      tronWeb: {
        defaultAddress: 'tron-address',
        trx: { balance: jest.fn().mockResolvedValue('100000') },
        transactionBuilder: {},
      },
    };

    // Act
    await act(async () => {
      await handleSwap(swapData);
    });

    // Assert
    expect(useProcessModal().showProcessModal).toHaveBeenCalledWith('failed', 'Minimum Required balance is 10 TRX');
  });

  it('should handle errors during API calls', async () => {
    // Arrange
    const swapData = {
      sender: { amount: '10', ticker: 'ADA', blockchain: 'cardano' },
      receiver: { address: 'receiver-address', amount: '10', ticker: 'MyUSD', blockchain: 'cardano' },
    };

    // Mock API to throw an error
    axios.post.mockRejectedValue(new Error('API error'));

    // Act
    await act(async () => {
      await handleSwap(swapData);
    });

    // Assert
    expect(useHandleApiError().handleApiError).toHaveBeenCalledWith(expect.any(Error), expect.any(Function));
    expect(useProcessModal().showProcessModal).toHaveBeenCalledWith('failed', 'Cannot assemble transaction', 'API error');
  });

  it('should not proceed with swap if already loading', async () => {
    // Arrange
    const swapData = {
      sender: { amount: '10', ticker: 'ADA', blockchain: 'cardano' },
      receiver: { address: 'receiver-address', amount: '10', ticker: 'MyUSD', blockchain: 'cardano' },
    };

    // Set isSwapLoading to true
    act(() => {
      result.current.isSwapLoading = true;
    });

    // Act
    await act(async () => {
      await handleSwap(swapData);
    });

    // Assert: Should not trigger swap if loading
    expect(useProcessModal().showProcessModal).not.toHaveBeenCalled();
  });
});
