'use client';

import { RouteErrorPane } from '@/components/errors/RouteErrorPane';

export default function LandingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorPane error={error} reset={reset} route="landing" />;
}
