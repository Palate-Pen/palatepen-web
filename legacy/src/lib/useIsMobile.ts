'use client';
import { useEffect, useState } from 'react';

// Returns true when the viewport is below `breakpoint` (default 768px).
// Single resize listener per consuming component; no shared global state.
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);
  return isMobile;
}
