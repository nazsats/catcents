'use client';
import { useEffect, useState } from 'react';

interface Badge {
  milestone: number;
  name: string;
  icon: string; // Placeholder for now, will be replaced with /public/badges path
}

interface BadgesProps {
  totalMeowMiles: number;
}

export default function Badges({ totalMeowMiles }: BadgesProps) {
  const badgeMilestones: Badge[] = [
    { milestone: 500, name: 'Bronze Paw', icon: '🏆' },
    { milestone: 1000, name: 'Silver Claw', icon: '🥈' },
    { milestone: 2000, name: 'Gold Whisker', icon: '🥇' },
    { milestone: 5000, name: 'Platinum Tail', icon: '✨' },
    { milestone: 10000, name: 'Diamond Meow', icon: '💎' },
    { milestone: 50000, name: 'Epic Cat', icon: '🐱' },
    { milestone: 1000000, name: 'Legendary Purr', icon: '🌟' },
    { milestone: 5000000, name: 'Mythic Feline', icon: '🔥' },
    { milestone: 10000000, name: 'Cosmic Kitty', icon: '🚀' },
  ];

  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);

  useEffect(() => {
    const earned = badgeMilestones.filter((badge) => totalMeowMiles >= badge.milestone);
    setEarnedBadges(earned);
  }, [totalMeowMiles]);

  return (
    <div className="bg-black/90 rounded-xl p-6 border border-purple-900 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-shadow duration-300">
      <h4 className="text-lg md:text-xl font-semibold text-purple-400 mb-4">Your Badges</h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {badgeMilestones.map((badge) => {
          const isEarned = earnedBadges.some((earned) => earned.milestone === badge.milestone);
          return (
            <div
              key={badge.milestone}
              className={`flex flex-col items-center p-4 rounded-lg transition-colors ${
                isEarned
                  ? 'bg-purple-900/20 hover:bg-purple-900/30'
                  : 'bg-gray-900/50 opacity-60 hover:bg-gray-900/70'
              }`}
            >
              <span className={`text-3xl ${isEarned ? '' : 'text-gray-500'}`}>{badge.icon}</span>
              <p
                className={`text-sm md:text-base font-semibold mt-2 ${
                  isEarned ? 'text-purple-400' : 'text-gray-500'
                }`}
              >
                {badge.name}
              </p>
              <p className={`text-xs ${isEarned ? 'text-gray-300' : 'text-gray-500'}`}>
                {badge.milestone} Miles
              </p>
              {!isEarned && (
                <span className="mt-1 text-xs font-bold text-white bg-gray-800 px-2 py-1 rounded-full shadow-md">
                  LOCKED
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}