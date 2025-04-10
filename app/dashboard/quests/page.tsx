'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import Sidebar from '../../components/Sidebar';
import Profile from '../../components/Profile';
import confetti from 'canvas-confetti';
import { useWeb3Modal } from '../../lib/useWeb3Modal';

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
  const [message, setMessage] = useState<string | null>(null);
  const [processingQuestId, setProcessingQuestId] = useState<string | null>(null);
  const router = useRouter();

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
      setMessage('Failed to load quests.');
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

    const newQuests = quests.map((q) =>
      q.id === questId ? { ...q, completed: true } : q
    );
    const newMeowMiles = (currentData.meowMiles || 0) + quest.meowMiles;

    setQuests(newQuests);
    setMeowMiles(newMeowMiles);
    setProcessingQuestId(null);

    await setDoc(
      userRef,
      {
        meowMiles: newMeowMiles,
        quests: { ...currentQuests, [questId]: true },
      },
      { merge: true }
    );
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
    setMessage('Referral link copied!');
    setTimeout(() => setMessage(null), 2000);
  };

  useEffect(() => {
    console.log('Quests useEffect - Account:', account, 'Loading:', loading);
    if (loading) return;
    if (!account) {
      router.push('/');
      return;
    }

    fetchUserData(account);

    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    if (success) {
      if (success === 'twitter_connected') {
        setMessage('Twitter connected successfully!');
        completeQuest('connect_twitter');
      } else if (success === 'discord_connected') {
        setMessage('Discord connected successfully!');
        completeQuest('connect_discord');
      }
      router.replace('/dashboard/quests');
    }

    const error = urlParams.get('error');
    if (error === 'twitter_failed') {
      setMessage('Failed to connect Twitter.');
    } else if (error === 'discord_failed') {
      setMessage('Failed to connect Discord.');
    }
  }, [account, loading, router]);

  if (loading || isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">Loading...</div>;
  }

  if (!account) return null;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-900 to-purple-900 text-white">
      <Sidebar onDisconnect={disconnectWallet} />
      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-purple-300">Catcents Quests</h1>
          <Profile account={account} onCopyAddress={() => navigator.clipboard.writeText(account)} />
        </div>

        {message && (
          <p className={`p-4 rounded-lg mb-6 ${message.includes('success') || message.includes('copied') ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'}`}>
            {message}
          </p>
        )}

        <div className="bg-gray-800 rounded-xl p-6 shadow-lg shadow-purple-500/20">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-purple-300">Your Meow Miles</h2>
            <p className="text-4xl font-bold text-cyan-400 mt-2">{meowMiles}</p>
          </div>

          <h3 className="text-xl font-semibold mb-4 text-purple-300">Quests</h3>
          <div className="grid gap-4">
            {quests.map((quest) => (
              <div
                key={quest.id}
                className="flex items-center justify-between bg-gray-700 p-4 rounded-lg hover:bg-gray-600 transition-all duration-200"
              >
                <div className="flex items-center space-x-4">
                  <span className="text-2xl">{quest.icon}</span>
                  <div>
                    <p className="text-lg font-semibold text-purple-200">{quest.title}</p>
                    <p className="text-sm text-gray-300">{quest.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <p className="text-cyan-400 font-medium">{quest.meowMiles} Miles</p>
                  <button
                    onClick={() => handleTaskStart(quest)}
                    disabled={quest.completed || processingQuestId === quest.id}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      quest.completed
                        ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                        : processingQuestId === quest.id
                        ? 'bg-yellow-600 text-white cursor-not-allowed'
                        : 'bg-purple-600 text-white hover:bg-purple-500'
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

          <h3 className="text-xl font-semibold mt-8 mb-4 text-purple-300">Refer Friends</h3>
          <div className="bg-gray-700 p-4 rounded-lg">
            <p className="text-lg font-semibold text-purple-200">Invite Friends</p>
            <p className="text-sm text-gray-300 mb-4">
              Earn 50 Meow Miles per referral! ({referrals} referrals, {referrals * 50} Meow Miles earned)
            </p>
            <div className="flex items-center space-x-3">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="w-full p-2 bg-gray-600 text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={handleCopyReferralLink}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-all duration-200"
              >
                Copy Link
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}