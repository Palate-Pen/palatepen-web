import Link from 'next/link';
import { SignOutForm } from '@/components/shell/SignOutForm';
import { AccessibilitySettings } from '@/components/shell/AccessibilitySettings';
import { getShellContext } from '@/lib/shell/context';
import { getUserPreferences, PREFERENCE_META } from '@/lib/preferences';
import { getAccountPreferences } from '@/lib/account-preferences';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { PreferenceToggle } from './PreferenceToggle';
import { InboxTokenPanel } from './InboxTokenPanel';
import { AccountPreferencesPanel } from './AccountPreferencesPanel';
import { DataExportPanel } from './DataExportPanel';
import { KpiCard } from '@/components/shell/KpiCard';

export const metadata = { title: 'Settings — Palatable' };

export default async function SettingsPage() {
  const ctx = await getShellContext();
  const prefs = await getUserPreferences(ctx.userId);
  const supabase = await createSupabaseServerClient();
  const { data: accountRow } = await supabase
    .from('accounts')
    .select('inbox_token')
    .eq('id', ctx.accountId)
    .single();
  const inboxToken = (accountRow?.inbox_token as string | null) ?? null;
  const accountPrefs = await getAccountPreferences(ctx.accountId);
  const canSeeManager = ctx.role === 'manager' || ctx.role === 'owner';
  const isFounder = ctx.email === 'jack@palateandpen.co.uk';
  const isOwner = ctx.role === 'owner';

  // Profile stats — counts across the chef's site, mirrors legacy
  // ProfileScreen dashboard ("Recipes / Ideas / In Bank / GP Calcs").
  const [
    recipesCount,
    notesCount,
    bankCount,
    gpCalcsCount,
  ] = await Promise.all([
    supabase
      .from('recipes')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', ctx.siteId)
      .is('archived_at', null),
    supabase
      .from('notebook_entries')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', ctx.siteId)
      .is('archived_at', null),
    supabase
      .from('ingredients')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', ctx.siteId),
    supabase
      .from('gp_calculations')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', ctx.siteId),
  ]);

  return (
    <div className="px-4 sm:px-8 lg:px-14 pt-6 lg:pt-12 pb-12 lg:pb-20 max-w-[800px] mx-auto">
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
          {ctx.role === 'owner' && (
            <SurfaceLink
              href="/owner"
              eyebrow="Owner access"
              title="Owner surface"
              body="The whole business lens — cross-site rollup, revenue, cash, group reporting."
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

      <Section title="At A Glance">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule">
          <KpiCard
            label="Recipes"
            value={String(recipesCount.count ?? 0)}
            sub="on the books"
          />
          <KpiCard
            label="Notebook"
            value={String(notesCount.count ?? 0)}
            sub="entries"
          />
          <KpiCard
            label="In The Bank"
            value={String(bankCount.count ?? 0)}
            sub="ingredients on file"
          />
          <KpiCard
            label="GP Calcs"
            value={String(gpCalcsCount.count ?? 0)}
            sub="saved scratch pads"
          />
        </div>
      </Section>

      <AccessibilitySettings />

      <Section title="Kitchen Info">
        <AccountPreferencesPanel initial={accountPrefs} canEdit={isOwner} />
      </Section>

      <Section title="Preferences">
        <PreferenceToggle
          prefKey="auto_bank_invoices"
          label={PREFERENCE_META.auto_bank_invoices.label}
          description={PREFERENCE_META.auto_bank_invoices.description}
          initial={prefs.auto_bank_invoices}
        />
        <PreferenceToggle
          prefKey="looking_ahead_notifications"
          label={PREFERENCE_META.looking_ahead_notifications.label}
          description={PREFERENCE_META.looking_ahead_notifications.description}
          initial={prefs.looking_ahead_notifications}
        />
        <PreferenceToggle
          prefKey="team_view_notebook"
          label={PREFERENCE_META.team_view_notebook.label}
          description={PREFERENCE_META.team_view_notebook.description}
          initial={prefs.team_view_notebook}
        />
      </Section>

      <Section title="Invoice Email Forwarding">
        <InboxTokenPanel initialToken={inboxToken} canRotate={isOwner} />
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

      <Section title="Export Data">
        <DataExportPanel />
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

