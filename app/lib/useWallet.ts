'use client';
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export function useWallet() {
  const [account, setAccount] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const MONAD_TESTNET_CHAIN_ID = '0x279f'; // Hex for 10143

  const switchToMonadTestnet = async () => {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed');
    }
    try {
      await (window.ethereum as ethers.Eip1193Provider).request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: MONAD_TESTNET_CHAIN_ID }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) { // Chain not added
        await (window.ethereum as ethers.Eip1193Provider).request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: MONAD_TESTNET_CHAIN_ID,
            chainName: 'Monad Testnet',
            rpcUrls: ['https://testnet-rpc.monad.xyz'],
            nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
            blockExplorerUrls: ['https://testnet.monadexplorer.com'],
          }],
        });
      } else {
        throw switchError;
      }
    }
  };

  const connectWallet = async (refCode?: string) => {
    console.log('Connecting wallet...');
    setLoading(true);
    try {
      if (!window.ethereum) throw new Error('MetaMask not installed');
      await switchToMonadTestnet();
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const address = (await signer.getAddress()).toLowerCase();
      console.log('Wallet connected:', address);

      const userRef = doc(db, 'users', address);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        console.log('Saving new user to Firebase...');
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
      }

      setAccount(address);
    } catch (error) {
      console.error('Connection failed:', error);
      alert('Failed to connect wallet: ' + (error as Error).message);
      setAccount(null); // Reset account on failure
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    console.log('Disconnecting wallet...');
    setAccount(null);
    setLoading(false);
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0].toLowerCase());
        } else {
          disconnectWallet();
        }
      });
      window.ethereum.on('chainChanged', (chainId: string) => {
        if (chainId !== MONAD_TESTNET_CHAIN_ID) {
          switchToMonadTestnet();
        }
      });
    }
  }, []);

  return { account, setAccount, connectWallet, disconnectWallet, loading };
}