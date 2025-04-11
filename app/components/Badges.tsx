'use client';
import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { useWeb3Modal } from '../lib/Web3ModalContext'; // Adjust path as needed
import { db } from '../lib/firebase'; // Adjust path as needed
import { doc, setDoc, getDoc } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';
import Image from 'next/image';

interface Badge {
  milestone: number;
  name: string;
  icon: string; // Path to badge image in /public/badges/
}

interface BadgesProps {
  totalMeowMiles: number;
}

const contractAddress = '0x64Dc82da10b09ECE5ab77d9432c42fFB3745DcA37'; // Replace with actual deployed address on Monad
const contractABI = [
  'function claimBadge(uint256 milestone) external',
  'event BadgeClaimed(address indexed user, uint256 milestone, uint256 timestamp)',
];

export default function Badges({ totalMeowMiles }: BadgesProps) {
  const { account, provider, loading } = useWeb3Modal();
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
  const [claimedBadges, setClaimedBadges] = useState<number[]>([]);
  const [isClaiming, setIsClaiming] = useState<{ [key: number]: boolean }>({});

  const badgeMilestones: Badge[] = [
    { milestone: 500, name: 'Whisker Initiate', icon: '/badges/whisker.png' },
    { milestone: 1000, name: 'Pawthfinder', icon: '/badges/pawthfinder.png' },
    { milestone: 2000, name: 'Claw Collector', icon: '/badges/claw.png' },
    { milestone: 5000, name: 'Yarnmaster', icon: '/badges/yarnmaster.png' },
    { milestone: 10000, name: 'Alley Alpha', icon: '/badges/alley.png' },
    { milestone: 50000, name: 'Shadow Stalker', icon: '/badges/shadow.png' },
    { milestone: 100000, name: 'Furion Elite', icon: '/badges/furion.png' },
    { milestone: 500000, name: 'Mythic Pouncer', icon: '/badges/mythic.png' },
    { milestone: 10000000, name: 'Catcents Legend', icon: '/badges/catcentslegend.png' },
  ];

  // Fetch claimed badges from Firebase
  const fetchClaimedBadges = async () => {
    if (!account) return;

    try {
      const userRef = doc(db, 'users', account);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        const claimed = data.claimedBadges || [];
        setClaimedBadges(claimed);
      }
    } catch (error) {
      console.error('Failed to fetch claimed badges from Firebase:', error);
      toast.error('Failed to load claimed badges.');
    }
  };

  useEffect(() => {
    // Filter badges user is eligible for based on totalMeowMiles
    const eligibleBadges = badgeMilestones.filter((badge) => totalMeowMiles >= badge.milestone);
    setEarnedBadges(eligibleBadges);

    if (account) {
      fetchClaimedBadges();
    }
  }, [totalMeowMiles, account]);

  const handleClaimBadge = async (milestone: number) => {
    if (!account || !provider) {
      toast.error('Please connect your wallet');
      return;
    }

    setIsClaiming((prev) => ({ ...prev, [milestone]: true }));

    try {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);

      const tx = await contract.claimBadge(milestone);
      const pendingToast = toast.loading(`Claiming ${milestone} MeowMiles badge...`);
      const receipt = await tx.wait();

      // Store the claimed badge in Firebase
      const userRef = doc(db, 'users', account);
      const userSnap = await getDoc(userRef);
      const existingClaims = userSnap.exists() ? userSnap.data().claimedBadges || [] : [];
      const updatedClaims = [...new Set([...existingClaims, milestone])]; // Avoid duplicates
      await setDoc(userRef, { claimedBadges: updatedClaims }, { merge: true });

      toast.dismiss(pendingToast);
      toast.success(
        <div>
          Badge claimed successfully!{' '}
          <a href={`https://testnet.monadexplorer.com/tx/${receipt.hash}`} target="_blank" rel="noopener noreferrer" className="underline text-cyan-400">
            View on Explorer
          </a>
        </div>,
        { duration: 5000 }
      );

      setClaimedBadges(updatedClaims);
    } catch (error) {
      console.error('Failed to claim badge:', error);
      toast.error('Failed to claim badge: ' + (error as Error).message);
    } finally {
      setIsClaiming((prev) => ({ ...prev, [milestone]: false }));
    }
  };

  return (
    <div className="bg-black/90 rounded-xl p-6 border border-purple-900 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-shadow duration-300">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1a1a1a', color: '#fff', border: '1px solid #9333ea' } }} />
      <h4 className="text-lg md:text-xl font-semibold text-purple-400 mb-6">Your Badges</h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {badgeMilestones.map((badge) => {
          const isEligible = earnedBadges.some((earned) => earned.milestone === badge.milestone);
          const isClaimed = claimedBadges.includes(badge.milestone);
          const isClaimingBadge = isClaiming[badge.milestone];

          return (
            <div
              key={badge.milestone}
              className={`flex flex-col items-center p-4 rounded-lg transition-all duration-300 ${
                isClaimed
                  ? 'bg-purple-900/20 hover:bg-purple-900/30'
                  : isEligible
                  ? 'bg-gray-800/50 hover:bg-gray-700/50 hover:-translate-y-1'
                  : 'bg-gray-900/50 opacity-60 hover:bg-gray-900/70'
              }`}
            >
              <Image
                src={badge.icon}
                alt={badge.name}
                width={64}
                height={64}
                className={`w-16 h-16 object-contain ${isClaimed ? '' : 'grayscale'}`}
              />
              <p
                className={`text-sm md:text-base font-semibold mt-3 ${
                  isClaimed ? 'text-purple-400' : 'text-gray-500'
                }`}
              >
                {badge.name}
              </p>
              <p className={`text-xs ${isClaimed ? 'text-gray-300' : 'text-gray-500'}`}>
                {badge.milestone.toLocaleString()} MeowMiles
              </p>
              {!isClaimed && isEligible && (
                <button
                  onClick={() => handleClaimBadge(badge.milestone)}
                  disabled={isClaimingBadge}
                  className={`mt-3 px-4 py-1 text-sm font-semibold text-white rounded-full transition-all duration-200 ${
                    isClaimingBadge
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 hover:scale-105'
                  }`}
                >
                  {isClaimingBadge ? 'Claiming...' : 'Claim'}
                </button>
              )}
              {!isClaimed && !isEligible && (
                <span className="mt-2 text-xs font-bold text-white bg-gray-800 px-2 py-1 rounded-full shadow-md">
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