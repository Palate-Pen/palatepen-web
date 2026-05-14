import Link from 'next/link';
import { signInWithPassword, signInWithMagicLink } from '@/lib/actions/auth';

export const metadata = { title: 'Sign in — Palatable' };

type SearchParams = {
  error?: string;
  magic_link?: string;
  check_email?: string;
  next?: string;
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  return (
    <div className="pt-6">
      <h1 className="font-display text-4xl font-semibold uppercase tracking-[0.04em] mb-3">Welcome back</h1>
      <p className="font-serif italic text-sm text-muted mb-8">
        sign in to your kitchen
      </p>

      {params.magic_link === 'sent' && (
        <StatusBanner kind="info">
          Magic link sent. Check your email to finish signing in.
        </StatusBanner>
      )}
      {params.check_email === '1' && (
        <StatusBanner kind="info">
          Check your email to confirm your account, then come back to sign in.
        </StatusBanner>
      )}
      {params.error && <StatusBanner kind="error">{params.error}</StatusBanner>}

      <form action={signInWithPassword} className="space-y-5">
        <Field name="email" label="Email" type="email" required />
        <Field name="password" label="Password" type="password" required />

        <button
          type="submit"
          className="w-full mt-4 bg-gold text-card font-sans font-semibold text-xs tracking-[0.08em] uppercase py-3 px-6 hover:opacity-90 transition-opacity"
        >
          Sign in
        </button>
      </form>

      <div className="flex items-center gap-4 my-8">
        <div className="flex-1 h-px bg-rule" />
        <span className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted-soft">
          or
        </span>
        <div className="flex-1 h-px bg-rule" />
      </div>

      <form action={signInWithMagicLink} className="space-y-5">
        <Field
          name="email"
          label="Email for magic link"
          type="email"
          required
        />
        <button
          type="submit"
          className="w-full border border-rule text-muted font-sans font-semibold text-xs tracking-[0.08em] uppercase py-3 px-6 hover:bg-card hover:text-ink transition-colors"
        >
          Send a magic link
        </button>
      </form>

      <Link
        href="/signup"
        className="block mt-8 text-center font-serif italic text-sm text-gold hover:text-gold/80 transition-colors"
      >
        New here? Sign up →
      </Link>
    </div>
  );
}

function Field({
  name,
  label,
  type,
  required,
}: {
  name: string;
  label: string;
  type: string;
  required?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="block font-sans font-semibold text-xs tracking-[0.08em] uppercase mb-2 text-ink"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        className="w-full bg-card border border-rule px-3 py-3 text-sm focus:outline-none focus:border-gold transition-colors"
      />
    </div>
  );
}

function StatusBanner({
  kind,
  children,
}: {
  kind: 'info' | 'error';
  children: React.ReactNode;
}) {
  const styles =
    kind === 'error'
      ? 'border-l-urgent text-urgent bg-urgent/5'
      : 'border-l-gold text-ink bg-gold-bg';
  return (
    <div
      className={`border-l-[3px] ${styles} px-4 py-3 mb-6 font-serif italic text-sm`}
    >
      {children}
    </div>
  );
}
