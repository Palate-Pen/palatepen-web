import Link from 'next/link';
import { signInWithPassword, signInWithMagicLink } from '@/lib/actions/auth';

export const metadata = { title: 'Sign in — Palatable' };

export default function SignInPage() {
  return (
    <div className="pt-6">
      <h1 className="font-serif text-4xl mb-3">Welcome back</h1>
      <p className="font-serif italic text-sm text-muted mb-8">
        sign in to your kitchen
      </p>

      <form action={signInWithPassword} className="space-y-5">
        <Field name="email" label="Email" type="email" required />
        <Field name="password" label="Password" type="password" required />

        <button
          type="submit"
          className="w-full mt-4 bg-gold text-card font-display text-[8px] tracking-[0.3em] uppercase py-3 px-6 hover:opacity-90 transition-opacity"
        >
          Sign in
        </button>
      </form>

      <div className="flex items-center gap-4 my-8">
        <div className="flex-1 h-px bg-rule" />
        <span className="font-display text-[8px] tracking-[0.3em] uppercase text-muted-soft">
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
          className="w-full border border-rule text-muted font-display text-[8px] tracking-[0.3em] uppercase py-3 px-6 hover:bg-card hover:text-ink transition-colors"
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
        className="block font-display text-[9px] tracking-[0.3em] uppercase mb-2 text-ink"
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
