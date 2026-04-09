import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

const PUBLIC_PATHS = [
  '/login',
  '/activate',
  '/portal',
  '/privacy',
  '/cookies',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
}

/** Fetch user role via Supabase REST API — works in edge runtime (no cookies() needed). */
async function getUserRole(userId: string): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  try {
    const res = await fetch(
      `${url}/rest/v1/users?select=role&id=eq.${encodeURIComponent(userId)}&limit=1`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Accept: 'application/json',
        },
        // Don't cache — role can change
        cache: 'no-store',
      }
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { role: string }[];
    return rows[0]?.role ?? null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const { supabaseResponse, user } = await updateSession(request);

  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Role-based routing ────────────────────────────────────────────────────
  const isDashboard = pathname.startsWith('/dashboard');
  const isAdmin = pathname.startsWith('/admin');

  if (isDashboard || isAdmin) {
    const role = await getUserRole(user.id);
    const impersonatingId = request.cookies.get('impersonating_broker_id')?.value;

    if (isDashboard && role === 'super_admin' && !impersonatingId) {
      // Super admin must use /admin unless actively impersonating
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    if (isAdmin && role !== null && role !== 'super_admin') {
      // Non-super-admin cannot access /admin
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
