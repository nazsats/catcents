'use client';
import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, increment } from 'firebase/firestore';
import Sidebar from '../components/Sidebar';
import Profile from '../components/Profile';
import toast, { Toaster } from 'react-hot-toast';

export default function DashboardPage() {
  const [account, setAccount] = useState<string | null>(null);
  const [meowMiles, setMeowMiles] = useState({ quests: 0, proposals: 0, games: 0, referrals: 0, total: 0 });
  const [monBalance, setMonBalance] = useState<string>('0');
  const [lastCheckIn, setLastCheckIn] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<string>('24:00:00');
  const [checkingIn, setCheckingIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (address: string) => {
    try {
      const userRef = doc(db, 'users', address);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        const quests = Math.floor(data.meowMiles || 0);
        const proposals = Math.floor(data.proposalsGmeow || 0);
        const games = Math.floor(data.gamesGmeow || 0);
        const referrals = Math.floor(data.referrals?.length || 0);
        setMeowMiles({
          quests,
          proposals,
          games,
          referrals,
          total: quests + proposals + games + referrals,
        });
        setLastCheckIn(data.lastCheckIn || null);
        if (data.lastCheckIn) startCountdown(data.lastCheckIn);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  const fetchMonBalance = async (address: string) => {
    try {
      if (!window.ethereum) {
        console.error('MetaMask not detected');
        setMonBalance('N/A');
        return;
      }
      const provider = new ethers.BrowserProvider(window.ethereum as ethers.Eip1193Provider);
      const balance = await provider.getBalance(address);
      setMonBalance(Number(ethers.formatEther(balance)).toFixed(4));
    } catch (error) {
      console.error('Failed to fetch MON balance:', error);
      setMonBalance('Error');
    }
  };

  const handleDailyCheckIn = async () => {
    if (!account || !window.ethereum || checkingIn) return;
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    if (lastCheckIn && now - lastCheckIn < oneDay) return;

    setCheckingIn(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum as ethers.Eip1193Provider);
      const signer = await provider.getSigner();
      const tx = await signer.sendTransaction({
        to: '0xfF8b7625894441C26fEd460dD21360500BF4E767',
        value: ethers.parseEther('0'),
      });

      const pendingToast = toast.loading('Processing check-in transaction...');
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('Transaction receipt is null');
      }
      const txHash = receipt.hash;

      const userRef = doc(db, 'users', account);
      await setDoc(userRef, { lastCheckIn: now, meowMiles: increment(10) }, { merge: true });

      setLastCheckIn(now);
      startCountdown(now);
      await fetchUserData(account);

      toast.dismiss(pendingToast);
      toast.success(
        <div>
          Check-in completed!{' '}
          <a
            href={`https://testnet.monadscan.com/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-cyan-400 hover:text-cyan-300"
          >
            View on MonadScan
          </a>
        </div>,
        { duration: 5000 }
      );
    } catch (error) {
      console.error('Daily check-in transaction failed:', error);
      toast.error('Failed to check-in: ' + (error as Error).message);
    } finally {
      setCheckingIn(false);
    }
  };

  const startCountdown = (lastCheckInTime: number) => {
    const updateTimer = () => {
      const now = Date.now();
      const timeLeft = 24 * 60 * 60 * 1000 - (now - lastCheckInTime);
      if (timeLeft <= 0) {
        setCountdown('00:00:00');
        setLastCheckIn(null);
        return;
      }
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      setCountdown(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  };

  const handleCopyAddress = () => {
    if (account) navigator.clipboard.writeText(account);
  };

  const disconnectWallet = () => {
    console.log('Disconnecting wallet...');
    setAccount(null);
    window.location.href = '/'; // Force redirect to landing page
  };

  useEffect(() => {
    const initializeAccount = async () => {
      if (!window.ethereum) {
        setLoading(false);
        return;
      }

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          const address = accounts[0].address.toLowerCase();
          console.log('Found connected account:', address);
          setAccount(address);
          fetchUserData(address);
          fetchMonBalance(address);
        }
      } catch (error) {
        console.error('Failed to initialize account:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAccount();
  }, []);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-black text-white">Loading...</div>;
  }

  if (!account) {
    window.location.href = '/'; // Redirect to landing if no account
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-black to-purple-950 text-white">
      <Sidebar onDisconnect={disconnectWallet} />
      <main className="flex-1 p-8">
        <Toaster position="top-right" />
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-semibold text-purple-300">Dashboard</h2>
          <Profile account={account} onCopyAddress={handleCopyAddress} />
        </div>

        <div className="flex space-x-6">
          <div className="flex-1 space-y-6">
            <div className="bg-black/80 rounded-lg p-6 text-center border border-purple-900 shadow-lg shadow-purple-500/20 animate-glow">
              <h3 className="text-2xl font-bold text-purple-400">Total Meow Miles</h3>
              <p className="text-5xl font-extrabold mt-2 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 bg-clip-text text-transparent">
                {meowMiles.total}
              </p>
            </div>

            <div className="bg-black/80 rounded-lg p-6 border border-purple-900 shadow-lg shadow-purple-500/20">
              <h4 className="text-lg font-semibold mb-4 text-purple-400">Score Breakdown</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xl font-bold text-purple-400">{meowMiles.quests}</p>
                  <p className="text-gray-300">Quest Meow Miles</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-purple-400">{meowMiles.proposals}</p>
                  <p className="text-gray-300">Proposal Meow Miles</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-purple-400">{meowMiles.games}</p>
                  <p className="text-gray-300">Game Meow Miles</p>
                </div>
              </div>
            </div>
          </div>

          <div className="w-80 space-y-6">
            <div className="bg-black/80 rounded-lg p-6 border border-purple-900 shadow-lg shadow-purple-500/20">
              <h4 className="text-lg font-semibold mb-2 text-purple-400">Assets</h4>
              <p className="text-2xl font-bold text-cyan-400">Available MON: {monBalance}</p>
            </div>

            <div className="bg-black/80 rounded-lg p-6 border border-purple-900 shadow-lg shadow-purple-500/20">
              <h4 className="text-lg font-semibold mb-4 text-purple-400">Daily Check-In</h4>
              <div className="space-y-4">
                <p className="text-center text-gray-300">Next check-in in: {countdown}</p>
                <button
                  onClick={handleDailyCheckIn}
                  className="w-full bg-gradient-to-r from-purple-700 to-purple-500 text-white py-3 rounded-lg hover:from-purple-600 hover:to-purple-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={checkingIn || (lastCheckIn !== null && Date.now() - lastCheckIn < 24 * 60 * 60 * 1000)}
                >
                  {checkingIn ? 'Checking In...' : 'Check In'}
                </button>
              </div>
            </div>

            <div className="bg-black/80 rounded-lg p-6 border border-purple-900 shadow-lg shadow-purple-500/20">
              <h4 className="text-lg font-semibold mb-4 text-purple-400">Referral Program</h4>
              <p className="text-gray-300 mb-2">Your Referral Link:</p>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={account ? `${window.location.origin}/?ref=${account}` : ''}
                  readOnly
                  className="flex-1 bg-gray-900 text-white p-2 rounded-lg border border-purple-900"
                />
                <button
                  onClick={() => account && navigator.clipboard.writeText(`${window.location.origin}/?ref=${account}`)}
                  className="bg-purple-600 px-4 py-2 rounded-lg hover:bg-purple-700"
                >
                  Copy
                </button>
              </div>
              <p className="text-gray-300 mt-4">Referrals: {meowMiles.referrals}</p>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes glow {
          0% { box-shadow: 0 0 5px rgba(147, 51, 234, 0.5), 0 0 10 Wpx rgba(147, 51, 234, 0.3); }
          50% { box-shadow: 0 0 20px rgba(147, 51, 234, 0.8), 0 0 30px rgba(147, 51, 234, 0.5); }
          100% { box-shadow: 0 0 5px rgba(147, 51, 234, 0.5), 0 0 10px rgba(147, 51, 234, 0.3); }
        }
        .animate-glow { animation: glow 2s infinite; }
      `}</style>
    </div>
  );
}