'use client';

import { useState, useId, type ReactNode } from 'react';

/**
 * Small info-tip surfaced from an "i" icon or a wrapped trigger.
 * Hover or focus reveals a bubble. Keyboard-friendly via focus.
 */
export function InfoTip({
  children,
  label,
  side = 'top',
}: {
  /** Tooltip body content. */
  children: ReactNode;
  /** Aria-label for the trigger icon. */
  label?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  const sideClasses =
    side === 'top'
      ? 'bottom-full left-1/2 -translate-x-1/2 mb-2'
      : side === 'bottom'
        ? 'top-full left-1/2 -translate-x-1/2 mt-2'
        : side === 'right'
          ? 'left-full top-1/2 -translate-y-1/2 ml-2'
          : 'right-full top-1/2 -translate-y-1/2 mr-2';

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={label ?? 'More info'}
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-rule bg-paper text-[10px] text-muted hover:border-gold hover:text-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold transition-colors"
      >
        i
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className={
            'pointer-events-none absolute z-30 w-[260px] bg-ink text-paper text-xs font-serif leading-relaxed px-3 py-2 shadow-[0_8px_24px_rgba(26,22,18,0.18)] ' +
            sideClasses
          }
        >
          {children}
        </span>
      )}
    </span>
  );
}
