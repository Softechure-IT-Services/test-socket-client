// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_ROUTES = [
  '/profile',
  '/wishlists',
  '/my-orders',
  '/thank-you',
  '/deleteaccount',
  '/channel',
  
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes and static files
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('access_token')?.value;

  // Redirect unauthenticated user visiting protected routes
  if (PROTECTED_ROUTES.some(route => pathname.startsWith(route)) && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect unauthenticated user visiting '/' to /welcome
 if (!token && (pathname === '/' || pathname === '/index')) {
  return NextResponse.redirect(new URL('/welcome', request.url));
}

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
