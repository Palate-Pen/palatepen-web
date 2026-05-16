'use client';

import { RouteErrorPane } from '@/components/errors/RouteErrorPane';

export default function SafetyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorPane
      error={error}
      reset={reset}
      route="safety"
      homeHref="/safety"
    />
  );
}
