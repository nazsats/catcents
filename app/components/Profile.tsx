'use client';
import { useState } from 'react';

interface ProfileProps {
  account: string | null;
  onCopyAddress: () => void;
}

export default function Profile({ account, onCopyAddress }: ProfileProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    onCopyAddress();
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="flex items-center space-x-4 bg-black/80 p-4 rounded-lg border border-purple-900">
      <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white font-bold">
        {account ? account.slice(2, 4).toUpperCase() : '??'}
      </div>
      <div>
        <p className="text-gray-200 font-semibold">
          {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Connecting...'}
        </p>
        <button
          onClick={handleCopy}
          className="text-purple-400 hover:text-purple-300 text-sm relative flex items-center space-x-1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <span>Copy</span>
          {isCopied && (
            <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-purple-700 text-white text-xs py-1 px-2 rounded">
              Copied!
            </span>
          )}
        </button>
      </div>
    </div>
  );
}