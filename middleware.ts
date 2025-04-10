import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const account = request.cookies.get('account')?.value;
  console.log('Middleware - Path:', request.nextUrl.pathname, 'Account:', account);
  if (!account && request.nextUrl.pathname.startsWith('/dashboard')) {
    console.log('Redirecting to / due to no account');
    // Add a small delay to allow client-side cookie to sync
    return NextResponse.redirect(new URL('/', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: '/dashboard/:path*',
};