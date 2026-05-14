import Link from 'next/link';
import { SignOutForm } from '@/components/shell/SignOutForm';
import { AccessibilitySettings } from '@/components/shell/AccessibilitySettings';
import { getShellContext } from '@/lib/shell/context';

export const metadata = { title: 'Settings — Palatable' };

export default async function SettingsPage() {
  const ctx = await getShellContext();
  const canSeeManager = ctx.role === 'manager' || ctx.role === 'owner';
  const isFounder = ctx.email === 'jack@palateandpen.co.uk';

  return (
    <div className="px-14 pt-12 pb-20 max-w-[800px]">
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-8">Settings</h1>

      {(canSeeManager || isFounder) && (
        <Section title="Switch Surface">
          {canSeeManager && (
            <SurfaceLink
              href="/manager"
              eyebrow={ctx.role === 'owner' ? 'Owner access' : 'Manager access'}
              title="Manager surface"
              body="Site command — menu builder, P&L, team, deliveries oversight."
            />
          )}
          {isFounder && (
            <SurfaceLink
              href="/admin"
              eyebrow="Founder only"
              title="Founder admin"
              body="Cross-account command centre. Users · business · system · ops."
            />
          )}
        </Section>
      )}

      <AccessibilitySettings />

      <Section title="Kitchen Info">
        <Row label="Kitchen name" value={ctx.kitchenName} />
        <Row label="Kitchen size" value="Not set" muted />
        <Row label="Kitchen location" value="Not set" muted />
      </Section>

      <Section title="Preferences">
        <ToggleRow label="Auto-bank invoices" on />
        <ToggleRow label="Looking Ahead notifications" on />
        <ToggleRow label="Team can view Notebook" on={false} />
      </Section>

      <Section title="Connections">
        <Link
          href="/connections"
          className="px-7 py-4 flex justify-between items-center hover:text-gold transition-colors"
        >
          <span className="font-serif text-sm text-ink">Integrations</span>
          <span className="text-xs text-muted">
            Manage in Connections tab →
          </span>
        </Link>
      </Section>

      <Section title="Account">
        <Row label="Email" value={ctx.email} />
        <Row label="Role" value={ctx.role} capitalize />
      </Section>

      <div className="bg-card border border-rule px-8 py-7">
        <div className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-gold mb-4">
          Session
        </div>
        <SignOutForm />
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-rule mb-6">
      <div className="px-7 py-5 border-b border-rule font-display font-semibold text-xs tracking-[0.3em] uppercase text-ink">
        {title}
      </div>
      <div className="divide-y divide-rule">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  capitalize,
}: {
  label: string;
  value: string;
  muted?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div className="px-7 py-4 flex justify-between items-center">
      <div className="font-serif text-sm text-ink">{label}</div>
      <div
        className={
          'text-xs ' +
          (muted ? 'italic text-muted-soft' : 'text-muted') +
          (capitalize ? ' capitalize' : '')
        }
      >
        {value}
      </div>
    </div>
  );
}

function SurfaceLink({
  href,
  eyebrow,
  title,
  body,
}: {
  href: string;
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="px-7 py-5 flex items-center justify-between gap-4 hover:bg-paper-warm transition-colors group"
    >
      <div className="flex-1 min-w-0">
        <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-gold mb-1.5">
          {eyebrow}
        </div>
        <div className="font-serif font-semibold text-base text-ink leading-tight">
          {title}
        </div>
        <div className="font-serif italic text-sm text-muted mt-1">
          {body}
        </div>
      </div>
      <span className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted group-hover:text-gold transition-colors">
        Open →
      </span>
    </Link>
  );
}

function ToggleRow({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="px-7 py-4 flex justify-between items-center">
      <div className="font-serif text-sm text-ink">{label}</div>
      <div
        className={
          'w-10 h-6 rounded-full relative transition-colors ' +
          (on ? 'bg-gold' : 'bg-rule')
        }
        aria-label={`${label} ${on ? 'on' : 'off'}`}
      >
        <span
          className={
            'absolute w-5 h-5 bg-white rounded-full top-0.5 transition-[left] ' +
            (on ? 'left-0.5' : 'left-[18px]')
          }
        />
      </div>
    </div>
  );
}
