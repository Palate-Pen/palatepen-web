import { promises as fs } from 'fs';
import path from 'path';

/**
 * Data sources for the Founder Ops page.
 *
 * Two streams:
 *   - GitHub Issues (live, via REST API) — bugs and problems with the
 *     fix documented inline per the project convention. Requires
 *     GITHUB_TOKEN env var on the deployment (PAT scoped to
 *     Palate-Pen/palatepen-web). Degrades gracefully when missing.
 *   - Roadmap todos (parsed from CLAUDE.md at request time) — the
 *     forward-looking work list grouped by phase. CLAUDE.md is bundled
 *     with the deployment via outputFileTracingIncludes in next.config.
 */

const REPO_OWNER = 'Palate-Pen';
const REPO_NAME = 'palatepen-web';
const ISSUES_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues?state=open&per_page=50`;

export type IssueLabel = {
  name: string;
  color: string;
};

export type AdminIssue = {
  number: number;
  title: string;
  url: string;
  state: 'open' | 'closed';
  created_at: string;
  labels: IssueLabel[];
  /** True when the issue carries the `Bug` / `urgent` / `critical` label
   *  so the home KPI can split urgent from normal. */
  is_urgent: boolean;
};

export type IssuesResult =
  | { ok: true; issues: AdminIssue[]; total: number }
  | { ok: false; reason: 'no_token' | 'network' | 'auth' | 'rate_limit' | 'other'; message: string };

/** Cached server-side fetch. Refresh every 5 minutes — the page is
 *  founder-only and doesn't need to be sub-second fresh. */
export async function getGitHubIssues(): Promise<IssuesResult> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return {
      ok: false,
      reason: 'no_token',
      message:
        'GITHUB_TOKEN not set. Add a fine-grained PAT (scoped to Palate-Pen/palatepen-web, Issues: Read) to .env.local and Vercel to surface live issues here.',
    };
  }

  try {
    const res = await fetch(ISSUES_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      next: { revalidate: 300 },
    });

    if (res.status === 401 || res.status === 403) {
      const isRateLimit = res.headers.get('x-ratelimit-remaining') === '0';
      return {
        ok: false,
        reason: isRateLimit ? 'rate_limit' : 'auth',
        message: isRateLimit
          ? 'GitHub API rate limit reached. Retry in an hour.'
          : 'GitHub token rejected (401/403). Check the PAT is valid and has Issues:Read scope.',
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        reason: 'other',
        message: `GitHub API ${res.status} — ${await res.text().catch(() => '')}`,
      };
    }

    const raw = (await res.json()) as Array<{
      number: number;
      title: string;
      html_url: string;
      state: string;
      created_at: string;
      pull_request?: unknown;
      labels: Array<{ name: string; color: string }>;
    }>;

    // GH issues endpoint returns PRs too; filter them out.
    const filtered = raw.filter((i) => !i.pull_request);

    const issues: AdminIssue[] = filtered.map((i) => {
      const labels = i.labels.map((l) => ({
        name: l.name,
        color: `#${l.color}`,
      }));
      const lower = labels.map((l) => l.name.toLowerCase());
      const isUrgent =
        lower.some((n) =>
          ['bug', 'urgent', 'critical', 'security', 'p0', 'p1'].includes(n),
        );
      return {
        number: i.number,
        title: i.title,
        url: i.html_url,
        state: (i.state === 'closed' ? 'closed' : 'open') as 'open' | 'closed',
        created_at: i.created_at,
        labels,
        is_urgent: isUrgent,
      };
    });

    return { ok: true, issues, total: issues.length };
  } catch (e) {
    return {
      ok: false,
      reason: 'network',
      message: e instanceof Error ? e.message : 'Unknown network error',
    };
  }
}

export type RoadmapTodo = {
  /** The text body of the bullet, stripped of the checkbox prefix. */
  text: string;
  /** True if the line was `- [x]`. */
  done: boolean;
  /** Italic note on the same bullet, if any. Captured between
   *  parentheses in the source. */
  note: string | null;
};

export type RoadmapPhase = {
  /** Header text, e.g. "Phase 3 — Kitchen and Group Tier". */
  name: string;
  /** Free-form paragraph between the header and the first checkbox,
   *  e.g. "Complete. See docs/roadmap-archive.md for full checklist." */
  blurb: string | null;
  todos: RoadmapTodo[];
};

export type RoadmapResult =
  | { ok: true; phases: RoadmapPhase[]; totalOpen: number; totalDone: number }
  | { ok: false; reason: 'not_found' | 'parse_error'; message: string };

/** Read CLAUDE.md from disk and parse the `## Roadmap` section into a
 *  phase-grouped list of todos. */
export async function getRoadmapTodos(): Promise<RoadmapResult> {
  let raw: string;
  try {
    raw = await fs.readFile(path.join(process.cwd(), 'CLAUDE.md'), 'utf8');
  } catch (e) {
    return {
      ok: false,
      reason: 'not_found',
      message: e instanceof Error ? e.message : 'Could not read CLAUDE.md',
    };
  }

  // Slice from `## Roadmap` to the next `## ` header (any other top-
  // level section ends the roadmap block).
  const startMatch = raw.match(/^## Roadmap\b/m);
  if (!startMatch) {
    return {
      ok: false,
      reason: 'parse_error',
      message: 'No `## Roadmap` heading in CLAUDE.md.',
    };
  }
  const startIdx = startMatch.index! + startMatch[0].length;
  const rest = raw.slice(startIdx);
  const endMatch = rest.match(/^## /m);
  const body = endMatch ? rest.slice(0, endMatch.index) : rest;

  const phases: RoadmapPhase[] = [];
  let current: RoadmapPhase | null = null;
  let blurbBuf: string[] = [];

  const lines = body.split(/\r?\n/);
  for (const line of lines) {
    const phaseMatch = line.match(/^###\s+(.+?)\s*$/);
    if (phaseMatch) {
      if (current) {
        current.blurb = blurbBuf.join(' ').trim() || null;
        phases.push(current);
      }
      current = { name: phaseMatch[1], blurb: null, todos: [] };
      blurbBuf = [];
      continue;
    }

    const todoMatch = line.match(/^\s*-\s+\[(x| )\]\s+(.+?)\s*$/);
    if (todoMatch && current) {
      const done = todoMatch[1] === 'x';
      // Extract trailing italic note like "*(All 4 stages shipped — …)*".
      let text = todoMatch[2];
      let note: string | null = null;
      const noteMatch = text.match(/^(.*?)\s*\*\(([^*]+)\)\*\s*$/);
      if (noteMatch) {
        text = noteMatch[1].trim();
        note = noteMatch[2].trim();
      }
      current.todos.push({ text, done, note });
      continue;
    }

    // Accumulate prose into the current phase blurb until the first
    // checkbox line appears. After that we ignore non-checkbox lines.
    if (current && current.todos.length === 0 && line.trim() !== '') {
      blurbBuf.push(line.trim());
    }
  }
  if (current) {
    current.blurb = blurbBuf.join(' ').trim() || null;
    phases.push(current);
  }

  let totalOpen = 0;
  let totalDone = 0;
  for (const p of phases) {
    for (const t of p.todos) {
      if (t.done) totalDone++;
      else totalOpen++;
    }
  }

  return { ok: true, phases, totalOpen, totalDone };
}
