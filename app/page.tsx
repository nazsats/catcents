'use client';
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { db } from './lib/firebase';
import { doc, setDoc, getDoc, arrayUnion, increment } from 'firebase/firestore';

export default function LandingPage() {
  const [account, setAccount] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refCode, setRefCode] = useState<string | null>(null);

  // Get refCode from URL query parameters on mount
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const ref = queryParams.get('ref');
    setRefCode(ref);
  }, []);

  const connectWallet = async (refCode?: string) => {
    console.log('Connecting wallet...');
    setLoading(true);
    try {
      if (!window.ethereum) throw new Error('MetaMask not installed');

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
          referralLink: `${window.location.origin}/?ref=${address}`,
        });

        if (refCode) {
          const referrerRef = doc(db, 'users', refCode.toLowerCase());
          const referrerSnap = await getDoc(referrerRef);
          if (referrerSnap.exists()) {
            console.log(`Updating referrer ${refCode} with new referral: ${address}`);
            await setDoc(
              referrerRef,
              {
                referrals: arrayUnion(address),
                meowMiles: increment(50),
              },
              { merge: true }
            );
          } else {
            console.log(`Referrer ${refCode} not found in Firebase`);
          }
        }
      }

      setAccount(address);
      console.log('Redirecting to dashboard...');
      window.location.href = '/dashboard'; // Force redirect
    } catch (error) {
      console.error('Connection failed:', error);
      alert('Failed to connect wallet: ' + (error as Error).message);
      setAccount(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-purple-900 text-white">
      {account ? (
        <div className="text-center">
          <p className="text-xl mb-4">Connected: {account.slice(0, 6)}...{account.slice(-4)}</p>
          <a
            href="/dashboard"
            className="bg-purple-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-purple-700 transition-colors"
          >
            Go to Dashboard
          </a>
        </div>
      ) : (
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            Welcome to Catcents
          </h1>
          <p className="text-xl mb-8">Join our Web3 community and start earning points!</p>
          {refCode && <p className="text-sm mb-4">Referred by: {refCode.slice(0, 6)}...</p>}
          <button
            onClick={() => connectWallet(refCode || undefined)}
            disabled={loading}
            className="bg-purple-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Connecting...' : 'Get Started - Connect Wallet'}
          </button>
        </div>
      )}
    </div>
  );
}