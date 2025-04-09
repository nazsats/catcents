// app/nft-staking/page.tsx
'use client';
import { useWallet } from '../../lib/useWallet';
import Sidebar from '../../components/Sidebar';
import Profile from '../../components/Profile';

export default function NFTStaking() {
  const { account, disconnectWallet } = useWallet();
  const handleCopyAddress = () => {
    if (account) navigator.clipboard.writeText(account);
  };

  if (!account) return <div>Loading...</div>;

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