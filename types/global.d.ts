import { Eip1193Provider } from 'ethers';

declare global {
  interface Window {
    ethereum?: MetaMaskProvider;
  }
}

// Extend Eip1193Provider with MetaMask-specific event methods
interface MetaMaskProvider extends Eip1193Provider {
  on(event: string, listener: (...args: any[]) => void): void;
  removeListener(event: string, listener: (...args: any[]) => void): void;
}