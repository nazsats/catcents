'use client';
import { createWeb3Modal, defaultConfig } from '@web3modal/ethers';
import { useEffect, useState } from 'react';
import { BrowserProvider, ethers } from 'ethers';
import { db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Extend Eip1193Provider to include event listener methods
interface ExtendedEip1193Provider extends ethers.Eip1193Provider {
  on(event: string, listener: (...args: any[]) => void): void;
  removeListener(event: string, listener: (...args: any[]) => void): void;
}

// WalletConnect project ID (ensure this is valid from WalletConnect Cloud)
const projectId = '28623011573d36852a0944841556a0c5';

const metadata = {
  name: 'Catcents',
  description: 'Web3 Community Platform',
  url: 'http://localhost:3000',
  icons: ['/favicon.ico'],
};

const chains = [
  {
    chainId: 10143,
    name: 'Monad Testnet',
    currency: 'MON',
    explorerUrl: 'https://testnet.monadexplorer.com',
    rpcUrl: 'https://testnet-rpc.monad.xyz',
  },
];

const ethersConfig = defaultConfig({
  metadata,
  defaultChainId: 10143,
  enableEIP6963: true, // Supports injected wallets (MetaMask, Rabby, etc.)
  enableCoinbase: false, // Disable Coinbase Wallet
});

const modal = createWeb3Modal({
  ethersConfig,
  chains,
  projectId,
});

export function useWeb3Modal() {
  const [account, setAccount] = useState<string | null>(() => {
    const storedAccount = localStorage.getItem('account');
    return storedAccount || null;
  });
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [loading, setLoading] = useState(false);

  const connectWallet = async (refCode?: string): Promise<void> => {
    try {
      console.log('connectWallet started');
      setLoading(true);

      await modal.open();

      const connectionPromise = new Promise<void>((resolve, reject) => {
        const unsubscribe = modal.subscribeProvider(async (state) => {
          console.log('Provider state:', state);
          if (state.provider && state.isConnected) {
            const web3Provider = new ethers.BrowserProvider(state.provider);
            const signer = await web3Provider.getSigner();
            const address = (await signer.getAddress()).toLowerCase();

            const userRef = doc(db, 'users', address);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
              await setDoc(userRef, {
                walletAddress: address,
                meowMiles: 0,
                proposalsGmeow: 0,
                gamesGmeow: 0,
                createdAt: new Date().toISOString(),
                lastCheckIn: null,
                referredBy: refCode || null,
                referrals: [],
              });
              console.log('New user saved to Firebase:', address);
            }

            document.cookie = `account=${address}; path=/; max-age=86400`;
            localStorage.setItem('account', address);
            setProvider(web3Provider);
            setAccount(address);
            console.log('Wallet connected, account set:', address);

            modal.close();
            if (unsubscribe) unsubscribe();
            resolve();
          }
        }) as (() => void) | undefined;

        setTimeout(() => {
          if (unsubscribe) unsubscribe();
          reject(new Error('Connection timed out'));
        }, 30000); // 30 seconds timeout
      });

      await connectionPromise;
    } catch (error) {
      console.error('Wallet connection failed:', error);
      setAccount(null);
      setProvider(null);
      localStorage.removeItem('account');
    } finally {
      setLoading(false);
      console.log('connectWallet finished, account:', account, 'loading:', loading);
    }
  };

  const disconnectWallet = (): void => {
    setAccount(null);
    setProvider(null);
    document.cookie = 'account=; path=/; max-age=0';
    localStorage.removeItem('account');
    console.log('Wallet disconnected');
    modal.close();
  };

  useEffect(() => {
    const initializeConnection = async (): Promise<void> => {
      try {
        console.log('Initializing connection');
        const cachedProvider = modal.getWalletProvider() as ExtendedEip1193Provider | undefined;
        if (cachedProvider) {
          const web3Provider = new ethers.BrowserProvider(cachedProvider);
          const accounts = await web3Provider.listAccounts();
          if (accounts.length > 0) {
            const address = accounts[0].address.toLowerCase();
            setProvider(web3Provider);
            setAccount(address);
            document.cookie = `account=${address}; path=/; max-age=86400`;
            localStorage.setItem('account', address);
            console.log('Found existing connected account:', address);
          }
        }
      } catch (error) {
        console.error('Failed to initialize wallet:', error);
      } finally {
        setLoading(false);
        console.log('Initialization complete, account:', account);
      }
    };

    initializeConnection();

    const unsubscribe = modal.subscribeProvider((state) => {
      if (state.provider && state.isConnected) {
        const web3Provider = new ethers.BrowserProvider(state.provider);
        setProvider(web3Provider);
      }
      if (!state.isConnected) {
        setAccount(null);
        setProvider(null);
        document.cookie = 'account=; path=/; max-age=0';
        localStorage.removeItem('account');
      }
    }) as (() => void) | undefined;

    const cachedProvider = modal.getWalletProvider() as ExtendedEip1193Provider | undefined;
    const handleAccountsChanged = (accounts: string[]): void => {
      if (accounts.length > 0) {
        const address = accounts[0].toLowerCase();
        setAccount(address);
        document.cookie = `account=${address}; path=/; max-age=86400`;
        localStorage.setItem('account', address);
      } else {
        disconnectWallet();
      }
    };

    if (cachedProvider && cachedProvider.on) {
      cachedProvider.on('accountsChanged', handleAccountsChanged);
    }

    return () => {
      if (unsubscribe) unsubscribe();
      if (cachedProvider && cachedProvider.removeListener) {
        cachedProvider.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  return { account, provider, connectWallet, disconnectWallet, loading };
}