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
const TOTAL_MINES = 20;
const INITIAL_BET = 0.01; // 0.01 MON

const contractAddress = '0x27DF24e9Ed3F256FE4Eea32311848F5a978Ab96e';
const contractABI = [
  'function placeBet() external payable',
  'function withdrawFunds() external',
  'function getContractBalance() external view returns (uint256)',
  'event BetPlaced(address indexed player, uint256 amount, uint256 timestamp)',
];

const catEmojis = ['😺', '🐱', '🐾', '🐈', '😻', '🙀', '🐯', '🦁', '🐰', '🐾'];

export default function Minesweeper() {
  const { account, disconnectWallet, loading, provider } = useWeb3Modal();
  const [grid, setGrid] = useState<any[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [points, setPoints] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [isCashout, setIsCashout] = useState(false);
  const [isBetting, setIsBetting] = useState(false);
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);

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
    if (!provider) {
      toast.error('Wallet provider not detected');
      return;
    }

    setIsBetting(true);
    try {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);

      const tx = await contract.placeBet({ value: ethers.parseEther(INITIAL_BET.toString()) });
      const pendingToast = toast.loading('Placing bet...');
      const receipt = await tx.wait();
      toast.dismiss(pendingToast);
      toast.success(
        <div>
          Bet placed! Game started!{' '}
          <a href={`https://testnet.monadexplorer.com/tx/${receipt.hash}`} target="_blank" rel="noopener noreferrer" className="underline text-cyan-400">
            View on Explorer
          </a>
        </div>
      );

      setGameStarted(true);
      setIsBetting(false);
    } catch (error: any) {
      console.error('Failed to place bet:', error);
      toast.error('Failed to place bet: ' + error.message);
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
          transaction.set(userDocRef, {
            minesweeperBestScore: newPoints,
            gamesGmeow: (data.gamesGmeow || 0) + gmeowProfit,
          }, { merge: true });
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
    if (!account || account.toLowerCase() !== '0x6D54EF5Fa17d69717Ff96D2d868e040034F26024'.toLowerCase() || !provider) {
      toast.error('Only admin can withdraw funds');
      return;
    }

    try {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);

      const tx = await contract.withdrawFunds();
      const pendingToast = toast.loading('Withdrawing funds...');
      const receipt = await tx.wait();
      toast.dismiss(pendingToast);
      toast.success(
        <div>
          Funds withdrawn!{' '}
          <a href={`https://testnet.monadexplorer.com/tx/${receipt.hash}`} target="_blank" rel="noopener noreferrer" className="underline text-cyan-400">
            View on Explorer
          </a>
        </div>
      );
    } catch (error: any) {
      console.error('Failed to withdraw funds:', error);
      toast.error('Failed to withdraw: ' + error.message);
    }
  };

  const checkBalance = async () => {
    if (!provider) {
      toast.error('Wallet provider not detected');
      return;
    }
    try {
      const contract = new ethers.Contract(contractAddress, contractABI, provider);
      const balance = await contract.getContractBalance();
      console.log('Contract balance:', ethers.formatEther(balance), 'MON');
      toast.success(`Contract balance: ${ethers.formatEther(balance)} MON`);
    } catch (error: any) {
      console.error('Failed to check balance:', error);
      toast.error('Failed to check balance: ' + error.message);
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
      <main className="flex-1 p-8">
        <Toaster position="top-right" toastOptions={{ style: { background: '#1a1a1a', color: '#fff', border: '1px solid #9333ea' } }} />
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-purple-300">Minesweeper</h1>
          <Profile
            account={account}
            onCopyAddress={handleCopyAddress}
            onDisconnect={disconnectWallet} // Added missing prop
          />
        </div>

        <div className="flex justify-between mb-6">
          <p className="text-lg">Points: <span className="text-cyan-400 font-bold">{points}</span></p>
          <p className="text-lg">Best Score: <span className="text-cyan-400 font-bold">{bestScore}</span></p>
        </div>

        <div className="flex justify-center">
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 40px)` }}>
            {grid.map((row, rowIndex) =>
              row.map((cell: any, colIndex: number) => (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  onClick={() => revealCell(rowIndex, colIndex)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    toggleFlag(rowIndex, colIndex);
                  }}
                  className={`w-10 h-10 border border-purple-900 rounded-lg flex items-center justify-center text-sm font-semibold transition-all duration-200 ${
                    cell.isRevealed
                      ? cell.isMine
                        ? 'bg-red-600'
                        : 'bg-gray-700'
                      : cell.isFlagged
                      ? 'bg-yellow-600'
                      : 'bg-gray-800 hover:bg-gray-700'
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

        <div className="flex justify-center space-x-4 mt-6">
          {!gameStarted ? (
            <button
              onClick={placeBet}
              disabled={isBetting}
              className={`bg-purple-600 px-6 py-3 rounded-lg text-white ${isBetting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-500'} transition-colors`}
            >
              {isBetting ? 'Processing...' : 'Place Bet (0.01 MON)'}
            </button>
          ) : (
            <>
              <button
                onClick={updateScores}
                disabled={gameOver || points <= INITIAL_BET || isCashout}
                className={`px-6 py-2 rounded-lg text-white ${
                  gameOver || points <= INITIAL_BET || isCashout ? 'bg-gray-600' : 'bg-green-500 hover:bg-green-400'
                }`}
              >
                {isCashout ? 'Cashed' : 'Cash Out'}
              </button>
              <button
                onClick={() => {
                  setGameStarted(false);
                  initializeGrid();
                }}
                className="px-6 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500"
              >
                New Game
              </button>
              {account && account.toLowerCase() === '0x6D54EF5Fa17d69717Ff96D2d868e040034F26024'.toLowerCase() && (
                <>
                  <button
                    onClick={withdrawFunds}
                    className="px-6 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500"
                  >
                    Withdraw Funds
                  </button>
                  <button
                    onClick={checkBalance}
                    className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500"
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