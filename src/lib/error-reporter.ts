/**
 * Lightweight error reporter — gives us notification + traceability
 * without an external dependency. Pre-launch alternative to Sentry; can
 * be replaced with @sentry/nextjs later if traffic justifies it.
 *
 * Two outputs:
 *   1. Structured console.error — Vercel captures it in runtime logs,
 *      always available.
 *   2. Optional POST to `ERROR_WEBHOOK_URL` env var — point this at a
 *      Discord/Slack incoming webhook or a Zapier catch hook to get
 *      pushed alerts. Silent fallback if unset, never blocks rendering.
 *
 * Every reported error gets a short request_id we can surface to the
 * user so they can quote it when emailing hello@palateandpen.co.uk.
 */

export type ReportedErrorContext = {
  /** Route the error fired on (best-effort — Next doesn't expose this in
   *  error boundaries directly, so call sites pass `digest` and a hint). */
  route?: string;
  /** Free-form severity tag. 'fatal' triggers louder webhook formatting. */
  level?: 'info' | 'warn' | 'error' | 'fatal';
  /** Hash Next.js attaches to the error for matching server/client. */
  digest?: string;
  /** Any extra structured context (user id, account id, action name). */
  extra?: Record<string, unknown>;
};

export type ReportedError = {
  request_id: string;
  timestamp_iso: string;
};

/**
 * Capture an error. Always returns a request_id the caller can show to
 * the end user. Never throws — failures in reporting must not cascade
 * into the original error path.
 */
export function reportError(
  error: unknown,
  context: ReportedErrorContext = {},
): ReportedError {
  const request_id = randomRequestId();
  const timestamp_iso = new Date().toISOString();
  const level = context.level ?? 'error';

  const err =
    error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack ?? null,
        }
      : { name: 'NonError', message: String(error), stack: null };

  const payload: NormalisedPayload = {
    request_id,
    timestamp_iso,
    level,
    error: err,
    route: context.route ?? null,
    digest: context.digest ?? null,
    extra: context.extra ?? null,
  };

  // Always log to console — Vercel runtime logs capture this for free.
  try {
    // Single-line JSON so log aggregators can index cleanly.
    console.error('[palatable.error]', JSON.stringify(payload));
  } catch {
    // Defensive: a circular reference shouldn't kill the reporter.
    console.error('[palatable.error] (unstringifiable payload)', request_id);
  }

  // Fire-and-forget webhook push, if configured.
  const webhookUrl = process.env.ERROR_WEBHOOK_URL;
  if (webhookUrl) {
    void pushToWebhook(webhookUrl, payload);
  }

  return { request_id, timestamp_iso };
}

type NormalisedPayload = {
  request_id: string;
  timestamp_iso: string;
  level: 'info' | 'warn' | 'error' | 'fatal';
  error: { name: string; message: string; stack: string | null };
  route: string | null;
  digest: string | null;
  extra: Record<string, unknown> | null;
};

async function pushToWebhook(url: string, payload: NormalisedPayload) {
  try {
    // Discord + Slack both accept `{ content: string }`; for richer
    // formats either platform can ingest the full JSON via Zapier. Keep
    // the body small so both work out of the box.
    const isFatal = payload.level === 'fatal';
    const emoji = isFatal ? '🔥' : '⚠️';
    const short =
      `${emoji} **${payload.level.toUpperCase()}** \`${payload.request_id}\`\n` +
      `${payload.error.name}: ${payload.error.message}\n` +
      (payload.route ? `route: \`${payload.route}\`\n` : '') +
      (payload.digest ? `digest: \`${payload.digest}\`\n` : '') +
      `time: ${payload.timestamp_iso}`;

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: short, payload }),
    });
  } catch {
    // Reporter failures must not propagate.
  }
}

function randomRequestId(): string {
  // Short, human-quotable id. Looks like "err_a4f2b1".
  const hex =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 6)
      : Math.random().toString(16).slice(2, 8);
  return 'err_' + hex;
}
