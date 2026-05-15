'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createSupplier,
  updateSupplier,
  type SupplierFormInput,
} from './actions';

export type SupplierFormInitial = {
  id?: string;
  name?: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  website?: string | null;
  payment_terms?: string | null;
  credit_limit?: number | null;
  account_balance?: number | null;
  notes_md?: string | null;
};

const PAYMENT_TERMS_SUGGESTIONS = [
  'COD',
  'Pre-pay',
  '7 days net',
  '14 days net',
  '30 days net',
  '60 days net',
  'Monthly EOM',
  'Weekly',
];

export function SupplierForm({
  mode,
  initial,
  onSaved,
  onCancel,
}: {
  mode: 'create' | 'edit';
  initial?: SupplierFormInitial;
  onSaved?: (id: string) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? '');
  const [contactPerson, setContactPerson] = useState(
    initial?.contact_person ?? '',
  );
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [website, setWebsite] = useState(initial?.website ?? '');
  const [paymentTerms, setPaymentTerms] = useState(
    initial?.payment_terms ?? '',
  );
  const [creditLimit, setCreditLimit] = useState(
    initial?.credit_limit != null ? String(initial.credit_limit) : '',
  );
  const [accountBalance, setAccountBalance] = useState(
    initial?.account_balance != null ? String(initial.account_balance) : '',
  );
  const [notes, setNotes] = useState(initial?.notes_md ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (pending) return;
    setError(null);
    const payload: SupplierFormInput = {
      name,
      contact_person: contactPerson,
      phone,
      email,
      address,
      website,
      payment_terms: paymentTerms,
      credit_limit: creditLimit,
      account_balance: accountBalance,
      notes_md: notes,
    };
    startTransition(async () => {
      const res =
        mode === 'create'
          ? await createSupplier(payload)
          : await updateSupplier(initial!.id!, payload);
      if (!res.ok) {
        setError(humaniseError(res.error));
        return;
      }
      if (onSaved) onSaved(res.id);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <Field label="Supplier name">
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Aubrey Allen, Reza Foods, Bookers"
          maxLength={120}
          className="w-full px-3 py-2 border border-rule bg-card font-serif font-semibold text-base text-ink focus:outline-none focus:border-gold"
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Contact name">
          <input
            type="text"
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            placeholder="e.g. James, Sandra, Tom on the desk"
            className="w-full px-3 py-2 border border-rule bg-card font-serif text-base text-ink focus:outline-none focus:border-gold"
          />
        </Field>
        <Field label="Phone">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="020 7946 1234"
            className="w-full px-3 py-2 border border-rule bg-card font-serif text-base text-ink focus:outline-none focus:border-gold"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="orders@..."
            className="w-full px-3 py-2 border border-rule bg-card font-serif text-base text-ink focus:outline-none focus:border-gold"
          />
        </Field>
        <Field label="Website">
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2 border border-rule bg-card font-serif text-base text-ink focus:outline-none focus:border-gold"
          />
        </Field>
      </div>

      <Field label="Address">
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={2}
          placeholder="Depot, town, postcode"
          className="w-full px-3 py-2 border border-rule bg-card font-serif text-sm text-ink resize-y focus:outline-none focus:border-gold"
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-4">
        <Field label="Payment terms">
          <input
            type="text"
            list="payment-terms-suggestions"
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            placeholder="COD / 30 days / weekly…"
            className="w-full px-3 py-2 border border-rule bg-card font-serif text-base text-ink focus:outline-none focus:border-gold"
          />
          <datalist id="payment-terms-suggestions">
            {PAYMENT_TERMS_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>
        <Field label="Credit limit (£)">
          <input
            type="number"
            step="50"
            min="0"
            value={creditLimit}
            onChange={(e) => setCreditLimit(e.target.value)}
            placeholder="e.g. 2500"
            className="w-full px-3 py-2 border border-rule bg-card font-serif text-base text-ink focus:outline-none focus:border-gold"
          />
        </Field>
        <Field label="Current balance (£)">
          <input
            type="number"
            step="0.01"
            value={accountBalance}
            onChange={(e) => setAccountBalance(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 border border-rule bg-card font-serif text-base text-ink focus:outline-none focus:border-gold"
          />
        </Field>
      </div>

      <Field label="Notes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Quirks, history, preferences — who delivers, what days, what to avoid."
          className="w-full px-3 py-2 border border-rule bg-card font-serif italic text-sm text-ink-soft leading-relaxed resize-y focus:outline-none focus:border-gold"
          maxLength={4000}
        />
      </Field>

      {error && (
        <div className="bg-card border border-l-4 border-l-urgent border-rule px-4 py-3 font-serif italic text-sm text-ink-soft">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-transparent text-muted border border-rule hover:border-gold hover:text-gold transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={pending || !name.trim()}
          className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {pending ? 'Saving…' : mode === 'create' ? 'Add supplier' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function humaniseError(code: string): string {
  switch (code) {
    case 'name_required':
      return 'Give the supplier a name.';
    case 'name_too_long':
      return "Name's too long (120 chars max).";
    case 'duplicate_name':
      return 'A supplier with that name is already on the books.';
    case 'invalid_credit_limit':
      return 'Credit limit must be a positive number.';
    case 'invalid_account_balance':
      return 'Balance must be a number.';
    case 'no_membership':
      return 'No site membership — try signing back in.';
    default:
      return code;
  }
}
