import {
  getRecentOpeningChecks,
  getRecentProbeReadings,
  getRecentIncidents,
  getCleaningSchedule,
  getTrainingRecords,
} from '@/lib/safety/lib';

/**
 * Safety compliance score.
 *
 * Five weighted factors, each scored 0–100. The total is the weighted
 * average rendered as a percentage + letter grade. Each factor carries
 * its own forward-looking message so the chef can see *what* is dragging
 * the score down rather than just the number.
 *
 * This is the Safety expression of the broader Operational Intelligence
 * pattern (KPI body + "where it's letting you down" + Looking Ahead).
 * The factor messages and the home page's Looking Ahead bar read the
 * same underlying detectors so they stay coherent.
 */

export type ComplianceFactorKey =
  | 'opening_checks'
  | 'probe_pass_rate'
  | 'cleaning_cadence'
  | 'training_validity'
  | 'incident_resolution';

export type ComplianceFactor = {
  key: ComplianceFactorKey;
  label: string;
  weight: number;          // 0–1, sums to 1 across all factors
  score: number;           // 0–100
  /** Short forward-looking note about what's hurting (or holding) this factor. */
  message: string;
  /** Deep-link into the relevant surface so the chef can act now. */
  href: string;
  /** Status bucket — drives the visual treatment on the card. */
  state: 'healthy' | 'attention' | 'urgent';
};

export type ComplianceReport = {
  /** Overall weighted score, 0–100. */
  score: number;
  /** A / B / C / D — schoolboy grading, fits the chef voice. */
  grade: 'A' | 'B' | 'C' | 'D';
  /** Overall tone for the headline pill. */
  tone: 'healthy' | 'attention' | 'urgent';
  /** Plain-language headline for the card eyebrow. */
  headline: string;
  factors: ComplianceFactor[];
};

const WEIGHTS: Record<ComplianceFactorKey, number> = {
  opening_checks: 0.3,
  probe_pass_rate: 0.25,
  cleaning_cadence: 0.2,
  training_validity: 0.15,
  incident_resolution: 0.1,
};

export async function getComplianceReport(
  siteId: string,
): Promise<ComplianceReport> {
  const [checks, probes, cleaning, training, incidents] = await Promise.all([
    getRecentOpeningChecks(siteId, 30),
    getRecentProbeReadings(siteId, 200),
    getCleaningSchedule(siteId),
    getTrainingRecords(siteId),
    getRecentIncidents(siteId, { limit: 30 }),
  ]);

  const factors: ComplianceFactor[] = [
    scoreOpeningChecks(checks),
    scoreProbePassRate(probes),
    scoreCleaningCadence(cleaning),
    scoreTrainingValidity(training),
    scoreIncidentResolution(incidents),
  ];

  const score = Math.round(
    factors.reduce((acc, f) => acc + f.score * f.weight, 0),
  );

  const grade: ComplianceReport['grade'] =
    score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D';

  const urgentCount = factors.filter((f) => f.state === 'urgent').length;
  const attentionCount = factors.filter((f) => f.state === 'attention').length;
  const tone: ComplianceReport['tone'] =
    urgentCount > 0 ? 'urgent' : attentionCount > 0 ? 'attention' : 'healthy';

  const headline =
    tone === 'healthy'
      ? 'The diary holds up. Keep doing what you&rsquo;re doing.'
      : tone === 'attention'
        ? 'Mostly solid. A couple of corners letting the score down.'
        : 'Worth tidying up before the next inspector knocks.';

  return { score, grade, tone, headline, factors };
}

// ---------- Factor scorers ----------
//
// Each scorer returns a score 0–100 plus a forward-looking message.
// Messages match the "forward intelligence" voice: never blame, always
// point to the next action.

