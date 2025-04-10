'use client';
import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  onDisconnect: () => void;
}

export default function Sidebar({ onDisconnect }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname(); // Get current route

  // Define active link styles
  const getLinkClass = (href: string) =>
    `flex items-center space-x-3 transition-colors ${
      pathname === href
        ? 'text-purple-400 font-semibold'
        : 'text-gray-300 hover:text-purple-300'
    }`;

  return (
    <>
      {/* Toggle Button - Attached to Sidebar */}
      <button
        className={`md:hidden fixed top-1/2 z-20 bg-purple-700 text-white p-3 rounded-r-lg shadow-lg transition-all duration-200 ease-in-out ${
          isOpen ? 'left-64' : 'left-0'
        } transform -translate-y-1/2`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Menu"
      >
        <span className="text-xl font-bold">{isOpen ? '>' : '<'}</span>
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 w-64 bg-black/90 p-6 flex flex-col justify-between border-r border-purple-900 shadow-lg transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 z-10`}
      >
        <div>
          <h1 className="text-2xl font-bold mb-8 bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
            Catcents
          </h1>
          <nav className="space-y-4">
            <Link href="/dashboard" className={getLinkClass('/dashboard')}>
              <span className="text-lg">🏠</span>
              <span className="text-base">Dashboard</span>
            </Link>
            <Link href="/dashboard/quests" className={getLinkClass('/dashboard/quests')}>
              <span className="text-lg">📜</span>
              <span className="text-base">Quests</span>
            </Link>
            <Link href="/dashboard/proposals" className={getLinkClass('/dashboard/proposals')}>
              <span className="text-lg">📋</span>
              <span className="text-base">Proposals</span>
            </Link>
            <Link href="/dashboard/games" className={getLinkClass('/dashboard/games')}>
              <span className="text-lg">🎮</span>
              <span className="text-base">Games</span>
            </Link>
            <Link href="/dashboard/nft-staking" className={getLinkClass('/nft-staking')}>
              <span className="text-lg">🌟</span>
              <span className="text-base">NFT Staking</span>
            </Link>
          </nav>
        </div>
        <button
          onClick={onDisconnect}
          className="bg-purple-700 text-white py-2 rounded-lg hover:bg-purple-600 transition-colors font-semibold"
        >
          Disconnect
        </button>
      </aside>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-0 transition-opacity duration-200 ease-in-out"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}