import type { createSupabaseServiceClient } from '@/lib/supabase/service';

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
