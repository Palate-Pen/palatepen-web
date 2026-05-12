// Shared by the in-app Menu Designer (client) and the public /m/[slug] page
// (server). Pure render — no hooks, no state — so it works in either context.

import React from 'react';

export type MenuBackground =
  | 'plain' | 'linen' | 'botanical' | 'deco'
  | 'marble' | 'kraft' | 'script' | 'modern'
  | 'custom';

export type MenuFontFamily = 'serif' | 'sans' | 'modern';
export type MenuDishStyle = 'standard' | 'leaders' | 'stacked';

export const MENU_FONT_OPTIONS: { id: MenuFontFamily; label: string; family: string }[] = [
  { id: 'serif',  label: 'Serif',  family: 'Georgia, "Times New Roman", serif' },
  { id: 'sans',   label: 'Sans',   family: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  { id: 'modern', label: 'Modern', family: 'system-ui, -apple-system, "Segoe UI", sans-serif' },
];

export function menuFontFor(f?: MenuFontFamily) {
  return MENU_FONT_OPTIONS.find(x => x.id === f)?.family || MENU_FONT_OPTIONS[0].family;
}

export function MenuBackgroundLayer({ bg, accent, mini, customUrl }: { bg: MenuBackground; accent: string; mini?: boolean; customUrl?: string }) {
  const inset: React.CSSProperties = { position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 };

  if (bg === 'custom' && customUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={customUrl} alt="" aria-hidden style={{ ...inset, width: '100%', height: '100%', objectFit: 'cover' }} />
    );
  }
  if (bg === 'plain' || bg === 'custom') return null;

  if (bg === 'linen') {
    return (
      <svg style={inset} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id={`linen-${mini ? 'm' : 'p'}`} width={mini ? 6 : 14} height={mini ? 6 : 14} patternUnits="userSpaceOnUse">
            <circle cx={mini ? 3 : 7} cy={mini ? 3 : 7} r={mini ? 0.4 : 0.7} fill="#000" opacity="0.07" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#linen-${mini ? 'm' : 'p'})`} />
      </svg>
    );
  }

  if (bg === 'botanical') {
    return (
      <svg style={inset} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 297" preserveAspectRatio="none">
        <g transform="translate(8, 8)" fill="none" stroke={accent} strokeWidth="0.4" opacity="0.25" strokeLinecap="round">
          <path d="M0 28 Q6 18 14 14 T28 0" />
          <ellipse cx="6"  cy="22" rx="3" ry="1.5" transform="rotate(-30 6 22)"  fill={accent} fillOpacity="0.18" />
          <ellipse cx="11" cy="17" rx="3" ry="1.5" transform="rotate(-30 11 17)" fill={accent} fillOpacity="0.18" />
          <ellipse cx="16" cy="13" rx="3" ry="1.5" transform="rotate(-30 16 13)" fill={accent} fillOpacity="0.18" />
          <ellipse cx="22" cy="8"  rx="3" ry="1.5" transform="rotate(-30 22 8)"  fill={accent} fillOpacity="0.18" />
        </g>
        <g transform="translate(202, 289) rotate(180)" fill="none" stroke={accent} strokeWidth="0.4" opacity="0.25" strokeLinecap="round">
          <path d="M0 28 Q6 18 14 14 T28 0" />
          <ellipse cx="6"  cy="22" rx="3" ry="1.5" transform="rotate(-30 6 22)"  fill={accent} fillOpacity="0.18" />
          <ellipse cx="11" cy="17" rx="3" ry="1.5" transform="rotate(-30 11 17)" fill={accent} fillOpacity="0.18" />
          <ellipse cx="16" cy="13" rx="3" ry="1.5" transform="rotate(-30 16 13)" fill={accent} fillOpacity="0.18" />
          <ellipse cx="22" cy="8"  rx="3" ry="1.5" transform="rotate(-30 22 8)"  fill={accent} fillOpacity="0.18" />
        </g>
      </svg>
    );
  }

  if (bg === 'deco') {
    return (
      <svg style={inset} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 297" preserveAspectRatio="none">
        <line x1="8" y1="6"   x2="202" y2="6"   stroke={accent} strokeWidth="0.6"  opacity="0.7" />
        <line x1="8" y1="9"   x2="202" y2="9"   stroke={accent} strokeWidth="0.25" opacity="0.55" />
        <line x1="8" y1="11"  x2="202" y2="11"  stroke={accent} strokeWidth="0.15" opacity="0.4" />
        <line x1="8" y1="291" x2="202" y2="291" stroke={accent} strokeWidth="0.6"  opacity="0.7" />
        <line x1="8" y1="288" x2="202" y2="288" stroke={accent} strokeWidth="0.25" opacity="0.55" />
        <line x1="8" y1="286" x2="202" y2="286" stroke={accent} strokeWidth="0.15" opacity="0.4" />
        <g transform="translate(105, 8)"   stroke={accent} strokeWidth="0.4" fill="none" opacity="0.7">
          <line x1="-10" y1="0" x2="-2" y2="0" />
          <line x1="2"   y1="0" x2="10" y2="0" />
          <circle cx="0" cy="0" r="1.2" />
        </g>
        <g transform="translate(105, 289)" stroke={accent} strokeWidth="0.4" fill="none" opacity="0.7">
          <line x1="-10" y1="0" x2="-2" y2="0" />
          <line x1="2"   y1="0" x2="10" y2="0" />
          <circle cx="0" cy="0" r="1.2" />
        </g>
      </svg>
    );
  }

  if (bg === 'marble') {
    return (
      <svg style={inset} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 297" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`marble-${mini ? 'm' : 'p'}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FAF7F2" />
            <stop offset="1" stopColor="#F0E8DC" />
          </linearGradient>
        </defs>
        <rect width="210" height="297" fill={`url(#marble-${mini ? 'm' : 'p'})`} />
        <g stroke="#B8A480" strokeWidth="0.3" fill="none" opacity="0.45" strokeLinecap="round">
          <path d="M-10 60 Q60 50 110 80 T220 100" />
          <path d="M-10 130 Q70 145 130 130 T220 170" />
          <path d="M-10 220 Q80 200 140 230 T220 240" />
        </g>
        <g stroke="#B8A480" strokeWidth="0.15" fill="none" opacity="0.35">
          <path d="M-10 80  Q70 75  130 90  T220 115" />
          <path d="M-10 195 Q80 185 140 200 T220 215" />
        </g>
      </svg>
    );
  }

  if (bg === 'kraft') {
    return (
      <svg style={inset} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id={`kraft-${mini ? 'm' : 'p'}`} width={mini ? 4 : 8} height={mini ? 4 : 8} patternUnits="userSpaceOnUse">
            <rect width={mini ? 4 : 8} height={mini ? 4 : 8} fill="#E8D9BA" />
            <circle cx={mini ? 1 : 2}   cy={mini ? 1 : 2}   r={mini ? 0.3 : 0.6} fill="#8C7A55" opacity="0.18" />
            <circle cx={mini ? 3 : 6}   cy={mini ? 2.5 : 5} r={mini ? 0.2 : 0.4} fill="#8C7A55" opacity="0.15" />
            <circle cx={mini ? 2 : 4}   cy={mini ? 3.5 : 7} r={mini ? 0.25 : 0.5} fill="#8C7A55" opacity="0.12" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#kraft-${mini ? 'm' : 'p'})`} />
      </svg>
    );
  }

  if (bg === 'script') {
    return (
      <svg style={inset} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 297" preserveAspectRatio="none">
        {[ 'translate(8, 8)', 'translate(202, 8) scale(-1, 1)', 'translate(8, 289) scale(1, -1)', 'translate(202, 289) scale(-1, -1)' ].map((t, i) => (
          <g key={i} transform={t} fill="none" stroke={accent} strokeWidth="0.45" opacity="0.7" strokeLinecap="round">
            <path d="M0 0 C8 2 14 6 18 12 C22 6 28 4 36 2" />
            <path d="M0 0 Q4 8 12 10 Q8 18 4 22" />
            <circle cx="18" cy="12" r="0.9" fill={accent} fillOpacity="0.7" />
            <circle cx="12" cy="10" r="0.6" fill={accent} fillOpacity="0.7" />
          </g>
        ))}
        <g transform="translate(105, 12)" stroke={accent} strokeWidth="0.35" fill="none" opacity="0.6">
          <path d="M-14 0 Q-7 -3 0 0 Q7 -3 14 0" />
          <circle cx="0" cy="0" r="0.8" fill={accent} fillOpacity="0.8" />
        </g>
        <g transform="translate(105, 285)" stroke={accent} strokeWidth="0.35" fill="none" opacity="0.6">
          <path d="M-14 0 Q-7 3 0 0 Q7 3 14 0" />
          <circle cx="0" cy="0" r="0.8" fill={accent} fillOpacity="0.8" />
        </g>
      </svg>
    );
  }

  if (bg === 'modern') {
    return (
      <svg style={inset} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 297" preserveAspectRatio="none">
        <rect x="6" y="6" width="198" height="285" stroke={accent} strokeWidth="0.4"  fill="none" opacity="0.85" />
        <rect x="9" y="9" width="192" height="279" stroke={accent} strokeWidth="0.15" fill="none" opacity="0.45" />
        <rect x="0" y="0" width="3"   height="297" fill={accent} opacity="0.85" />
        {[[6,6],[204,6],[6,291],[204,291]].map(([cx, cy], i) => (
          <g key={i} stroke={accent} strokeWidth="0.5" fill="none" opacity="0.9">
            <line x1={cx - 2} y1={cy} x2={cx + 2} y2={cy} />
            <line x1={cx} y1={cy - 2} x2={cx} y2={cy + 2} />
          </g>
        ))}
      </svg>
    );
  }

  return null;
}