function scoreOpeningChecks(
  checks: Awaited<ReturnType<typeof getRecentOpeningChecks>>,
): ComplianceFactor {
  // Look at the last 14 days. Each fully-signed-off day = +1. Partial = +0.5.
  // Missing day = 0. Then score = (sum / 14) * 100.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = 14;
  const byDate = new Map<string, number>();
  for (const row of checks) {
    const a = (row.answers ?? {}) as Record<string, unknown>;
    const entries = Object.entries(a).filter(([k]) => k !== '_meta');
    if (entries.length === 0) {
      byDate.set(row.check_date, 0);
      continue;
    }
    const all = entries.every(([, v]) => Boolean(v));
    byDate.set(row.check_date, all ? 1 : 0.5);
  }

  let sum = 0;
  let missed = 0;
  let partial = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const v = byDate.get(iso) ?? 0;
    sum += v;
    if (v === 0) missed += 1;
    else if (v === 0.5) partial += 1;
  }
  const score = Math.round((sum / days) * 100);
  const state: ComplianceFactor['state'] =
    score >= 90 ? 'healthy' : score >= 70 ? 'attention' : 'urgent';

  let message = `Every day signed off clear for the last ${days} days. The diary is doing its job.`;
  if (missed > 0) {
    message = `<em>${missed} day${missed === 1 ? '' : 's'}</em> in the last ${days} with no opening check on file. That&rsquo;s the first thing an EHO would flag.`;
  } else if (partial > 0) {
    message = `${partial} day${partial === 1 ? '' : 's'} marked partial — one or more questions not ticked clear. Worth a chat with whoever opened those shifts.`;
  }

  return {
    key: 'opening_checks',
    label: 'Opening checks',
    weight: WEIGHTS.opening_checks,
    score,
    message,
    href: '/safety',
    state,
  };
}

function scoreProbePassRate(
  probes: Awaited<ReturnType<typeof getRecentProbeReadings>>,
): ComplianceFactor {
  // Last 30 days. Score = pass% with a floor of 60 when no readings exist
  // (the absence isn't fully compliant but isn't a failure either).
  const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recent = probes.filter((p) => new Date(p.logged_at).getTime() >= since);

  if (recent.length === 0) {
    return {
      key: 'probe_pass_rate',
      label: 'Probe readings',
      weight: WEIGHTS.probe_pass_rate,
      score: 60,
      message:
        'No probe readings logged in the last 30 days. Even one a day across the fridge and a hot-hold check gives you something to show.',
      href: '/safety/probe',
      state: 'attention',
    };
  }

  const passed = recent.filter((p) => p.passed).length;
  const score = Math.round((passed / recent.length) * 100);
  const state: ComplianceFactor['state'] =
    score >= 95 ? 'healthy' : score >= 80 ? 'attention' : 'urgent';

  const failingLoc = recent
    .filter((p) => !p.passed)
    .reduce<Record<string, number>>((acc, p) => {
      acc[p.location] = (acc[p.location] ?? 0) + 1;
      return acc;
    }, {});
  const worst = Object.entries(failingLoc).sort((a, b) => b[1] - a[1])[0];

  let message = `${passed} of ${recent.length} readings inside spec across the last 30 days. The temperature record is clean.`;
  if (worst) {
    message = `<em>${worst[0]}</em> has read outside spec ${worst[1]} time${worst[1] === 1 ? '' : 's'} this month. Worth a maintenance check before the next inspection.`;
  }

  return {
    key: 'probe_pass_rate',
    label: 'Probe readings',
    weight: WEIGHTS.probe_pass_rate,
    score,
    message,
    href: '/safety/probe',
    state,
  };
}

