'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { logIncidentAction } from '@/lib/safety/actions';
import {
  ALL_ALLERGENS,
  ALLERGEN_LABEL,
  INCIDENT_KIND_LABEL,
  type AllergenCode,
} from '@/lib/safety/standards';

const INCIDENT_KINDS = Object.keys(
  INCIDENT_KIND_LABEL,
) as Array<keyof typeof INCIDENT_KIND_LABEL>;

export function IncidentForm() {
  const router = useRouter();
  const [kind, setKind] = useState<keyof typeof INCIDENT_KIND_LABEL>('complaint');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [allergens, setAllergens] = useState<AllergenCode[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleAllergen(a: AllergenCode) {
    setAllergens((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));
  }

  function submit() {
    setError(null);
    setSaved(false);
    if (summary.trim() === '') {
      setError('Add a short summary.');
      return;
    }
    startTransition(async () => {
      const res = await logIncidentAction({
        kind,
        summary: summary.trim(),
        body_md: body.trim() === '' ? null : body.trim(),
        allergens: kind === 'allergen' && allergens.length > 0 ? allergens : null,
        customer_name: customerName.trim() === '' ? null : customerName.trim(),
        customer_contact:
          customerContact.trim() === '' ? null : customerContact.trim(),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      setSummary('');
      setBody('');
      setAllergens([]);
      setCustomerName('');
      setCustomerContact('');
      router.refresh();
    });
  }

  return (
    <div className="bg-card border border-rule px-7 py-7 mb-10">
      <div className="flex flex-wrap gap-2 mb-5">
        {INCIDENT_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={
              'font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 border transition-colors ' +
              (kind === k
                ? 'bg-gold text-paper border-gold'
                : 'bg-paper text-muted border-rule hover:border-gold hover:text-gold')
            }
          >
            {INCIDENT_KIND_LABEL[k]}
          </button>
        ))}
      </div>

      <label className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-2 block">
        Summary
      </label>
      <input
        type="text"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder="one line: what happened"
        className="w-full px-3 py-2.5 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none mb-4"
      />

      <label className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-2 block">
        Detail
      </label>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        placeholder="dish involved, who was on station, what was done, who was told"
        className="w-full px-3 py-2 border border-rule bg-paper font-serif text-sm text-ink focus:border-gold focus:outline-none mb-4"
      />

      {kind === 'allergen' && (
        <>
          <label className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-2 block">
            Allergens involved (14 UK FIR list)
          </label>
          <div className="flex flex-wrap gap-2 mb-5">
            {ALL_ALLERGENS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => toggleAllergen(a)}
                className={
                  'font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-3 py-1.5 border transition-colors ' +
                  (allergens.includes(a)
                    ? 'bg-urgent text-paper border-urgent'
                    : 'bg-paper text-muted border-rule hover:border-urgent hover:text-urgent')
                }
              >
                {ALLERGEN_LABEL[a]}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-2 block">
            Customer name (optional)
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full px-3 py-2.5 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-2 block">
            Contact (optional)
          </label>
          <input
            type="text"
            value={customerContact}
            onChange={(e) => setCustomerContact(e.target.value)}
            placeholder="email or phone"
            className="w-full px-3 py-2.5 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap pt-4 border-t border-rule">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-urgent text-paper border border-urgent hover:bg-urgent/90 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Logging' + String.fromCharCode(0x2026) : 'Log incident'}
        </button>
        {saved && <span className="font-serif italic text-sm text-healthy">{String.fromCharCode(0x2713)} Saved.</span>}
        {error && <span className="font-serif italic text-sm text-urgent">{error}</span>}
      </div>
    </div>
  );
}
