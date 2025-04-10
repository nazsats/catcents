'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs, query, orderBy, Timestamp, increment } from 'firebase/firestore';
import { ethers } from 'ethers';
import Sidebar from '../../components/Sidebar';
import Profile from '../../components/Profile';
import { useWeb3Modal } from '../../lib/Web3ModalContext';
import toast, { Toaster } from 'react-hot-toast';

const DEMO_PROPOSALS = [
  { author: 'CatLord', title: 'Decentralized Node Hub', content: 'Deploy validator nodes.', date: new Date().toISOString(), image: 'https://picsum.photos/200/300?random=1', yesVotes: 0, noVotes: 0 },
  { author: 'PurrMaster', title: 'DeFi Incubator', content: 'Fund DeFi development.', date: new Date(Date.now() - 86400000).toISOString(), image: 'https://picsum.photos/200/300?random=2', yesVotes: 0, noVotes: 0 },
  { author: 'WhiskerWizard', title: 'Cross-Chain Bridge', content: 'Connect Monad to other chains.', date: new Date(Date.now() - 2 * 86400000).toISOString(), image: 'https://picsum.photos/200/300?random=3', yesVotes: 0, noVotes: 0 },
];

const ADMIN_WALLET = '0x6D54EF5Fa17d69717Ff96D2d868e040034F26024'.toLowerCase();

const catEmojis = ['😺', '🐱', '🐾', '🐈', '😻', '🙀', '🐯', '🦁', '🐰', '🐾'];
const getRandomCatEmoji = (seed: string) => {
  const index = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % catEmojis.length;
  return catEmojis[index];
};

