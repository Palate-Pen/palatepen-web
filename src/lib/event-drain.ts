import { createSupabaseServiceClient } from '@/lib/supabase/service';
import {
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
} from '@/lib/signal-detectors-public';
import {
  detectWasteGap,
  detectDeliveryGap,
  detectPrepRoutineGap,
} from '@/lib/detectors/behavioural-gap';
import { upsertSignals } from '@/lib/signals-write';

/**
 * Map intelligence_event kinds to the detectors that should run when one
 * lands. Multiple detectors can subscribe to the same kind. Detectors
 * still emit their own signals via upsertSignals — the drainer is just
 * the dispatcher.
 *
 * Keep this map narrow: each kind should trigger only the detectors
 * whose output could change because of the event. Anything that needs a
 * cross-site / full-history view stays on the daily cron sweep.
 */
type Detector = (
  svc: ReturnType<typeof createSupabaseServiceClient>,
  siteId: string,
) => Promise<unknown>;

const KIND_TO_DETECTORS: Record<string, Detector[]> = {
  'invoice.confirmed': [
    detectFlaggedInvoicesNeedingCreditNotes,
    detectTodaysDeliveries,
  ],
  'invoice.flagged': [detectFlaggedInvoicesNeedingCreditNotes],
  'prep.completed': [detectTonightsPrep, detectPrepPatternLag],
  'prep.added': [detectTonightsPrep],
  'delivery.received': [detectTodaysDeliveries, detectDeliveryGap],
  'delivery.expected': [detectTodaysDeliveries],
  'recipe.updated': [detectIdleRecipes, detectMenuGpDrag],
  'recipe.costed': [
    detectRecipeCostDrift,
    detectStaleCostBaseline,
    detectMenuGpDrag,
    detectNotebookLinkDrift,
  ],
  'ingredient.price_changed': [
    detectRecipeCostDrift,
    detectParBreaches,
    detectStaleCostBaseline,
  ],
  'waste.logged': [detectSpillagePatterns, detectWasteGap],
  'transfer.received': [detectParBreaches],
  'po.received': [detectParBreaches, detectTodaysDeliveries],
};

/**
 * Drain unprocessed intelligence_events. Called inline from server
 * actions (for immediate feedback) and from the 1-minute Vercel cron
 * (for events written via SQL or missed in flight).
 *
 * Idempotent: processed_at marks success; failures stamp error_text so
 * the row can be inspected later but isn't re-run automatically (avoid
 * thundering retries against a broken detector).
 *
 * Returns the count of events drained.
 */
export async function drainEvents(options?: {
  siteId?: string;
  limit?: number;
}): Promise<{ drained: number; failed: number }> {
  const svc = createSupabaseServiceClient();
  const limit = options?.limit ?? 200;

  let query = svc
    .from('intelligence_events')
    .select('id, site_id, kind, payload')
    .is('processed_at', null)
    .order('emitted_at', { ascending: true })
    .limit(limit);

  if (options?.siteId) query = query.eq('site_id', options.siteId);

  const { data: events, error } = await query;
  if (error || !events || events.length === 0) {
    return { drained: 0, failed: 0 };
  }

  // Group events by (site_id, kind) so we run each detector once per
  // batch even if 50 events came in for the same site + kind.
  const grouped = new Map<string, { siteId: string; kind: string; ids: string[] }>();
  for (const e of events) {
    const key = `${e.site_id}::${e.kind}`;
    const cur = grouped.get(key) ?? {
      siteId: e.site_id as string,
      kind: e.kind as string,
      ids: [],
    };
    cur.ids.push(e.id as string);
    grouped.set(key, cur);
  }

  let drained = 0;
  let failed = 0;
  const now = new Date().toISOString();

  for (const { siteId, kind, ids } of grouped.values()) {
    const detectors = KIND_TO_DETECTORS[kind] ?? [];
    if (detectors.length === 0) {
      // No subscriber for this kind: mark all ids processed so the
      // queue clears even if no work was done.
      await svc
        .from('intelligence_events')
        .update({ processed_at: now })
        .in('id', ids);
      drained += ids.length;
      continue;
    }

    let allOk = true;
    let lastErr: string | null = null;
    for (const d of detectors) {
      try {
        const sigs = (await d(svc, siteId)) as Array<Record<string, unknown>>;
        if (sigs && sigs.length > 0) {
          await upsertSignals(svc, sigs);
        }
      } catch (e) {
        allOk = false;
        lastErr = (e as Error).message;
        // eslint-disable-next-line no-console
        console.error('[event-drain]', kind, siteId, lastErr);
      }
    }

    if (allOk) {
      await svc
        .from('intelligence_events')
        .update({ processed_at: now })
        .in('id', ids);
      drained += ids.length;
    } else {
      await svc
        .from('intelligence_events')
        .update({ processed_at: now, error_text: lastErr })
        .in('id', ids);
      failed += ids.length;
    }
  }

  return { drained, failed };
}
