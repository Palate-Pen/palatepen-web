'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export type SupplierFormInput = {
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  payment_terms: string;
  credit_limit: string;
  account_balance: string;
  notes_md: string;
};

function normalisePayload(input: SupplierFormInput): {
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  payment_terms: string | null;
  credit_limit: number | null;
  account_balance: number | null;
  notes_md: string | null;
} | { error: string } {
  const name = input.name.trim();
  if (!name) return { error: 'name_required' };
  if (name.length > 120) return { error: 'name_too_long' };

  const creditLimit =
    input.credit_limit.trim() === '' ? null : Number(input.credit_limit);
  if (creditLimit != null && (!Number.isFinite(creditLimit) || creditLimit < 0)) {
    return { error: 'invalid_credit_limit' };
  }
  const balance =
    input.account_balance.trim() === '' ? null : Number(input.account_balance);
  if (balance != null && !Number.isFinite(balance)) {
    return { error: 'invalid_account_balance' };
  }

  return {
    name,
    contact_person: input.contact_person.trim() || null,
    phone: input.phone.trim() || null,
    email: input.email.trim() || null,
    address: input.address.trim() || null,
    website: input.website.trim() || null,
    payment_terms: input.payment_terms.trim() || null,
    credit_limit: creditLimit,
    account_balance: balance,
    notes_md: input.notes_md.trim() || null,
  };
}

export async function createSupplier(
  input: SupplierFormInput,
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const payload = normalisePayload(input);
  if ('error' in payload) return { ok: false, error: payload.error };

  const { data: memberships } = await supabase
    .from('memberships')
    .select('site_id, role')
    .eq('user_id', user.id)
    .limit(1);
  const membership = memberships?.[0];
  if (!membership) return { ok: false, error: 'no_membership' };

  // Soft-enforce unique name per site (case-insensitive).
  const { data: existing } = await supabase
    .from('suppliers')
    .select('id')
    .eq('site_id', membership.site_id as string)
    .ilike('name', payload.name)
    .limit(1);
  if (existing && existing.length > 0) {
    return { ok: false, error: 'duplicate_name' };
  }

  const { data, error } = await supabase
    .from('suppliers')
    .insert({
      site_id: membership.site_id as string,
      ...payload,
    })
    .select('id')
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? 'insert_failed' };
  }

  revalidatePath('/stock-suppliers/suppliers');
  revalidatePath('/stock-suppliers');
  return { ok: true, id: data.id as string };
}

export async function updateSupplier(
  supplierId: string,
  input: SupplierFormInput,
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const payload = normalisePayload(input);
  if ('error' in payload) return { ok: false, error: payload.error };

  const { error } = await supabase
    .from('suppliers')
    .update(payload)
    .eq('id', supplierId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/stock-suppliers/suppliers');
  revalidatePath(`/stock-suppliers/suppliers/${supplierId}`);
  revalidatePath('/stock-suppliers');
  return { ok: true, id: supplierId };
}
