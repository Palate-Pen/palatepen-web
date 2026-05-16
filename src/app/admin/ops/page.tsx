import Link from 'next/link';
import {
  getGitHubIssues,
  getRoadmapTodos,
  type AdminIssue,
  type RoadmapPhase,
} from '@/lib/admin-ops';
import { KpiCard } from '@/components/shell/KpiCard';
import { SectionHead } from '@/components/shell/SectionHead';
import { ReseedDemoCard } from './ReseedDemoCard';

export const metadata = { title: 'Admin · Founder Ops — Palatable' };

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export default async function AdminOpsPage() {
  const [issues, roadmap] = await Promise.all([
    getGitHubIssues(),
    getRoadmapTodos(),
  ]);

  const openIssueCount = issues.ok ? issues.total : 0;
  const urgentCount = issues.ok
    ? issues.issues.filter((i) => i.is_urgent).length
    : 0;
  const openTodoCount = roadmap.ok ? roadmap.totalOpen : 0;
  const doneTodoCount = roadmap.ok ? roadmap.totalDone : 0;

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[1680px] mx-auto">
      <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-3.5">
        Founder Admin
      </div>
      <h1 className="font-serif text-4xl font-normal leading-[1.1] tracking-[-0.015em] text-ink">
        Founder <em className="text-gold font-semibold not-italic">Ops</em>
      </h1>
      <p className="font-serif italic text-lg text-muted mt-3 mb-10">
        Live issues from GitHub. Forward-looking todos from CLAUDE.md
        Roadmap. Reseed control for the founder demo account.
      </p>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule mb-12">
        <KpiCard
          label="Open Issues"
          value={String(openIssueCount)}
          sub={
            issues.ok
              ? urgentCount > 0
                ? `${urgentCount} urgent · ${openIssueCount - urgentCount} normal`
                : 'all triaged'
              : 'GitHub unavailable'
          }
          tone={
            !issues.ok
              ? undefined
              : urgentCount > 0
                ? 'attention'
                : openIssueCount > 0
                  ? undefined
                  : 'healthy'
          }
        />
        <KpiCard
          label="Open Todos"
          value={String(openTodoCount)}
          sub={`${doneTodoCount} shipped`}
          tone={openTodoCount === 0 ? 'healthy' : undefined}
        />
        <KpiCard
          label="Roadmap Phases"
          value={String(roadmap.ok ? roadmap.phases.length : 0)}
          sub="in flight + backlog"
        />
        <KpiCard
          label="Done / Total"
          value={
            doneTodoCount + openTodoCount > 0
              ? `${Math.round((doneTodoCount / (doneTodoCount + openTodoCount)) * 100)}%`
              : '—'
          }
          sub="across the roadmap"
        />
      </div>

      {/* Issues panel */}
      <section id="issues" className="mb-12 scroll-mt-8">
        <SectionHead
          title="GitHub Issues"
          meta={
            issues.ok
              ? `${openIssueCount} open`
              : 'connection · pending'
          }
        />
        {!issues.ok ? (
          <div className="bg-card border border-rule border-l-4 border-l-attention px-7 py-6">
            <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-attention mb-2">
              GitHub integration · {issues.reason.replace('_', ' ')}
            </div>
            <p className="font-serif italic text-sm text-ink-soft leading-relaxed">
              {issues.message}
            </p>
            <a
              href={`https://github.com/Palate-Pen/palatepen-web/issues`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold hover:text-gold-dark transition-colors mt-3 inline-block"
            >
              Open on GitHub →
            </a>
          </div>
        ) : issues.issues.length === 0 ? (
          <div className="bg-card border border-rule px-10 py-12 text-center">
            <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-healthy mb-2">
              All Clear
            </div>
            <p className="font-serif italic text-muted">
              No open issues. The tracker is dry — bugs that surface land here as we hit them.
            </p>
            <a
              href="https://github.com/Palate-Pen/palatepen-web/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold hover:text-gold-dark transition-colors mt-3 inline-block"
            >
              Open on GitHub →
            </a>
          </div>
        ) : (
          <>
            <div className="bg-card border border-rule">
              {issues.issues.map((issue, i) => (
                <IssueRow
                  key={issue.number}
                  issue={issue}
                  last={i === issues.issues.length - 1}
                />
              ))}
            </div>
            <a
              href="https://github.com/Palate-Pen/palatepen-web/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-gold hover:text-gold-dark transition-colors mt-4 inline-block"
            >
              Open all issues on GitHub →
            </a>
          </>
        )}
      </section>

      {/* Roadmap todos panel */}
      <section id="todos" className="mb-12 scroll-mt-8">
        <SectionHead
          title="Roadmap Todos"
          meta={
            roadmap.ok
              ? `${openTodoCount} open · ${doneTodoCount} shipped`
              : 'CLAUDE.md · unavailable'
          }
        />
        {!roadmap.ok ? (
          <div className="bg-card border border-rule border-l-4 border-l-urgent px-7 py-6">
            <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-urgent mb-2">
              Roadmap parse · {roadmap.reason.replace('_', ' ')}
            </div>
            <p className="font-serif italic text-sm text-ink-soft">
              {roadmap.message}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {roadmap.phases.map((phase) => (
              <PhasePanel key={phase.name} phase={phase} />
            ))}
          </div>
        )}
      </section>

      {/* Founder demo controls — kept from v1 */}
      <section id="demo">
        <SectionHead title="Founder Demo" meta="re-anchor every surface to today" />
        <ReseedDemoCard />
      </section>
    </div>
  );
}