function scoreCleaningCadence(
  tasks: Awaited<ReturnType<typeof getCleaningSchedule>>,
): ComplianceFactor {
  if (tasks.length === 0) {
    return {
      key: 'cleaning_cadence',
      label: 'Cleaning schedule',
      weight: WEIGHTS.cleaning_cadence,
      score: 50,
      message:
        'No cleaning schedule on file yet. Seed the SFBB default tasks from the Cleaning tab — it takes one click.',
      href: '/safety/cleaning',
      state: 'attention',
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Score each task on whether it's within its cycle window.
  let inWindow = 0;
  const overdue: typeof tasks = [];
  for (const t of tasks) {
    const window =
      t.frequency === 'daily'
        ? 1
        : t.frequency === 'weekly'
          ? 7
          : t.frequency === 'monthly'
            ? 30
            : t.frequency === 'quarterly'
              ? 90
              : 365;
    if (!t.last_completed_at) {
      overdue.push(t);
      continue;
    }
    const days = Math.floor(
      (today.getTime() - new Date(t.last_completed_at).getTime()) /
        (24 * 60 * 60 * 1000),
    );
    if (days <= window) {
      inWindow += 1;
    } else {
      overdue.push(t);
    }
  }
  const score = Math.round((inWindow / tasks.length) * 100);
  const state: ComplianceFactor['state'] =
    score >= 90 ? 'healthy' : score >= 70 ? 'attention' : 'urgent';

  let message = `All ${tasks.length} scheduled tasks ticked within their cycle. Cleaning record looks tidy.`;
  if (overdue.length > 0) {
    const first = overdue[0];
    message = `<em>${first.task}</em>${overdue.length > 1 ? ` and ${overdue.length - 1} other${overdue.length - 1 === 1 ? '' : 's'}` : ''} past their ${first.frequency} window. The calendar dots them red on the diary.`;
  }

  return {
    key: 'cleaning_cadence',
    label: 'Cleaning schedule',
    weight: WEIGHTS.cleaning_cadence,
    score,
    message,
    href: '/safety/cleaning',
    state,
  };
}

function scoreTrainingValidity(
  training: Awaited<ReturnType<typeof getTrainingRecords>>,
): ComplianceFactor {
  if (training.length === 0) {
    return {
      key: 'training_validity',
      label: 'Training records',
      weight: WEIGHTS.training_validity,
      score: 50,
      message:
        'No training certificates on file. At minimum log each kitchen team member&rsquo;s Level 2 Food Hygiene — it&rsquo;s a legal requirement.',
      href: '/safety/training',
      state: 'attention',
    };
  }
  const expired = training.filter((t) => t.expiry_band === 'expired');
  const dueSoon = training.filter((t) =>
    ['today', 'this_week', 'two_weeks'].includes(t.expiry_band),
  );
  const valid = training.length - expired.length - dueSoon.length;
  const score = Math.round((valid / training.length) * 100);
  const state: ComplianceFactor['state'] =
    expired.length > 0 ? 'urgent' : dueSoon.length > 0 ? 'attention' : 'healthy';

  let message = `All ${training.length} certificate${training.length === 1 ? '' : 's'} in date. Nothing expiring inside the action window.`;
  if (expired.length > 0) {
    const e = expired[0];
    message = `<em>${e.staff_name}&rsquo;s ${e.certificate_name ?? e.kind}</em> expired ${Math.abs(e.days_until_expiry ?? 0)} day${Math.abs(e.days_until_expiry ?? 0) === 1 ? '' : 's'} ago${expired.length > 1 ? ` (plus ${expired.length - 1} other${expired.length - 1 === 1 ? '' : 's'})` : ''}. Book the refresher or work them off-floor.`;
  } else if (dueSoon.length > 0) {
    message = `${dueSoon.length} certificate${dueSoon.length === 1 ? '' : 's'} expiring inside two weeks. Earlier you book the refresher, easier it is.`;
  }

  return {
    key: 'training_validity',
    label: 'Training records',
    weight: WEIGHTS.training_validity,
    score,
    message,
    href: '/safety/training',
    state,
  };
}

function scoreIncidentResolution(
  incidents: Awaited<ReturnType<typeof getRecentIncidents>>,
): ComplianceFactor {
  if (incidents.length === 0) {
    return {
      key: 'incident_resolution',
      label: 'Incident log',
      weight: WEIGHTS.incident_resolution,
      score: 100,
      message:
        'Nothing on file in the last 30 days. Long may that continue.',
      href: '/safety/incidents',
      state: 'healthy',
    };
  }
  const unresolved = incidents.filter((i) => !i.resolved_at);
  const score =
    unresolved.length === 0
      ? 100
      : Math.max(0, 100 - unresolved.length * 25);
  const state: ComplianceFactor['state'] =
    unresolved.length === 0
      ? 'healthy'
      : unresolved.length >= 2
        ? 'urgent'
        : 'attention';

  let message = `${incidents.length} logged · all resolved with corrective actions ticked.`;
  if (unresolved.length > 0) {
    const oldest = unresolved[unresolved.length - 1];
    const days = Math.floor(
      (Date.now() - new Date(oldest.occurred_at).getTime()) /
        (24 * 60 * 60 * 1000),
    );
    message = `<em>${oldest.summary}</em> still open after ${days} day${days === 1 ? '' : 's'}${unresolved.length > 1 ? ` (and ${unresolved.length - 1} other${unresolved.length - 1 === 1 ? '' : 's'})` : ''}. Resolve or escalate.`;
  }

  return {
    key: 'incident_resolution',
    label: 'Incident log',
    weight: WEIGHTS.incident_resolution,
    score,
    message,
    href: '/safety/incidents',
    state,
  };
}
