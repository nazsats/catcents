'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Sidebar from '../../components/Sidebar';
import Profile from '../../components/Profile';
import { useWeb3Modal } from '../../lib/Web3ModalContext';
import toast, { Toaster } from 'react-hot-toast';

export default function Games() {
  const { account, disconnectWallet, loading } = useWeb3Modal();
  const [gamesGmeow, setGamesGmeow] = useState(0);
  const [gameScores, setGameScores] = useState<{ [key: string]: number }>({});
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);

  const fetchGameScores = async (userAddress: string) => {
    try {
      const userDocRef = doc(db, 'users', userAddress);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        setGamesGmeow(Math.floor(data.gamesGmeow || 0));
        setGameScores({
          catsweeper: data.minesweeperBestScore || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch game scores:', error);
      toast.error('Failed to load game stats.');
    }
  };

  useEffect(() => {
    console.log('Games useEffect - Account:', account, 'Loading:', loading, 'HasRedirected:', hasRedirected);
    if (loading) return;
    if (!account && !hasRedirected) {
      console.log('Games - Redirecting to /');
      setHasRedirected(true);
      router.push('/');
      return;
    }
    if (account) {
      fetchGameScores(account);
    }
  }, [account, loading, router, hasRedirected]);

  const handleCopyAddress = () => {
    if (account) {
      navigator.clipboard.writeText(account);
      toast.success('Address copied!');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black to-purple-950 text-white">
        <svg className="animate-spin h-8 w-8 text-purple-400" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        </svg>
      </div>
    );
  }

  if (!account) return null;

  const games = [
    {
      id: 'catsweeper',
      title: 'Cat Sweeper',
      description: 'Uncover safe cells and avoid bombs to earn Gmeow points!',
      image: '/games/catsweeper.png',
    },
    {
      id: 'puzzle',
      title: 'Paw-some Puzzle (Coming Soon)',
      description: 'Solve cat-themed puzzles to win rewards.',
      image: '/games/puzzle.png',
      comingSoon: true,
    },
    {
      id: 'race',
      title: 'Kitty Race (Coming Soon)',
      description: 'Race your NFT cats for Gmeow glory!',
      image: '/games/race.png',
      comingSoon: true,
    },
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-black to-purple-950 text-white">
      <Sidebar onDisconnect={disconnectWallet} />
      <main className="flex-1 p-4 md:p-8">
        <Toaster position="top-right" toastOptions={{ style: { background: '#1a1a1a', color: '#fff', border: '1px solid #9333ea' } }} />

        {/* Header and Profile */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
          <h2 className="text-2xl md:text-3xl font-bold text-purple-300">Games</h2>
          <div className="ml-auto">
            <Profile account={account} onCopyAddress={handleCopyAddress} onDisconnect={disconnectWallet} />
          </div>
        </div>

        {/* Banner */}
        <div className="w-full max-w-4xl mx-auto mb-6 md:mb-8">
          <div className="relative w-full" style={{ paddingTop: '33.33%' /* 3:1 aspect ratio */ }}>
            <Image
              src="/games/gamebanner.png"
              alt="Catcents Playground Banner"
              layout="fill"
              objectFit="cover"
              className="rounded-xl border border-purple-900 shadow-lg shadow-purple-500/30"
              priority
            />
          </div>
        </div>

        {/* Welcome Content (Smaller) */}
        <div className="text-center mb-6 md:mb-8 px-4">
          <h1 className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 bg-clip-text text-transparent mb-3">
            Welcome to the Catcents Playground
          </h1>
          <p className="text-sm md:text-base text-gray-300 max-w-2xl mx-auto leading-relaxed">
            <span className="text-cyan-400 font-semibold">This is your space</span> to{' '}
            <span className="text-purple-400 font-semibold">play, earn, and have fun</span>. Every game you try helps you collect{' '}
            <span className="text-pink-400 font-semibold">MeowMiles</span> and level up in the community.
          </p>
          <p className="text-sm md:text-base text-gray-300 max-w-2xl mx-auto mt-1 leading-relaxed">
            No pressure, just <span className="text-cyan-400 font-semibold">good vibes</span>,{' '}
            <span className="text-purple-400 font-semibold">cool games</span>, and a chance to win some{' '}
            <span className="text-pink-400 font-semibold">real rewards</span> while you’re at it.
          </p>
          <p className="text-base md:text-lg font-bold text-cyan-400 mt-2">Let’s play and make it count!</p>
        </div>

        {/* Game Stats */}
        <div className="bg-black/90 rounded-xl p-6 border border-purple-900 shadow-md shadow-purple-500/20 mb-6 md:mb-8">
          <h3 className="text-lg md:text-xl font-semibold text-purple-400 mb-4">Your Game Stats</h3>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <p className="text-gray-300">
              Total Games Gmeow: <span className="text-cyan-400 font-bold">{gamesGmeow}</span>
            </p>
          </div>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {games.map((game) => (
            <div
              key={game.id}
              className="bg-black/90 rounded-xl border border-purple-900 shadow-md shadow-purple-500/20 hover:shadow-purple-500/40 transition-all duration-300 overflow-hidden flex flex-col"
            >
              <div className="w-full h-40 sm:h-48 relative">
                <Image
                  src={game.image}
                  alt={game.title}
                  width={300}
                  height={300}
                  className="w-full h-full object-cover rounded-t-xl"
                  onError={(e) => (e.currentTarget.src = 'https://picsum.photos/300/300?random=fallback')}
                />
                {game.comingSoon && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-yellow-400 font-bold text-base md:text-lg">Coming Soon</span>
                  </div>
                )}
              </div>
              <div className="p-4 flex flex-col flex-grow">
                <h3 className="text-base md:text-lg font-semibold text-purple-400">{game.title}</h3>
                <p className="text-gray-300 text-sm mt-1">{game.description}</p>
                {!game.comingSoon && (
                  <p className="text-gray-300 text-sm mt-2">
                    Best Score: <span className="text-cyan-400 font-bold">{gameScores[game.id] || 0} Gmeow</span>
                  </p>
                )}
                <Link
                  href={`/dashboard/games/${game.id}`}
                  className={`mt-4 inline-block px-4 py-2 md:px-6 md:py-2 rounded-lg text-sm md:text-base font-semibold text-white transition-all duration-200 transform hover:scale-105 ${
                    game.comingSoon
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400'
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