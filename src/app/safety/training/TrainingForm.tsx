'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addTrainingAction } from '@/lib/safety/actions';
import { TRAINING_KIND_LABEL } from '@/lib/safety/standards';
import { DishPicker, type DishPickerValue } from '@/components/safety/DishPicker';
import type { DishPickerBands } from '@/lib/safety/dish-picker';

const KINDS = Object.keys(
  TRAINING_KIND_LABEL,
) as Array<keyof typeof TRAINING_KIND_LABEL>;

export function TrainingForm({ bands }: { bands: DishPickerBands }) {
  const router = useRouter();
  const [staffName, setStaffName] = useState('');
  const [kind, setKind] = useState<keyof typeof TRAINING_KIND_LABEL>(
    'food_hygiene_l2',
  );
  const [certName, setCertName] = useState('');
  const [awardingBody, setAwardingBody] = useState('');
  const [awardedOn, setAwardedOn] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [expiresOn, setExpiresOn] = useState('');
  const [dish, setDish] = useState<DishPickerValue>({ recipe_id: null, text: '' });
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    setSaved(false);
    if (staffName.trim() === '') {
      setError('Staff name is required.');
      return;
    }
    startTransition(async () => {
      const res = await addTrainingAction({
        staff_name: staffName.trim(),
        kind,
        certificate_name: certName.trim() === '' ? null : certName.trim(),
        awarding_body: awardingBody.trim() === '' ? null : awardingBody.trim(),
        awarded_on: awardedOn,
        expires_on: expiresOn === '' ? null : expiresOn,
        recipe_id: dish.recipe_id,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      setStaffName('');
      setCertName('');
      setAwardingBody('');
      setExpiresOn('');
      setDish({ recipe_id: null, text: '' });
      router.refresh();
    });
  }

  return (
    <div className="bg-card border border-rule px-7 py-7 mb-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-2 block">
            Staff name
          </label>
          <input
            type="text"
            value={staffName}
            onChange={(e) => setStaffName(e.target.value)}
            className="w-full px-3 py-2.5 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-2 block">
            Kind
          </label>
          <select
            value={kind}
            onChange={(e) =>
              setKind(e.target.value as keyof typeof TRAINING_KIND_LABEL)
            }
            className="w-full px-3 py-2.5 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none"
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {TRAINING_KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-2 block">
            Certificate name (optional)
          </label>
          <input
            type="text"
            value={certName}
            onChange={(e) => setCertName(e.target.value)}
            placeholder="e.g. CIEH Level 2 Food Safety"
            className="w-full px-3 py-2.5 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-2 block">
            Awarding body (optional)
          </label>
          <input
            type="text"
            value={awardingBody}
            onChange={(e) => setAwardingBody(e.target.value)}
            placeholder="e.g. CIEH, RSPH"
            className="w-full px-3 py-2.5 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-2 block">
            Awarded
          </label>
          <input
            type="date"
            value={awardedOn}
            onChange={(e) => setAwardedOn(e.target.value)}
            className="w-full px-3 py-2.5 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted mb-2 block">
            Expires (optional)
          </label>
          <input
            type="date"
            value={expiresOn}
            onChange={(e) => setExpiresOn(e.target.value)}
            className="w-full px-3 py-2.5 border border-rule bg-paper font-serif text-base text-ink focus:border-gold focus:outline-none"
          />
        </div>
      </div>

      <div className="mb-5">
        <DishPicker
          bands={bands}
          value={dish}
          onChange={setDish}
          label="Linked dish (optional)"
          meta="link the cert to a menu item it covers — e.g. allergen training against the summer tasting"
          placeholder="e.g. all desserts · live fire section · house bread"
        />
      </div>

      <div className="flex items-center gap-3 flex-wrap pt-4 border-t border-rule">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-6 py-3 bg-gold text-paper border border-gold hover:bg-gold-dark disabled:opacity-50 transition-colors"
        >
          {pending ? 'Saving' + String.fromCharCode(0x2026) : 'Add record'}
        </button>
        {saved && <span className="font-serif italic text-sm text-healthy">{String.fromCharCode(0x2713)} Saved.</span>}
        {error && <span className="font-serif italic text-sm text-urgent">{error}</span>}
      </div>
    </div>
  );
}
