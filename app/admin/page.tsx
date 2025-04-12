'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../lib/firebase';
import { doc, setDoc, getDocs, collection, deleteDoc, query, orderBy, Timestamp } from 'firebase/firestore';
import Sidebar from '../components/Sidebar';
import Profile from '../components/Profile';
import { useWeb3Modal } from '../lib/Web3ModalContext'; // Static import
import toast, { Toaster } from 'react-hot-toast';

const ADMIN_WALLET = '0x6D54EF5Fa17d69717Ff96D2d868e040034F26024'.toLowerCase();

export default function AdminProposals() {
  const { account, disconnectWallet, loading } = useWeb3Modal();
  const [proposals, setProposals] = useState<
    { id: string; author: string; title: string; content: string; date: string; image?: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newProposal, setNewProposal] = useState({ title: '', content: '', image: '' });
  const router = useRouter();

  const fetchProposals = async () => {
    setIsLoading(true);
    try {
      const propQuery = query(collection(db, 'proposals'), orderBy('date', 'desc'));
      const propSnapshot = await getDocs(propQuery);
      const fetchedProposals = propSnapshot.docs.map((doc) => {
        const data = doc.data();
        const date = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date || Date.now());
        return {
          id: doc.id,
          author: data.author,
          title: data.title,
          content: data.content,
          date: date.toISOString(),
          image: data.image || undefined,
        };
      });
      setProposals(fetchedProposals);
    } catch (error) {
      console.error('Failed to fetch proposals:', error);
      toast.error('Failed to load proposals.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('Admin useEffect - Account:', account, 'Loading:', loading);
    if (loading) return;
    if (!account) {
      router.push('/');
    } else if (account.toLowerCase() !== ADMIN_WALLET) {
      toast.error('Access denied. Admin only.');
      router.push('/dashboard/proposals');
    } else {
      fetchProposals();
    }
  }, [account, loading, router]);

  const handleAddProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProposal.title || !newProposal.content) {
      toast.error('Title and content are required.');
      return;
    }

    try {
      const propRef = doc(collection(db, 'proposals'));
      await setDoc(propRef, {
        author: 'Admin',
        title: newProposal.title,
        content: newProposal.content,
        date: Timestamp.fromDate(new Date()),
        image: newProposal.image || undefined,
        yesVotes: 0,
        noVotes: 0,
        likes: 0,
      });
      setNewProposal({ title: '', content: '', image: '' });
      fetchProposals();
      toast.success('Proposal added successfully!');
    } catch (error) {
      console.error('Failed to add proposal:', error);
      toast.error('Failed to add proposal.');
    }
  };

  const handleDeleteProposal = async (propId: string) => {
    if (!confirm('Are you sure you want to delete this proposal?')) return;

    try {
      await deleteDoc(doc(db, 'proposals', propId));
      fetchProposals();
      toast.success('Proposal deleted successfully!');
    } catch (error) {
      console.error('Failed to delete proposal:', error);
      toast.error('Failed to delete proposal.');
    }
  };

  const handleCopyAddress = () => {
    if (account) {
      navigator.clipboard.writeText(account);
      toast.success('Address copied!');
    }
  };

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
          <h2 className="text-xl font-semibold text-purple-300">Admin - Manage Proposals</h2>
          <Profile
            account={account}
            onCopyAddress={handleCopyAddress}
            onDisconnect={disconnectWallet} // Added missing prop
          />
        </div>

        <div className="bg-black/80 rounded-lg p-6 border border-purple-900 mb-8">
          <h3 className="text-lg font-semibold text-purple-400 mb-4">Add New Proposal</h3>
          <form onSubmit={handleAddProposal} className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-1">Title</label>
              <input
                type="text"
                value={newProposal.title}
                onChange={(e) => setNewProposal({ ...newProposal, title: e.target.value })}
                className="w-full p-2 bg-gray-700 text-white rounded-lg border border-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter proposal title"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-1">Content</label>
              <textarea
                value={newProposal.content}
                onChange={(e) => setNewProposal({ ...newProposal, content: e.target.value })}
                className="w-full p-2 bg-gray-700 text-white rounded-lg border border-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter proposal content"
                rows={4}
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-1">Image URL (optional)</label>
              <input
                type="text"
                value={newProposal.image}
                onChange={(e) => setNewProposal({ ...newProposal, image: e.target.value })}
                className="w-full p-2 bg-gray-700 text-white rounded-lg border border-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter image URL"
              />
            </div>
            <button
              type="submit"
              className="bg-purple-600 px-6 py-2 rounded-lg text-white hover:bg-purple-500 transition-colors"
            >
              Add Proposal
            </button>
          </form>
        </div>

        <div className="bg-black/80 rounded-lg p-6 border border-purple-900">
          <h3 className="text-lg font-semibold text-purple-400 mb-4">Existing Proposals</h3>
          {proposals.length === 0 ? (
            <p className="text-gray-300">No proposals found.</p>
          ) : (
            <div className="space-y-4">
              {proposals.map((proposal) => (
                <div
                  key={proposal.id}
                  className="flex items-center justify-between bg-gray-700 p-4 rounded-lg hover:bg-gray-600 transition-all"
                >
                  <div>
                    <p className="text-lg font-semibold text-purple-200">{proposal.title}</p>
                    <p className="text-sm text-gray-300">{proposal.content.slice(0, 100)}...</p>
                    <p className="text-xs text-gray-400">
                      Created: {new Date(proposal.date).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteProposal(proposal.id)}
                    className="bg-red-600 px-4 py-2 rounded-lg text-white hover:bg-red-500 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}