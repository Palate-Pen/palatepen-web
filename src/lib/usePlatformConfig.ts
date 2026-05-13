'use client';
import { useEffect, useState } from 'react';
import { isFeatureEnabled, type FeatureFlagKey } from './featureFlags';

// Module-level cache so we fetch /api/platform-config exactly once per
// session. Subsequent useFeatureFlag() calls in any component get the value
// synchronously after the first load resolves.

interface PlatformConfig {
  featureFlags: Record<string, unknown>;
}

let cached: PlatformConfig | null = null;
let inflight: Promise<PlatformConfig> | null = null;
const subscribers = new Set<() => void>();

async function load(): Promise<PlatformConfig> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch('/api/platform-config', { cache: 'no-store' });
      const json = await res.json();
      cached = { featureFlags: json.featureFlags || {} };
    } catch {
      cached = { featureFlags: {} };
    }
    subscribers.forEach(fn => fn());
    return cached!;
  })();
  return inflight;
}

export function usePlatformConfig(): { flags: Record<string, unknown>; ready: boolean } {
  const [, force] = useState(0);
  useEffect(() => {
    const rerender = () => force(n => n + 1);
    subscribers.add(rerender);
    if (!cached) load();
    return () => { subscribers.delete(rerender); };
  }, []);
  return { flags: cached?.featureFlags || {}, ready: !!cached };
}

// Hook for a single flag with per-user overrides applied. Pass the user's
// profile.featureOverrides (from useApp().state.profile) when available so
// admin per-user overrides win over the global flag.
export function useFeatureFlag(
  key: FeatureFlagKey,
  userOverrides?: Record<string, unknown> | null,
): boolean {
  const { flags } = usePlatformConfig();
  return isFeatureEnabled(key, flags, userOverrides);
}
