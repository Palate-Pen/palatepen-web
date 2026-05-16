'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  saveConnection,
  disconnectService,
} from '@/lib/connections-actions';
import {
  type Connection,
  type ServiceDef,
} from '@/lib/connections';

export function ConnectionCard({
  def,
  connection,
  revalidatePathname,
}: {
  def: ServiceDef;
  connection: Connection | null;
  revalidatePathname: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [credential, setCredential] = useState('');
  const [displayName, setDisplayName] = useState(
    connection?.display_name ?? '',
  );
  const [notes, setNotes] = useState(connection?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const connected = connection?.has_credential ?? false;

  function open_panel() {
    setError(null);
    setOpen(true);
  }

  function close_panel() {
    setOpen(false);
    setCredential('');
  }

  function save() {
    setError(null);
    start(async () => {
      const res = await saveConnection({
        service: def.service,
        credential,
        displayName,
        notes,
        revalidatePathname,
      });
      if ('error' in res) {
        setError(res.error);
        return;
      }
      close_panel();
      router.refresh();
    });
  }

  function disconnect() {
    if (!confirm(`Disconnect ${def.name}? The pasted credential will be wiped.`)) return;
    start(async () => {
      const res = await disconnectService(def.service, revalidatePathname);
      if ('error' in res) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  const statusTone =
    connection?.status === 'connected'
      ? 'text-healthy'
      : connection?.status === 'error' || connection?.status === 'expired'
        ? 'text-urgent'
        : 'text-muted-soft';

  return (
    <div className="bg-card border border-rule px-7 py-6">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-gold mb-2">
            {def.category}
          </div>
          <h3 className="font-serif text-xl font-normal text-ink leading-[1.2] tracking-[-0.01em]">
            {def.name}
          </h3>
          <p className="font-serif italic text-sm text-muted mt-1.5 leading-relaxed">
            {def.tagline}
          </p>
        </div>
        <div className={`font-display font-semibold text-xs tracking-[0.08em] uppercase whitespace-nowrap ${statusTone}`}>
          <span
            className={
              'inline-block w-1.5 h-1.5 rounded-full mr-1.5 ' +
              (connected
                ? 'bg-healthy'
                : connection?.status === 'error' || connection?.status === 'expired'
                  ? 'bg-urgent'
                  : 'bg-muted-soft')
            }
          />
          {connected ? 'connected' : 'not connected'}
        </div>
      </div>

      {connection?.last_synced_at && (
        <p className="font-serif italic text-xs text-muted mb-3">
          last synced{' '}
          {new Date(connection.last_synced_at).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
          })}
        </p>
      )}

      {!open ? (
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={open_panel}
            className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors"
          >
            {connected ? 'Update key' : 'Connect'}
          </button>
          {connected && (
            <button
              type="button"
              onClick={disconnect}
              disabled={pending}
              className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 bg-transparent text-muted border border-rule hover:border-urgent hover:text-urgent transition-colors disabled:opacity-50"
            >
              Disconnect
            </button>
          )}
        </div>
      ) : (
        <div className="border-t border-rule pt-4 mt-3 space-y-3">
          <div>
            <label className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-muted mb-1.5 block">
              API key / token
            </label>
            <input
              type="password"
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              placeholder="Paste it here…"
              className="w-full font-mono text-sm text-ink bg-card border border-rule px-3 py-2 focus:outline-none focus:border-gold"
              autoFocus
            />
            <p className="font-serif italic text-xs text-muted mt-1">
              We store this verbatim. It's only used when {def.name} feeds Palatable.
            </p>
          </div>
          <div>
            <label className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-muted mb-1.5 block">
              Label (optional)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={`e.g. ${def.name} — main floor`}
              className="w-full font-serif text-sm text-ink bg-card border border-rule px-3 py-2 focus:outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-muted mb-1.5 block">
              Notes (optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything we should know about this connection"
              className="w-full font-serif text-sm text-ink bg-card border border-rule px-3 py-2 focus:outline-none focus:border-gold"
            />
          </div>
          {error && (
            <div className="font-serif italic text-sm text-urgent">{error}</div>
          )}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={close_panel}
              disabled={pending}
              className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 bg-transparent text-muted border border-rule hover:border-gold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={pending || !credential.trim()}
              className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors disabled:opacity-50"
            >
              {pending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
