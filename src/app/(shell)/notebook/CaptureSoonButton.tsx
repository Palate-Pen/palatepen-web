'use client';

import { useState } from 'react';

const KIND_COPY: Record<string, { line: string; sub: string }> = {
  Voice: {
    line: 'Voice recording is coming next.',
    sub: 'The MediaRecorder + Storage bucket is wired in the follow-up.',
  },
  Photo: {
    line: 'Photo capture is coming next.',
    sub: 'Upload + Storage bucket lands in the follow-up.',
  },
  Sketch: {
    line: 'Sketch capture is coming next.',
    sub: 'The canvas component lands in the follow-up.',
  },
};

export function CaptureSoonButton({
  label,
  children,
  primary,
}: {
  label: 'Voice' | 'Photo' | 'Sketch';
  children: React.ReactNode;
  primary?: boolean;
}) {
  const [showHint, setShowHint] = useState(false);
  const copy = KIND_COPY[label];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowHint((v) => !v)}
        onBlur={() => setShowHint(false)}
        className={
          'flex flex-col items-center gap-1.5 px-4 py-3 border transition-colors relative ' +
          (primary
            ? 'bg-gold/30 border-gold/40 text-paper/80'
            : 'bg-card border-rule text-muted-soft') +
          ' hover:border-gold hover:text-gold cursor-pointer'
        }
        aria-haspopup="true"
        aria-expanded={showHint}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {children}
        </svg>
        <span className="font-sans font-semibold text-xs tracking-[0.08em] uppercase">
          {label}
        </span>
        <span className="absolute -top-1.5 -right-1.5 font-display font-semibold text-[8px] tracking-[0.18em] uppercase bg-gold-bg border border-gold/40 text-gold-dark px-1 py-0.5">
          Soon
        </span>
      </button>

      {showHint && (
        <div className="absolute z-20 top-full left-0 mt-2 w-[240px] bg-card border border-rule shadow-[0_8px_24px_rgba(26,22,18,0.12)] px-4 py-3">
          <div className="font-serif font-semibold text-sm text-ink mb-1">
            {copy.line}
          </div>
          <div className="font-serif italic text-xs text-muted leading-relaxed">
            {copy.sub}
          </div>
        </div>
      )}
    </div>
  );
}
