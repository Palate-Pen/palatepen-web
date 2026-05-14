import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PUBLIC_PREFIXES = ['/signin', '/signup', '/auth/callback'];

// Routes that authenticate themselves (Bearer token, webhook secret, etc.)
// and must not be redirected to /signin when there's no cookie session.
const SELF_AUTH_PREFIXES = ['/api/cron/'];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Skip Supabase session work entirely for self-authenticating routes —
  // they don't need cookies and shouldn't be redirected if absent.
  if (SELF_AUTH_PREFIXES.some((p) => path.startsWith(p))) {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);
  const isPublic = PUBLIC_PREFIXES.some((p) => path.startsWith(p));

  if (!user && !isPublic) {
    const signinUrl = new URL('/signin', request.url);
    if (path !== '/') {
      signinUrl.searchParams.set('next', path);
    }
    return NextResponse.redirect(signinUrl);
  }

  if (user && (path === '/signin' || path === '/signup')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
