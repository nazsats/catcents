'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWeb3Modal } from './lib/Web3ModalContext';

export default function LandingPage() {
  const { account, connectWallet, loading } = useWeb3Modal();
  const [refCode, setRefCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null); // Add error state
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const queryParams = new URLSearchParams(window.location.search);
      const ref = queryParams.get('ref');
      console.log('Landing - Setting refCode:', ref);
      setRefCode(ref);
    }
  }, []);

  useEffect(() => {
    console.log('Landing - useEffect - Account:', account, 'Loading:', loading, 'HasRedirected:', hasRedirected);
    if (account && !loading && !hasRedirected) {
      console.log('Landing - Redirecting to /dashboard');
      setHasRedirected(true);
      router.push('/dashboard');
    }
  }, [account, loading, router, hasRedirected]);

  const handleConnectWallet = async () => {
    try {
      setError(null); // Clear previous errors
      await connectWallet(refCode ?? undefined);
    } catch (err) {
      console.error('Connect wallet error:', err);
      setError('Failed to connect wallet: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

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
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <button
            onClick={handleConnectWallet}
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