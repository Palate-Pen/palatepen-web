import PostalMime from 'postal-mime';

// Cloudflare Email Worker — runs for every email Cloudflare Email Routing
// delivers to the `mail.palateandpen.co.uk` subdomain. We parse the raw
// MIME, extract attachments (PDF/image), and POST JSON to the Palatable
// webhook in the exact shape `/api/inbound-email/route.ts` expects.
//
// Why this exists instead of using a SaaS inbound provider: keeps invoice
// data out of any third-party email service (chef invoices may include
// supplier prices the user considers commercially sensitive), runs free
// on Cloudflare's Workers free tier, and lives in the same stack as the
// rest of the platform.

export interface Env {
  WEBHOOK_URL: string;
  INBOUND_EMAIL_SECRET: string;
}

interface EmailMessage {
  readonly from: string;
  readonly to: string;
  readonly raw: ReadableStream;
  readonly rawSize: number;
  setReject(reason: string): void;
  forward(rcptTo: string, headers?: Headers): Promise<void>;
}

// Convert an ArrayBuffer / Uint8Array into a base64 string in chunks so
// `String.fromCharCode(...)` doesn't blow the call-stack on large PDFs.
function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, i + CHUNK);
    parts.push(String.fromCharCode(...slice));
  }
  return btoa(parts.join(''));
}

export default {
  async email(message: EmailMessage, env: Env, _ctx: ExecutionContext): Promise<void> {
    // Defensive: if the secret isn't configured we can't authenticate to the
    // webhook, so reject the email rather than silently dropping it. The
    // sender will get an SMTP bounce and we'll see it in Cloudflare logs.
    if (!env.INBOUND_EMAIL_SECRET) {
      message.setReject('Inbound webhook not configured.');
      return;
    }

    // Stream the raw MIME into memory. Cloudflare currently caps Email
    // Worker messages at 25 MB so an ArrayBuffer is safe.
    const rawResponse = new Response(message.raw);
    const rawBuffer = await rawResponse.arrayBuffer();

    let parsed: Awaited<ReturnType<typeof PostalMime.parse>>;
    try {
      parsed = await PostalMime.parse(rawBuffer);
    } catch (err) {
      console.error('[inbound-email worker] MIME parse failed', err);
      message.setReject('Could not parse this email.');
      return;
    }

    // Filter attachments to invoice-shaped MIME types. The webhook does its
    // own filtering too (via isInvoiceAttachment in route.ts) but trimming
    // here avoids shipping a 20 MB body across the wire for an email that
    // contains a single 200 KB PDF plus a giant inline image.
    const KEEP_MIME = /^(application\/pdf|image\/(jpeg|jpg|png|webp|heic))/i;
    const attachments = (parsed.attachments || [])
      .filter(a => a.content && KEEP_MIME.test(a.mimeType || ''))
      .map(a => ({
        filename: a.filename || 'attachment',
        contentType: a.mimeType || 'application/octet-stream',
        content: bytesToBase64(
          a.content instanceof ArrayBuffer
            ? new Uint8Array(a.content)
            : (a.content as Uint8Array),
        ),
      }));

    const payload = {
      to: [message.to],
      from: message.from,
      subject: parsed.subject || '',
      attachments,
    };

    // POST to the Palatable webhook with the shared bearer. The webhook will
    // 401 if the secret doesn't match, 200 with a "skipped" reason for any
    // benign no-op (no token, no attachments, tier ineligible, etc.), or 200
    // with the parsed invoice list on success. We treat every non-2xx as a
    // hard failure so it surfaces in `wrangler tail` logs.
    let res: Response;
    try {
      res = await fetch(env.WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.INBOUND_EMAIL_SECRET}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error('[inbound-email worker] webhook fetch failed', err);
      message.setReject('Inbound webhook unreachable, try again.');
      return;
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[inbound-email worker] webhook rejected', { status: res.status, text });
      // Reject so the sender knows something went wrong — better than a
      // silent black hole. 401 specifically indicates a secret mismatch
      // which the operator needs to fix.
      message.setReject(`Inbound webhook returned ${res.status}.`);
      return;
    }
  },
};
