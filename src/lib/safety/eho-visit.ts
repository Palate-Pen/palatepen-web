// Client-safe types + constants for the EHO Visit control desk. Server
// reads (getActiveEhoVisit, getRecentEhoVisits) live in
// eho-visit-server.ts so client components can import constants without
// pulling next/headers via supabase/server.

export type EhoVisitTag =
  | 'arrival'
  | 'note'
  | 'observed'
  | 'requested'
  | 'action';

export const EHO_TAG_LABEL: Record<EhoVisitTag, string> = {
  arrival: 'Arrival',
  note: 'Note',
  observed: 'Observed',
  requested: 'Requested',
  action: 'Action',
};

export const EHO_TAG_TONE: Record<EhoVisitTag, string> = {
  arrival: 'bg-ink/[0.08] text-ink border-rule',
  note: 'bg-paper-warm text-muted border-rule',
  observed: 'bg-gold-bg text-gold-dark border-gold/40',
  requested: 'bg-attention/10 text-attention border-attention/40',
  action: 'bg-healthy/10 text-healthy border-healthy/40',
};

export type EhoVisitType =
  | 'routine'
  | 'follow_up'
  | 'complaint'
  | 'spot_check'
  | 'other';

export const EHO_VISIT_TYPE_LABEL: Record<EhoVisitType, string> = {
  routine: 'Routine — programmed',
  follow_up: 'Follow-up visit',
  complaint: 'Complaint-driven',
  spot_check: 'Spot-check / unannounced',
  other: 'Other',
};

export type EhoVisitOutcome = 'pass' | 'improvements_required' | 'failed';

export const EHO_OUTCOME_LABEL: Record<EhoVisitOutcome, string> = {
  pass: 'Pass · good visit',
  improvements_required: 'Improvements required',
  failed: 'Formal issues raised',
};

export type EhoVisitLogEntry = {
  at: string;
  tag: EhoVisitTag;
  body: string;
  by: string | null;
};

export type EhoVisitRow = {
  id: string;
  site_id: string;
  visit_start_at: string;
  visit_end_at: string | null;
  inspector_name: string | null;
  inspector_authority: string | null;
  inspector_id_shown: string | null;
  visit_type: EhoVisitType | null;
  visit_log: EhoVisitLogEntry[];
  outcome: EhoVisitOutcome | null;
  rating_after: number | null;
  notes_md: string | null;
  due_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};
