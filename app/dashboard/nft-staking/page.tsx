'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import Profile from '../../components/Profile';
import { useWeb3Modal } from '../../lib/useWeb3Modal'; // Static import

export default function NFTStaking() {
  const { account, disconnectWallet, loading } = useWeb3Modal();
  const router = useRouter();

  const handleCopyAddress = () => {
    if (account) navigator.clipboard.writeText(account);
  };

  useEffect(() => {
    console.log('NFT Staking useEffect - Account:', account, 'Loading:', loading);
    if (loading) return;
    if (!account) {
      router.push('/');
    }
  }, [account, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black to-purple-950 text-white">
        Loading...
      </div>
    );
  }

  if (!account) return null;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-black to-purple-950 text-white">
      <Sidebar onDisconnect={disconnectWallet} />
      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-semibold text-purple-300">NFT Staking</h2>
          <Profile account={account} onCopyAddress={handleCopyAddress} />
        </div>
        <div className="bg-black/80 rounded-lg p-6 border border-purple-900">
          <h3 className="text-lg font-semibold text-purple-400">Stake Your NFTs</h3>
          <p className="text-gray-300">Coming soon: Stake your NFTs to earn Gmeow points!</p>
        </div>
      </main>
    </div>
  );
}