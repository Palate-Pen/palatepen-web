'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

/**
 * Client-side subscriber for the forward_signals table. When a new signal
 * lands (insert) or an existing one is dismissed/acted-on (update), the
 * component asks Next.js to re-fetch the server-rendered LookingAhead
 * tree so the user sees fresh state without a manual refresh.
 *
 * This pairs with the SSR-rendered LookingAhead — first paint is server,
 * subsequent updates are realtime-patched. No flicker since the data
 * is identical and the router refresh is incremental.
 *
 * The browser Supabase client is created here rather than imported from
 * a shared singleton because LookingAhead is rendered on many pages and
 * each instance needs its own subscription scoped to the site.
 */

export function LookingAheadLive({ siteId }: { siteId: string }) {
  const router = useRouter();

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return;

    const supabase = createBrowserClient(url, anonKey);
    const channel = supabase
      .channel('forward_signals:' + siteId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'v2',
          table: 'forward_signals',
          filter: 'site_id=eq.' + siteId,
        },
        () => {
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [siteId, router]);

  return null;
}