export default function Proposals() {
  const { account, provider, loading, disconnectWallet } = useWeb3Modal();
  const [proposals, setProposals] = useState<
    { id: string; author: string; title: string; content: string; date: string; image?: string; yesVotes: number; noVotes: number; likedByUser: boolean; votedByUser: 'yes' | 'no' | null; isExpanded: boolean; isLiking?: boolean; isVoting?: boolean }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('Latest');
  const [currentPage, setCurrentPage] = useState(1);
  const [votesCast, setVotesCast] = useState(0);
  const [pointsEarned, setPointsEarned] = useState(0);
  const cardsPerPage = 20;
  const router = useRouter();
  const contentPreviewLength = 100;
  const [hasRedirected, setHasRedirected] = useState(false);

  const fetchProposalsAndUserData = async (userAddress: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const propQuery = query(collection(db, 'proposals'), orderBy('date', 'desc'));
      const propSnapshot = await getDocs(propQuery);
      console.log('Fetched proposals:', propSnapshot.docs.map(doc => doc.data()));

      if (propSnapshot.empty) {
        console.log('Initializing demo proposals...');
        const addPromises = DEMO_PROPOSALS.map((prop) =>
          setDoc(doc(collection(db, 'proposals')), { ...prop, date: Timestamp.fromDate(new Date(prop.date)), likes: 0 })
        );
        await Promise.all(addPromises);
      }

      const updatedPropSnapshot = await getDocs(propQuery);
      const fetchedProposals = await Promise.all(
        updatedPropSnapshot.docs.map(async (propDoc) => {
          const propData = propDoc.data();
          const likesCollection = collection(db, 'proposals', propDoc.id, 'likes');
          const votesCollection = collection(db, 'proposals', propDoc.id, 'votes');
          const likesSnap = await getDocs(likesCollection);
          const userLiked = likesSnap.docs.some((doc) => doc.id === userAddress);
          const userVoteDoc = await getDoc(doc(db, 'proposals', propDoc.id, 'votes', userAddress));
          const userVote = userVoteDoc.exists() ? userVoteDoc.data().vote : null;

          const date = propData.date instanceof Timestamp ? propData.date.toDate() : new Date(propData.date || Date.now());
          return {
            id: propDoc.id,
            author: propData.author,
            title: propData.title,
            content: propData.content,
            date: date.toISOString(),
            image: propData.image || undefined,
            yesVotes: propData.yesVotes || 0,
            noVotes: propData.noVotes || 0,
            likedByUser: userLiked,
            votedByUser: userVote,
            isExpanded: false,
            isLiking: false,
            isVoting: false,
          };
        })
      );

      setProposals(fetchedProposals);

      let totalVotes = 0;
      await Promise.all(
        updatedPropSnapshot.docs.map(async (propDoc) => {
          const voteDoc = await getDoc(doc(db, 'proposals', propDoc.id, 'votes', userAddress));
          if (voteDoc.exists()) totalVotes += 1;
        })
      );
      setVotesCast(totalVotes);

      const userRef = doc(db, 'users', userAddress);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : { proposalsGmeow: 0 };
      setPointsEarned(userData.proposalsGmeow || 0);
    } catch (error) {
      console.error('Failed to fetch proposals:', error);
      setError('Failed to load proposals: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('Proposals useEffect - Account:', account, 'Loading:', loading, 'HasRedirected:', hasRedirected);
    if (loading) return;
    if (!account && !hasRedirected) {
      console.log('Proposals - Redirecting to /');
      setHasRedirected(true);
      router.push('/');
      return;
    }
    if (account) {
      fetchProposalsAndUserData(account);
    }
  }, [account, loading, router, hasRedirected]);

  const handleLike = async (propId: string) => {
    if (!account) return;
    const index = proposals.findIndex((p) => p.id === propId);
    if (index === -1 || proposals[index].likedByUser) return;

    setProposals((prev) => prev.map((prop, i) => (i === index ? { ...prop, isLiking: true } : prop)));

    const likeRef = doc(db, 'proposals', propId, 'likes', account);

    try {
      const likeSnap = await getDoc(likeRef);
      if (!likeSnap.exists()) {
        await setDoc(likeRef, { likedAt: new Date().toISOString() });
        setProposals((prev) =>
          prev.map((prop, i) => (i === index ? { ...prop, likedByUser: true, isLiking: false } : prop))
        );
        toast.success('Liked proposal!');
      }
    } catch (error) {
      console.error('Failed to like proposal:', error);
      toast.error('Failed to like proposal.');
      setProposals((prev) => prev.map((prop, i) => (i === index ? { ...prop, isLiking: false } : prop)));
    }
  };

  const handleVote = async (propId: string, vote: 'yes' | 'no') => {
    if (!account || !provider) {
      toast.error('Please connect your wallet');
      return;
    }
    const index = proposals.findIndex((p) => p.id === propId);
    if (index === -1 || proposals[index].votedByUser || proposals[index].isVoting) return;

    setProposals((prev) => prev.map((prop, i) => (i === index ? { ...prop, isVoting: true } : prop)));

    const propRef = doc(db, 'proposals', propId);
    const voteRef = doc(db, 'proposals', propId, 'votes', account);
    const userRef = doc(db, 'users', account);

    try {
      const voteSnap = await getDoc(voteRef);
      if (!voteSnap.exists()) {
        const signer = await provider.getSigner();
        const contractAddress = '0x9C451d8065314504Bb90f37c8b6431c57Fc655C4';
        const contractABI = [
          'function voteYes(uint256 proposalId) external',
          'function voteNo(uint256 proposalId) external',
        ];
        const contract = new ethers.Contract(contractAddress, contractABI, signer);
        const proposalIndex = index;
        const tx = vote === 'yes' ? await contract.voteYes(proposalIndex) : await contract.voteNo(proposalIndex);

        const pendingToast = toast.loading('Processing vote...');
        const receipt = await tx.wait();
        const txHash = receipt.hash;

        await setDoc(voteRef, { vote, votedAt: new Date().toISOString(), txHash });
        await setDoc(propRef, { [vote === 'yes' ? 'yesVotes' : 'noVotes']: increment(1) }, { merge: true });
        await setDoc(userRef, { proposalsGmeow: increment(10) }, { merge: true });

        setProposals((prev) =>
          prev.map((prop, i) =>
            i === index
              ? { ...prop, [vote === 'yes' ? 'yesVotes' : 'noVotes']: prop[vote === 'yes' ? 'yesVotes' : 'noVotes'] + 1, votedByUser: vote, isVoting: false }
              : prop
          )
        );
        setVotesCast((prev) => prev + 1);
        setPointsEarned((prev) => prev + 10);

        toast.dismiss(pendingToast);
        toast.success(
          <div>
            Voted {vote} successfully! +10 Gmeow{' '}
            <a href={`https://testnet.monadexplorer.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="underline text-cyan-400">
              View on Explorer
            </a>
          </div>,
          { duration: 5000 }
        );
      }
    } catch (error) {
      console.error('Failed to vote:', error);
      toast.error('Failed to vote: ' + (error as Error).message);
      setProposals((prev) => prev.map((prop, i) => (i === index ? { ...prop, isVoting: false } : prop)));
    }
  };

  const handleShowMore = (propId: string) => {
    setProposals((prev) => prev.map((prop) => (prop.id === propId ? { ...prop, isExpanded: !prop.isExpanded } : prop)));
  };

  const sortProposals = useMemo(() => {
    let sorted = [...proposals];
    switch (category) {
      case 'All':
      case 'Latest':
        return sorted;
      case 'Trending':
        return sorted.sort((a, b) => (b.yesVotes + b.noVotes) - (a.yesVotes + a.noVotes));
      case 'Win':
        return sorted.filter((prop) => prop.yesVotes > prop.noVotes);
      case 'Lose':
        return sorted.filter((prop) => prop.yesVotes < prop.noVotes);
      default:
        return sorted;
    }
  }, [proposals, category]);

  const totalPages = Math.ceil(sortProposals.length / cardsPerPage);
  const startIndex = (currentPage - 1) * cardsPerPage;
  const paginatedProposals = sortProposals.slice(startIndex, startIndex + cardsPerPage);

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
      <main className="flex-1 p-8">
        <Toaster position="top-right" toastOptions={{ style: { background: '#1a1a1a', color: '#fff', border: '1px solid #9333ea' } }} />
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-semibold text-purple-300">Proposals</h2>
          <Profile account={account} onCopyAddress={() => navigator.clipboard.writeText(account)} />
        </div>

        {error && <div className="text-red-400 mb-4">{error}</div>}

        <div className="bg-black/80 rounded-lg p-6 border border-purple-900 mb-8">
          <h3 className="text-lg font-semibold text-purple-400 mb-4">Your Voting Stats</h3>
          <div className="flex justify-between">
            <p className="text-gray-300">Votes Cast: <span className="text-cyan-400 font-bold">{votesCast}</span></p>
            <p className="text-gray-300">Points Earned: <span className="text-cyan-400 font-bold">{pointsEarned} Gmeow</span></p>
          </div>
        </div>

        <div className="flex space-x-4 mb-6">
          {['All', 'Latest', 'Trending', 'Win', 'Lose'].map((cat) => (
            <button
              key={cat}
              onClick={() => { setCategory(cat); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-full text-sm font-semibold ${category === cat ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedProposals.map((proposal) => {
            const totalVotes = proposal.yesVotes + proposal.noVotes;
            const yesPercentage = totalVotes > 0 ? (proposal.yesVotes / totalVotes) * 100 : 0;
            const noPercentage = totalVotes > 0 ? (proposal.noVotes / totalVotes) * 100 : 0;
            const status = yesPercentage > noPercentage ? 'Winning' : yesPercentage === noPercentage ? 'Tied' : 'Losing';

            return (
              <div
                key={proposal.id}
                className="bg-black/80 rounded-lg border border-purple-900 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all duration-300 overflow-hidden max-w-sm min-h-[400px] flex flex-col"
              >
                {proposal.image && (
                  <img src={proposal.image} alt={proposal.title} className="w-full h-48 object-cover" onError={(e) => (e.currentTarget.src = '/placeholder.jpg')} />
                )}
                <div className="p-4 flex flex-col flex-grow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-500 rounded-full flex items-center justify-center text-2xl">
                        {getRandomCatEmoji(proposal.author)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-purple-400">{proposal.title}</h3>
                        <p className="text-sm text-cyan-400 italic">By {proposal.author}</p>
                      </div>
                    </div>
                    <div className={`text-white text-xs font-bold px-3 py-1 rounded-full ${status === 'Winning' ? 'bg-green-500' : status === 'Losing' ? 'bg-red-500' : 'bg-yellow-500'}`}>
                      {status}
                    </div>
                  </div>
                  <div className={`transition-all duration-500 ${proposal.isExpanded ? 'max-h-96' : 'max-h-16'} overflow-hidden whitespace-pre-wrap`}>
                    <p className="text-gray-300 text-sm">{proposal.content}</p>
                  </div>
                  {proposal.content.length > contentPreviewLength && (
                    <button onClick={() => handleShowMore(proposal.id)} className="text-purple-400 hover:text-purple-300 text-sm mt-2">
                      {proposal.isExpanded ? 'Collapse' : 'Expand'}
                    </button>
                  )}
                </div>
                <div className="p-4 mt-auto border-t border-purple-900/50">
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs text-gray-300 mb-1">
                        <span>Yes: {proposal.yesVotes}</span>
                        <span>{yesPercentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div className="bg-green-500 h-full" style={{ width: `${yesPercentage}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-300 mb-1">
                        <span>No: {proposal.noVotes}</span>
                        <span>{noPercentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div className="bg-red-500 h-full" style={{ width: `${noPercentage}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex space-x-2">
                      {proposal.votedByUser ? (
                        <span className="text-gray-400 text-sm font-semibold px-4 py-2 bg-gray-800 rounded-full">
                          Vote Cast: {proposal.votedByUser === 'yes' ? 'Yes 👍' : 'No 👎'}
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleVote(proposal.id, 'yes')}
                            disabled={proposal.isVoting}
                            className={`px-4 py-2 rounded-full text-white ${proposal.isVoting ? 'bg-gray-600' : 'bg-green-500 hover:bg-green-400'}`}
                          >
                            {proposal.isVoting ? 'Voting...' : 'Yes 👍'}
                          </button>
                          <button
                            onClick={() => handleVote(proposal.id, 'no')}
                            disabled={proposal.isVoting}
                            className={`px-4 py-2 rounded-full text-white ${proposal.isVoting ? 'bg-gray-600' : 'bg-red-500 hover:bg-red-400'}`}
                          >
                            {proposal.isVoting ? 'Voting...' : 'No 👎'}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleLike(proposal.id)}
                        disabled={proposal.likedByUser || proposal.isLiking}
                        className={`px-3 py-2 rounded-full text-white ${proposal.likedByUser ? 'bg-purple-600' : proposal.isLiking ? 'bg-purple-700 animate-pulse' : 'bg-purple-500 hover:bg-purple-400'}`}
                      >
                        {proposal.isLiking ? 'Liking...' : '❤️'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-4 mt-8">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-800 text-gray-300 rounded-full disabled:opacity-50 hover:bg-gray-700"
            >
              Previous
            </button>
            <span className="text-gray-300">Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-gray-800 text-gray-300 rounded-full disabled:opacity-50 hover:bg-gray-700"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}