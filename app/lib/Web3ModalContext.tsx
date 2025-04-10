'use client';
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { createWeb3Modal, defaultConfig } from '@web3modal/ethers';
import { BrowserProvider, ethers } from 'ethers';
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface ExtendedEip1193Provider extends ethers.Eip1193Provider {
  on(event: string, listener: (...args: any[]) => void): void;
  removeListener(event: string, listener: (...args: any[]) => void): void;
}

interface Web3ModalContextType {
  account: string | null;
  provider: BrowserProvider | null;
  loading: boolean;
  connectWallet: (refCode?: string) => Promise<void>;
  disconnectWallet: () => void;
}

const Web3ModalContext = createContext<Web3ModalContextType | undefined>(undefined);

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
  enableEIP6963: true,
  enableCoinbase: false,
});
const modal = createWeb3Modal({
  ethersConfig,
  chains,
  projectId,
});

export function Web3ModalProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('account'); // Load synchronously from localStorage
    }
    return null;
  });
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const fetchAccountFromFirebase = useCallback(async (address: string) => {
    const userRef = doc(db, 'users', address.toLowerCase());
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      console.log('Account fetched from Firebase:', address);
      return address;
    }
    return null;
  }, []);

  const initializeConnection = useCallback(async () => {
    if (typeof window === 'undefined' || isInitialized) return;

    console.log('Initializing connection');
    try {
      const cachedProvider = modal.getWalletProvider() as ExtendedEip1193Provider | undefined;
      if (cachedProvider) {
        const web3Provider = new ethers.BrowserProvider(cachedProvider);
        const accounts = await web3Provider.listAccounts();
        console.log('Accounts from provider:', accounts);
        if (accounts.length > 0) {
          const address = accounts[0].address.toLowerCase();
          const firebaseAccount = await fetchAccountFromFirebase(address);
          if (firebaseAccount) {
            console.log('Setting account and provider from init:', firebaseAccount);
            setProvider(web3Provider);
            setAccount(firebaseAccount);
            document.cookie = `account=${firebaseAccount}; path=/; max-age=86400`;
            if (window.localStorage) localStorage.setItem('account', firebaseAccount);
          }
        }
      }
    } catch (error) {
      console.error('Failed to initialize wallet:', error);
    } finally {
      setLoading(false);
      setIsInitialized(true);
      console.log('Initialization complete - Account:', account, 'Loading:', loading);
    }
  }, [fetchAccountFromFirebase, isInitialized]);

  const connectWallet = useCallback(
    async (refCode?: string): Promise<void> => {
      try {
        console.log('connectWallet started');
        setLoading(true);

        await modal.open();
        console.log('Modal opened, awaiting provider state...');

        const connectionPromise = new Promise<void>((resolve, reject) => {
          const unsubscribe = modal.subscribeProvider(async (state) => {
            console.log('Provider state update:', state);
            if (state.provider && state.isConnected) {
              console.log('Provider connected, fetching signer...');
              const web3Provider = new ethers.BrowserProvider(state.provider);
              const signer = await web3Provider.getSigner();
              const address = (await signer.getAddress()).toLowerCase();
              console.log('Signer address:', address);

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

              console.log('Setting account and provider from connect:', address);
              setProvider(web3Provider);
              setAccount(address);
              document.cookie = `account=${address}; path=/; max-age=86400`;
              if (window.localStorage) localStorage.setItem('account', address);

              modal.close();
              if (unsubscribe) unsubscribe();
              resolve();
            }
          }) as (() => void) | undefined;

          setTimeout(() => {
            if (unsubscribe) unsubscribe();
            console.log('Connection timed out after 60 seconds');
            reject(new Error('Connection timed out'));
          }, 60000);
        });

        await connectionPromise;
      } catch (error) {
        console.error('Wallet connection failed:', error);
        setAccount(null);
        setProvider(null);
        if (window.localStorage) localStorage.removeItem('account');
        throw error;
      } finally {
        setLoading(false);
        console.log('connectWallet finished - Account:', account, 'Loading:', loading);
      }
    },
    []
  );

  const disconnectWallet = useCallback((): void => {
    console.log('Disconnecting wallet');
    setAccount(null);
    setProvider(null);
    document.cookie = 'account=; path=/; max-age=0';
    if (window.localStorage) localStorage.removeItem('account');
    modal.close();
  }, []);

  useEffect(() => {
    console.log('Web3ModalProvider useEffect - Initializing');
    initializeConnection();

    const cachedProvider = modal.getWalletProvider() as ExtendedEip1193Provider | undefined;
    const handleAccountsChanged = (accounts: string[]): void => {
      console.log('handleAccountsChanged - Accounts:', accounts);
      if (accounts.length > 0) {
        const address = accounts[0].toLowerCase();
        fetchAccountFromFirebase(address).then((firebaseAccount) => {
          if (firebaseAccount && firebaseAccount !== account) {
            console.log('Setting account from handleAccountsChanged:', firebaseAccount);
            setAccount(firebaseAccount);
            document.cookie = `account=${firebaseAccount}; path=/; max-age=86400`;
            if (window.localStorage) localStorage.setItem('account', firebaseAccount);
          }
        });
      } else if (account) {
        console.log('No accounts, disconnecting');
        disconnectWallet();
      }
    };

    if (cachedProvider && cachedProvider.on) {
      console.log('Adding accountsChanged listener');
      cachedProvider.on('accountsChanged', handleAccountsChanged);
    }

    const unsubscribe = modal.subscribeProvider((state) => {
      console.log('subscribeProvider state:', state);
      if (!state.isConnected && account) {
        console.log('Provider disconnected, calling disconnectWallet');
        disconnectWallet();
      }
    }) as (() => void) | undefined;

    return () => {
      console.log('Cleaning up Web3ModalProvider useEffect');
      if (unsubscribe) unsubscribe();
      if (cachedProvider && cachedProvider.removeListener) {
        cachedProvider.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, [initializeConnection, disconnectWallet, fetchAccountFromFirebase]);

  return (
    <Web3ModalContext.Provider value={{ account, provider, loading, connectWallet, disconnectWallet }}>
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