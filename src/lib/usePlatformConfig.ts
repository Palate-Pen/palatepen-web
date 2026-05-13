'use client';
import { useEffect, useState } from 'react';
import { isFeatureEnabled, type FeatureFlagKey } from './featureFlags';
import { canAccess } from './tierGate';
import { useAuth } from '@/context/AuthContext';

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

// Pure tier-gate hook — does the current user's tier reach the minimum
// for this feature key? `featureKey` is one of the entries in
// FEATURE_MIN_TIER (src/lib/tierGate.ts). Returns true when the feature
// has no tier requirement (key not in the map).
export function useTierFeature(featureKey: string): boolean {
  const { tier } = useAuth();
  return canAccess(tier, featureKey);
}

// Combined gate — tier first, then flag. Mirrors the server-side
// `denyIfBlocked` helper. Both checks must pass for the feature to render.
// `featureKey` is a tierGate FEATURE_MIN_TIER key (e.g. 'menus_live_digital');
// `flagKey` is a FeatureFlagKey for the admin kill switch (e.g. 'publicMenus').
export function useTierAndFlag(
  featureKey: string,
  flagKey: FeatureFlagKey,
  userOverrides?: Record<string, unknown> | null,
): boolean {
  const tierOK = useTierFeature(featureKey);
  const flagOK = useFeatureFlag(flagKey, userOverrides);
  return tierOK && flagOK;
}
