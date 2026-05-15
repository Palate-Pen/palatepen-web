/* eslint-disable no-console */
/*
 * setup-002-intelligence-lib.js
 *
 * Writes the TypeScript libraries for the event-bus + feature flags +
 * AI voice helper + behavioural-gap detector. All files use plain ASCII
 * + LF line endings to avoid Windows encoding surprises.
 *
 *   src/lib/event-drain.ts         — kind -> detector router, idempotent drain
 *   src/lib/features.ts            — FEATURE_REGISTRY + userHasFeature
 *   src/lib/ai-voice.ts            — Haiku voice helper, cost-metered
 *   src/lib/detectors/behavioural-gap.ts — generic recurrence-gap primitive + 3 concrete detectors
 *
 * Run with: node scripts/setup-002-intelligence-lib.js
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
// src/lib/event-drain.ts
// ---------------------------------------------------------------------
const eventDrain = `import { createSupabaseServiceClient } from '@/lib/supabase/service';
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
    const key = \`\${e.site_id}::\${e.kind}\`;
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
`;

// ---------------------------------------------------------------------
// src/lib/features.ts
// ---------------------------------------------------------------------
const features = `import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * The Palatable feature registry. Every gateable feature lives here.
 * Each entry specifies which roles have it ON by default and which tier
 * is required for the feature to exist at all. Per-user overrides via
 * v2.feature_flags overlay on top.
 *
 * Adding a feature: add an entry here, then surface a toggle row in the
 * /owner/team or /manager/team matrix. RLS still applies independently;
 * feature flags are a UX-level lock, not a security boundary.
 */

export type FeatureKey =
  | 'recipes.edit'
  | 'recipes.create'
  | 'recipes.archive'
  | 'bank.edit_prices'
  | 'bank.add_ingredients'
  | 'invoices.scan'
  | 'invoices.flag'
  | 'invoices.confirm'
  | 'credit_notes.draft'
  | 'credit_notes.send'
  | 'purchase_orders.draft'
  | 'purchase_orders.send'
  | 'stock_transfers.draft'
  | 'stock_transfers.send'
  | 'menus.publish'
  | 'menu_plans.create'
  | 'waste.log'
  | 'team.manage'
  | 'connections.manage'
  | 'safety.opening_checks'
  | 'safety.probe_readings'
  | 'safety.incidents'
  | 'safety.cleaning'
  | 'safety.training_records'
  | 'safety.haccp'
  | 'safety.eho_visit';

type ShellRole =
  | 'owner'
  | 'manager'
  | 'chef'
  | 'sous_chef'
  | 'commis'
  | 'bartender'
  | 'head_bartender'
  | 'bar_back'
  | 'viewer';

type TierKey = 'free' | 'pro' | 'kitchen' | 'group' | 'enterprise';

type FeatureDef = {
  key: FeatureKey;
  label: string;
  description: string;
  group: 'kitchen' | 'bar' | 'finance' | 'safety' | 'admin';
  /** Tier at which the feature becomes available. */
  min_tier: TierKey;
  /** Roles that have the feature ON by default. */
  default_roles: ShellRole[];
};

const TIER_RANK: Record<TierKey, number> = {
  free: 0,
  pro: 1,
  kitchen: 2,
  group: 3,
  enterprise: 4,
};

