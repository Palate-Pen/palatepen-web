// Single source of truth for the Anthropic model used across server-side AI
// endpoints (recipe import, invoice scan, spec-sheet scan, inbound email).
// Swap once here when moving between Sonnet / Haiku / Opus tiers — there are
// no per-route overrides today.
//
// Pricing context (2026-05): switched from Sonnet 4.6 to Haiku 4.5 for a
// ~13× cost reduction on the document-and-vision payloads we send. Haiku
// handles single-page invoice / spec-sheet scans and clean recipe pages
// reliably; if accuracy degrades on messy handwritten spec sheets we can
// route that one endpoint to a different constant.

export const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';

// Per-call cost estimate in pence. Keyed by the `kind` string we pass into
// recordAnthropicCall below. Calibrated against Haiku 4.5 pricing — roughly
// 13× cheaper than the previous Sonnet 4.6 estimates (80p/40p/20p/80p).
// Stored as integer pence so the metering table stays float-free. Revise
// once a real Haiku-era invoice from Anthropic is in.
export const ANTHROPIC_COST_PENCE: Record<string, number> = {
  'scan-invoice':    6,  // ~£0.06 per multi-page document scan
  'scan-spec-sheet': 3,  // ~£0.03 per recipe spec
  'import-recipe':   2,  // ~£0.02 per URL/file recipe extraction
  'inbound-email':   6,  // an inbound email runs a scan-invoice pass
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
