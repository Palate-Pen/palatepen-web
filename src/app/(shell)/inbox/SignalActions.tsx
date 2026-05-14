'use client';

import { useTransition } from 'react';
import {
  dismissSignal,
  markSignalActed,
  restoreSignal,
} from './actions';

export function SignalActions({
  signalId,
  dismissed,
  acted,
  hasActionTarget,
}: {
  signalId: string;
  dismissed: boolean;
  acted: boolean;
  hasActionTarget: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function onDismiss() {
    if (pending) return;
    startTransition(async () => {
      await dismissSignal(signalId);
    });
  }

  function onActed() {
    if (pending) return;
    startTransition(async () => {
      await markSignalActed(signalId);
    });
  }

  function onRestore() {
    if (pending) return;
    startTransition(async () => {
      await restoreSignal(signalId);
    });
  }

  if (acted) {
    return (
      <div className="flex items-center gap-3">
        <span className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-healthy">
          ✓ Acted on
        </span>
        <ActionButton
          onClick={onRestore}
          disabled={pending}
          title="Put back in the feed"
        >
          Restore
        </ActionButton>
      </div>
    );
  }

  if (dismissed) {
    return (
      <div className="flex items-center gap-3">
        <span className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted-soft">
          Dismissed
        </span>
        <ActionButton
          onClick={onRestore}
          disabled={pending}
          title="Put back in the feed"
        >
          Restore
        </ActionButton>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {hasActionTarget && (
        <ActionButton
          onClick={onActed}
          disabled={pending}
          tone="gold"
          title="The suggestion was useful — clear it with a thumbs-up"
        >
          ✓ Acted on this
        </ActionButton>
      )}
      <ActionButton
        onClick={onDismiss}
        disabled={pending}
        title="Not actionable — clear it"
      >
        Dismiss
      </ActionButton>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  title,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  tone?: 'gold';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={
        'font-display font-semibold text-xs tracking-[0.18em] uppercase bg-transparent border-0 p-0 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ' +
        (tone === 'gold'
          ? 'text-gold hover:text-gold-dark'
          : 'text-muted hover:text-ink')
      }
    >
      {children}
    </button>
  );
}
