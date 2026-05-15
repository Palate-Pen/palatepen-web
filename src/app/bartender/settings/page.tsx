import Link from 'next/link';
import { SignOutForm } from '@/components/shell/SignOutForm';
import { AccessibilitySettings } from '@/components/shell/AccessibilitySettings';
import { getShellContext } from '@/lib/shell/context';
import { getAccountPreferences } from '@/lib/account-preferences';
import { AccountPreferencesPanel } from '@/app/(shell)/settings/AccountPreferencesPanel';

export const metadata = { title: 'Settings — Bar — Palatable' };

export default async function BarSettingsPage() {
  const ctx = await getShellContext();
  const accountPrefs = await getAccountPreferences(ctx.accountId);
  const isOwner = ctx.role === 'owner';

  return (
    <div className="px-4 sm:px-8 lg:px-10 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[800px] mx-auto">
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] text-ink mb-8">
        Settings
      </h1>

      <Section title="Switch Surface">
        <SurfaceLink
          href="/"
          eyebrow="Chef access"
          title="Chef surface"
          body="The kitchen view — recipes, prep, stock & suppliers."
        />
        {(ctx.role === 'manager' || ctx.role === 'owner') && (
          <SurfaceLink
            href="/manager"
            eyebrow="Manager access"
            title="Manager surface"
            body="Site command — menu builder, team, deliveries oversight."
          />
        )}
        {ctx.role === 'owner' && (
          <SurfaceLink
            href="/owner"
            eyebrow="Owner access"
            title="Owner surface"
            body="Whole business — cross-site, revenue, cash."
          />
        )}
      </Section>

      {(ctx.role === 'owner' || ctx.role === 'manager') && (
        <Section title="Team & Permissions">
          <Link
            href={ctx.role === 'owner' ? '/owner/team' : '/manager/team'}
            className="px-7 py-5 flex items-center justify-between gap-4 hover:bg-paper-warm transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <div className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-gold mb-1.5">
                {ctx.role === 'owner' ? 'Across every site' : 'The brigade'}
              </div>
              <div className="font-serif font-semibold text-base text-ink leading-tight">
                Manage roles + permissions
              </div>
              <div className="font-serif italic text-sm text-muted mt-1">
                Click a member to see their info and per-feature permissions. Roles set defaults — overrides give you precision.
              </div>
            </div>
            <span className="font-display font-semibold text-xs tracking-[0.18em] uppercase text-muted group-hover:text-gold transition-colors">
              Open →
            </span>
          </Link>
        </Section>
      )}

      <AccessibilitySettings />

      <Section title="Bar Info">
        <AccountPreferencesPanel initial={accountPrefs} canEdit={isOwner} />
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
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="px-7 py-4 flex justify-between items-center">
      <div className="font-serif text-sm text-ink">{label}</div>
      <div
        className={
          'text-xs text-muted' + (capitalize ? ' capitalize' : '')
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
