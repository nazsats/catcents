'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, increment } from 'firebase/firestore';
import Sidebar from '../components/Sidebar';
import Profile from '../components/Profile';
import Badges from '../components/Badges';
import { useWeb3Modal } from '../lib/Web3ModalContext';
import toast, { Toaster } from 'react-hot-toast';
import { ethers } from 'ethers';

export default function DashboardPage() {
  const { account, provider, disconnectWallet, loading } = useWeb3Modal();
  const [meowMiles, setMeowMiles] = useState({ quests: 0, proposals: 0, games: 0, referrals: 0, total: 0 });
  const [monBalance, setMonBalance] = useState<string>('0');
  const [lastCheckIn, setLastCheckIn] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<string>('24:00:00');
  const [checkingIn, setCheckingIn] = useState(false);
  const [referralsList, setReferralsList] = useState<string[]>([]);
  const router = useRouter();

  const fetchUserData = async (address: string) => {
    console.log('fetchUserData called with address:', address);
    try {
      const userRef = doc(db, 'users', address);
      const userSnap = await getDoc(userRef);
      console.log('Firebase snapshot exists:', userSnap.exists());
      if (userSnap.exists()) {
        const data = userSnap.data();
        console.log('Firebase data:', data);
        const quests = Math.floor(data.meowMiles || 0);
        const proposals = Math.floor(data.proposalsGmeow || 0);
        const games = Math.floor(data.gamesGmeow || 0);
        const referrals = Math.floor(data.referrals?.length || 0);
        const newMeowMiles = {
          quests,
          proposals,
          games,
          referrals,
          total: quests + proposals + games + referrals,
        };
        console.log('Setting meowMiles:', newMeowMiles);
        setMeowMiles(newMeowMiles);
        setLastCheckIn(data.lastCheckIn || null);
        setReferralsList(data.referrals || []);
        if (data.lastCheckIn) startCountdown(data.lastCheckIn);
      } else {
        console.log('No data found in Firebase for address:', address);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      toast.error('Failed to load user data');
    }
  };

  const fetchMonBalance = async (address: string) => {
    console.log('fetchMonBalance called with address:', address);
    try {
      if (!provider) {
        throw new Error('Provider not available');
      }
      const balance = await provider.getBalance(address);
      setMonBalance(ethers.formatEther(balance).slice(0, 6));
    } catch (error) {
      console.error('Failed to fetch MON balance:', error);
      setMonBalance('N/A');
      toast.error('Unable to fetch MON balance');
    }
  };

  const handleDailyCheckIn = async () => {
    if (!account || !provider || checkingIn) return;
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    if (lastCheckIn && now - lastCheckIn < oneDay) return;

    setCheckingIn(true);
    try {
      const signer = await provider.getSigner();
      const tx = await signer.sendTransaction({
        to: '0xfF8b7625894441C26fEd460dD21360500BF4E767',
        value: ethers.parseEther('0'),
      });

      const pendingToast = toast.loading('Processing check-in...');
      const receipt = await tx.wait();
      if (!receipt) throw new Error('Transaction receipt not received');
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
      console.error('Daily check-in failed:', error);
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
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
          .toString()
          .padStart(2, '0')}`
      );
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  };

  const handleCopyAddress = () => {
    if (account) {
      navigator.clipboard.writeText(account);
      toast.success('Address copied!');
    }
  };

  const handleCopyReferralLink = () => {
    if (account) {
      const referralLink = `${window.location.origin}/?ref=${account}`;
      navigator.clipboard.writeText(referralLink);
      toast.success('Referral link copied!');
    }
  };

  const shortenAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 7)}...${address.slice(-6)}`;
  };

  useEffect(() => {
    console.log('Dashboard - useEffect - Account:', account, 'Provider:', provider, 'Loading:', loading);
    if (loading) return;
    if (!account) {
      console.log('No account, redirecting to /');
      router.replace('/');
      return;
    }
    console.log('Fetching data for account:', account);
    fetchUserData(account);
    fetchMonBalance(account);
  }, [account, provider, loading, router]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-black text-white animate-pulse">Loading...</div>;
  if (!account) return null;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-black to-purple-950 text-white">
      <Sidebar onDisconnect={disconnectWallet} />
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        <Toaster position="top-right" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
          <h2 className="text-xl md:text-2xl font-semibold text-purple-300">Dashboard</h2>
          <div className="ml-auto">
            <Profile account={account} onCopyAddress={handleCopyAddress} onDisconnect={disconnectWallet} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Daily Check-In */}
          <div className="bg-black/90 rounded-xl p-6 border border-purple-900 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-shadow duration-300 md:order-3">
            <h4 className="text-lg font-semibold text-purple-400 mb-4">Daily Check-In</h4>
            <div className="space-y-4">
              <p className="text-center text-gray-300 text-sm md:text-base">
                Next check-in: <span className="font-mono text-cyan-400">{countdown}</span>
              </p>
              <button
                onClick={handleDailyCheckIn}
                className="w-full bg-gradient-to-r from-purple-700 to-cyan-500 text-white py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-cyan-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                disabled={checkingIn || (lastCheckIn !== null && Date.now() - lastCheckIn < 24 * 60 * 60 * 1000)}
              >
                {checkingIn ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Checking In...
                  </span>
                ) : (
                  'Check In'
                )}
              </button>
            </div>
          </div>

          {/* Total Meow Miles */}
          <div className="bg-black/90 rounded-xl p-6 text-center border border-purple-900 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-shadow duration-300 md:order-1 md:col-span-2">
            <h3 className="text-xl md:text-2xl font-bold text-purple-400 mb-2">Total Meow Miles</h3>
            <p className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 bg-clip-text text-transparent animate-pulse-slow">
              {meowMiles.total}
            </p>
          </div>

          {/* Assets */}
          <div className="hidden md:block bg-black/90 rounded-xl p-6 border border-purple-900 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-shadow duration-300 md:order-2">
            <h4 className="text-lg font-semibold text-purple-400 mb-2">Assets</h4>
            <p className="text-xl md:text-2xl font-bold text-cyan-400">MON: {monBalance}</p>
          </div>

          {/* Score Breakdown */}
          <div className="bg-black/90 rounded-xl p-6 border border-purple-900 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-shadow duration-300 md:order-4 md:col-span-2">
            <h4 className="text-lg md:text-xl font-semibold text-purple-400 mb-4">Score Breakdown</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-purple-900/20 rounded-lg hover:bg-purple-900/30 transition-colors">
                <p className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-500 to-cyan-400 bg-clip-text text-transparent">
                  {meowMiles.quests}
                </p>
                <p className="text-sm text-gray-300">Quest Miles</p>
              </div>
              <div className="text-center p-4 bg-purple-900/20 rounded-lg hover:bg-purple-900/30 transition-colors">
                <p className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-500 to-cyan-400 bg-clip-text text-transparent">
                  {meowMiles.proposals}
                </p>
                <p className="text-sm text-gray-300">Proposal Miles</p>
              </div>
              <div className="text-center p-4 bg-purple-900/20 rounded-lg hover:bg-purple-900/30 transition-colors">
                <p className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-500 to-cyan-400 bg-clip-text text-transparent">
                  {meowMiles.games}
                </p>
                <p className="text-sm text-gray-300">Game Miles</p>
              </div>
              <div className="text-center p-4 bg-purple-900/20 rounded-lg hover:bg-purple-900/30 transition-colors">
                <p className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-500 to-cyan-400 bg-clip-text text-transparent">
                  {meowMiles.referrals}
                </p>
                <p className="text-sm text-gray-300">Referral Miles</p>
              </div>
            </div>
          </div>

          {/* Invite Friends */}
          <div className="bg-black/90 rounded-xl p-6 border border-purple-900 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-shadow duration-300 md:order-5">
            <h4 className="text-lg font-semibold text-purple-400 mb-4">Invite Friends</h4>
            <button
              onClick={handleCopyReferralLink}
              className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-700 to-cyan-500 text-white py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-cyan-400 transition-all duration-300 mb-6"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span>Copy Referral Link</span>
            </button>
            <div className="space-y-4">
              <p className="text-sm text-gray-300 font-semibold">Referred Wallets ({referralsList.length})</p>
              {referralsList.length > 0 ? (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-purple-900/50 bg-gray-900/80 shadow-inner">
                  <table className="w-full text-xs md:text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-purple-900 to-cyan-900 sticky top-0 text-white">
                        <th className="py-2 px-4 text-left font-semibold">Wallet</th>
                        <th className="py-2 px-4 text-right font-semibold">Ref #</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referralsList.map((wallet, index) => (
                        <tr
                          key={index}
                          className="border-t border-purple-900/30 hover:bg-purple-900/20 transition-colors duration-200"
                        >
                          <td className="py-3 px-4 text-cyan-400 font-mono">{shortenAddress(wallet)}</td>
                          <td className="py-3 px-4 text-right text-gray-300">{index + 1}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4 bg-gray-900/50 rounded-lg">No referrals yet.</p>
              )}
            </div>
          </div>

          {/* Badges */}
          <div className="md:col-span-2 md:order-6">
            <Badges totalMeowMiles={meowMiles.total} />
          </div>
        </div>
      </main>
    </div>
  );
}