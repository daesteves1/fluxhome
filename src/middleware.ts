import { NextResponse, type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { updateSession } from './lib/supabase/middleware';

const intlMiddleware = createMiddleware(routing);

const PUBLIC_PATHS = [
  '/login',
  '/activate',
  '/portal',
  '/privacy',
  '/cookies',
];

function isPublicPath(pathname: string): boolean {
  const strippedPath = pathname.replace(/^\/(pt|en)/, '') || '/';
  return PUBLIC_PATHS.some(
    (p) => strippedPath === p || strippedPath.startsWith(p + '/')
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always pass through static files, API routes, and Next internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Handle i18n routing
  const intlResponse = intlMiddleware(request);

  // Public paths — no auth required
  if (isPublicPath(pathname)) {
    return intlResponse;
  }

  // Auth check for protected routes
  const { supabaseResponse, user } = await updateSession(request);

  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Copy cookies from supabaseResponse to intlResponse
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value, cookie);
  });

  return intlResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
