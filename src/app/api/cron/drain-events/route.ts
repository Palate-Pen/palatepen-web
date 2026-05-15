import { NextResponse } from 'next/server';
import { drainEvents } from '@/lib/event-drain';

/**
 * Vercel cron: drain unprocessed intelligence_events.
 *
 * Schedule (vercel.json): every minute. Vercel rejects schedules under
 * 1 minute on the Hobby/Pro plans; the inline-drain path in server
 * actions covers the same-tick case, so 1 minute is the worst-case
 * latency for an event that escapes the inline path.
 *
 * Auth: Vercel sends Authorization: Bearer <CRON_SECRET>.
 */

export const dynamic = 'force-dynamic';

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get('authorization') ?? '';
  return header === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await drainEvents({ limit: 500 });
  return NextResponse.json({ ok: true, ...result });
}
