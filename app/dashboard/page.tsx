'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers'; // ethers v6
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, increment } from 'firebase/firestore';
import Sidebar from '../components/Sidebar';
import Profile from '../components/Profile';
import Badges from '../components/Badges';
import { useWeb3Modal } from '../lib/Web3ModalContext';
import toast, { Toaster } from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

export default function DashboardPage() {
  const { account, provider: wagmiProvider, disconnectWallet, loading, selectedWallet } = useWeb3Modal();
  const [meowMiles, setMeowMiles] = useState({ quests: 0, proposals: 0, games: 0, referrals: 0, total: 0 });
  const [monBalance, setMonBalance] = useState<string>('0');
  const [lastCheckIn, setLastCheckIn] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<string>('24:00:00');
  const [checkingIn, setCheckingIn] = useState(false);
  const [referralsList, setReferralsList] = useState<string[]>([]);
  const [providerReady, setProviderReady] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const MONAD_TESTNET_CHAIN_ID = '0x279f'; // Hex for 10143
  const CHECK_IN_ADDRESS = '0xfF8b7625894441C26fEd460dD21360500BF4E767'; // Target address for 0 MON transfer

  // Convert Wagmi provider to Ethers.js provider (ethers v6)
  const getEthersProvider = async () => {
    if (!wagmiProvider) {
      console.error('Wagmi provider not available');
      return null;
    }
    try {
      let provider;
      const win = window as Window & { phantom?: { ethereum?: any }; backpack?: { ethereum?: any } };
      if (selectedWallet === 'phantom' && win.phantom?.ethereum) {
        provider = win.phantom.ethereum;
      } else if (selectedWallet === 'backpack' && (win.backpack?.ethereum || wagmiProvider.isBackpack)) {
        provider = win.backpack?.ethereum || wagmiProvider;
      } else if (selectedWallet === 'metaMask' && wagmiProvider.isMetaMask) {
        provider = wagmiProvider;
      } else {
        provider = wagmiProvider; // Fallback
      }
      return new ethers.BrowserProvider(provider);
    } catch (error) {
      console.error('Failed to create Ethers.js provider:', error);
      return null;
    }
  };

  // Fetch user data with React Query
  const fetchUserData = async (address: string) => {
    console.log('fetchUserData called with address:', address);
    const userRef = doc(db, 'users', address);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      console.log('Firebase data:', data);
      return {
        quests: Math.floor(data.meowMiles || 0),
        proposals: Math.floor(data.proposalsGmeow || 0),
        games: Math.floor(data.gamesGmeow || 0),
        referrals: Math.floor(data.referrals?.length || 0),
        total: Math.floor((data.meowMiles || 0) + (data.proposalsGmeow || 0) + (data.gamesGmeow || 0) + (data.referrals?.length || 0)),
        lastCheckIn: data.lastCheckIn || null,
        referralsList: data.referrals || [],
      };
    }
    return null;
  };

  const { data: userData, isLoading: userDataLoading } = useQuery({
    queryKey: ['userData', account],
    queryFn: () => fetchUserData(account!),
    enabled: !!account,
  });

  useEffect(() => {
    if (userData) {
      setMeowMiles({
        quests: userData.quests,
        proposals: userData.proposals,
        games: userData.games,
        referrals: userData.referrals,
        total: userData.total,
      });
      setLastCheckIn(userData.lastCheckIn);
      setReferralsList(userData.referralsList);
      if (userData.lastCheckIn) startCountdown(userData.lastCheckIn);
    }
  }, [userData]);

  // Fetch MON balance
  const fetchMonBalance = async (address: string) => {
    console.log('fetchMonBalance called with address:', address);
    try {
      const ethersProvider = await getEthersProvider();
      if (!ethersProvider) {
        throw new Error('Ethers.js provider not available');
      }
      const balance = await ethersProvider.getBalance(address);
      console.log('Raw MON balance:', balance.toString());
      setMonBalance(ethers.formatEther(balance).slice(0, 6));
    } catch (error) {
      console.error('Failed to fetch MON balance:', error);
      setMonBalance('N/A');
      toast.error('Unable to fetch MON balance');
    }
  };

  // Handle daily check-in
  const handleDailyCheckIn = async () => {
    if (!account || !wagmiProvider || checkingIn) {
      toast.error('Please ensure a wallet is connected and ready.');
      return;
    }
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    if (lastCheckIn && now - lastCheckIn < oneDay) {
      toast.error('Check-in not available yet.');
      return;
    }

    setCheckingIn(true);
    const pendingToast = toast.loading('Processing check-in...');
    try {
      const ethersProvider = await getEthersProvider();
      if (!ethersProvider) {
        throw new Error('Ethers.js provider not available');
      }

      // Check current network
      const network = await ethersProvider.getNetwork();
      console.log('Current network chain ID:', network.chainId.toString());

      // Only switch if not on Monad Testnet
      if (network.chainId.toString() !== '10143') {
        console.log('Switching to Monad Testnet...');
        try {
          await wagmiProvider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: MONAD_TESTNET_CHAIN_ID }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            console.log('Adding Monad Testnet to wallet...');
            await wagmiProvider.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: MONAD_TESTNET_CHAIN_ID,
                  chainName: 'Monad Testnet',
                  rpcUrls: ['https://testnet-rpc.monad.xyz'],
                  nativeCurrency: {
                    name: 'MON',
                    symbol: 'MON',
                    decimals: 18,
                  },
                  blockExplorerUrls: ['https://testnet.monadscan.com'],
                },
              ],
            });
          } else {
            throw new Error('Failed to switch to Monad Testnet. Please switch networks manually in your wallet.');
          }
        }
      }

      // Verify network after potential switch
      const updatedNetwork = await ethersProvider.getNetwork();
      if (updatedNetwork.chainId.toString() !== '10143') {
        throw new Error('Network verification failed. Please ensure you are on Monad Testnet.');
      }

      const signer = await ethersProvider.getSigner();
      console.log('Signer address:', await signer.getAddress());

      // Validate check-in address
      console.log('Check-in address:', CHECK_IN_ADDRESS);
      console.log('Check-in address length:', CHECK_IN_ADDRESS.length);
      if (CHECK_IN_ADDRESS.length !== 42 || !/^0x[0-9a-fA-F]{40}$/.test(CHECK_IN_ADDRESS)) {
        throw new Error('Invalid check-in address');
      }

      // Check balance
      const balance = await ethersProvider.getBalance(account);
      console.log('Account balance:', ethers.formatEther(balance));
      if (balance === BigInt(0)) {
        throw new Error('Insufficient MON balance. Please claim testnet tokens from the Monad faucet.');
      }

      // Estimate gas
      const gasLimit = 21000; // Simple transfer
      console.log('Gas limit:', gasLimit);

      // Send 0 MON transaction
      const tx = await signer.sendTransaction({
        to: CHECK_IN_ADDRESS,
        value: 0,
        gasLimit,
      });

      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      if (!receipt) throw new Error('Transaction receipt not received');
      const txHash = receipt.hash;
      console.log('Transaction confirmed:', txHash);

      // Update Firebase
      const userRef = doc(db, 'users', account);
      await setDoc(userRef, { lastCheckIn: now, meowMiles: increment(10) }, { merge: true });

      setLastCheckIn(now);
      startCountdown(now);
      queryClient.invalidateQueries({ queryKey: ['userData', account] });

      toast.dismiss(pendingToast);
      toast.success(
        <div>
          Check-in completed! You earned 10 MeowMiles.{' '}
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
    } catch (error: any) {
      console.error('Daily check-in failed:', error);
      toast.dismiss(pendingToast);
      if (error.message.includes('insufficient funds') || error.message.includes('Insufficient MON balance')) {
        toast.error(
          <div>
            Insufficient MON balance.{' '}
            <a
              href="https://testnet.monad.xyz/faucet"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-cyan-400 hover:text-cyan-300"
            >
              Claim MON tokens
            </a>
          </div>,
          { duration: 5000 }
        );
      } else if (error.message.includes('Failed to switch to Monad Testnet')) {
        toast.error(
          <div>
            {error.message}{' '}
            <button
              onClick={() => !checkingIn && handleDailyCheckIn()}
              className="underline text-cyan-400 hover:text-cyan-300"
            >
              Retry
            </button>
          </div>,
          { duration: 10000 }
        );
      } else if (error.code === 'CALL_EXCEPTION' || error.message.includes('revert')) {
        toast.error('Transaction failed. Please try again.', { duration: 5000 });
      } else {
        toast.error('Failed to check-in: ' + error.message, { duration: 5000 });
      }
    } finally {
      setCheckingIn(false);
    }
  };

  // Countdown logic
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
    console.log('Dashboard - useEffect - Account:', account, 'Provider:', wagmiProvider, 'Loading:', loading, 'Selected Wallet:', selectedWallet);
    if (loading || !account) {
      if (!account && !loading) {
        console.log('No account, redirecting to /');
        router.replace('/');
      }
      return;
    }

    if (!wagmiProvider) {
      console.log('Provider not yet available, waiting...');
      const interval = setInterval(() => {
        if (wagmiProvider) {
          console.log('Provider now available:', wagmiProvider);
          setProviderReady(true);
          clearInterval(interval);
        }
      }, 500);
      return () => clearInterval(interval);
    }

    setProviderReady(true);
    if (account) {
      fetchMonBalance(account);
    }
  }, [account, wagmiProvider, loading, router]);

  if (userDataLoading || loading || !providerReady) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-black to-purple-950 text-white">
        <Sidebar onDisconnect={disconnectWallet} />
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton height={200} className="rounded-xl" />
            <Skeleton height={200} className="rounded-xl" />
            <Skeleton height={200} className="rounded-xl" />
          </div>
        </main>
      </div>
    );
  }
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