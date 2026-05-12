import React from 'react';

// Custom icon set for the Palatable sidebar + nav. Every glyph lives on a
// 32×32 viewBox, strokes inherit colour from the parent via `currentColor`,
// and brand-gold accents (#C8960A) are baked in where called for.

export type IconName =
  | 'dashboard'
  | 'recipes'
  | 'notebook'
  | 'costing'
  | 'menus'
  | 'invoices'
  | 'stock'
  | 'ingredients'
  | 'waste'
  | 'reports'
  | 'team'
  | 'settings';

export interface IconProps {
  name: IconName | string;
  size?: number;
}

const GOLD = '#C8960A';

export function Icon({ name, size = 24 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {renderIcon(name)}
    </svg>
  );
}

function renderIcon(name: string): React.ReactNode {
  switch (name) {
    case 'dashboard':
      return (
        <>
          <rect x={4} y={4} width={10} height={10} rx={2.5} strokeWidth={1.5} />
          <rect x={18} y={4} width={10} height={10} rx={2.5} strokeWidth={1.5} />
          <rect x={4} y={18} width={10} height={10} rx={2.5} strokeWidth={1.5} />
          <rect x={18} y={18} width={10} height={10} rx={2.5} strokeWidth={1.5} />
          <circle cx={23} cy={9} r={3} fill={GOLD} stroke="none" />
        </>
      );

    case 'recipes':
      return (
        <>
          <path
            d="M6 5 C6 5 10 7 16 5 C22 3 26 5 26 5 V27 C26 27 22 25 16 27 C10 29 6 27 6 27 V5Z"
            strokeWidth={1.5}
          />
          <line x1={6} y1={5} x2={6} y2={27} strokeWidth={1.5} />
          <line x1={10} y1={11} x2={22} y2={11} strokeWidth={1.2} />
          <line x1={10} y1={16} x2={22} y2={16} strokeWidth={1.2} />
          <line x1={10} y1={21} x2={22} y2={21} strokeWidth={1.2} />
        </>
      );

    case 'notebook':
      return (
        <>
          <rect x={6} y={4} width={20} height={24} rx={3} strokeWidth={1.5} />
          <path d="M11 4 V8 L16 6.5 L21 8 V4" strokeWidth={1.5} />
          <line x1={11} y1={13} x2={21} y2={13} strokeWidth={1.2} />
          <line x1={11} y1={17} x2={21} y2={17} strokeWidth={1.2} />
          <line x1={11} y1={21} x2={21} y2={21} strokeWidth={1.2} />
        </>
      );

    case 'costing':
      return (
        <>
          <rect x={7} y={4} width={18} height={24} rx={3} strokeWidth={1.5} />
          <rect x={10} y={7} width={12} height={6} rx={1.5} strokeWidth={1.2} />
          <circle cx={11.5} cy={18} r={1.5} strokeWidth={1.2} />
          <circle cx={16} cy={18} r={1.5} strokeWidth={1.2} />
          <circle cx={20.5} cy={18} r={1.5} strokeWidth={1.2} />
          <circle cx={11.5} cy={22.5} r={1.5} strokeWidth={1.2} />
          <circle cx={16} cy={22.5} r={1.5} strokeWidth={1.2} />
          <circle cx={20.5} cy={22.5} r={1.5} fill={GOLD} stroke="none" />
        </>
      );

    case 'menus':
      return (
        <>
          <rect x={5} y={8} width={22} height={16} rx={2.5} strokeWidth={1.5} />
          <line x1={5} y1={13} x2={27} y2={13} strokeWidth={1.2} />
          <line x1={12} y1={8} x2={12} y2={24} strokeWidth={1.2} />
          <path d="M9 5 H23" strokeWidth={1.5} />
          <line x1={14} y1={18} x2={25} y2={18} strokeWidth={1.2} />
          <line x1={14} y1={21} x2={25} y2={21} strokeWidth={1.2} />
        </>
      );

    case 'invoices':
      return (
        <>
          <rect x={6} y={5} width={20} height={22} rx={2.5} strokeWidth={1.5} />
          <path d="M11 5 V8" strokeWidth={1.5} />
          <path d="M21 5 V8" strokeWidth={1.5} />
          <path d="M10 14 L14 18 L22 11" stroke={GOLD} strokeWidth={2} />
        </>
      );

    case 'stock':
      return (
        <>
          <path d="M6 10 L16 5 L26 10 V22 L16 27 L6 22 V10Z" strokeWidth={1.5} />
          <path d="M6 10 L16 15 L26 10" strokeWidth={1.2} />
          <line x1={16} y1={15} x2={16} y2={27} strokeWidth={1.2} />
          <path d="M11 7.5 L21 12.5" strokeWidth={1.2} strokeDasharray="2 2" />
        </>
      );

    case 'ingredients':
      return (
        <>
          {/* Bulb / vegetable body */}
          <path
            d="M18 8 C18 8 24 10 24 17 C24 22 20.42 26 16 26 C11.58 26 8 22 8 17 C8 10 14 8 14 8"
            strokeWidth={1.5}
          />
          {/* Three leaves at top */}
          <path d="M13 7 C12 5 10.5 4 9.5 6 C10.5 7.5 12.5 7.5 13 7 Z" strokeWidth={1.2} />
          <path d="M16 6.5 C15.5 4 16.5 2.5 17.5 3 C18 4.5 17 6.5 16 6.5 Z" strokeWidth={1.2} />
          <path d="M19 7 C20 5 21.5 4 22.5 6 C21.5 7.5 19.5 7.5 19 7 Z" strokeWidth={1.2} />
          {/* Surface texture lines */}
          <line x1={11} y1={16} x2={21} y2={16} strokeWidth={1} />
          <line x1={11} y1={20} x2={21} y2={20} strokeWidth={1} />
        </>
      );

    case 'waste':
      return (
        <>
          <path d="M8 11 H24 L22 26 H10 Z" strokeWidth={1.5} />
          <path d="M6 11 H26" strokeWidth={1.5} />
          <path d="M12 7 H20" strokeWidth={1.5} />
          <line x1={13} y1={15} x2={13} y2={22} strokeWidth={1.2} />
          <line x1={16} y1={15} x2={16} y2={22} strokeWidth={1.2} />
          <line x1={19} y1={15} x2={19} y2={22} strokeWidth={1.2} />
        </>
      );

    case 'reports':
      return (
        <>
          <rect x={5} y={18} width={5} height={9} rx={1} strokeWidth={1.5} />
          <rect x={13.5} y={12} width={5} height={15} rx={1} strokeWidth={1.5} />
          <rect x={22} y={6} width={5} height={21} rx={1} strokeWidth={1.5} />
          <path
            d="M7.5 18 L16 12 L24.5 6"
            stroke={GOLD}
            strokeWidth={1.5}
            strokeDasharray="2 2"
          />
        </>
      );

    case 'team':
      return (
        <>
          <circle cx={16} cy={11} r={5} strokeWidth={1.5} />
          <circle cx={8} cy={11} r={3.5} strokeWidth={1.5} />
          <circle cx={24} cy={11} r={3.5} strokeWidth={1.5} />
          {/* Main person shoulders */}
          <path
            d="M4 27 C4 23.13 9.37 20 16 20 C22.63 20 28 23.13 28 27"
            strokeWidth={1.5}
          />
          {/* Smaller side-person shoulders peeking out behind */}
          <path d="M1 26 C1 23 3 20.5 7 19.5" strokeWidth={1.5} />
          <path d="M31 26 C31 23 29 20.5 25 19.5" strokeWidth={1.5} />
        </>
      );

    case 'settings':
      return (
        <>
          <circle cx={16} cy={16} r={3.5} strokeWidth={1.5} />
          {/* Cardinal rays */}
          <path d="M16 5 V8" strokeWidth={1.5} />
          <path d="M16 24 V27" strokeWidth={1.5} />
          <path d="M5 16 H8" strokeWidth={1.5} />
          <path d="M24 16 H27" strokeWidth={1.5} />
          {/* Diagonal rays */}
          <path d="M11 11 L8.5 8.5" strokeWidth={1.5} />
          <path d="M21 11 L23.5 8.5" strokeWidth={1.5} />
          <path d="M11 21 L8.5 23.5" strokeWidth={1.5} />
          <path d="M21 21 L23.5 23.5" strokeWidth={1.5} />
          {/* Dashed orbit */}
          <circle cx={16} cy={16} r={8} strokeWidth={1} strokeDasharray="2.5 2" />
        </>
      );

    default:
      return null;
  }
}
