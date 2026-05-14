import { createSupabaseServerClient } from '@/lib/supabase/server';

export type InboxSignal = {
  id: string;
  target_surface: string;
  tag: 'plan_for_it' | 'get_ready' | 'worth_knowing' | 'market_move';
  severity: 'urgent' | 'attention' | 'healthy' | 'info';
  section_label: string;
  headline_pre: string | null;
  headline_em: string | null;
  headline_post: string | null;
  body_md: string;
  action_label: string | null;
  action_target: string | null;
  action_context: string | null;
  emitted_at: string;
  dismissed_at: string | null;
  acted_at: string | null;
};

/**
 * Inbox is the chronological feed of every forward_signal the
 * intelligence engine has emitted for this site, across every surface.
 * Unlike per-surface LookingAhead components which limit to 4 signals
 * for surface={surface}, Inbox shows the whole stream — dismissed +
 * acted + active.
 */
export async function getInboxSignals(siteId: string): Promise<InboxSignal[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('forward_signals')
    .select(
      'id, target_surface, tag, severity, section_label, headline_pre, headline_em, headline_post, body_md, action_label, action_target, action_context, emitted_at, dismissed_at, acted_at',
    )
    .eq('site_id', siteId)
    .order('emitted_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[inbox] forward_signals fetch failed:', error);
    return [];
  }
  return (data ?? []) as InboxSignal[];
}
