import { signOut } from '@/lib/actions/auth';

export function SignOutForm() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="font-display text-[8px] tracking-[0.3em] uppercase text-muted hover:text-ink transition-colors"
      >
        Sign out
      </button>
    </form>
  );
}
