/* eslint-disable no-console */
/*
 * setup-003-intelligence-plumbing.js
 *
 * Wires up the parts that connect the new lib to the existing
 * codebase + Vercel cron infra:
 *
 *   1. Migration: v2.anthropic_usage table (was archived in legacy
 *      cleanup; needed again for ai-voice.ts metering)
 *   2. src/lib/signals-write.ts — upsertSignals helper (used by drainer)
 *   3. src/lib/signal-detectors-public.ts — re-export shim for the
 *      thirteen existing detectors so the drainer can import them
 *      without modifying the closed signal-detectors.ts module
 *   4. src/app/api/cron/drain-events/route.ts — 1-minute drainer cron
 *   5. vercel.json — register the new cron schedule
 *
 * Run with: node scripts/setup-003-intelligence-plumbing.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function write(rel, body) {
  const out = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, body, { encoding: 'utf8' });
  console.log('wrote', out);
}

// ---------------------------------------------------------------------
// 1. v2.anthropic_usage migration
// ---------------------------------------------------------------------
const usageMigration = `-- v2 migration: anthropic_usage
-- Date: 2026-05-16
--
-- Per-call metering for Anthropic API spend. The legacy public.anthropic_usage
-- table was moved to legacy_archive on 2026-05-14 because the v1 admin
-- read paths went away; the v2 admin Infrastructure dashboard plus the
-- ai-voice helper need it back so customer-level cost attribution works.
--
-- Each row: one API call, attributed to an account so multi-site owners
-- see one bill. surface tells us which feature triggered it (invoice scan
-- / signal voice / recipe import / spec OCR / etc.).

create table v2.anthropic_usage (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references v2.accounts(id) on delete set null,
  site_id uuid references v2.sites(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,

  model text not null,
  surface text not null,

  in_tokens integer not null default 0,
  out_tokens integer not null default 0,

  -- GBP pence. Computed in app code from token counts + the centralised
  -- per-1k rates in src/lib/ai-voice.ts (and any future caller). Storing
  -- it here means the admin dashboard doesn't need to know rates.
  cost_pence numeric(10, 4) not null default 0,

  recorded_at timestamptz not null default now()
);

create index anthropic_usage_account_recorded_idx
  on v2.anthropic_usage(account_id, recorded_at desc);
create index anthropic_usage_surface_idx
  on v2.anthropic_usage(surface, recorded_at desc);

-- RLS: only owner / manager of the account can see their own usage.
-- Inserts come from server actions running with the service role and
-- bypass RLS.
alter table v2.anthropic_usage enable row level security;

create policy anthropic_usage_select on v2.anthropic_usage
  for select using (
    account_id in (
      select a.id from v2.accounts a
      join v2.sites s on s.account_id = a.id
      join v2.memberships m on m.site_id = s.id
      where m.user_id = auth.uid()
        and m.role in ('owner', 'manager')
    )
  );

comment on table v2.anthropic_usage is
  'Per-call Anthropic API metering. Drives admin Infrastructure dashboard + per-account usage attribution.';
`;

// ---------------------------------------------------------------------
// 2. src/lib/signals-write.ts
// ---------------------------------------------------------------------
const signalsWrite = `import type { createSupabaseServiceClient } from '@/lib/supabase/service';

/**
 * Upsert helper for the new event-driven detectors. Uses the existing
 * unique index on (site_id, detector_kind, detector_key) so a detector
 * firing repeatedly produces ONE row, not a stream.
 *
 * Signals without a detector_key (rare — most detectors set one) are
 * inserted unconditionally and rely on the application to dedupe.
 */

type SupaClient = ReturnType<typeof createSupabaseServiceClient>;

export async function upsertSignals(
  svc: SupaClient,
  signals: Array<Record<string, unknown>>,
): Promise<void> {
  if (signals.length === 0) return;

  const withKey = signals.filter((s) => s.detector_key);
  const withoutKey = signals.filter((s) => !s.detector_key);

  if (withKey.length > 0) {
    await svc.from('forward_signals').upsert(withKey, {
      onConflict: 'site_id,detector_kind,detector_key',
    });
  }
  if (withoutKey.length > 0) {
    await svc.from('forward_signals').insert(withoutKey);
  }
}
`;

// ---------------------------------------------------------------------
// 3. src/lib/signal-detectors-public.ts
// ---------------------------------------------------------------------
const detectorsPublic = `/**
 * Public re-exports of the detector functions defined in
 * signal-detectors.ts. The original module keeps the detectors private
 * because they are only called by regenerateSignalsForSite. The drainer
 * now needs to call them individually per event-kind, so this shim adds
 * the export surface without touching the closed module.
 *
 * Once the event bus is fully bedded in, the original module's
 * detectors can move here and signal-detectors.ts becomes the public
 * surface.
 */

// Re-imports happen via a barrel file edit — the function bodies live
// in signal-detectors.ts. To minimise churn, this file imports the
// module with a side-effect-free dynamic import pattern that resolves
// to the same functions through TS module merging at the source.
//
// Step 1 of this batch keeps both: signal-detectors.ts still exports
// only regenerateSignalsForSite, but we ALSO add named exports for the
// detectors. The trade-off: a tiny edit to signal-detectors.ts adding
// "export" in front of each detector function. That edit is performed
// by setup-004-export-detectors.js — running this re-export then
// becomes a plain re-export.
//
// This file is the consumer-facing surface; consumers (event-drain.ts)
// import from signal-detectors-public, never from signal-detectors.

export {
  detectParBreaches,
  detectAllocationsArriving,
  detectFlaggedInvoicesNeedingCreditNotes,
  detectRecipeCostDrift,
  detectSpillagePatterns,
  detectStockTakeVariance,
  detectTodaysDeliveries,
  detectTonightsPrep,
  detectIdleRecipes,
  detectStaleCostBaseline,
  detectPrepPatternLag,
  detectMenuGpDrag,
  detectNotebookLinkDrift,
} from './signal-detectors';
`;

// ---------------------------------------------------------------------
// 4. cron route
// ---------------------------------------------------------------------
const cronRoute = `import { NextResponse } from 'next/server';
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
  return header === \`Bearer \${secret}\`;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const result = await drainEvents({ limit: 500 });
  return NextResponse.json({ ok: true, ...result });
}
`;

// ---------------------------------------------------------------------
// 5. vercel.json
// ---------------------------------------------------------------------
const vercelJson = `{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/drain-events",
      "schedule": "*/1 * * * *"
    },
    {
      "path": "/api/cron/detect-market-moves",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/detect-recipe-staleness",
      "schedule": "30 8 * * *"
    },
    {
      "path": "/api/cron/detect-cost-spikes",
      "schedule": "0 9 * * *"
    }
  ]
}
`;

write('supabase/migrations/20260516_v2_anthropic_usage.sql', usageMigration);
write('src/lib/signals-write.ts', signalsWrite);
write('src/lib/signal-detectors-public.ts', detectorsPublic);
write('src/app/api/cron/drain-events/route.ts', cronRoute);
write('vercel.json', vercelJson);

console.log('\ndone');
