'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Chef-shell error boundary. Catches any server- or client-rendered
 * exception from a (shell) route and shows a usable fallback with the
 * error message + a retry button. Replaces what was previously a
 * generic blank screen on unhandled throws.
 *
 * `digest` is Next's hashed error id from production logs — surfacing
 * it gives the operator a way to correlate the user-visible page with
 * the Vercel error log.
 */
export default function ChefShellError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Mirror to the browser console so it's also visible in DevTools
    // when chefs report a problem.
    console.error('[(shell) error boundary]', error);
  }, [error]);

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-12 pb-12 max-w-[800px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-urgent mb-3.5">
        Something snagged
      </div>
      <h1 className="font-serif text-4xl font-normal leading-[1.1] tracking-[-0.015em] text-ink">
        This page <em className="text-gold font-semibold not-italic">stumbled</em>
      </h1>
      <p className="font-serif italic text-lg text-muted mt-3 mb-8">
        The error below is what the system saw. Try the action again — most issues are transient. If it keeps happening, screenshot this and send it our way.
      </p>

      <div className="bg-card border border-l-4 border-l-urgent border-rule px-7 py-5 mb-6">
        <div className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-urgent mb-2">
          Error
        </div>
        <p className="font-mono text-sm text-ink-soft whitespace-pre-wrap break-words">
          {error.message || 'Unknown error'}
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-muted-soft mt-3">
            digest · {error.digest}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={reset}
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors"
        >
          Try again
        </button>
        <Link
          href="/"
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-transparent text-muted border border-rule hover:border-gold hover:text-gold transition-colors"
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
