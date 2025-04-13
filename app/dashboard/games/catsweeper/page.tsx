'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc, runTransaction, increment } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useWeb3Modal } from '../../../lib/Web3ModalContext';
import { ethers } from 'ethers';
import Sidebar from '../../../components/Sidebar';
import Profile from '../../../components/Profile';
import toast, { Toaster } from 'react-hot-toast';

const GRID_SIZE = 10;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
const TOTAL_MINES = 8;
const INITIAL_BET = 0.01; // 0.01 MON

const contractAddress = '0x27DF24e9Ed3F256FE4Eea32311848F5a978Ab96e';
const contractABI = [
  'function placeBet() external payable',
  'function withdrawFunds() external',
  'function getContractBalance() external view returns (uint256)',
  'event BetPlaced(address indexed player, uint256 amount, uint256 timestamp)',
];

const catEmojis = ['😺', '🐱', '🐾', '🐈', '😻', '🙀', '🐯', '🦁', '🐰', '🐾'];
const MONAD_TESTNET_CHAIN_ID = '0x279f'; // Hex for 10143

export default function Minesweeper() {
  const { account, disconnectWallet, loading, provider: wagmiProvider, selectedWallet } = useWeb3Modal();
  const [grid, setGrid] = useState<any[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [points, setPoints] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [isCashout, setIsCashout] = useState(false);
  const [isBetting, setIsBetting] = useState(false);
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);

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

  const initializeGrid = () => {
    const newGrid = Array.from({ length: GRID_SIZE }, () =>
      Array.from({ length: GRID_SIZE }, () => ({
        isMine: false,
        isRevealed: false,
        isFlagged: false,
        adjacentMines: 0,
      }))
    );

    let minesPlaced = 0;
    while (minesPlaced < TOTAL_MINES) {
      const row = Math.floor(Math.random() * GRID_SIZE);
      const col = Math.floor(Math.random() * GRID_SIZE);
      if (!newGrid[row][col].isMine) {
        newGrid[row][col].isMine = true;
        minesPlaced++;
      }
    }

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (!newGrid[row][col].isMine) {
          let count = 0;
          for (let r = -1; r <= 1; r++) {
            for (let c = -1; c <= 1; c++) {
              const newRow = row + r;
              const newCol = col + c;
              if (newRow >= 0 && newRow < GRID_SIZE && newCol >= 0 && newCol < GRID_SIZE && newGrid[newRow][newCol].isMine) {
                count++;
              }
            }
          }
          newGrid[row][col].adjacentMines = count;
        }
      }
    }

    setGrid(newGrid);
    setPoints(0);
    setGameOver(false);
    setIsCashout(false);
  };

  const fetchUserData = async () => {
    if (!account) return;
    const userRef = doc(db, 'users', account);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.exists() ? userDoc.data() : { minesweeperBestScore: 0 };
    setBestScore(userData.minesweeperBestScore || 0);
  };

  useEffect(() => {
    console.log('Minesweeper useEffect - Account:', account, 'Loading:', loading, 'HasRedirected:', hasRedirected);
    if (loading) return;
    if (!account && !hasRedirected) {
      console.log('Minesweeper - Redirecting to /');
      setHasRedirected(true);
      router.push('/');
      return;
    }
    if (account) {
      fetchUserData();
      initializeGrid();
    }
  }, [account, loading, router, hasRedirected]);

  const placeBet = async () => {
    if (!account || !wagmiProvider) {
      toast.error('Please connect your wallet');
      return;
    }

    setIsBetting(true);
    const pendingToast = toast.loading('Placing bet...');

    try {
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

      // Validate contract address
      console.log('Contract address:', contractAddress);
      if (contractAddress.length !== 42 || !/^0x[0-9a-fA-F]{40}$/.test(contractAddress)) {
        throw new Error('Invalid contract address');
      }

      // Check balance
      const balance = await ethersProvider.getBalance(account);
      console.log('Account balance:', ethers.formatEther(balance));
      const betAmount = ethers.parseEther(INITIAL_BET.toString());
      if (balance < betAmount) {
        throw new Error('Insufficient MON balance. Please claim testnet tokens from the Monad faucet.');
      }

      const contract = new ethers.Contract(contractAddress, contractABI, signer);

      // Simulate transaction
      const iface = new ethers.Interface(contractABI);
      const data = iface.encodeFunctionData('placeBet', []);
      console.log('Encoded transaction data:', data);

      try {
        await ethersProvider.call({
          to: contractAddress,
          data,
          from: account,
          value: betAmount,
        });
        console.log('Simulation successful');
      } catch (simError: any) {
        console.error('Simulation failed:', simError);
        throw new Error(`Transaction will fail: ${simError.reason || simError.message || 'Unknown reason'}`);
      }

      // Send transaction
      const gasLimit = 100000;
      console.log('Gas limit:', gasLimit);

      const tx = await contract.placeBet({ value: betAmount, gasLimit });
      console.log('Transaction sent:', tx.hash);

      const receipt = await tx.wait();
      if (!receipt || receipt.status === 0) {
        throw new Error('Transaction failed or no receipt received');
      }
      const txHash = receipt.hash;
      console.log('Transaction confirmed:', txHash);

      toast.dismiss(pendingToast);
      toast.success(
        <div>
          Bet placed successfully! Game started!{' '}
          <a
            href={`https://testnet.monadscan.com/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-cyan-400"
          >
            View on MonadScan
          </a>
        </div>,
        { duration: 5000 }
      );

      setGameStarted(true);
      setIsBetting(false);
    } catch (error: any) {
      console.error('Failed to place bet:', error);
      toast.dismiss(pendingToast);
      if (error.message.includes('insufficient funds') || error.message.includes('Insufficient MON balance')) {
        toast.error(
          <div>
            Insufficient MON balance.{' '}
            <a
              href="https://testnet.monad.xyz/faucet"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-cyan-400"
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
              onClick={() => placeBet()}
              className="underline text-cyan-400 hover:text-cyan-300"
            >
              Retry
            </button>
          </div>,
          { duration: 10000 }
        );
      } else if (error.code === 'CALL_EXCEPTION' || error.message.includes('revert')) {
        toast.error(
          `Bet failed: ${error.reason || 'Transaction reverted. Please try again.'}`,
          { duration: 5000 }
        );
      } else {
        toast.error('Failed to place bet: ' + error.message, { duration: 5000 });
      }
      setIsBetting(false);
    }
  };

  const revealCell = (row: number, col: number, updatedGrid = [...grid]) => {
    if (gameOver || !gameStarted || updatedGrid[row][col].isRevealed || updatedGrid[row][col].isFlagged) return;

    updatedGrid[row][col].isRevealed = true;

    if (updatedGrid[row][col].isMine) {
      setGameOver(true);
      setPoints(0);
      toast.error('Game Over! You hit a mine.');
      setGrid(updatedGrid);
      return;
    }

    setPoints((prev) => prev + 1);

    if (updatedGrid[row][col].adjacentMines === 0) {
      for (let r = -1; r <= 1; r++) {
        for (let c = -1; c <= 1; c++) {
          const newRow = row + r;
          const newCol = col + c;
          if (newRow >= 0 && newRow < GRID_SIZE && newCol >= 0 && newCol < GRID_SIZE) {
            revealCell(newRow, newCol, updatedGrid);
          }
        }
      }
    }

    setGrid(updatedGrid);
  };

  const toggleFlag = (row: number, col: number) => {
    if (gameOver || !gameStarted || grid[row][col].isRevealed) return;
    const updatedGrid = [...grid];
    updatedGrid[row][col].isFlagged = !updatedGrid[row][col].isFlagged;
    setGrid(updatedGrid);
  };

  const updateScores = async () => {
    if (!account) return;
    setIsCashout(true);

    try {
      await runTransaction(db, async (transaction) => {
        const userDocRef = doc(db, 'users', account);
        const userDoc = await transaction.get(userDocRef);
        const data = userDoc.data() || {};
        const newPoints = points;
        const gmeowProfit = Math.floor(newPoints - INITIAL_BET);

        if (newPoints > (data.minesweeperBestScore || 0)) {
          transaction.set(
            userDocRef,
            {
              minesweeperBestScore: newPoints,
              gamesGmeow: (data.gamesGmeow || 0) + gmeowProfit,
            },
            { merge: true }
          );
          setBestScore(newPoints);
        } else if (newPoints > INITIAL_BET) {
          transaction.update(userDocRef, { gamesGmeow: increment(gmeowProfit) });
        }
      });

      toast.success(`Cashed out ${points} points to Firestore!`);
      setGameOver(true);
    } catch (error) {
      console.error('Failed to update scores:', error);
      toast.error('Failed to cash out: ' + (error as Error).message);
      setIsCashout(false);
    }
  };

  const withdrawFunds = async () => {
    if (!account || account.toLowerCase() !== '0x6D54EF5Fa17d69717Ff96D2d868e040034F26024'.toLowerCase() || !wagmiProvider) {
      toast.error('Only admin can withdraw funds');
      return;
    }

    try {
      const ethersProvider = await getEthersProvider();
      if (!ethersProvider) {
        throw new Error('Ethers.js provider not available');
      }

      const signer = await ethersProvider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);

      const tx = await contract.withdrawFunds();
      const pendingToast = toast.loading('Withdrawing funds...');
      const receipt = await tx.wait();
      toast.dismiss(pendingToast);
      toast.success(
        <div>
          Funds withdrawn!{' '}
          <a
            href={`https://testnet.monadscan.com/tx/${receipt.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-cyan-400"
          >
            View on MonadScan
          </a>
        </div>,
        { duration: 5000 }
      );
    } catch (error: any) {
      console.error('Failed to withdraw funds:', error);
      toast.error('Failed to withdraw: ' + error.message, { duration: 5000 });
    }
  };

  const checkBalance = async () => {
    if (!wagmiProvider) {
      toast.error('Wallet provider not detected');
      return;
    }
    try {
      const ethersProvider = await getEthersProvider();
      if (!ethersProvider) {
        throw new Error('Ethers.js provider not available');
      }

      const contract = new ethers.Contract(contractAddress, contractABI, ethersProvider);
      const balance = await contract.getContractBalance();
      console.log('Contract balance:', ethers.formatEther(balance), 'MON');
      toast.success(`Contract balance: ${ethers.formatEther(balance)} MON`, { duration: 5000 });
    } catch (error: any) {
      console.error('Failed to check balance:', error);
      toast.error('Failed to check balance: ' + error.message, { duration: 5000 });
    }
  };

  const handleCopyAddress = () => {
    if (account) {
      navigator.clipboard.writeText(account);
      toast.success('Address copied!');
    }
  };

  if (loading) {
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
          <h1 className="text-2xl md:text-3xl font-bold text-purple-300">Cat Sweeper</h1>
          <div className="ml-auto">
            <Profile account={account} onCopyAddress={handleCopyAddress} onDisconnect={disconnectWallet} />
          </div>
        </div>

        <div className="bg-black/90 rounded-xl p-6 border border-purple-900 shadow-md shadow-purple-500/20 mb-6 md:mb-8">
          <h3 className="text-lg md:text-xl font-semibold text-purple-400 mb-4">Your Stats</h3>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <p className="text-gray-300">
              Points: <span className="text-cyan-400 font-bold">{points}</span>
            </p>
            <p className="text-gray-300">
              Best Score: <span className="text-cyan-400 font-bold">{bestScore}</span>
            </p>
          </div>
        </div>

        <div className="flex justify-center mb-6 md:mb-8">
          <div
            className="grid gap-0.5 md:gap-1 bg-gray-900/80 p-2 rounded-xl border border-purple-900 w-full sm:w-auto"
            style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`, maxWidth: '400px' }}
          >
            {grid.map((row, rowIndex) =>
              row.map((cell: any, colIndex: number) => (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  onClick={() => revealCell(rowIndex, colIndex)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    toggleFlag(rowIndex, colIndex);
                  }}
                  className={`w-full aspect-square md:w-10 md:h-10 text-xs md:text-sm font-semibold transition-all duration-200 border border-purple-900/50 rounded-md flex items-center justify-center ${
                    cell.isRevealed
                      ? cell.isMine
                        ? 'bg-red-600/80'
                        : 'bg-gray-700/80'
                      : cell.isFlagged
                      ? 'bg-yellow-600/80'
                      : 'bg-gray-800/80 hover:bg-gray-700/80'
                  }`}
                  disabled={gameOver || !gameStarted}
                >
                  {cell.isRevealed
                    ? cell.isMine
                      ? '💣'
                      : cell.adjacentMines > 0
                      ? cell.adjacentMines
                      : catEmojis[Math.floor(Math.random() * catEmojis.length)]
                    : cell.isFlagged
                    ? '🚩'
                    : ''}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 md:gap-4 mt-6">
          {!gameStarted ? (
            <button
              onClick={placeBet}
              disabled={isBetting}
              className={`px-4 py-2 md:px-6 md:py-3 rounded-lg text-sm md:text-base font-semibold text-white transition-all duration-200 ${
                isBetting
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400'
              }`}
            >
              {isBetting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Placing Bet...
                </span>
              ) : (
                'Place Bet (0.01 MON)'
              )}
            </button>
          ) : (
            <>
              <button
                onClick={updateScores}
                disabled={gameOver || points <= INITIAL_BET || isCashout}
                className={`px-4 py-2 md:px-6 md:py-3 rounded-lg text-sm md:text-base font-semibold text-white transition-all duration-200 ${
                  gameOver || points <= INITIAL_BET || isCashout
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 to-green-400 hover:from-green-500 hover:to-green-300'
                }`}
              >
                {isCashout ? 'Cashed Out' : 'Cash Out'}
              </button>
              <button
                onClick={() => {
                  setGameStarted(false);
                  initializeGrid();
                }}
                className="px-4 py-2 md:px-6 md:py-3 rounded-lg text-sm md:text-base font-semibold text-white bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 transition-all duration-200"
              >
                New Game
              </button>
              {account && account.toLowerCase() === '0x6D54EF5Fa17d69717Ff96D2d868e040034F26024'.toLowerCase() && (
                <>
                  <button
                    onClick={withdrawFunds}
                    className="px-4 py-2 md:px-6 md:py-3 rounded-lg text-sm md:text-base font-semibold text-white bg-gradient-to-r from-red-600 to-red-400 hover:from-red-500 hover:to-red-300 transition-all duration-200"
                  >
                    Withdraw Funds
                  </button>
                  <button
                    onClick={checkBalance}
                    className="px-4 py-2 md:px-6 md:py-3 rounded-lg text-sm md:text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300 transition-all duration-200"
                  >
                    Check Balance
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}