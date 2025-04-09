import { Suspense } from 'react';
import QuestContent from '../quests/QuestContent';

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
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">Loading Quests...</div>}>
      <QuestContent initialQuests={INITIAL_QUESTS} />
    </Suspense>
  );
}