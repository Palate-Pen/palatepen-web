'use server';

import { redirect } from 'next/navigation';

// Stub. Next commit wires this to update v2.sites.name + v2.accounts.name
// for the current user's owner-membership site.

export async function saveKitchenName(formData: FormData) {
  const kitchenName = formData.get('kitchen_name');
  console.log('[onboarding stub] saveKitchenName', { kitchenName });
  redirect('/');
}
