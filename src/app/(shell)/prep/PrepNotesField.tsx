'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { setPrepNotes } from './actions';

export function PrepNotesField({
  itemId,
  initial,
}: {
  itemId: string;
  initial: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial ?? '');
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const initialValue = initial ?? '';

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function commit() {
    setEditing(false);
    const next = value.trim();
    if (next === initialValue.trim()) return;
    startTransition(async () => {
      await setPrepNotes(itemId, next);
    });
  }

  function cancel() {
    setValue(initialValue);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') cancel();
        }}
        disabled={pending}
        placeholder="Add a note"
        maxLength={240}
        className="w-full font-serif italic text-xs leading-snug bg-card border border-gold/40 rounded-sm px-2 py-1 text-ink-soft focus:outline-none focus:border-gold disabled:opacity-50"
      />
    );
  }

  const hasNote = (value ?? '').trim().length > 0;
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={
        'text-left w-full font-serif italic text-xs leading-snug bg-transparent border-0 p-0 cursor-pointer hover:text-gold transition-colors ' +
        (hasNote ? 'text-ink-soft' : 'text-muted-soft')
      }
    >
      {hasNote ? value : 'Add note'}
    </button>
  );
}
