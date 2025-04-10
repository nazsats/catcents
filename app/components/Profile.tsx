'use client';
import { useState } from 'react';

interface ProfileProps {
  account: string | null;
  onCopyAddress: () => void;
  onDisconnect: () => void;
}

export default function Profile({ account, onCopyAddress, onDisconnect }: ProfileProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleCopy = () => {
    onCopyAddress();
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const toggleProfile = () => setIsOpen(!isOpen);

  return (
    <div className="relative flex items-center bg-black/80 rounded-lg border border-purple-900 shadow-lg p-2 md:p-4">
      {/* Avatar - Always Visible */}
      <button
        onClick={toggleProfile}
        className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 md:cursor-default mr-3 md:mr-4"
        aria-label="Toggle profile details on mobile"
      >
        {account ? account.slice(2, 4).toUpperCase() : '??'}
      </button>

      {/* Profile Content */}
      <div
        className={`${
          isOpen ? 'flex' : 'hidden'
        } md:flex items-start md:items-center flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4 absolute md:static top-14 right-0 md:top-auto md:right-auto z-10 bg-black/90 md:bg-transparent rounded-b-lg md:rounded-none border md:border-0 border-purple-900 shadow-lg md:shadow-none p-4 md:p-0 w-64 md:w-auto transition-all duration-200 ease-in-out`}
      >
        {/* Account Info */}
        <div className="flex flex-col space-y-2 md:space-y-0">
          <p className="text-gray-200 font-semibold text-sm md:text-base">
            {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Connecting...'}
          </p>
          <div className="flex items-center space-x-3">
            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="text-purple-400 hover:text-purple-300 relative transition-colors"
              aria-label="Copy wallet address"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
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
              {isCopied && (
                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-purple-700 text-white text-xs py-1 px-2 rounded shadow animate-fade-in">
                  Copied!
                </span>
              )}
            </button>

            {/* Social Media Icons */}
            <a
              href="https://x.com/CatCentsio/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 transition-colors"
              aria-label="Visit Catcents on X"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="https://t.me/catcentsio"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 transition-colors"
              aria-label="Join Catcents on Telegram"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm4.962 5.856l-1.89 8.92c-.14.66-.54.82-1.1.51l-2.87-2.11-1.38 1.33c-.15.15-.28.28-.58.28l.2-2.94 5.34-4.84c.24-.21-.05-.33-.37-.12l-6.62 4.17-2.86-.89c-.62-.19-.64-.67.13-.98l11.18-4.31c.52-.19.98.13.87.99z" />
              </svg>
            </a>
            <a
              href="https://discord.gg/TXPbt7ztMC"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 transition-colors"
              aria-label="Join Catcents on Discord"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.045-.319 13.579.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-2.25.076.076 0 00-.041-.093 13.607 13.607 0 01-1.937-.652.077.077 0 00-.079.037c-.129.13-.253.259-.374.385a.077.077 0 00-.022.09c.396.75 1.627 2.037 4.047 2.037 2.42 0 3.65-1.287 4.047-2.037a.077.077 0 00-.022-.09c-.121-.126-.245-.255-.374-.385a.077.077 0 00-.079-.037 13.607 13.607 0 01-1.937.652.076.076 0 00-.041.093c.36.813.834 1.557 1.226 2.25a.078.078 0 00.084.028 19.9 19.9 0 005.993-3.03.082.082 0 00.031-.057c.418-4.478-.434-9.012-3.545-13.687a.07.07 0 00-.032-.027zM8.02 15.33c-.795 0-1.44-.723-1.44-1.617s.645-1.617 1.44-1.617c.795 0 1.44.723 1.44 1.617s-.645 1.617-1.44 1.617zm7.96 0c-.795 0-1.44-.723-1.44-1.617s.645-1.617 1.44-1.617c.795 0 1.44.723 1.44 1.617s-.645 1.617-1.44 1.617z" />
              </svg>
            </a>
          </div>
        </div>

        {/* Disconnect Button */}
        <button
          onClick={onDisconnect}
          className="bg-purple-700 text-white px-3 py-1 rounded-md hover:bg-purple-600 transition-colors text-sm font-semibold w-full md:w-auto"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}