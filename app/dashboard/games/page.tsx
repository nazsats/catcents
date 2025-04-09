'use client';
import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Sidebar from '../../components/Sidebar';
import Profile from '../../components/Profile';

export default function Games() {
  const [account, setAccount] = useState<string | null>(null);
  const [gamesGmeow, setGamesGmeow] = useState(0);
  const [gameScores, setGameScores] = useState<{ [key: string]: number }>({});
  const router = useRouter();

  const checkWalletConnection = async () => {
    try {
      if (!window.ethereum) throw new Error('MetaMask not installed');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();
      if (accounts.length > 0) {
        setAccount(accounts[0].address.toLowerCase());
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
    }
  };

  const fetchGameScores = async (userAddress: string) => {
    try {
      const userDocRef = doc(db, 'users', userAddress);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        setGamesGmeow(Math.floor(data.gamesGmeow || 0)); // Round down to integer
        setGameScores({
          minesweeper: data.minesweeperBestScore || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch game scores:', error);
    }
  };

  useEffect(() => {
    checkWalletConnection();
  }, []);

  useEffect(() => {
    if (account) {
      fetchGameScores(account);
    }
  }, [account]);

  const handleDisconnect = () => {
    setAccount(null);
    router.push('/');
  };

  const handleCopyAddress = () => {
    if (account) {
      navigator.clipboard.writeText(account);
    }
  };

  if (!account) {
    return <div className="flex min-h-screen items-center justify-center bg-black text-white">Loading...</div>;
  }

  const games = [
    {
      id: 'minesweeper',
      title: 'Cat Sweeper',
      description: 'Uncover safe cells and avoid bombs to earn Gmeow points!',
      image: 'https://picsum.photos/300/200?random=1',
    },
    {
      id: 'future-game-1',
      title: 'Paw-some Puzzle (Coming Soon)',
      description: 'Solve cat-themed puzzles to win rewards.',
      image: 'https://picsum.photos/300/200?random=2',
      comingSoon: true,
    },
    {
      id: 'future-game-2',
      title: 'Kitty Race (Coming Soon)',
      description: 'Race your NFT cats for Gmeow glory!',
      image: 'https://picsum.photos/300/200?random=3',
      comingSoon: true,
    },
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-black to-purple-950 text-white">
      <Sidebar onDisconnect={handleDisconnect} />
      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-semibold text-purple-300">Games</h2>
          <Profile account={account} onCopyAddress={handleCopyAddress} />
        </div>

        <div className="bg-black/80 rounded-lg p-6 border border-purple-900 mb-8">
          <h3 className="text-lg font-semibold text-purple-400 mb-4">Your Game Stats</h3>
          <div className="flex items-center justify-between">
            <p className="text-gray-300">
              Total Games Gmeow: <span className="text-cyan-400 font-bold">{gamesGmeow}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => (
            <div
              key={game.id}
              className="bg-black/80 rounded-lg border border-purple-900 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all duration-300 overflow-hidden"
            >
              <div className="w-full h-48 relative">
                <img
                  src={game.image}
                  alt={game.title}
                  className="w-full h-full object-cover"
                  onError={(e) => (e.currentTarget.src = 'https://picsum.photos/300/200?random=fallback')}
                />
                {game.comingSoon && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-yellow-400 font-bold text-lg">Coming Soon</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-purple-400">{game.title}</h3>
                <p className="text-gray-300 text-sm mt-1">{game.description}</p>
                {!game.comingSoon && (
                  <p className="text-gray-300 text-sm mt-2">
                    Best Score: <span className="text-cyan-400">{gameScores[game.id] || 0} Gmeow</span>
                  </p>
                )}
                <Link
                  href={`/dashboard/games/${game.id}`}
                  className={`mt-4 inline-block px-6 py-2 rounded-lg text-white font-semibold transition-all duration-200 transform hover:scale-105 ${
                    game.comingSoon
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-700 to-purple-500 hover:from-purple-600 hover:to-purple-400'
                  }`}
                  prefetch={true}
                >
                  {game.comingSoon ? 'Locked' : 'Play Now'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}