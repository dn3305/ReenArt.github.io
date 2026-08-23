import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, SESSION_TOKEN } from './lib/adminAuth';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect dashboard pages and all admin API routes, except the login endpoint itself
  const isProtected =
    (pathname.startsWith('/studio-x9k2/dashboard') ||
    pathname.startsWith('/api/admin')) &&
    pathname !== '/api/admin/login';

  if (isProtected) {
    const session = request.cookies.get(SESSION_COOKIE);
    if (!session || session.value !== SESSION_TOKEN) {
      // For API routes return 401; for pages redirect to login
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const loginUrl = new URL('/studio-x9k2', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/studio-x9k2/dashboard/:path*', '/api/admin/:path*'],
};
