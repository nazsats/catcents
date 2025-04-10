'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import Sidebar from '../../components/Sidebar';
import Profile from '../../components/Profile';
import confetti from 'canvas-confetti';
import { useWeb3Modal } from '../../lib/Web3ModalContext';
import toast, { Toaster } from 'react-hot-toast';

const INITIAL_QUESTS = [
  { id: 'connect_twitter', title: 'Connect Twitter', description: 'Link your Twitter account', meowMiles: 20, completed: false, icon: '🔗' },
  { id: 'connect_discord', title: 'Connect Discord', description: 'Link your Discord account', meowMiles: 20, completed: false, icon: '🎮' },
  { id: 'follow_twitter', title: 'Follow Twitter', description: 'Follow @catcentsio on Twitter', meowMiles: 15, completed: false, icon: '🐦', taskUrl: 'https://twitter.com/catcentsio' },
  { id: 'share_post', title: 'Share a Post', description: 'Tweet: I love @catcentsio 🐱', meowMiles: 25, completed: false, icon: '✍️', taskUrl: 'https://twitter.com/intent/tweet?text=I%20love%20@catcentsio%20🐱' },
  { id: 'like_rt', title: 'Like and RT', description: 'Like and retweet our post', meowMiles: 20, completed: false, icon: '❤️', taskUrl: 'https://x.com/CatCentsio/status/1829876735468564912' },
  { id: 'join_catcents_server', title: 'Join Catcents Server', description: 'Join our Discord server', meowMiles: 20, completed: false, icon: '🎉', taskUrl: 'https://discord.gg/TXPbt7ztMC' },
  { id: 'join_telegram', title: 'Join Telegram', description: 'Join our Telegram channel', meowMiles: 20, completed: false, icon: '📩', taskUrl: 'https://t.me/catcentsio' },
];

