'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { rotateInboxToken } from './inbox-actions';

const INBOUND_DOMAIN = 'palateandpen.co.uk';

export function InboxTokenPanel({
  initialToken,
  canRotate,
}: {
  initialToken: string | null;
  canRotate: boolean;
}) {
  const router = useRouter();
  const [token, setToken] = useState(initialToken);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const address = token ? `invoices+${token}@${INBOUND_DOMAIN}` : null;

  function generate() {
    if (pending || !canRotate) return;
    setError(null);
    startTransition(async () => {
      const res = await rotateInboxToken();
      if (!res.ok) {
        setError(humaniseError(res.error));
        return;
      }
      setToken(res.token);
      setCopied(false);
      router.refresh();
    });
  }

  async function copy() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy — copy it by hand.");
    }
  }

  return (
    <div className="px-7 py-5 flex flex-col gap-3">
      <div>
        <div className="font-serif text-sm text-ink mb-1">
          Forward supplier invoice emails
        </div>
        <p className="font-serif italic text-xs text-muted leading-relaxed">
          Forward any supplier's email to your private address below — the
          system scans the attachment, extracts the lines, and lands a draft
          invoice in your Inbox. No re-uploading.
        </p>
      </div>

      {token ? (
        <div className="bg-paper-warm border border-rule px-4 py-3 flex items-center gap-3 flex-wrap">
          <code className="font-mono text-sm text-ink flex-1 min-w-0 truncate">
            {address}
          </code>
          <button
            type="button"
            onClick={copy}
            className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold hover:text-gold-dark transition-colors bg-transparent border-0 p-0 cursor-pointer flex-shrink-0"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      ) : (
        <div className="bg-card border border-dashed border-rule px-4 py-3 font-serif italic text-sm text-muted">
          No address set up yet. Generate one to start forwarding emails.
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap pt-1">
        <button
          type="button"
          onClick={generate}
          disabled={pending || !canRotate}
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {pending
            ? token
              ? 'Rotating…'
              : 'Generating…'
            : token
              ? 'Rotate address'
              : 'Generate address'}
        </button>
        {!canRotate && (
          <span className="font-serif italic text-xs text-muted">
            Owner-only — ask the account owner to set this up.
          </span>
        )}
        {error && (
          <span className="font-serif italic text-xs text-urgent">{error}</span>
        )}
      </div>

      {token && (
        <p className="font-serif italic text-xs text-muted leading-relaxed pt-2 border-t border-rule-soft">
          Rotating the address invalidates the old one — every team member
          forwarding to the old address will need the new one. Use only if it's
          been leaked.
        </p>
      )}
    </div>
  );
}

function humaniseError(code: string): string {
  switch (code) {
    case 'not_owner':
      return 'Only the account owner can change this address.';
    case 'token_collision':
      return 'Hit a rare collision — try once more.';
    default:
      return code;
  }
}
