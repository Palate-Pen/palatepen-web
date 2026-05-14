import { SignOutForm } from '@/components/shell/SignOutForm';
import { getShellContext } from '@/lib/shell/context';

export const metadata = { title: 'Settings — Palatable' };

export default async function SettingsPage() {
  const ctx = await getShellContext();

  return (
    <div className="px-14 pt-12 pb-20 max-w-[1200px]">
      <h1 className="font-serif text-5xl mb-3">Settings</h1>
      <p className="font-serif italic text-sm text-muted mb-10">
        Full preferences UI coming. For now, what's wired:
      </p>

      <div className="bg-card border border-rule px-8 py-7 mb-6">
        <div className="font-display text-[10px] font-semibold tracking-[0.45em] uppercase text-gold mb-4">
          Account
        </div>
        <dl className="space-y-3 text-[15px]">
          <Row label="Email" value={ctx.email} />
          <Row label="Kitchen" value={ctx.kitchenName} />
          <Row label="Role" value={ctx.role} />
        </dl>
      </div>

      <div className="bg-card border border-rule px-8 py-7">
        <div className="font-display text-[10px] font-semibold tracking-[0.45em] uppercase text-gold mb-4">
          Session
        </div>
        <SignOutForm />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-6">
      <dt className="font-display text-[8px] font-semibold tracking-[0.4em] uppercase text-muted w-24 flex-shrink-0">
        {label}
      </dt>
      <dd className="font-serif text-[17px] text-ink capitalize">{value}</dd>
    </div>
  );
}
