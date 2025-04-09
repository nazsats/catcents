'use client';
import Link from 'next/link';

interface SidebarProps {
  onDisconnect: () => void;
}

export default function Sidebar({ onDisconnect }: SidebarProps) {
  return (
    <aside className="w-64 bg-black/90 p-6 flex flex-col justify-between border-r border-purple-900">
      <div>
        <h1 className="text-2xl font-bold mb-8 bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
          Catcents
        </h1>
        <nav className="space-y-4">
          <Link href="/dashboard" className="flex items-center space-x-2 text-purple-400 hover:text-purple-300">
            <span>🏠</span>
            <span>Dashboard</span>
          </Link>
          <Link href="/dashboard/quests" className="flex items-center space-x-2 text-gray-300 hover:text-purple-300">
            <span>📜</span>
            <span>Quests</span>
          </Link>
          <Link href="/dashboard/proposals" className="flex items-center space-x-2 text-gray-300 hover:text-purple-300">
            <span>📋</span>
            <span>Proposals</span>
          </Link>
          <Link href="/dashboard/games" className="flex items-center space-x-2 text-gray-300 hover:text-purple-300">
            <span>🎮</span>
            <span>Games</span>
          </Link>
          <Link href="/nft-staking" className="flex items-center space-x-2 text-gray-300 hover:text-purple-300">
            <span>🌟</span>
            <span>NFT Staking</span>
          </Link>
        </nav>
      </div>
      <button
        onClick={onDisconnect}
        className="bg-purple-700 text-white py-2 rounded-lg hover:bg-purple-600 transition-colors"
      >
        Disconnect
      </button>
    </aside>
  );
}