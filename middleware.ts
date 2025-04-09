import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const walletAddress = request.cookies.get('walletAddress')?.value;
  console.log('Middleware - Path:', request.nextUrl.pathname, 'Wallet Address:', walletAddress);
  return NextResponse.next(); // Allow all for testing
}

export const config = {
  matcher: '/dashboard/:path*',
};