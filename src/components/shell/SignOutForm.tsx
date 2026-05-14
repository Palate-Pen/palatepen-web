import { signOut } from '@/lib/actions/auth';

export function SignOutForm() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="font-sans font-semibold text-xs tracking-[0.08em] uppercase text-muted hover:text-ink transition-colors"
      >
        Sign out
      </button>
    </form>
  );
}
