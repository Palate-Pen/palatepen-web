'use server';

import { redirect } from 'next/navigation';

// Stubs. The next commit wires these to Supabase auth via
// @/lib/supabase/server. Forms in (flows)/signin/page.tsx and
// (flows)/signup/page.tsx reference these action signatures.

export async function signInWithPassword(formData: FormData) {
  const email = formData.get('email');
  const password = formData.get('password');
  console.log('[auth stub] signInWithPassword', { email, hasPassword: !!password });
  redirect('/');
}

export async function signUpWithPassword(formData: FormData) {
  const email = formData.get('email');
  const password = formData.get('password');
  console.log('[auth stub] signUpWithPassword', { email, hasPassword: !!password });
  redirect('/onboarding');
}

export async function signInWithMagicLink(formData: FormData) {
  const email = formData.get('email');
  console.log('[auth stub] signInWithMagicLink', { email });
  redirect('/signin?magic_link=sent');
}

export async function signOut() {
  console.log('[auth stub] signOut');
  redirect('/signin');
}
