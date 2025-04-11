'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useWeb3Modal } from './lib/Web3ModalContext';
import Image from 'next/image';
import { gsap } from 'gsap';

export default function LandingPage() {
  const { account, connectWallet, loading } = useWeb3Modal();
  const [refCode, setRefCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);

  const router = useRouter();

  // Handle referral code and redirect
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const ref = queryParams.get('ref');
    setRefCode(ref);
  }, []);

  useEffect(() => {
    if (account && !loading) {
      router.replace('/dashboard');
    }
  }, [account, loading, router]);

  // Animation setup with GSAP
  useEffect(() => {
    if (loading || account) return;

    // Debug logs
    console.log('Title ref:', titleRef.current);
    console.log('Logo ref:', logoRef.current);
    console.log('Content ref:', contentRef.current);
    console.log('Button ref:', buttonRef.current);
    console.log('Nav ref:', navRef.current);

    // Manually split the title into characters
    const titleElement = titleRef.current;
    if (titleElement) {
      const titleText = 'CATCENTS';
      titleElement.innerHTML = titleText
        .split('')
        .map((char) => `<span class="split-char">${char}</span>`)
        .join('');
    }

    const chars = titleElement?.querySelectorAll('.split-char');

    // Animation timeline
    const tl = gsap.timeline({ delay: 0.5 });

    // Animate title characters and logo together
    if (chars && chars.length && logoRef.current) {
      tl.from([chars, logoRef.current], {
        filter: 'blur(10px)',
        opacity: 0,
        duration: 0.5,
        ease: 'power1.inOut',
        stagger: 0.05,
      });
    }

    // Animate content
    if (contentRef.current) {
      tl.to(contentRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power1.out',
      }, '-=0.5');
    }

    // Animate button
    if (buttonRef.current) {
      tl.fromTo(
        buttonRef.current,
        { opacity: 0, scale: 0.8 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.6,
          ease: 'back.out(1.7)',
        },
        '-=0.5'
      );
    }

    // Animate nav
    if (navRef.current) {
      tl.from(navRef.current, {
        opacity: 0,
        y: -20,
        duration: 0.5,
      }, '-=0.8');
    }
  }, [loading, account]);

  const handleConnectWallet = async () => {
    try {
      setError(null);
      await connectWallet(refCode ?? undefined);
    } catch (err) {
      setError('Failed to connect wallet. Please try again.');
      console.error('Connect wallet error:', err);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Video - z-0 */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
      >
        <source
          src="https://cdn.prod.website-files.com/67d2fd9186723a84c5f3b2e7%2F67d36f01e2b1e45d502df42f_Securitize_TriangleNoise-V28_2-transcode.mp4"
          type="video/mp4"
        />
        Your browser does not support the video tag.
      </video>

      {/* Overlay - z-10 */}
      <div className="absolute inset-0 bg-black/50 z-10"></div>

      {/* Navbar - z-50 */}
      <nav
        ref={navRef}
        className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center p-6 bg-transparent"
      >
        {/* Left Side: Bigger Logo */}
        <div className="flex items-center">
          <Image
            src="/logo.png" // Navbar logo
            alt="Catcents Logo"
            width={80} // Increased size
            height={80}
          />
        </div>

        {/* Right Side: Bigger X Icon and Join Discord Button */}
        <div className="flex items-center space-x-4">
          <a href="https://x.com/CatCentsio/" target="_blank" rel="noopener noreferrer">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 23 23">
              <path d="M13.2492 9.43523L21.4392 0.124512H19.4985L12.3871 8.20887L6.70726 0.124512H0.15625L8.74527 12.3495L0.15625 22.1132H2.09713L9.60692 13.5759L15.6052 22.1132H22.1562L13.2488 9.43523H13.2492ZM10.5909 12.4572L9.72069 11.2399L2.79645 1.55343H5.77752L11.3655 9.3707L12.2357 10.588L19.4994 20.7493H16.5183L10.5909 12.4577V12.4572Z" />
            </svg>
          </a>
          <a
            href="https://discord.gg/TXPbt7ztMC"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center bg-purple-600 px-4 py-2 rounded-full text-sm font-semibold text-white hover:bg-purple-700 transition-all"
          >
            Join Discord
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </nav>

      {/* Main Content - z-20 */}
      <div className="relative z-20 flex min-h-screen items-center justify-center p-6">
        <div className="text-center max-w-lg w-full">
          {loading ? (
            <div className="text-white animate-pulse">Loading...</div>
          ) : account ? (
            <div className="space-y-6">
              <p className="text-xl text-white">Connected: {account.slice(0, 6)}...{account.slice(-4)}</p>
              <a
                href="/dashboard"
                className="inline-flex items-center bg-purple-600 px-8 py-4 rounded-full text-lg font-semibold text-white hover:bg-purple-700 transition-all"
              >
                Go to Dashboard
              </a>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Title and Logo */}
              <div className="flex items-center justify-center space-x-4">
                <h1 ref={titleRef} className="text-5xl md:text-6xl font-bold text-white"></h1>
                <div ref={logoRef}>
                  <Image
                    src="/logo.png" // Main content logo
                    alt="Catcents Logo"
                    width={50}
                    height={50}
                  />
                </div>
              </div>

              {/* Content */}
              <div ref={contentRef} className="space-y-6 opacity-0 translate-y-10">
                <p className="text-xl text-gray-200">
                  The playground where clicks turn into culture. Come for the games, stay for the grind.
                </p>
                {refCode && (
                  <p className="text-sm text-gray-400">Referred by: {refCode.slice(0, 6)}...</p>
                )}
                {error && (
                  <p className="text-red-400 bg-red-900/20 p-2 rounded">{error}</p>
                )}
              </div>

              {/* Button */}
              <div>
                <button
                  ref={buttonRef}
                  onClick={handleConnectWallet}
                  disabled={loading}
                  className="inline-flex items-center bg-purple-600 px-8 py-4 rounded-full text-lg font-semibold text-white hover:bg-purple-700 transition-all disabled:opacity-50"
                >
                  {loading ? 'Connecting...' : 'Connect Wallet'}
                  <svg className="w-6 h-6 ml-2" fill="none" viewBox="0 0 29 27">
                    <path
                      d="M27.0441 12.9477C22.0221 13.033 16.9051 12.1638 12.526 10.0899C8.03585 7.96241 4.5049 4.61395 2.0031 0.874474L1.65241 1.06518L1.61574 1.28465C3.55827 4.13285 5.0848 7.23886 5.59593 10.5193C6.4016 15.6867 4.72609 20.8829 1.48853 25.2644L2.06155 25.4638C5.00802 21.0324 9.37443 17.3025 15.0129 15.3005C18.8178 13.9502 22.9229 13.4442 27.0429 13.4288L27.0429 12.9487L27.0441 12.9477Z"
                      fill="white"
                      stroke="white"
                      strokeWidth="0.917946"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}