const FEATURE_REGISTRY: Record<FeatureKey, FeatureDef> = {
  'recipes.edit': {
    key: 'recipes.edit',
    label: 'Edit recipes',
    description: 'Change name, method, sell price, ingredients.',
    group: 'kitchen',
    min_tier: 'pro',
    default_roles: ['owner', 'manager', 'chef', 'sous_chef'],
  },
  'recipes.create': {
    key: 'recipes.create',
    label: 'Create recipes',
    description: 'Add new dishes to the book.',
    group: 'kitchen',
    min_tier: 'pro',
    default_roles: ['owner', 'manager', 'chef', 'sous_chef'],
  },
  'recipes.archive': {
    key: 'recipes.archive',
    label: 'Archive recipes',
    description: 'Remove dishes from the live book.',
    group: 'kitchen',
    min_tier: 'pro',
    default_roles: ['owner', 'manager', 'chef'],
  },
  'bank.edit_prices': {
    key: 'bank.edit_prices',
    label: 'Edit Bank prices',
    description: 'Manually adjust ingredient current_price.',
    group: 'finance',
    min_tier: 'pro',
    default_roles: ['owner', 'manager', 'chef'],
  },
  'bank.add_ingredients': {
    key: 'bank.add_ingredients',
    label: 'Add Bank ingredients',
    description: 'Create new ingredient rows.',
    group: 'kitchen',
    min_tier: 'pro',
    default_roles: ['owner', 'manager', 'chef', 'sous_chef'],
  },
  'invoices.scan': {
    key: 'invoices.scan',
    label: 'Scan invoices',
    description: 'Use the AI vision pipeline to extract invoice lines.',
    group: 'finance',
    min_tier: 'pro',
    default_roles: ['owner', 'manager', 'chef'],
  },
  'invoices.flag': {
    key: 'invoices.flag',
    label: 'Flag invoice discrepancies',
    description: 'Mark received-vs-ordered mismatches.',
    group: 'finance',
    min_tier: 'pro',
    default_roles: ['owner', 'manager', 'chef'],
  },
  'invoices.confirm': {
    key: 'invoices.confirm',
    label: 'Confirm invoices',
    description: 'Bank a scanned invoice into the cost-side ledger.',
    group: 'finance',
    min_tier: 'pro',
    default_roles: ['owner', 'manager', 'chef'],
  },
  'credit_notes.draft': {
    key: 'credit_notes.draft',
    label: 'Draft credit notes',
    description: 'Compose a credit-note from a flagged invoice.',
    group: 'finance',
    min_tier: 'kitchen',
    default_roles: ['owner', 'manager'],
  },
  'credit_notes.send': {
    key: 'credit_notes.send',
    label: 'Send credit notes',
    description: 'Mail a draft credit note to the supplier.',
    group: 'finance',
    min_tier: 'kitchen',
    default_roles: ['owner', 'manager'],
  },
  'purchase_orders.draft': {
    key: 'purchase_orders.draft',
    label: 'Draft purchase orders',
    description: 'Start a PO from below-par suggestions.',
    group: 'finance',
    min_tier: 'kitchen',
    default_roles: ['owner', 'manager', 'chef'],
  },
  'purchase_orders.send': {
    key: 'purchase_orders.send',
    label: 'Send purchase orders',
    description: 'Lock a PO and mail it to the supplier.',
    group: 'finance',
    min_tier: 'kitchen',
    default_roles: ['owner', 'manager'],
  },
  'stock_transfers.draft': {
    key: 'stock_transfers.draft',
    label: 'Draft stock transfers',
    description: 'Start a stock transfer between pools or sites.',
    group: 'kitchen',
    min_tier: 'kitchen',
    default_roles: ['owner', 'manager', 'chef', 'sous_chef', 'head_bartender', 'bartender'],
  },
  'stock_transfers.send': {
    key: 'stock_transfers.send',
    label: 'Send stock transfers',
    description: 'Commit a transfer (source stock decrements).',
    group: 'kitchen',
    min_tier: 'kitchen',
    default_roles: ['owner', 'manager', 'chef', 'head_bartender'],
  },
  'menus.publish': {
    key: 'menus.publish',
    label: 'Publish menus',
    description: 'Push a menu version live on the public reader.',
    group: 'kitchen',
    min_tier: 'kitchen',
    default_roles: ['owner', 'manager', 'chef'],
  },
  'menu_plans.create': {
    key: 'menu_plans.create',
    label: 'Create menu plans',
    description: 'Build a forward menu plan with the Kasavana matrix.',
    group: 'kitchen',
    min_tier: 'kitchen',
    default_roles: ['owner', 'manager', 'chef'],
  },
  'waste.log': {
    key: 'waste.log',
    label: 'Log waste',
    description: 'Record binned items + value into the waste ledger.',
    group: 'kitchen',
    min_tier: 'pro',
    default_roles: ['owner', 'manager', 'chef', 'sous_chef', 'commis', 'head_bartender', 'bartender'],
  },
  'team.manage': {
    key: 'team.manage',
    label: 'Manage team',
    description: 'Invite, remove, change role + feature flags for team members.',
    group: 'admin',
    min_tier: 'kitchen',
    default_roles: ['owner', 'manager'],
  },
  'connections.manage': {
    key: 'connections.manage',
    label: 'Manage integrations',
    description: 'Wire up POS, accountant, inbound email keys.',
    group: 'admin',
    min_tier: 'kitchen',
    default_roles: ['owner', 'manager'],
  },
  'safety.opening_checks': {
    key: 'safety.opening_checks',
    label: 'Opening checks',
    description: 'Complete the daily opening-checks SFBB diary entry.',
    group: 'safety',
    min_tier: 'kitchen',
    default_roles: ['owner', 'manager', 'chef', 'sous_chef'],
  },
  'safety.probe_readings': {
    key: 'safety.probe_readings',
    label: 'Probe readings',
    description: 'Log temperature probe readings.',
    group: 'safety',
    min_tier: 'kitchen',
    default_roles: ['owner', 'manager', 'chef', 'sous_chef', 'commis'],
  },
  'safety.incidents': {
    key: 'safety.incidents',
    label: 'Log incidents',
    description: 'Record complaints, allergens, near-misses, illness.',
    group: 'safety',
    min_tier: 'kitchen',
    default_roles: ['owner', 'manager', 'chef', 'sous_chef'],
  },
  'safety.cleaning': {
    key: 'safety.cleaning',
    label: 'Cleaning sign-off',
    description: 'Tick off the cleaning schedule.',
    group: 'safety',
    min_tier: 'kitchen',
    default_roles: ['owner', 'manager', 'chef', 'sous_chef', 'commis'],
  },
  'safety.training_records': {
    key: 'safety.training_records',
    label: 'Training records',
    description: 'Maintain staff certification + expiry tracking.',
    group: 'safety',
    min_tier: 'kitchen',
    default_roles: ['owner', 'manager'],
  },
  'safety.haccp': {
    key: 'safety.haccp',
    label: 'HACCP wizard',
    description: 'Build + maintain HACCP plans.',
    group: 'safety',
    min_tier: 'kitchen',
    default_roles: ['owner', 'manager', 'chef'],
  },
  'safety.eho_visit': {
    key: 'safety.eho_visit',
    label: 'EHO Visit mode',
    description: 'Run the inspection control desk + export the audit bundle.',
    group: 'safety',
    min_tier: 'kitchen',
    default_roles: ['owner', 'manager'],
  },
};

