'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWeb3Modal } from './lib/useWeb3Modal';

export default function LandingPage() {
  const { account, connectWallet, loading } = useWeb3Modal();
  const [refCode, setRefCode] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const ref = queryParams.get('ref');
    setRefCode(ref);
  }, []);

  useEffect(() => {
    console.log('Landing page useEffect - Account:', account, 'Loading:', loading);
    if (account && !loading) {
      console.log('Redirecting to /dashboard');
      router.push('/dashboard');
    }
  }, [account, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-purple-900 text-white">
      {loading ? (
        <div>Loading...</div>
      ) : account ? (
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
            onClick={() => connectWallet(refCode)}
            disabled={loading}
            className="bg-purple-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      )}
    </div>
  );
}