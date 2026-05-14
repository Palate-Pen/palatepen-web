import { createSupabaseServerClient } from '@/lib/supabase/server';

export type UserPreferences = {
  auto_bank_invoices: boolean;
  looking_ahead_notifications: boolean;
  team_view_notebook: boolean;
};

export const PREFERENCE_DEFAULTS: UserPreferences = {
  auto_bank_invoices: true,
  looking_ahead_notifications: true,
  team_view_notebook: false,
};

export const PREFERENCE_META: Record<
  keyof UserPreferences,
  { label: string; description: string }
> = {
  auto_bank_invoices: {
    label: 'Auto-bank invoices',
    description: 'Confirm scanned invoices automatically once the lines look right.',
  },
  looking_ahead_notifications: {
    label: 'Looking Ahead notifications',
    description: 'Email digest when high-priority forward signals land.',
  },
  team_view_notebook: {
    label: 'Team can view my Notebook entries',
    description: 'Sets the default share-with-brigade state when you capture a note.',
  },
};

export async function getUserPreferences(
  userId: string,
): Promise<UserPreferences> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('user_preferences')
    .select('prefs')
    .eq('user_id', userId)
    .maybeSingle();

  const stored = (data?.prefs ?? {}) as Partial<UserPreferences>;
  return {
    ...PREFERENCE_DEFAULTS,
    ...stored,
  };
}