export default function QuestsPage() {
  const { account, disconnectWallet, loading } = useWeb3Modal();
  const [quests, setQuests] = useState(INITIAL_QUESTS);
  const [meowMiles, setMeowMiles] = useState(0);
  const [referrals, setReferrals] = useState(0);
  const [referralLink, setReferralLink] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [processingQuestId, setProcessingQuestId] = useState<string | null>(null);
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);

  const fetchUserData = async (address: string) => {
    setIsLoading(true);
    try {
      const userRef = doc(db, 'users', address);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        console.log('Fetched Firebase data:', data);
        const storedQuests = data.quests || {};
        setQuests(
          INITIAL_QUESTS.map((quest) => ({
            ...quest,
            completed: storedQuests[quest.id] || false,
          }))
        );
        setMeowMiles(data.meowMiles || 0);
        setReferrals(data.referrals?.length || 0);
        setReferralLink(data.referralLink || `${window.location.origin}/?ref=${address}`);
      } else {
        const newReferralLink = `${window.location.origin}/?ref=${address}`;
        await setDoc(userRef, {
          walletAddress: address,
          meowMiles: 0,
          referrals: [],
          quests: {},
          referralLink: newReferralLink,
        });
        setReferralLink(newReferralLink);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load quests. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const completeQuest = async (questId: string) => {
    if (!account) return;
    const quest = quests.find((q) => q.id === questId);
    if (!quest || quest.completed) return;

    const userRef = doc(db, 'users', account);
    const userSnap = await getDoc(userRef);
    const currentData = userSnap.exists() ? userSnap.data() : {};
    const currentQuests = currentData.quests || {};
    if (currentQuests[questId]) {
      console.log(`Quest ${questId} already completed in Firebase`);
      return;
    }

    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

    const newQuests = quests.map((q) => (q.id === questId ? { ...q, completed: true } : q));
    const newMeowMiles = (currentData.meowMiles || 0) + quest.meowMiles;

    setQuests(newQuests);
    setMeowMiles(newMeowMiles);
    setProcessingQuestId(null);

    try {
      await setDoc(
        userRef,
        {
          meowMiles: newMeowMiles,
          quests: { ...currentQuests, [questId]: true },
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Failed to complete quest:', error);
      toast.error('Failed to complete quest.');
      setQuests(quests); // Revert local state on failure
    }
  };

  const handleTaskStart = async (quest: typeof INITIAL_QUESTS[0]) => {
    if (quest.completed || processingQuestId) return;

    setProcessingQuestId(quest.id);

    if (quest.id === 'connect_twitter') {
      window.location.href = `/api/twitter/auth?walletAddress=${account}`;
    } else if (quest.id === 'connect_discord') {
      window.location.href = `/api/discord/auth?walletAddress=${account}`;
    } else if (quest.taskUrl) {
      window.open(quest.taskUrl, '_blank');
      await new Promise((resolve) => setTimeout(resolve, 10000));
      await completeQuest(quest.id);
    }
  };

  const handleCopyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Referral link copied!');
  };

  const handleCopyAddress = () => {
    if (account) {
      navigator.clipboard.writeText(account);
      toast.success('Address copied!');
    }
  };

  useEffect(() => {
    console.log('Quests useEffect - Account:', account, 'Loading:', loading, 'HasRedirected:', hasRedirected);
    if (loading) return;
    if (!account && !hasRedirected) {
      console.log('Quests - Redirecting to /');
      setHasRedirected(true);
      router.push('/');
      return;
    }

    if (account) {
      fetchUserData(account);

      const urlParams = new URLSearchParams(window.location.search);
      const success = urlParams.get('success');
      if (success) {
        if (success === 'twitter_connected') {
          toast.success('Twitter connected successfully!');
          completeQuest('connect_twitter');
        } else if (success === 'discord_connected') {
          toast.success('Discord connected successfully!');
          completeQuest('connect_discord');
        }
        router.replace('/dashboard/quests');
      }

      const error = urlParams.get('error');
      if (error === 'twitter_failed') {
        toast.error('Failed to connect Twitter.');
      } else if (error === 'discord_failed') {
        toast.error('Failed to connect Discord.');
      }
    }
  }, [account, loading, router, hasRedirected]);

  if (loading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black to-purple-950 text-white">
        <svg className="animate-spin h-8 w-8 text-purple-400" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        </svg>
      </div>
    );
  }

  if (!account) return null;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-black to-purple-950 text-white">
      <Sidebar onDisconnect={disconnectWallet} />
      <main className="flex-1 p-4 md:p-8">
        <Toaster position="top-right" toastOptions={{ style: { background: '#1a1a1a', color: '#fff', border: '1px solid #9333ea' } }} />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-purple-300">Catcents Quests</h1>
          <div className="ml-auto">
            <Profile account={account} onCopyAddress={handleCopyAddress} onDisconnect={disconnectWallet} />
          </div>
        </div>

        <div className="space-y-6 md:space-y-8">
          <div className="text-center">
            <h2 className="text-xl md:text-2xl font-semibold text-purple-400">Your Meow Miles</h2>
            <p className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 bg-clip-text text-transparent animate-pulse-slow mt-2">
              {meowMiles}
            </p>
          </div>

          <div>
            <h3 className="text-lg md:text-xl font-semibold mb-4 text-purple-400">Quests</h3>
            <div className="space-y-4">
              {quests.map((quest) => (
                <div
                  key={quest.id}
                  className="flex items-center justify-between py-2 border-b border-purple-900/50 last:border-b-0"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl md:text-3xl">{quest.icon}</span>
                    <div>
                      <p className="text-base md:text-lg font-semibold text-purple-200">{quest.title}</p>
                      <p className="text-sm text-gray-300">{quest.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
                    <p className="text-cyan-400 font-medium text-sm md:text-base">{quest.meowMiles} Miles</p>
                    <button
                      onClick={() => handleTaskStart(quest)}
                      disabled={quest.completed || processingQuestId === quest.id}
                      className={`px-3 py-1 md:px-4 md:py-2 rounded-lg font-medium text-sm md:text-base transition-all duration-200 whitespace-nowrap ${
                        quest.completed
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : processingQuestId === quest.id
                          ? 'bg-yellow-600 text-white cursor-not-allowed'
                          : 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:from-purple-500 hover:to-cyan-400'
                      }`}
                    >
                      {quest.completed
                        ? 'Completed'
                        : processingQuestId === quest.id
                        ? 'Processing'
                        : quest.id === 'connect_twitter'
                        ? 'Connect Twitter'
                        : quest.id === 'connect_discord'
                        ? 'Connect Discord'
                        : 'Start'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg md:text-xl font-semibold mb-4 text-purple-400">Refer Friends</h3>
            <div className="bg-black/90 rounded-xl p-6 border border-purple-900 shadow-md shadow-purple-500/20 hover:shadow-purple-500/40 transition-shadow duration-300">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <p className="text-base md:text-lg font-semibold text-purple-200">Invite Friends</p>
                  <p className="text-sm text-gray-300 mt-1">
                    Earn <span className="text-cyan-400 font-bold">50 Meow Miles</span> per referral! ({referrals}{' '}
                    referrals, <span className="text-cyan-400 font-bold">{referrals * 50} Miles</span> earned)
                  </p>
                </div>
                <div className="flex items-center space-x-3 w-full sm:w-auto">
                  <input
                    type="text"
                    value={referralLink}
                    readOnly
                    className="w-full sm:w-64 p-2 bg-gray-700/80 text-gray-200 rounded-lg border border-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  />
                  <button
                    onClick={handleCopyReferralLink}
                    className="flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-700 to-cyan-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-cyan-400 transition-all duration-300 whitespace-nowrap"
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
                    <span>Copy Link</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}