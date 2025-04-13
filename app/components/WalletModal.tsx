'use client';
import { useState, useEffect } from 'react';
import { useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import toast from 'react-hot-toast';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface WalletInfo {
  id: string;
  name: string;
  icon: string;
  connector: any;
  isInstalled: boolean;
  installUrl: string;
}

export default function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { connect } = useConnect();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [preferredWallet, setPreferredWallet] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect mobile device
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    setIsMobile(mobileRegex.test(userAgent));

    const detectWallets = () => {
      const win = window as Window & { phantom?: { ethereum?: any }; backpack?: { ethereum?: any } };
      const walletList: WalletInfo[] = [
        {
          id: 'metaMask',
          name: 'MetaMask',
          icon: '/wallets/metamask.jpg',
          connector: injected({
            target: {
              id: 'metaMask',
              name: 'MetaMask',
              provider: () => (win.ethereum?.isMetaMask ? win.ethereum : undefined),
            },
          }),
          isInstalled: typeof window !== 'undefined' && !!win.ethereum?.isMetaMask,
          installUrl: 'https://metamask.io/download/',
        },
        {
          id: 'phantom',
          name: 'Phantom',
          icon: '/wallets/phantom.jpg',
          connector: injected({
            target: {
              id: 'phantom',
              name: 'Phantom',
              provider: () => win.phantom?.ethereum,
            },
          }),
          isInstalled: typeof window !== 'undefined' && !!win.phantom?.ethereum,
          installUrl: 'https://phantom.app/download',
        },
        {
          id: 'backpack',
          name: 'Backpack',
          icon: '/wallets/backpack.jpg',
          connector: injected({
            target: {
              id: 'backpack',
              name: 'Backpack',
              provider: () => win.backpack?.ethereum || (win.ethereum?.isBackpack ? win.ethereum : undefined),
            },
          }),
          isInstalled: typeof window !== 'undefined' && (win.backpack?.ethereum || win.ethereum?.isBackpack),
          installUrl: 'https://www.backpack.app/downloads',
        },
        {
          id: 'haha',
          name: 'Haha Wallet',
          icon: '/wallets/haha.jpg',
          connector: injected({
            target: {
              id: 'haha',
              name: 'Haha Wallet',
              provider: () => (win.ethereum?.isHahaWallet ? win.ethereum : undefined),
            },
          }),
          isInstalled: typeof window !== 'undefined' && !!win.ethereum?.isHahaWallet,
          installUrl: 'https://www.haha.me/',
        },
        {
          id: 'rabby',
          name: 'Rabby Wallet',
          icon: '/wallets/rabby.jpg',
          connector: injected({
            target: {
              id: 'rabby',
              name: 'Rabby Wallet',
              provider: () => (win.ethereum?.isRabby ? win.ethereum : undefined),
            },
          }),
          isInstalled: typeof window !== 'undefined' && !!win.ethereum?.isRabby,
          installUrl: 'https://rabby.io/',
        },
      ];

      setWallets(walletList);

      // Auto-detect preferred wallet
      if (win.phantom?.ethereum) {
        setPreferredWallet('phantom');
      } else if (win.backpack?.ethereum || win.ethereum?.isBackpack) {
        setPreferredWallet('backpack');
      } else if (win.ethereum?.isMetaMask) {
        setPreferredWallet('metaMask');
      } else if (win.ethereum?.isHahaWallet) {
        setPreferredWallet('haha');
      } else if (win.ethereum?.isRabby) {
        setPreferredWallet('rabby');
      }
    };

    detectWallets();
  }, []);

  const handleConnect = async (walletId: string, connector: any) => {
    setConnecting(walletId);
    try {
      await connect({ connector });
      toast.success(`Connected to ${walletId}`);
      onClose();
    } catch (error: any) {
      console.error(`Failed to connect with ${walletId}:`, error);
      if (error.code === 4001) {
        toast.error('Connection rejected by user');
      } else {
        toast.error(`Failed to connect to ${walletId}: ${error.message}`, { duration: 6000 });
      }
    } finally {
      setConnecting(null);
    }
  };

  if (!isOpen) return null;

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
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
          .modal-container {
            position: relative;
            border-radius: 1rem;
          }
          .modal-container::before {
            content: '';
            position: absolute;
            inset: -2px;
            border-radius: 1rem;
            background: linear-gradient(45deg, rgba(147, 51, 234, 0.7), rgba(6, 182, 212, 0.7));
            z-index: -1;
            animation: glow-pulse 2s infinite;
          }
        `}</style>
        <div className="absolute inset-0 bg-black/75" onClick={onClose}></div>
        <div className="modal-container relative bg-gradient-to-br from-black to-purple-950 rounded-2xl p-6 max-w-md w-full shadow-lg">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-cyan-400 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-2xl md:text-3xl font-bold text-purple-300 mb-6 text-center">Connect Your Wallet</h2>
          <p className="text-gray-300 text-sm text-center mb-4">
            Wallet connections are not supported in mobile browsers. Please use a desktop browser with a wallet extension
            (e.g., MetaMask, Phantom) or your wallet's in-app browser.
          </p>
          <div className="mt-6 text-center">
            <a
              href="https://catcents.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 text-sm font-semibold hover:underline"
            >
              Powered by Catcents.io
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
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
        .modal-container {
          position: relative;
          border-radius: 1rem;
        }
        .modal-container::before {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 1rem;
          background: linear-gradient(45deg, rgba(147, 51, 234, 0.7), rgba(6, 182, 212, 0.7));
          z-index: -1;
          animation: glow-pulse 2s infinite;
        }
      `}</style>
      <div className="absolute inset-0 bg-black/75" onClick={onClose}></div>
      <div className="modal-container relative bg-gradient-to-br from-black to-purple-950 rounded-2xl p-6 max-w-md w-full shadow-lg">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-cyan-400 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="text-2xl md:text-3xl font-bold text-purple-300 mb-6 text-center">Connect Your Wallet</h2>
        <div className="space-y-3">
          {wallets.map((wallet) => (
            <div key={wallet.id} className="flex items-center">
              {wallet.isInstalled ? (
                <button
                  onClick={() => handleConnect(wallet.id, wallet.connector)}
                  disabled={connecting === wallet.id}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${
                    preferredWallet === wallet.id
                      ? 'bg-gradient-to-r from-purple-600 to-cyan-500'
                      : 'bg-[#2d2d2d]'
                  } text-white hover:bg-gradient-to-r hover:from-purple-500 hover:to-cyan-400 disabled:opacity-50 hover:scale-105`}
                >
                  <span className="text-sm md:text-base font-semibold">
                    {connecting === wallet.id ? 'Connecting...' : wallet.name}
                  </span>
                  <img
                    src={wallet.icon}
                    alt={wallet.name}
                    className="w-8 h-8 rounded-full object-cover"
                    onError={(e) => (e.currentTarget.src = '/wallets/fallback.jpg')}
                  />
                </button>
              ) : (
                <div className="w-full flex items-center justify-between bg-[#2d2d2d] text-gray-400 px-4 py-3 rounded-lg opacity-60">
                  <span className="text-sm md:text-base">{wallet.name} (Not Installed)</span>
                  <a
                    href={wallet.installUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 text-sm hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Install
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <a
            href="https://catcents.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 text-sm font-semibold hover:underline"
          >
            Powered by Catcents.io
          </a>
        </div>
      </div>
    </div>
  );
}