import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import Twitter from 'twitter-lite';

// In-memory store for walletAddress (for local testing only)
const tokenStore = new Map<string, string>();

const twitterClient = new Twitter({
  consumer_key: process.env.TWITTER_API_KEY!,
  consumer_secret: process.env.TWITTER_API_SECRET!,
});

export async function GET(request: NextRequest) {
  try {
    console.log('Starting Twitter auth flow');
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');
    const oauthToken = searchParams.get('oauth_token');
    const oauthVerifier = searchParams.get('oauth_verifier');

    console.log('Wallet Address:', walletAddress);
    console.log('OAuth Token:', oauthToken);
    console.log('OAuth Verifier:', oauthVerifier);

    if (!oauthToken || !oauthVerifier) {
      if (!walletAddress) {
        console.log('No wallet address provided in initial request');
        return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/quests?error=twitter_failed`);
      }

      console.log('Generating request token');
      const response = await twitterClient.getRequestToken(
        `${process.env.NEXTAUTH_URL}/api/twitter/auth`
      );
      console.log('Request token response:', response);

      if (response.oauth_callback_confirmed !== 'true') {
        console.log('OAuth callback not confirmed');
        throw new Error('OAuth callback not confirmed');
      }

      tokenStore.set(response.oauth_token, walletAddress);
      console.log('Stored walletAddress in tokenStore:', walletAddress);

      const redirectUrl = `https://api.twitter.com/oauth/authorize?oauth_token=${response.oauth_token}`;
      console.log('Redirecting to:', redirectUrl);
      return NextResponse.redirect(redirectUrl);
    }

    const storedWalletAddress = tokenStore.get(oauthToken);
    console.log('Retrieved stored walletAddress:', storedWalletAddress);
    if (!storedWalletAddress) {
      console.log('No stored wallet address found for this oauth_token');
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/quests?error=twitter_failed`);
    }

    console.log('Handling callback with token and verifier');
    const accessTokenResponse = await twitterClient.getAccessToken({
      oauth_token: oauthToken,
      oauth_verifier: oauthVerifier,
    });
    console.log('Access token response:', accessTokenResponse);

    const username = accessTokenResponse.screen_name;
    console.log('Extracted username:', username);

    const userRef = doc(db, 'users', storedWalletAddress);
    await setDoc(
      userRef,
      {
        twitterUsername: username,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    console.log('Stored username in Firebase:', username);

    tokenStore.delete(oauthToken);

    console.log('Redirecting to success');
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/quests?success=twitter_connected`
    );
  } catch (error) {
    console.error('Twitter auth error:', error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/quests?error=twitter_failed`
    );
  }
}