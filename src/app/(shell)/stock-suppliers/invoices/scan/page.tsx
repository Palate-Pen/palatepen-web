'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

type ScanState = 'idle' | 'scanning' | 'error';

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];

export default function ScanInvoicePage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<ScanState>('idle');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function pickFile(next: File | null) {
    setError(null);
    if (!next) {
      setFile(null);
      return;
    }
    if (!ALLOWED_MIME.includes(next.type)) {
      setError(
        `That file type (${next.type || 'unknown'}) isn't supported. Use JPG, PNG, WebP, GIF, or PDF.`,
      );
      return;
    }
    if (next.size > MAX_BYTES) {
      setError(
        `File is ${(next.size / 1024 / 1024).toFixed(1)}MB — max is 4MB. Try a smaller scan.`,
      );
      return;
    }
    setFile(next);
  }

  async function submit() {
    if (!file || state === 'scanning') return;
    setState('scanning');
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/palatable/scan-invoice', {
        method: 'POST',
        body: fd,
      });
      const json = (await res.json()) as {
        ok?: boolean;
        invoice_id?: string;
        error?: string;
        detail?: string;
      };
      if (!res.ok || !json.ok || !json.invoice_id) {
        setError(
          json.detail ||
            json.error ||
            `Scanning failed (HTTP ${res.status}). Try again or upload by hand.`,
        );
        setState('error');
        return;
      }
      router.push(`/stock-suppliers/invoices/${json.invoice_id}`);
    } catch (e) {
      setError(`Network error: ${(e as Error).message ?? 'unknown'}`);
      setState('error');
    }
  }

  function clearFile() {
    setFile(null);
    setError(null);
    setState('idle');
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="px-14 pt-12 pb-20 max-w-[800px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Stock & Suppliers
      </div>
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink">
        Scan an invoice
      </h1>
      <p className="font-serif italic text-lg text-muted mt-3 mb-10">
        Drop a delivery invoice — photo or PDF — and the system extracts the lines. You review, you confirm, prices land in The Bank.
      </p>

      <label
        className={`block bg-card border-2 border-dashed rounded-sm cursor-pointer transition-colors px-10 py-16 text-center ${
          file
            ? 'border-gold bg-gold-bg'
            : 'border-rule hover:border-gold hover:bg-card-warm'
        } ${state === 'scanning' ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_MIME.join(',')}
          className="hidden"
          disabled={state === 'scanning'}
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <>
            <div className="font-display text-xs font-semibold tracking-[0.4em] uppercase text-gold mb-3">
              Ready to scan
            </div>
            <div className="font-serif font-semibold text-lg text-ink mb-1 break-all">
              {file.name}
            </div>
            <div className="font-serif italic text-sm text-muted">
              {(file.size / 1024).toFixed(0)}KB · {file.type}
            </div>
          </>
        ) : (
          <>
            <div className="w-12 h-12 mx-auto mb-4 border border-gold rounded-sm flex items-center justify-center text-gold bg-gold-bg">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h3l1.5-2h7L17 7h3v12H4V7z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
            </div>
            <div className="font-display text-xs font-semibold tracking-[0.4em] uppercase text-muted mb-2">
              Tap to choose
            </div>
            <div className="font-serif font-semibold text-lg text-ink mb-1">
              Photo of the invoice, or a PDF
            </div>
            <div className="font-serif italic text-sm text-muted">
              JPG, PNG, WebP, GIF or PDF · up to 4MB
            </div>
          </>
        )}
      </label>

      {error && (
        <div className="mt-5 bg-card border border-l-4 border-l-urgent border-rule px-5 py-4">
          <div className="font-display text-xs font-semibold tracking-[0.3em] uppercase text-urgent mb-1">
            Couldn't scan that
          </div>
          <div className="font-serif italic text-sm text-ink-soft">{error}</div>
        </div>
      )}

      {state === 'scanning' && (
        <div className="mt-5 bg-card border border-l-4 border-l-gold border-rule px-5 py-4">
          <div className="font-display text-xs font-semibold tracking-[0.3em] uppercase text-gold mb-1 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            Reading the invoice
          </div>
          <div className="font-serif italic text-sm text-muted">
            Reading through the lines — usually 5–10 seconds. Don't close this tab.
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mt-8">
        <button
          type="button"
          disabled={!file || state === 'scanning'}
          onClick={submit}
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {state === 'scanning' ? 'Reading…' : 'Scan invoice'}
        </button>
        {file && state !== 'scanning' && (
          <button
            type="button"
            onClick={clearFile}
            className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-transparent text-ink-soft border border-rule hover:border-gold hover:text-gold transition-colors"
          >
            Choose different
          </button>
        )}
        <Link
          href="/stock-suppliers"
          className="ml-auto font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted hover:text-gold transition-colors"
        >
          ← Back to Stock & Suppliers
        </Link>
      </div>

      <div className="mt-12 bg-card border border-rule px-7 py-6">
        <div className="font-display text-xs font-semibold tracking-[0.4em] uppercase text-gold mb-3">
          How it works
        </div>
        <ol className="font-serif italic text-sm text-muted leading-relaxed list-decimal pl-5 space-y-1.5">
          <li>You upload a clear photo or PDF of the invoice.</li>
          <li>
            The system reads the supplier, line items, quantities and unit prices. Costs a fraction of a penny a call.
          </li>
          <li>
            You review the extracted lines on the next screen. Anything that didn't auto-match The Bank gets flagged so you can match it once.
          </li>
          <li>
            You hit confirm and the prices land in The Bank automatically. Every recipe using those ingredients picks up the new cost.
          </li>
        </ol>
      </div>
    </div>
  );
}
