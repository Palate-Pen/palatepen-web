'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { publishAnnouncementAction, deactivateAllAnnouncements } from './actions';
import type { AnnouncementSeverity } from '@/lib/announcements';

const SEVERITY_OPTIONS: AnnouncementSeverity[] = ['info', 'attention', 'urgent'];

export function AnnouncementForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [severity, setSeverity] = useState<AnnouncementSeverity>('info');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function publish() {
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setError(null);
    start(async () => {
      const res = await publishAnnouncementAction({
        title: title.trim(),
        body: body.trim() || null,
        severity,
        expiresAt: expiresAt || null,
      });
      if ('error' in res) {
        setError(res.error);
        return;
      }
      setTitle('');
      setBody('');
      setSeverity('info');
      setExpiresAt('');
      router.refresh();
    });
  }

  function clearAll() {
    if (!confirm('Deactivate every active banner? Users will see nothing until you publish again.')) return;
    start(async () => {
      const res = await deactivateAllAnnouncements();
      if ('error' in res) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="bg-card border border-rule px-7 py-6 space-y-4">
      <div>
        <label className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-muted mb-1.5 block">
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Sub-recipes are live — your stock bases reprice automatically."
          maxLength={120}
          className="w-full font-serif text-base text-ink bg-card border border-rule px-3 py-2 focus:outline-none focus:border-gold"
        />
      </div>

      <div>
        <label className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-muted mb-1.5 block">
          Body (optional)
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Two-line max. The banner stays calm."
          rows={2}
          className="w-full font-serif text-sm text-ink bg-card border border-rule px-3 py-2 focus:outline-none focus:border-gold resize-y"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-muted mb-1.5 block">
            Severity
          </label>
          <div className="flex gap-1.5">
            {SEVERITY_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeverity(s)}
                className={
                  'font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-3 py-1.5 border transition-colors ' +
                  (severity === s
                    ? s === 'info'
                      ? 'bg-gold/10 border-gold text-gold'
                      : s === 'attention'
                        ? 'bg-attention/10 border-attention text-attention'
                        : 'bg-urgent/10 border-urgent text-urgent'
                    : 'bg-transparent text-muted border-rule hover:border-gold')
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-muted mb-1.5 block">
            Expires (optional)
          </label>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full font-serif text-sm text-ink bg-card border border-rule px-3 py-2 focus:outline-none focus:border-gold"
          />
        </div>
      </div>

      {error && (
        <div className="font-serif italic text-sm text-urgent">{error}</div>
      )}

      <div className="flex gap-2 flex-wrap pt-2">
        <button
          type="button"
          onClick={publish}
          disabled={pending || !title.trim()}
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors disabled:opacity-50"
        >
          {pending ? 'Publishing…' : 'Publish banner'}
        </button>
        <button
          type="button"
          onClick={clearAll}
          disabled={pending}
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-transparent text-muted border border-rule hover:border-urgent hover:text-urgent transition-colors disabled:opacity-50"
        >
          Clear all
        </button>
      </div>
    </div>
  );
}
