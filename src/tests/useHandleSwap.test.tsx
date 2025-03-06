import { renderHook, act } from '@testing-library/react-hooks';
import axios from 'axios';
import { useCardano } from 'mynth-use-cardano';
import { useTronlink } from '../contexts/ConnectTronWalletContext';
import useHandleSwap from '../hooks/useHandleSwap'; // adjust the import path
import useDecimals from '../hooks/useDecimals';
import useHandleApiError from '../hooks/useHandleApiErrors';
import useProcessModal from '../hooks/useProcessModal';

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
jest.mock('./useHandleApiErrors', () => ({
  useHandleApiError: jest.fn(),
}));
jest.mock('./useProcessModal', () => ({
  useProcessModal: jest.fn(),
}));

const mockShowProcessModal = jest.fn();
const mockShowSuccessModal = jest.fn();
const mockHandleApiError = jest.fn();
const mockToCardanoTokens = jest.fn();

describe('useHandleSwap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useHandleApiError.mockReturnValue({ handleApiError: mockHandleApiError });
    useProcessModal.mockReturnValue({
      showProcessModal: mockShowProcessModal,
      showSuccessModal: mockShowSuccessModal,
      swapProcessStatus: 'building',
    });
    useDecimals.mockReturnValue({ toCardanoTokens: mockToCardanoTokens });
  });

  it('should handle swap from Cardano wallet correctly', async () => {
    const mockAccount = { address: 'mock-cardano-address' };
    useCardano.mockReturnValue({ account: mockAccount, lucid: { wallet: { getUtxos: jest.fn().mockResolvedValue([]) }, fromTx: jest.fn() } });

    const data = {
      sender: { amount: '100', ticker: 'ADA', blockchain: 'cardano' },
      receiver: { address: 'mock-receiver-address', amount: '100', ticker: 'MyUSD', blockchain: 'cardano' },
    };

    axios.post.mockResolvedValueOnce({ data: { tx: 'mock-tx' } });

    const { result } = renderHook(() => useHandleSwap());
    
    act(() => {
      result.current.handleSwap(data);
    });

    // Check if process modal is shown
    expect(mockShowProcessModal).toHaveBeenCalledWith('generating');
  });

  it('should handle swap from TronLink wallet correctly', async () => {
    const mockTronLinkAddress = 'mock-tron-address';
    useTronlink.mockReturnValue({ address: mockTronLinkAddress });

    const data = {
      sender: { amount: '100', ticker: 'USDT', blockchain: 'tron' },
      receiver: { address: 'mock-receiver-address', amount: '100', ticker: 'USDC', blockchain: 'tron' },
    };

    axios.post.mockResolvedValueOnce({ data: { tx: 'mock-tx' } });

    const { result } = renderHook(() => useHandleSwap());

    act(() => {
      result.current.handleSwap(data);
    });

    // Check if process modal is shown for Tron
    expect(mockShowProcessModal).toHaveBeenCalledWith('building');
  });

  it('should handle error when Cardano wallet is not connected', async () => {
    useCardano.mockReturnValue({ account: null, lucid: null });

    const data = {
      sender: { amount: '100', ticker: 'ADA', blockchain: 'cardano' },
      receiver: { address: 'mock-receiver-address', amount: '100', ticker: 'MyUSD', blockchain: 'cardano' },
    };

    const { result } = renderHook(() => useHandleSwap());

    act(() => {
      result.current.handleSwap(data);
    });

    // Check if error modal is shown for Cardano
    expect(mockShowProcessModal).toHaveBeenCalledWith('failed', 'Connect your Wallet', 'Error');
  });

  it('should handle error when Tron wallet is not connected', async () => {
    useTronlink.mockReturnValue({ address: null });

    const data = {
      sender: { amount: '100', ticker: 'USDT', blockchain: 'tron' },
      receiver: { address: 'mock-receiver-address', amount: '100', ticker: 'USDC', blockchain: 'tron' },
    };

    const { result } = renderHook(() => useHandleSwap());

    act(() => {
      result.current.handleSwap(data);
    });

    // Check if error modal is shown for Tron
    expect(mockShowProcessModal).toHaveBeenCalledWith('failed', 'Connect your Wallet', 'Error');
  });

  it('should call handleApiError on unexpected error', async () => {
    const error = new Error('Unexpected error');
    axios.post.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useHandleSwap());

    const data = {
      sender: { amount: '100', ticker: 'ADA', blockchain: 'cardano' },
      receiver: { address: 'mock-receiver-address', amount: '100', ticker: 'MyUSD', blockchain: 'cardano' },
    };

    act(() => {
      result.current.handleSwap(data);
    });

    // Check if the error handler was called
    expect(mockHandleApiError).toHaveBeenCalledWith(error, mockShowProcessModal);
  });
});