export { FEATURE_REGISTRY };

export type FeatureFlagOverride = {
  membership_id: string;
  feature_key: FeatureKey;
  enabled: boolean;
};

export function isFeatureAvailableAtTier(
  feature: FeatureKey,
  tier: string,
): boolean {
  const def = FEATURE_REGISTRY[feature];
  if (!def) return false;
  const userTierRank = TIER_RANK[tier.toLowerCase() as TierKey] ?? 0;
  const requiredRank = TIER_RANK[def.min_tier];
  return userTierRank >= requiredRank;
}

export function isFeatureOnByDefault(
  feature: FeatureKey,
  role: ShellRole,
): boolean {
  const def = FEATURE_REGISTRY[feature];
  if (!def) return false;
  return def.default_roles.includes(role);
}

/**
 * Resolve effective access for one user at one site:
 *   1. If tier doesn't include the feature, return false.
 *   2. If an override row exists, use it.
 *   3. Otherwise use the role default.
 */
export async function userHasFeature(
  userId: string,
  siteId: string,
  feature: FeatureKey,
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();

  const { data: site } = await supabase
    .from('sites')
    .select('account_id')
    .eq('id', siteId)
    .maybeSingle();
  if (!site) return false;

  const { data: account } = await supabase
    .from('accounts')
    .select('tier')
    .eq('id', site.account_id)
    .maybeSingle();
  const tier = (account?.tier as string | undefined) ?? 'free';
  if (!isFeatureAvailableAtTier(feature, tier)) return false;

  const { data: membership } = await supabase
    .from('memberships')
    .select('id, role')
    .eq('user_id', userId)
    .eq('site_id', siteId)
    .maybeSingle();
  if (!membership) return false;

  const { data: override } = await supabase
    .from('feature_flags')
    .select('enabled')
    .eq('membership_id', membership.id)
    .eq('feature_key', feature)
    .maybeSingle();

  if (override) return Boolean(override.enabled);
  return isFeatureOnByDefault(feature, membership.role as ShellRole);
}

export type FeatureMatrixCell = {
  feature: FeatureKey;
  enabled: boolean;
  source: 'role' | 'override';
};

/**
 * Resolve every feature for a single membership in one pass. Used by
 * /owner/team + /manager/team to render the toggle matrix.
 */
