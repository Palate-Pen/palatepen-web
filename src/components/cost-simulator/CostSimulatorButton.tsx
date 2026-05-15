'use client';

import { useState } from 'react';
import { CostSimulatorModal, type CostSimSeed } from './CostSimulatorModal';

export function CostSimulatorButton({
  seed,
  targetGpPct = 70,
  label = 'Cost simulator',
}: {
  seed: CostSimSeed;
  targetGpPct?: number;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 bg-transparent text-ink border border-rule hover:border-gold hover:text-gold transition-colors"
      >
        ⊕ {label}
      </button>
      <CostSimulatorModal
        open={open}
        onClose={() => setOpen(false)}
        seed={seed}
        targetGpPct={targetGpPct}
      />
    </>
  );
}
