'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { reportError } from '@/lib/error-reporter';

/**
 * Shared error UI used by every route-group error.tsx. Reports through
 * the lightweight error-reporter (console + optional webhook) and
 * surfaces a quotable request_id so customers can email support without
 * us having to dig blind through logs.
 *
 * Each error.tsx wraps this with a `route` label so the webhook payload
 * shows where the error fired.
 */
export function RouteErrorPane({
  error,
  reset,
  route,
  homeHref = '/',
}: {
  error: Error & { digest?: string };
  reset: () => void;
  /** Identifies the route group in the error report (e.g. 'landing'). */
  route: string;
  /** Where the "Back home" button lands. */
  homeHref?: string;
}) {
  const [requestId, setRequestId] = useState<string>('—');

  useEffect(() => {
    const r = reportError(error, {
      route,
      level: 'error',
      digest: error.digest,
    });
    setRequestId(r.request_id);
  }, [error, route]);

  return (
    <div className="bg-paper min-h-screen flex flex-col">
      <header className="px-6 md:px-10 py-8 border-b border-rule">
        <Link
          href={homeHref}
          className="font-display font-semibold text-sm tracking-[0.3em] uppercase text-ink no-underline inline-flex items-center gap-1.5"
        >
          Palatable
          <span className="w-1.5 h-1.5 rounded-full bg-gold" aria-hidden />
        </Link>
      </header>

      <main className="flex-1 w-full max-w-[680px] mx-auto px-6 md:px-10 py-16 md:py-24 flex flex-col justify-center">
        <div className="font-display font-semibold text-[11px] tracking-[0.4em] uppercase text-urgent mb-5">
          Something burnt
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-normal text-ink leading-[1.05] tracking-[-0.02em] mb-5">
          That didn&apos;t go to{' '}
          <em className="text-gold italic font-medium">plan</em>.
        </h1>
        <p className="font-serif italic text-lg text-muted mb-10 leading-relaxed">
          Something unexpected blew up on this page. Try again — most of
          the time it&apos;ll just work the second time.
        </p>

        <div className="flex flex-col md:flex-row gap-3 mb-10">
          <button
            type="button"
            onClick={reset}
            className="font-display font-semibold text-[11px] tracking-[0.35em] uppercase px-7 py-4 bg-ink text-paper border border-ink hover:bg-gold hover:border-gold transition-colors"
          >
            Try again
          </button>
          <Link
            href={homeHref}
            className="font-display font-semibold text-[11px] tracking-[0.35em] uppercase px-7 py-4 bg-transparent text-ink border border-ink hover:bg-ink hover:text-paper transition-colors text-center"
          >
            Back home
          </Link>
        </div>

        <div className="bg-paper-warm border-l-[3px] border-gold px-6 py-5">
          <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-gold mb-2">
            If it keeps happening
          </div>
          <p className="font-serif text-[15px] text-ink-soft leading-relaxed">
            Email{' '}
            <a
              href={`mailto:hello@palateandpen.co.uk?subject=Palatable%20error%20${requestId}`}
              className="text-gold hover:text-gold-dark transition-colors underline-offset-2 hover:underline"
            >
              hello@palateandpen.co.uk
            </a>{' '}
            and quote{' '}
            <code className="font-mono text-sm bg-paper border border-rule px-1.5 py-0.5">
              {requestId}
            </code>
            {' '}— we&apos;ll find it in the logs.
          </p>
        </div>
      </main>
    </div>
  );
}
