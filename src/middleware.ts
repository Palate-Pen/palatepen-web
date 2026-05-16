import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import {
  MAINTENANCE_COOKIE,
  bypassTokenValid,
  isMaintenanceEnabled,
  isPassthroughPath,
} from '@/lib/maintenance';

const PUBLIC_PREFIXES = [
  '/signin',
  '/signup',
  '/auth/callback',
  '/m/',
  '/landing',
  '/coming-soon-feature',
];

// Routes that authenticate themselves (Bearer token, webhook secret, etc.)
// and must not be redirected to /signin when there's no cookie session.
const SELF_AUTH_PREFIXES = ['/api/cron/'];

// Host architecture:
//   - palateandpen.co.uk           → Palate & Pen consulting site (coming-soon for now)
//   - www.palateandpen.co.uk       → same as above
//   - app.palateandpen.co.uk       → Palatable (this Next.js app)
// Anything else (preview deploys, localhost) falls through to app behaviour.
const APP_HOST = 'app.palateandpen.co.uk';
const CONSULTING_HOSTS = ['palateandpen.co.uk', 'www.palateandpen.co.uk'];

function bareHost(header: string | null): string {
  return (header ?? '').toLowerCase().split(':')[0];
}

export async function middleware(request: NextRequest) {
  const host = bareHost(request.headers.get('host'));
  const path = request.nextUrl.pathname;
  const search = request.nextUrl.search;

  // -----------------------------------------------------------------
  // MAINTENANCE MODE — first thing, runs ahead of every other route
  // decision. Webhooks + static assets always pass through so
  // providers don't disable our endpoints during downtime.
  // -----------------------------------------------------------------
  if (isMaintenanceEnabled() && !isPassthroughPath(path)) {
    // Bypass flow: founder/tester hits ?bypass=<TOKEN> to drop a cookie
    // and reach the app while everyone else still sees /maintenance.
    const bypassQ = request.nextUrl.searchParams.get('bypass');
    if (bypassQ && bypassTokenValid(bypassQ)) {
      const cleanUrl = new URL(request.url);
      cleanUrl.searchParams.delete('bypass');
      const res = NextResponse.redirect(cleanUrl);
      res.cookies.set(MAINTENANCE_COOKIE, '1', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24, // 24h
      });
      return res;
    }
    const hasBypassCookie = request.cookies.get(MAINTENANCE_COOKIE)?.value === '1';
    if (!hasBypassCookie) {
      // Render the maintenance page but keep the URL the user typed —
      // less jarring than a hard redirect when the outage ends.
      return NextResponse.rewrite(new URL('/maintenance', request.url));
    }
  }

  // CONSULTING HOST — palateandpen.co.uk (root + www). This is the
  // separate Palate & Pen consulting site, not the Palatable app.
  if (CONSULTING_HOSTS.includes(host)) {
    // /admin and any /admin/* path moves to the app subdomain.
    if (path === '/admin' || path.startsWith('/admin/')) {
      return NextResponse.redirect(
        `https://${APP_HOST}${path}${search}`,
        { status: 308 },
      );
    }
    // Skip rewriting for Next.js internals and the coming-soon route
    // itself so the page can serve its own static assets.
    if (
      path === '/coming-soon' ||
      path.startsWith('/_next/') ||
      path.startsWith('/api/')
    ) {
      return NextResponse.next();
    }
    // Everything else on the consulting host → rewrite to /coming-soon.
    // URL in the browser stays as whatever the user typed.
    return NextResponse.rewrite(new URL('/coming-soon', request.url));
  }

  // APP HOST + everything else (preview deploys, localhost) — existing
  // Palatable app behaviour.

  // Skip Supabase session work entirely for self-authenticating routes —
  // they don't need cookies and shouldn't be redirected if absent.
  if (SELF_AUTH_PREFIXES.some((p) => path.startsWith(p))) {
    return NextResponse.next();
  }

  // /coming-soon is host-agnostic — keep it reachable on the app host
  // too (e.g. for QA without changing DNS).
  if (path === '/coming-soon') {
    return NextResponse.next();
  }

  // Public menu reader — /m/{slug} is a guest-facing surface (no chef
  // chrome, no auth). Skip session work entirely.
  if (path.startsWith('/m/')) {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);
  const isPublic = PUBLIC_PREFIXES.some((p) => path.startsWith(p));

  // Unauthenticated `/` on the app host renders the public Palatable
  // landing page instead of bouncing to /signin. URL stays as `/`.
  // Founder still has direct access by typing /signin.
  if (!user && path === '/') {
    return NextResponse.rewrite(new URL('/landing', request.url));
  }

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
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
