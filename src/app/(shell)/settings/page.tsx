import Link from 'next/link';
import { SignOutForm } from '@/components/shell/SignOutForm';
import { getShellContext } from '@/lib/shell/context';

export const metadata = { title: 'Settings — Palatable' };

export default async function SettingsPage() {
  const ctx = await getShellContext();

  return (
    <div className="px-14 pt-12 pb-20 max-w-[800px]">
      <h1 className="font-serif text-5xl text-ink mb-8">Settings</h1>

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
          <span className="font-serif text-[15px] text-ink">Integrations</span>
          <span className="text-[11px] text-muted">
            Manage in Connections tab →
          </span>
        </Link>
      </Section>

      <Section title="Account">
        <Row label="Email" value={ctx.email} />
        <Row label="Role" value={ctx.role} capitalize />
      </Section>

      <div className="bg-card border border-rule px-8 py-7">
        <div className="font-display font-semibold text-[10px] tracking-[0.45em] uppercase text-gold mb-4">
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
      <div className="px-7 py-5 border-b border-rule font-display font-semibold text-[11px] tracking-[0.3em] uppercase text-ink">
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
      <div className="font-serif text-[15px] text-ink">{label}</div>
      <div
        className={
          'text-[11px] ' +
          (muted ? 'italic text-muted-soft' : 'text-muted') +
          (capitalize ? ' capitalize' : '')
        }
      >
        {value}
      </div>
    </div>
  );
}

function ToggleRow({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="px-7 py-4 flex justify-between items-center">
      <div className="font-serif text-[15px] text-ink">{label}</div>
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
