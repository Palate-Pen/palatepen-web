'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { draftPurchaseOrderFromBreaches } from './actions';

/** "Draft PO" button for the Reorder Suggestions card. Calls the server
 *  action and routes to the newly-created PO detail page. */
export function DraftPOFromSupplierButton({
  supplierId,
  label = 'Draft PO',
}: {
  supplierId: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await draftPurchaseOrderFromBreaches(supplierId);
            if (!res.ok) {
              setError(res.error);
              return;
            }
            router.push(`/stock-suppliers/purchase-orders/${res.id}`);
          });
        }}
        className="font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors disabled:opacity-50"
      >
        {pending ? 'Drafting…' : label}
      </button>
      {error && (
        <div className="font-serif italic text-xs text-urgent mt-2">{error}</div>
      )}
    </>
  );
}
