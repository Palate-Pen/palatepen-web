import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { defaultHomeForCurrentUser } from '@/lib/role-home';

type CookieEntry = { name: string; value: string; options: CookieOptions };

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const explicitNext = searchParams.get('next');

  if (!code) {
    return NextResponse.redirect(`${origin}/signin?error=missing_code`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieEntry[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/signin?error=${encodeURIComponent(error.message)}`,
    );
  }

  // Honor an explicit `next` (e.g. /onboarding after signup, deep links
  // captured during the signin bounce). Otherwise send the user to their
  // role-appropriate home (owner -> /owner, bar -> /bartender, etc.) so
  // magic-link signin matches the password-signin behaviour in
  // src/lib/actions/auth.ts.
  if (explicitNext && explicitNext !== '/') {
    return NextResponse.redirect(`${origin}${explicitNext}`);
  }
  const home = await defaultHomeForCurrentUser();
  return NextResponse.redirect(`${origin}${home}`);
}
