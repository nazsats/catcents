import type { Metadata } from 'next';
import { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Catcents - Web3 Community Platform',
    template: '%s | Catcents',
  },
  description: 'Join Catcents, a Web3 community platform to earn Gmeow points through quests, proposals, and games. Connect your wallet and start today!',
  keywords: 'Web3, NFT, Blockchain, Ethereum, Catcents, Gmeow, Crypto, Community',
  authors: [{ name: 'Catcents Team' }],
  openGraph: {
    title: 'Catcents - Web3 Community Platform',
    description: 'Earn Gmeow points in a fun Web3 ecosystem with Catcents.',
    url: 'https://yourdomain.com', // Replace with your deployed URL
    siteName: 'Catcents',
    images: [
      {
        url: '/og-image.jpg', // Add an OG image in /public
        width: 1200,
        height: 630,
        alt: 'Catcents Platform Preview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Catcents - Web3 Community Platform',
    description: 'Earn Gmeow points with Catcents!',
    images: ['/og-image.jpg'], // Same as above
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#9333EA" />
      </head>
      <body className="bg-gray-900 text-white antialiased">{children}</body>
    </html>
  );
}