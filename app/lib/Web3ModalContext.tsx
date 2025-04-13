'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAccount, useDisconnect, useConnect, useConfig } from 'wagmi';
import { getAccount } from '@wagmi/core';

// Define provider interface to include wallet-specific properties
interface WalletProvider {
  isMetaMask?: boolean;
  isBackpack?: boolean;
  [key: string]: any; // Allow other properties
}

interface Web3ModalContextType {
  account: string | null;
  provider: WalletProvider | null;
  disconnectWallet: () => void;
  loading: boolean;
  selectedWallet: string | null;
}

const Web3ModalContext = createContext<Web3ModalContextType | undefined>(undefined);

export function Web3ModalProvider({ children }: { children: ReactNode }) {
  const { address, connector } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect, connectors } = useConnect();
  const config = useConfig();
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<WalletProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

  useEffect(() => {
    const initializeWallet = async () => {
      try {
        const accountData = getAccount(config);
        if (accountData.address && accountData.connector) {
          setAccount(accountData.address);
          if (typeof accountData.connector.getProvider === 'function') {
            // Assert the provider as WalletProvider since Wagmi types it as unknown
            const provider = (await accountData.connector.getProvider()) as WalletProvider;
            setProvider(provider);
            // Detect wallet type with type assertion for window
            const win = window as Window & { phantom?: { ethereum?: any }; backpack?: { ethereum?: any } };
            if (provider?.isMetaMask) {
              setSelectedWallet('metaMask');
            } else if (provider === win.phantom?.ethereum) {
              setSelectedWallet('phantom');
            } else if (provider === win.backpack?.ethereum || provider?.isBackpack) {
              setSelectedWallet('backpack');
            } else {
              setSelectedWallet('unknown');
            }
          } else {
            console.warn('Connector does not have getProvider function');
            setProvider(null);
            setSelectedWallet(null);
          }
        } else {
          setAccount(null);
          setProvider(null);
          setSelectedWallet(null);
        }
      } catch (error) {
        console.error('Failed to initialize wallet:', error);
        setAccount(null);
        setProvider(null);
        setSelectedWallet(null);
      } finally {
        setLoading(false);
      }
    };

    initializeWallet();
  }, [config]);

  useEffect(() => {
    const fetchProvider = async () => {
      if (address && connector) {
        try {
          setAccount(address);
          if (typeof connector.getProvider === 'function') {
            // Assert the provider as WalletProvider since Wagmi types it as unknown
            const provider = (await connector.getProvider()) as WalletProvider;
            console.log('Provider fetched:', provider);
            setProvider(provider);
            // Detect wallet type with type assertion for window
            const win = window as Window & { phantom?: { ethereum?: any }; backpack?: { ethereum?: any } };
            if (provider?.isMetaMask) {
              setSelectedWallet('metaMask');
            } else if (provider === win.phantom?.ethereum) {
              setSelectedWallet('phantom');
            } else if (provider === win.backpack?.ethereum || provider?.isBackpack) {
              setSelectedWallet('backpack');
            } else {
              setSelectedWallet('unknown');
            }
          } else {
            console.warn('Connector does not have getProvider function');
            setProvider(null);
            setSelectedWallet(null);
          }
        } catch (error) {
          console.error('Failed to fetch provider:', error);
          setProvider(null);
          setSelectedWallet(null);
        }
      } else {
        setAccount(null);
        setProvider(null);
        setSelectedWallet(null);
      }
    };

    fetchProvider();
  }, [address, connector]);

  const disconnectWallet = () => {
    disconnect();
    setAccount(null);
    setProvider(null);
    setSelectedWallet(null);
  };

  return (
    <Web3ModalContext.Provider value={{ account, provider, disconnectWallet, loading, selectedWallet }}>
      {children}
    </Web3ModalContext.Provider>
  );
}

export function useWeb3Modal() {
  const context = useContext(Web3ModalContext);
  if (context === undefined) {
    throw new Error('useWeb3Modal must be used within a Web3ModalProvider');
  }
  return context;
}