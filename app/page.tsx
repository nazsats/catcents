'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWeb3Modal } from './lib/Web3ModalContext';

export default function LandingPage() {
  const { account, connectWallet, loading } = useWeb3Modal();
  const [refCode, setRefCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const ref = queryParams.get('ref');
    setRefCode(ref);
  }, []);

  useEffect(() => {
    if (account && !loading) {
      router.replace('/dashboard'); // Use replace to avoid stacking history
    }
  }, [account, loading, router]);

  const handleConnectWallet = async () => {
    try {
      setError(null);
      await connectWallet(refCode ?? undefined);
    } catch (err) {
      setError('Failed to connect wallet. Please try again.');
      console.error('Connect wallet error:', err);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-purple-900 text-white p-4">
      <div className="text-center max-w-md w-full">
        {loading ? (
          <div className="animate-pulse">Loading...</div>
        ) : account ? (
          <div className="space-y-4 animate-fade-in">
            <p className="text-xl mb-4">Connected: {account.slice(0, 6)}...{account.slice(-4)}</p>
            <a
              href="/dashboard"
              className="inline-block bg-purple-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              Go to Dashboard
            </a>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
              Welcome to Catcents
            </h1>
            <p className="text-lg md:text-xl">Join our Web3 community and start earning points!</p>
            {refCode && (
              <p className="text-sm text-gray-300">Referred by: {refCode.slice(0, 6)}...</p>
            )}
            {error && (
              <p className="text-red-400 bg-red-900/20 p-2 rounded">{error}</p>
            )}
            <button
              onClick={handleConnectWallet}
              disabled={loading}
              className="bg-purple-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 w-full md:w-auto"
            >
              {loading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}