function IssueRow({ issue, last }: { issue: AdminIssue; last: boolean }) {
  return (
    <a
      href={issue.url}
      target="_blank"
      rel="noopener noreferrer"
      className={
        'block px-7 py-4 hover:bg-paper-warm transition-colors' +
        (last ? '' : ' border-b border-rule-soft')
      }
    >
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1.5">
        <div className="font-serif font-semibold text-base text-ink">
          <span className="text-muted-soft mr-2">#{issue.number}</span>
          {issue.title}
        </div>
        <div className="font-serif italic text-xs text-muted whitespace-nowrap">
          {dateFmt.format(new Date(issue.created_at))}
        </div>
      </div>
      {issue.labels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {issue.labels.map((label) => (
            <span
              key={label.name}
              className={
                'font-display font-semibold text-[11px] tracking-[0.18em] uppercase px-2 py-0.5 border ' +
                (issue.is_urgent &&
                ['bug', 'urgent', 'critical', 'security', 'p0', 'p1'].includes(
                  label.name.toLowerCase(),
                )
                  ? 'bg-urgent/10 text-urgent border-urgent/40'
                  : 'bg-paper-warm text-ink-soft border-rule')
              }
            >
              {label.name}
            </span>
          ))}
        </div>
      )}
    </a>
  );
}

function PhasePanel({ phase }: { phase: RoadmapPhase }) {
  const openCount = phase.todos.filter((t) => !t.done).length;
  const doneCount = phase.todos.filter((t) => t.done).length;
  const isComplete =
    phase.todos.length > 0 && openCount === 0;

  return (
    <div className="bg-card border border-rule">
      <div className="px-7 py-5 border-b border-rule bg-paper-warm flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-gold">
            {phase.name}
          </div>
          {phase.blurb && (
            <p className="font-serif italic text-sm text-muted mt-1 max-w-[640px]">
              {phase.blurb}
            </p>
          )}
        </div>
        <div className="font-serif text-xs text-muted whitespace-nowrap">
          {phase.todos.length === 0
            ? 'no todos'
            : isComplete
              ? `${doneCount} shipped · ✓ complete`
              : `${openCount} open · ${doneCount} shipped`}
        </div>
      </div>
      {phase.todos.length > 0 && (
        <div className="px-2 py-2">
          {phase.todos.map((todo, i) => (
            <TodoRow key={`${phase.name}-${i}`} todo={todo} />
          ))}
        </div>
      )}
    </div>
  );
}

function TodoRow({ todo }: { todo: { text: string; done: boolean; note: string | null } }) {
  return (
    <div
      className={
        'flex gap-3 items-start px-5 py-2.5 rounded-sm ' +
        (todo.done ? 'opacity-60' : '')
      }
    >
      <div
        className={
          'mt-1 w-4 h-4 border flex-shrink-0 flex items-center justify-center ' +
          (todo.done
            ? 'bg-healthy border-healthy text-paper'
            : 'bg-card border-rule')
        }
        aria-hidden="true"
      >
        {todo.done && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className={
            'font-serif text-sm leading-snug ' +
            (todo.done ? 'text-muted line-through' : 'text-ink')
          }
        >
          {todo.text}
        </div>
        {todo.note && (
          <div className="font-serif italic text-xs text-muted mt-0.5 leading-snug">
            {todo.note}
          </div>
        )}
      </div>
    </div>
  );
}
