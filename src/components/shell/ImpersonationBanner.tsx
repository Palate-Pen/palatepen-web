import { cookies } from 'next/headers';
import {
  IMPERSONATION_FLAG_COOKIE,
  IMPERSONATION_LABEL_COOKIE,
} from '@/app/admin/users/cookies';
import { StopImpersonationButton } from './StopImpersonationButton';

/**
 * Site-wide pill that appears on every page when the founder is
 * impersonating another user. Written from the user's point of view
 * ("your friendly developer is in your kitchen…") so it feels warm
 * rather than surveillance-y — and serves as the founder's only path
 * back to their own account via the Stop button.
 *
 * Server-rendered from the cookie set by impersonateUserAction.
 * Hidden when the cookie isn't present.
 */
export async function ImpersonationBanner() {
  const c = await cookies();
  const flag = c.get(IMPERSONATION_FLAG_COOKIE)?.value;
  if (flag !== '1') return null;
  const label = c.get(IMPERSONATION_LABEL_COOKIE)?.value ?? null;

  return (
    <div className="bg-gold-bg border-b border-gold/30 px-4 sm:px-6 py-3 flex items-center gap-4 flex-wrap">
      <span
        aria-hidden
        className="w-2.5 h-2.5 rounded-full bg-gold flex-shrink-0 animate-pulse"
      />
      <div className="flex-1 min-w-[200px]">
        <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-gold-dark mb-0.5">
          Friendly visit
        </div>
        <div className="font-serif text-[15px] text-ink leading-snug">
          Your friendly developer is in the kitchen{' '}
          <em className="text-gold-dark italic font-medium">checking the burners</em>
          {' '}— making sure everything&apos;s running smooth.
          {label && (
            <span className="text-muted font-serif italic text-sm">
              {' · signed in as '}
              <span className="font-mono text-xs">{label}</span>
            </span>
          )}
        </div>
      </div>
      <StopImpersonationButton />
    </div>
  );
}
