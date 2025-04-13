'use client';
import { ReactNode, useRef } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { Web3ModalProvider } from './lib/Web3ModalContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { injected } from 'wagmi/connectors';
import './globals.css'; // Static import

// Define Monad Testnet chain configuration
const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  rpcUrls: {
    default: {
      http: ['https://testnet-rpc.monad.xyz'],
    },
  },
  nativeCurrency: {
    name: 'MON',
    symbol: 'MON',
    decimals: 18,
  },
  blockExplorers: {
    default: {
      name: 'Monad Testnet Explorer',
      url: 'https://testnet.monadexplorer.com',
    },
  },
};

// Configure wagmi with injected connectors for multiple wallets
const config = createConfig({
  chains: [monadTestnet],
  connectors: [
    // MetaMask
    injected({
      target: {
        id: 'metaMask',
        name: 'MetaMask',
        provider: () => {
          if (typeof window === 'undefined') return undefined;
          return window.ethereum?.isMetaMask ? window.ethereum : undefined;
        },
      },
    }),
    // Phantom
    injected({
      target: {
        id: 'phantom',
        name: 'Phantom',
        provider: () => {
          if (typeof window === 'undefined') return undefined;
          const win = window as Window & { phantom?: { ethereum?: any } };
          return win.phantom?.ethereum;
        },
      },
    }),
    // Backpack
    injected({
      target: {
        id: 'backpack',
        name: 'Backpack',
        provider: () => {
          if (typeof window === 'undefined') return undefined;
          const win = window as Window & { backpack?: { ethereum?: any } };
          const backpack = win.backpack?.ethereum;
          return backpack || (window.ethereum?.isBackpack ? window.ethereum : undefined);
        },
      },
    }),
    // Haha Wallet
    injected({
      target: {
        id: 'haha',
        name: 'Haha Wallet',
        provider: () => {
          if (typeof window === 'undefined') return undefined;
          return window.ethereum?.isHahaWallet ? window.ethereum : undefined;
        },
      },
    }),
    // Rabby
    injected({
      target: {
        id: 'rabby',
        name: 'Rabby Wallet',
        provider: () => {
          if (typeof window === 'undefined') return undefined;
          return window.ethereum?.isRabby ? window.ethereum : undefined;
        },
      },
    }),
  ],
  transports: {
    [monadTestnet.id]: http(),
  },
});

// Create a QueryClient instance
const queryClient = new QueryClient();

export default function ClientLayout({ children }: { children: ReactNode }) {
  const appRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={appRef}>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <Web3ModalProvider>
            <div className="bg-gray-900 text-white antialiased">{children}</div>
          </Web3ModalProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </div>
  );
}