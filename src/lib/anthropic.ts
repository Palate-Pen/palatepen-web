// Single source of truth for the Anthropic model used across server-side AI
// endpoints (recipe import, invoice scan, spec-sheet scan, inbound email).
// Swap once here when moving between Sonnet / Haiku / Opus tiers — there are
// no per-route overrides today.
//
// Pricing context (2026-05): Sonnet 4.6 is roughly $0.005 / call for the
// document-and-vision payloads we send. Haiku is ~4× cheaper but loses
// reliability on multi-page invoice scans; Opus is ~5× more expensive with
// a worthwhile accuracy bump only for messy handwritten spec sheets.

export const ANTHROPIC_MODEL = 'claude-sonnet-4-6';

// Per-call cost estimate in pence. Keyed by the `kind` string we pass into
// recordAnthropicCall below. These are estimates pegged against our own
// observed Sonnet 4.6 spend — revise once a real invoice from Anthropic
// is in. Stored as integer pence so the metering table stays float-free.
export const ANTHROPIC_COST_PENCE: Record<string, number> = {
  'scan-invoice':    80,  // ~£0.80 per multi-page document scan
  'scan-spec-sheet': 40,  // ~£0.40 per recipe spec
  'import-recipe':   20,  // ~£0.20 per URL/file recipe extraction
  'inbound-email':   80,  // an inbound email runs a scan-invoice pass
};

// recordAnthropicCall logs one call to the metering table. Best-effort:
// any failure is swallowed (caller already returned a successful response
// to the user; we don't want a metering hiccup to surface as an error).
// Call AFTER the Anthropic request succeeds — don't bill the user (or
// ourselves) for calls that didn't actually fire.
export async function recordAnthropicCall(opts: {
  kind: keyof typeof ANTHROPIC_COST_PENCE;
  userId?: string | null;
}) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;
    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const cost = ANTHROPIC_COST_PENCE[opts.kind] ?? 0;
    await supabase.from('anthropic_usage').insert({
      kind: opts.kind,
      cost_pence: cost,
      user_id: opts.userId ?? null,
    });
  } catch (e) {
    console.error('[anthropic usage]', e);
  }
}