export async function resolveFeatureMatrix(
  membershipId: string,
): Promise<FeatureMatrixCell[]> {
  const supabase = await createSupabaseServerClient();
  const { data: m } = await supabase
    .from('memberships')
    .select('role, site_id, sites:site_id (account_id)')
    .eq('id', membershipId)
    .maybeSingle();
  if (!m) return [];
  const role = m.role as ShellRole;
  const accountId =
    (m.sites as unknown as { account_id: string } | null)?.account_id;
  let tier: string = 'free';
  if (accountId) {
    const { data: a } = await supabase
      .from('accounts')
      .select('tier')
      .eq('id', accountId)
      .maybeSingle();
    tier = (a?.tier as string | undefined) ?? 'free';
  }

  const { data: overrides } = await supabase
    .from('feature_flags')
    .select('feature_key, enabled')
    .eq('membership_id', membershipId);
  const overrideMap = new Map<string, boolean>();
  for (const o of overrides ?? []) {
    overrideMap.set(o.feature_key as string, Boolean(o.enabled));
  }

  const out: FeatureMatrixCell[] = [];
  for (const def of Object.values(FEATURE_REGISTRY)) {
    if (!isFeatureAvailableAtTier(def.key, tier)) continue;
    const override = overrideMap.get(def.key);
    if (override !== undefined) {
      out.push({ feature: def.key, enabled: override, source: 'override' });
    } else {
      out.push({
        feature: def.key,
        enabled: isFeatureOnByDefault(def.key, role),
        source: 'role',
      });
    }
  }
  return out;
}
`;

// ---------------------------------------------------------------------
// src/lib/ai-voice.ts — Haiku voice helper, cost-metered
// ---------------------------------------------------------------------
const aiVoice = `import { createSupabaseServiceClient } from '@/lib/supabase/service';

/**
 * Haiku-powered "voice" enhancement for forward signals.
 *
 * A detector emits a raw signal with terse default copy. If the site is
 * on Kitchen tier or higher, this helper can rewrite the headline +
 * body in Palatable's sous-chef voice (day-not-time, italic gold em
 * accents, no AI / algorithm language, voice tracks severity).
 *
 * Every call is metered to v2.anthropic_usage so the admin Infrastructure
 * dashboard reads actual spend. Callers must pass account_id so the
 * usage row attributes correctly. Soft fail: if the API call errors or
 * tier is too low, we return the raw input unchanged so the signal
 * still ships.
 *
 * Model: claude-haiku-4-5-20251001 (the central model id from
 * src/lib/anthropic.ts; swap here only when the central id changes).
 *
 * Pricing (Anthropic, 2026-05): Haiku 4.5 is roughly
 *   input: GBP 0.00072 / 1k tokens
 *   output: GBP 0.0036 / 1k tokens
 * Per signal we use ~400 input + ~80 output tokens, so a re-voiced
 * signal costs around 0.06p. Effectively free at single-site volumes,
 * but still metered.
 */

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

// Approximate GBP per 1k tokens. Centralised here so the meter agrees
// with the admin dashboard's formula.
const INPUT_PENCE_PER_K = 0.072;
const OUTPUT_PENCE_PER_K = 0.36;

const TIER_RANK: Record<string, number> = {
  free: 0,
  pro: 1,
  kitchen: 2,
  group: 3,
  enterprise: 4,
};

export type RawSignalCopy = {
  section_label: string;
  headline_pre: string | null;
  headline_em: string | null;
  headline_post: string | null;
  body_md: string;
  severity: 'urgent' | 'attention' | 'healthy' | 'info';
};

export type VoicedSignalCopy = RawSignalCopy;

export type VoiceRequest = {
  account_id: string;
  tier: string;
  raw: RawSignalCopy;
  /** Plain summary of what triggered the signal, for the model to chew on. */
  context: string;
};

/**
 * Returns the input unchanged if:
 *   - tier is below Kitchen
 *   - ANTHROPIC_API_KEY is not set
 *   - the API call fails (logged but not thrown)
 *
 * Otherwise: returns a re-voiced copy of the signal text.
 */
