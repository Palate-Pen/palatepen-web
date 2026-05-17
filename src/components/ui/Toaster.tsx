'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/**
 * Global toast system. One provider mounted at the shell layout,
 * useToast() anywhere underneath. Supports info / success / error /
 * warning + an optional Undo button for destructive actions.
 *
 * Why custom (not react-hot-toast / sonner): the brand v8 design has
 * tight typography and gold/urgent tokens; a third-party lib drags in
 * its own visual language. Custom is ~150 lines and lives inside our
 * Tailwind utility set.
 */

export type ToastTone = 'info' | 'success' | 'error' | 'warning';

export type ToastInput = {
  tone?: ToastTone;
  title?: string;
  body: string;
  /** Auto-dismiss in ms. 0 = sticky. Default 5000. */
  durationMs?: number;
  /** Optional action button on the right of the toast. Returning a
   *  Promise that resolves dismisses the toast; throwing keeps it
   *  open. */
  action?: {
    label: string;
    run: () => void | Promise<void>;
  };
};

type ToastItem = ToastInput & {
  id: string;
  tone: ToastTone;
  durationMs: number;
  createdAt: number;
};

type ToastContextValue = {
  push: (input: ToastInput) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Soft-fall back to noop in case the provider isn't mounted (e.g.
    // public marketing pages). Better than crashing on render.
    return {
      push: () => '',
      dismiss: () => {},
    };
  }
  return ctx;
}

export function ToasterProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setItems((cur) => cur.filter((t) => t.id !== id));
    const handle = timers.current.get(id);
    if (handle) {
      clearTimeout(handle);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (input: ToastInput) => {
      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2);
      const tone: ToastTone = input.tone ?? 'info';
      const durationMs = input.durationMs ?? 5000;
      const item: ToastItem = {
        ...input,
        id,
        tone,
        durationMs,
        createdAt: Date.now(),
      };
      setItems((cur) => [...cur.slice(-4), item]);
      if (durationMs > 0) {
        const handle = setTimeout(() => dismiss(id), durationMs);
        timers.current.set(id, handle);
      }
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    return () => {
      timers.current.forEach((h) => clearTimeout(h));
      timers.current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ push, dismiss }}>
      {children}
      <ToastViewport items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({
  items,
  onDismiss,
}: {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      className="pointer-events-none fixed z-[60] bottom-4 right-4 w-[min(100%-2rem,420px)] flex flex-col-reverse gap-2"
      aria-live="polite"
      aria-atomic="false"
    >
      {items.map((t) => (
        <ToastCard key={t.id} item={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [pending, setPending] = useState(false);
  const accent =
    item.tone === 'error'
      ? 'border-l-urgent'
      : item.tone === 'warning'
        ? 'border-l-attention'
        : item.tone === 'success'
          ? 'border-l-healthy'
          : 'border-l-gold';
  const headingTone =
    item.tone === 'error'
      ? 'text-urgent'
      : item.tone === 'warning'
        ? 'text-attention'
        : item.tone === 'success'
          ? 'text-healthy'
          : 'text-gold';

  async function runAction() {
    if (!item.action || pending) return;
    try {
      setPending(true);
      await item.action.run();
      onDismiss(item.id);
    } catch {
      setPending(false);
    }
  }

  return (
    <div
      role="status"
      className={
        'pointer-events-auto bg-card border border-rule border-l-[3px] shadow-[0_8px_28px_rgba(26,22,18,0.12)] px-5 py-3.5 flex items-start gap-3 ' +
        accent
      }
    >
      <div className="flex-1 min-w-0">
        {item.title && (
          <div
            className={
              'font-display font-semibold text-[10px] tracking-[0.3em] uppercase mb-0.5 ' +
              headingTone
            }
          >
            {item.title}
          </div>
        )}
        <div className="font-serif text-sm text-ink leading-snug">
          {item.body}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {item.action && (
          <button
            type="button"
            onClick={runAction}
            disabled={pending}
            className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase px-3 py-1.5 bg-transparent text-ink border border-rule hover:border-gold hover:text-gold disabled:opacity-50 transition-colors"
          >
            {pending ? '...' : item.action.label}
          </button>
        )}
        <button
          type="button"
          onClick={() => onDismiss(item.id)}
          aria-label="Dismiss notification"
          className="font-display text-lg text-muted hover:text-ink leading-none px-1.5"
        >
          {String.fromCharCode(0xd7)}
        </button>
      </div>
    </div>
  );
}
