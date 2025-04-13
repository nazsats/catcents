'use client';
import { useEffect, useState } from 'react';
import { ethers } from 'ethers'; // ethers v6
import { useWeb3Modal } from '../lib/Web3ModalContext';
import { db } from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';
import Image from 'next/image';
import { useQueryClient } from '@tanstack/react-query';

interface Badge {
  milestone: number;
  name: string;
  icon: string;
}

interface BadgesProps {
  totalMeowMiles: number;
}

const contractAddress = '0x64Dc82da10b09ECE5ab77d9432c42fB3745DcA37';
const contractABI = [
  'function claimBadge(uint256 milestone) external',
  'event BadgeClaimed(address indexed user, uint256 milestone, uint256 timestamp)',
];
const MONAD_TESTNET_CHAIN_ID = '0x279f'; // Hex for 10143

export default function Badges({ totalMeowMiles }: BadgesProps) {
  const { account, provider: wagmiProvider, loading, selectedWallet } = useWeb3Modal();
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
  const [claimedBadges, setClaimedBadges] = useState<number[]>([]);
  const [isClaiming, setIsClaiming] = useState<{ [key: number]: boolean }>({});
  const [isMobile, setIsMobile] = useState(false);
  const queryClient = useQueryClient();

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

  // Detect mobile device
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    setIsMobile(mobileRegex.test(userAgent));
  }, []);

  // Convert Wagmi provider to Ethers.js provider
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
        provider = wagmiProvider;
      }
      return new ethers.BrowserProvider(provider);
    } catch (error) {
      console.error('Failed to create Ethers.js provider:', error);
      return null;
    }
  };

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
    const eligibleBadges = badgeMilestones.filter((badge) => totalMeowMiles >= badge.milestone);
    setEarnedBadges(eligibleBadges);

    if (account) {
      fetchClaimedBadges();
    }
  }, [totalMeowMiles, account]);

  const handleClaimBadge = async (milestone: number) => {
    if (!account || !wagmiProvider) {
      toast.error('Wallet not ready. Please connect and try again.');
      return;
    }

    setIsClaiming((prev) => ({ ...prev, [milestone]: true }));
    const pendingToast = toast.loading(`Claiming ${milestone} MeowMiles badge...`);

    try {
      // Validate address
      console.log('Raw contract address:', JSON.stringify(contractAddress));
      console.log('Address length:', contractAddress.length);
      console.log('Character codes:', contractAddress.split('').map((c) => c.charCodeAt(0)));

      if (contractAddress.length !== 42) {
        throw new Error(`Invalid contract address length: ${contractAddress.length} (expected 42)`);
      }
      if (!/^0x[0-9a-fA-F]{40}$/.test(contractAddress)) {
        throw new Error('Contract address contains invalid characters');
      }

      console.log('Using contract address:', contractAddress);

      const ethersProvider = await getEthersProvider();
      if (!ethersProvider) {
        throw new Error('Ethers.js provider not available');
      }

      // Check network
      const network = await ethersProvider.getNetwork();
      console.log('Current network chain ID:', network.chainId.toString());

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
                  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
                  blockExplorerUrls: ['https://testnet.monadscan.com'],
                },
              ],
            });
          } else {
            throw new Error('Failed to switch to Monad Testnet. Please switch networks manually.');
          }
        }
      }

      const updatedNetwork = await ethersProvider.getNetwork();
      if (updatedNetwork.chainId.toString() !== '10143') {
        throw new Error('Network verification failed. Please ensure you are on Monad Testnet.');
      }

      const signer = await ethersProvider.getSigner();
      console.log('Signer address:', await signer.getAddress());

      // Use ethers.Contract
      const contract = new ethers.Contract(contractAddress, contractABI, signer);

      // Log encoded data
      const iface = new ethers.Interface(contractABI);
      const data = iface.encodeFunctionData('claimBadge', [milestone]);
      console.log('Encoded transaction data:', data);
      console.log('Claiming milestone:', milestone);

      // Set gas parameters
      const gasLimit = 100000; // Increased to handle potential complexity
      console.log('Gas limit:', gasLimit);

      // Simulate transaction
      try {
        await ethersProvider.call({
          to: contractAddress,
          data,
          from: account,
        });
        console.log('Simulation successful');
      } catch (simError: any) {
        console.error('Simulation failed:', simError);
        throw new Error(`Transaction will fail: ${simError.reason || simError.message || 'Unknown reason'}`);
      }

      const tx = await contract.claimBadge(milestone, { gasLimit });
      console.log('Transaction sent:', tx.hash);

      const receipt = await tx.wait();
      if (!receipt || receipt.status === 0) {
        throw new Error('Transaction failed or no receipt received');
      }
      const txHash = receipt.hash;
      console.log('Transaction confirmed:', txHash);

      // Update Firebase
      const userRef = doc(db, 'users', account);
      const userSnap = await getDoc(userRef);
      const existingClaims = userSnap.exists() ? userSnap.data().claimedBadges || [] : [];
      const updatedClaims = [...new Set([...existingClaims, milestone])];
      await setDoc(userRef, { claimedBadges: updatedClaims }, { merge: true });

      queryClient.invalidateQueries({ queryKey: ['userData', account] });

      toast.dismiss(pendingToast);
      toast.success(
        <div>
          Badge claimed successfully!{' '}
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

      setClaimedBadges(updatedClaims);
    } catch (error: any) {
      console.error('Failed to claim badge:', error);
      toast.dismiss(pendingToast);
      if (error.message.includes('insufficient funds')) {
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
              onClick={() => handleClaimBadge(milestone)}
              className="underline text-cyan-400 hover:text-cyan-300"
            >
              Retry
            </button>
          </div>,
          { duration: 10000 }
        );
      } else if (error.code === 'CALL_EXCEPTION' || error.message.includes('revert')) {
        toast.error(
          `Badge claim failed: ${error.reason || 'Badge may already be claimed or milestone is invalid.'}`,
          { duration: 5000 }
        );
      } else {
        toast.error('Failed to claim badge: ' + error.message, { duration: 5000 });
      }
    } finally {
      setIsClaiming((prev) => ({ ...prev, [milestone]: false }));
    }
  };

  // Check for no wallet or mobile browser
  if (!wagmiProvider || isMobile) {
    return (
      <div className="bg-black/90 rounded-xl p-6 border border-purple-900 shadow-lg shadow-purple-500/30 text-center">
        <h4 className="text-lg md:text-xl font-semibold text-purple-400 mb-4">Badges Unavailable</h4>
        <p className="text-gray-300 text-sm md:text-base">
          For the best experience, please use a desktop browser with a wallet installed (e.g., MetaMask, Phantom, or Backpack) or a wallet dApp.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-black/90 rounded-xl p-6 border border-purple-900 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-shadow duration-300">
      <style>{`
        @keyframes glow-pulse {
          0% {
            box-shadow: 0 0 5px rgba(147, 51, 234, 0.5), 0 0 10px rgba(147, 51, 234, 0.3);
          }
          50% {
            box-shadow: 0 0 15px rgba(147, 51, 234, 0.8), 0 0 20px rgba(6, 182, 212, 0.5);
          }
          100% {
            box-shadow: 0 0 5px rgba(147, 51, 234, 0.5), 0 0 10px rgba(147, 51, 234, 0.3);
          }
        }
        .badge-container {
          position: relative;
          overflow: hidden;
          border-radius: 1rem;
          transition: transform 0.3s ease;
        }
        .badge-container:hover {
          transform: scale(1.05);
        }
        .badge-container::before {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 1rem;
          background: linear-gradient(45deg, rgba(147, 51, 234, 0.7), rgba(6, 182, 212, 0.7));
          z-index: -1;
          animation: glow-pulse 2s infinite;
        }
        .claimed::before {
          animation: glow-pulse 1.5s infinite;
        }
        .locked {
          opacity: 0.6;
        }
        .overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          align-items: center;
          padding: 0.5rem;
          color: white;
        }
        .overlay-text {
          background: rgba(0, 0, 0, 0.7);
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          width: 100%;
          text-align: center;
        }
      `}</style>
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
              className={`badge-container ${isClaimed ? 'claimed' : ''} ${!isEligible && !isClaimed ? 'locked' : ''}`}
            >
              <Image
                src={badge.icon}
                alt={badge.name}
                width={150}
                height={200}
                className={`w-full h-48 object-cover rounded-lg ${isClaimed ? '' : 'grayscale'}`}
              />
              <div className="overlay">
                <div className="mt-auto overlay-text">
                  <p className="text-sm md:text-base font-semibold text-purple-400">{badge.name}</p>
                  <p className="text-xs text-cyan-400">{badge.milestone.toLocaleString()} Meow Miles</p>
                </div>
                <div className="mt-2">
                  {!isClaimed && isEligible && (
                    <button
                      onClick={() => handleClaimBadge(badge.milestone)}
                      disabled={isClaimingBadge}
                      className={`px-4 py-1 text-sm font-semibold text-white rounded-full transition-all duration-200 ${
                        isClaimingBadge
                          ? 'bg-gray-600 cursor-not-allowed'
                          : 'bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 hover:scale-105'
                      }`}
                    >
                      {isClaimingBadge ? 'Claiming...' : 'Claim'}
                    </button>
                  )}
                  {!isClaimed && !isEligible && (
                    <span className="text-xs font-bold text-white bg-gray-800 px-2 py-1 rounded-full shadow-md">
                      LOCKED
                    </span>
                  )}
                  {isClaimed && (
                    <span className="text-xs font-bold text-green-400 bg-gray-800 px-2 py-1 rounded-full shadow-md">
                      CLAIMED
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}