export async function enhanceSignalVoice(
  req: VoiceRequest,
): Promise<VoicedSignalCopy> {
  const tierRank = TIER_RANK[(req.tier ?? 'free').toLowerCase()] ?? 0;
  if (tierRank < 2) return req.raw; // Pro and below stay on default voice

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return req.raw;

  const systemPrompt = [
    "You are the editorial voice of Palatable, a chef-facing kitchen toolkit.",
    "Rewrite a forward signal in this exact voice:",
    "- day-not-time references ('Thursday', not '14:23')",
    "- italic gold accents go in headline_em (one short phrase, 2-5 words)",
    "- headline_pre + headline_em + headline_post concatenate into a single sentence with a soft, observational tone",
    "- never say 'AI', 'algorithm', 'data shows', 'we detected', 'the system'",
    "- voice tracks severity: urgent = direct, attention = noticing, info = casual",
    "- body_md is one sentence in serif italic voice, mentions one concrete next step without commanding it",
    "- preserve all numbers, supplier names, ingredient names verbatim from the context",
    "Output STRICT JSON with keys: section_label, headline_pre, headline_em, headline_post, body_md. No prose outside the JSON.",
  ].join('\\n');

  const userPrompt = [
    'Severity: ' + req.raw.severity,
    'Section label: ' + req.raw.section_label,
    '',
    'Original copy:',
    '  pre: ' + (req.raw.headline_pre ?? ''),
    '  em: ' + (req.raw.headline_em ?? ''),
    '  post: ' + (req.raw.headline_post ?? ''),
    '  body_md: ' + req.raw.body_md,
    '',
    'Context: ' + req.context,
  ].join('\\n');

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: HAIKU_MODEL,
        max_tokens: 400,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    if (!res.ok) {
      return req.raw;
    }
    const j = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = (j.content ?? []).find((c) => c.type === 'text')?.text ?? '';
    const parsed = safeJsonExtract(text);
    if (!parsed) return req.raw;

    // Meter the call against the account.
    const inTok = j.usage?.input_tokens ?? 0;
    const outTok = j.usage?.output_tokens ?? 0;
    const costPence =
      (inTok / 1000) * INPUT_PENCE_PER_K +
      (outTok / 1000) * OUTPUT_PENCE_PER_K;
    await meterUsage({
      account_id: req.account_id,
      model: HAIKU_MODEL,
      surface: 'signal_voice',
      in_tokens: inTok,
      out_tokens: outTok,
      cost_pence: costPence,
    });

    return {
      section_label: parsed.section_label ?? req.raw.section_label,
      headline_pre: parsed.headline_pre ?? req.raw.headline_pre,
      headline_em: parsed.headline_em ?? req.raw.headline_em,
      headline_post: parsed.headline_post ?? req.raw.headline_post,
      body_md: parsed.body_md ?? req.raw.body_md,
      severity: req.raw.severity,
    };
  } catch {
    return req.raw;
  }
}

