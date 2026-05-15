'use client';

import { useState } from 'react';
import { GPCalculatorModal, type GPCalcSeed } from './GPCalculatorModal';

/**
 * Tiny client wrapper that owns the open/close state and lets a server-
 * rendered detail page drop a "Cost a dish" button in place. Pass the
 * current recipe's data via `seed` to pre-fill the calculator.
 */
export function GPCalculatorButton({
  seed,
  targetGpPct = 70,
  label = 'GP calculator',
  variant = 'subtle',
}: {
  seed?: GPCalcSeed;
  targetGpPct?: number;
  label?: string;
  variant?: 'subtle' | 'primary';
}) {
  const [open, setOpen] = useState(false);
  const buttonClass =
    variant === 'primary'
      ? 'font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors'
      : 'font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 bg-transparent text-ink border border-rule hover:border-gold hover:text-gold transition-colors';
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass}>
        ⚖ {label}
      </button>
      <GPCalculatorModal
        open={open}
        onClose={() => setOpen(false)}
        seed={seed}
        targetGpPct={targetGpPct}
      />
    </>
  );
}