function safeJsonExtract(text: string): Record<string, string> | null {
  // Models occasionally wrap JSON in code fences or trailing prose. Strip
  // both and try to parse the first {...} block.
  const stripped = text.replace(/\`\`\`(?:json)?/g, '').trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start < 0 || end < start) return null;
  try {
    return JSON.parse(stripped.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function meterUsage(row: {
  account_id: string;
  model: string;
  surface: string;
  in_tokens: number;
  out_tokens: number;
  cost_pence: number;
}): Promise<void> {
  try {
    const svc = createSupabaseServiceClient();
    await svc.from('anthropic_usage').insert({
      account_id: row.account_id,
      model: row.model,
      surface: row.surface,
      in_tokens: row.in_tokens,
      out_tokens: row.out_tokens,
      cost_pence: row.cost_pence,
    });
  } catch {
    // Metering failure must not break the signal pipeline.
  }
}
`;

// ---------------------------------------------------------------------
// src/lib/detectors/behavioural-gap.ts
// ---------------------------------------------------------------------
const behaviouralGap = `import type { createSupabaseServiceClient } from '@/lib/supabase/service';

/**
 * Behavioural-gap primitive. Looks at a rolling event history and
 * detects when an expected recurrence has broken: 'you usually log
 * waste on Mondays - the last 3 Mondays had nothing.'
 *
 * Generic enough to be reused across waste, deliveries, prep, invoices,
 * stock takes. Each concrete detector below configures the primitive
 * with a table, a date column, and an optional grouping key.
 */

type SupaClient = ReturnType<typeof createSupabaseServiceClient>;

const WEEKDAY = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function isoNow(): string {
  return new Date().toISOString();
}

function isoIn(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

type GapResult = {
  weekday: number;
  consecutive_misses: number;
  typical_count: number;
  weeks_observed: number;
};

/**
 * For each day-of-week, decide whether the last few occurrences of that
 * weekday had ZERO events compared to a baseline where they typically
 * had >= 1. Returns the worst-offending weekday, or null.
 *
 * Heuristic:
 *   - look at the last 8 weeks of dates
 *   - bucket by day-of-week
 *   - on weeks the chef DID have at least one matching event for that
 *     weekday, count this as 'typical'
 *   - if typical_count >= 4 AND the last 3 occurrences of that weekday
 *     had zero events, it's a gap.
 */
function findRecurringGap(
  datesIso: string[],
): GapResult | null {
  if (datesIso.length === 0) return null;

  const today = new Date();
  const eightWeeksAgo = new Date(Date.now() - 56 * 24 * 60 * 60 * 1000);

  // For each weekday, build a per-week presence map.
  const byWeekday: Map<number, Map<string, boolean>> = new Map();
  for (let dow = 0; dow < 7; dow++) byWeekday.set(dow, new Map());

  const cursor = new Date(eightWeeksAgo);
  while (cursor <= today) {
    const iso = cursor.toISOString().slice(0, 10);
    const dow = cursor.getDay();
    const weekKey = isoWeekKey(cursor);
    if (!byWeekday.get(dow)!.has(weekKey)) {
      byWeekday.get(dow)!.set(weekKey, false);
    }
    if (datesIso.includes(iso)) {
      byWeekday.get(dow)!.set(weekKey, true);
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  let worst: GapResult | null = null;
  for (let dow = 0; dow < 7; dow++) {
    const weeks = Array.from(byWeekday.get(dow)!.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
    const typicalCount = weeks.filter(([, has]) => has).length;
    if (typicalCount < 4) continue;
    const recent = weeks.slice(-3);
    if (recent.length < 3) continue;
    const allMissed = recent.every(([, has]) => !has);
    if (!allMissed) continue;
    const candidate = {
      weekday: dow,
      consecutive_misses: recent.length,
      typical_count: typicalCount,
      weeks_observed: weeks.length,
    };
    if (
      !worst ||
      candidate.consecutive_misses > worst.consecutive_misses ||
      candidate.typical_count > worst.typical_count
    ) {
      worst = candidate;
    }
  }
  return worst;
}

function isoWeekKey(d: Date): string {
  // ISO year-week (1-based). Good enough for grouping.
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return tmp.getUTCFullYear() + '-W' + String(week).padStart(2, '0');
}

// ---------------------------------------------------------------------
// Concrete detectors
// ---------------------------------------------------------------------

/**
 * Waste gap. Chef typically logs waste on a given weekday but the last
 * N occurrences had nothing. Either the routine slipped or waste is
 * happening unrecorded.
 */
export async function detectWasteGap(
  svc: SupaClient,
  siteId: string,
): Promise<Array<Record<string, unknown>>> {
  const { data } = await svc
    .from('waste_entries')
    .select('logged_at')
    .eq('site_id', siteId)
    .gte(
      'logged_at',
      new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString(),
    );
  if (!data || data.length === 0) return [];

  const dates = (data as Array<{ logged_at: string }>).map((r) =>
    new Date(r.logged_at).toISOString().slice(0, 10),
  );
  const gap = findRecurringGap(dates);
  if (!gap) return [];

  const weekdayName = WEEKDAY[gap.weekday];
  return [
    {
      site_id: siteId,
      target_surface: 'stock-suppliers',
      target_role: 'chef',
      tag: 'worth_knowing',
      severity: 'attention',
      section_label: 'Routine slipped',
      headline_pre: 'Waste log usually lands on a ',
      headline_em: weekdayName,
      headline_post:
        ' - the last ' + gap.consecutive_misses + ' have been empty',
      body_md:
        'Across the last 8 weeks ' +
        weekdayName +
        ' had at least one waste entry on **' +
        gap.typical_count +
        ' of ' +
        gap.weeks_observed +
        '** weeks. Either the routine slipped, or waste is going unlogged. Worth a five-minute sweep at the end of service.',
      action_label: 'Open Waste →',
      action_target: '/stock-suppliers/waste',
      action_context: null,
      detector_kind: 'auto',
      detector_key: 'waste_gap',
      payload: gap,
      display_priority: 40,
      emitted_at: isoNow(),
      expires_at: isoIn(7),
    },
  ];
}

/**
 * Delivery gap. Supplier usually delivers on a given weekday but the
 * last few haven't arrived. Either rescheduled or worth a call.
 */
export async function detectDeliveryGap(
  svc: SupaClient,
  siteId: string,
): Promise<Array<Record<string, unknown>>> {
  const { data: deliveries } = await svc
    .from('deliveries')
    .select('supplier_id, received_at, suppliers:supplier_id (name)')
    .eq('site_id', siteId)
    .not('received_at', 'is', null)
    .gte(
      'received_at',
      new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString(),
    );
  if (!deliveries || deliveries.length === 0) return [];

  // Group by supplier and run the gap detector per supplier.
  const bySupplier = new Map<
    string,
    { name: string; dates: string[] }
  >();
  for (const row of deliveries as unknown as Array<{
    supplier_id: string | null;
    received_at: string;
    suppliers: { name: string } | null;
  }>) {
    if (!row.supplier_id) continue;
    const key = row.supplier_id;
    const cur = bySupplier.get(key) ?? {
      name: row.suppliers?.name ?? 'Supplier',
      dates: [],
    };
    cur.dates.push(new Date(row.received_at).toISOString().slice(0, 10));
    bySupplier.set(key, cur);
  }

  const signals: Array<Record<string, unknown>> = [];
  for (const [supplierId, info] of bySupplier.entries()) {
    const gap = findRecurringGap(info.dates);
    if (!gap) continue;
    const weekdayName = WEEKDAY[gap.weekday];
    signals.push({
      site_id: siteId,
      target_surface: 'stock-suppliers',
      target_role: 'chef',
      tag: 'plan_for_it',
      severity: 'attention',
      section_label: 'Supplier rhythm broken',
      headline_pre: info.name + ' usually delivers on a ',
      headline_em: weekdayName,
      headline_post:
        ' - the last ' + gap.consecutive_misses + ' have been missed',
      body_md:
        'A delivery from **' +
        info.name +
        '** has landed on ' +
        weekdayName +
        ' in **' +
        gap.typical_count +
        ' of the last 8** weeks. The last ' +
        gap.consecutive_misses +
        " haven't shown. Worth a call before stock runs thin.",
      action_label: 'Open Suppliers →',
      action_target: '/stock-suppliers/suppliers/' + supplierId,
      action_context: null,
      detector_kind: 'auto',
      detector_key: 'delivery_gap:' + supplierId,
      payload: { ...gap, supplier_id: supplierId },
      display_priority: 50,
      emitted_at: isoNow(),
      expires_at: isoIn(7),
    });
  }
  return signals;
}

/**
 * Prep routine gap. Same idea applied to prep_items: the kitchen
 * typically preps on a given weekday but the last few have been blank.
 */
export async function detectPrepRoutineGap(
  svc: SupaClient,
  siteId: string,
): Promise<Array<Record<string, unknown>>> {
  const { data } = await svc
    .from('prep_items')
    .select('prep_date, status')
    .eq('site_id', siteId)
    .gte(
      'prep_date',
      new Date(Date.now() - 56 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
    );
  if (!data || data.length === 0) return [];

  // Only count days where at least one prep item existed (any status).
  const dates = Array.from(
    new Set(
      (data as Array<{ prep_date: string }>).map((r) => r.prep_date),
    ),
  );
  const gap = findRecurringGap(dates);
  if (!gap) return [];

  const weekdayName = WEEKDAY[gap.weekday];
  return [
    {
      site_id: siteId,
      target_surface: 'prep',
      target_role: 'chef',
      tag: 'worth_knowing',
      severity: 'info',
      section_label: 'Prep rhythm slipped',
      headline_pre: 'Prep board usually has work on a ',
      headline_em: weekdayName,
      headline_post:
        ' - the last ' +
        gap.consecutive_misses +
        " have been quiet",
      body_md:
        weekdayName +
        ' had at least one prep entry on **' +
        gap.typical_count +
        ' of the last 8** weeks. Three quiet ones in a row is unusual. Either the menu shifted, or the prep board is going unlogged.',
      action_label: 'Open Prep →',
      action_target: '/prep',
      action_context: null,
      detector_kind: 'auto',
      detector_key: 'prep_routine_gap',
      payload: gap,
      display_priority: 30,
      emitted_at: isoNow(),
      expires_at: isoIn(7),
    },
  ];
}
`;

write('src/lib/event-drain.ts', eventDrain);
write('src/lib/features.ts', features);
write('src/lib/ai-voice.ts', aiVoice);
write('src/lib/detectors/behavioural-gap.ts', behaviouralGap);

console.log('\ndone');
