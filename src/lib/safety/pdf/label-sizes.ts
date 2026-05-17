/**
 * Label preset catalogue. Covers the most common kitchen + office
 * printer formats. Two layout modes:
 *
 *   single — one label per PDF page, page size = label size. Fits
 *            thermal label printers (DYMO, Brother) that feed one
 *            label at a time.
 *   sheet  — A4 page with a grid of labels. Fits office laser /
 *            inkjet printers using Avery-style sheet labels.
 *
 * 1 mm = 2.834645669 pt (react-pdf renders in pt).
 */

export type LabelLayout = 'single' | 'sheet';

export type LabelSize = {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  layout: LabelLayout;
  /** For sheet layout only. */
  perA4Cols?: number;
  perA4Rows?: number;
};

export const LABEL_SIZES: LabelSize[] = [
  // ---- Single-label / thermal printers ----
  {
    id: 'dymo-multi',
    name: 'DYMO Multipurpose · 57 × 32 mm',
    widthMm: 57,
    heightMm: 32,
    layout: 'single',
  },
  {
    id: 'dymo-address',
    name: 'DYMO Large Address · 89 × 36 mm',
    widthMm: 89,
    heightMm: 36,
    layout: 'single',
  },
  {
    id: 'dymo-shipping',
    name: 'DYMO Shipping · 102 × 59 mm',
    widthMm: 102,
    heightMm: 59,
    layout: 'single',
  },
  {
    id: 'brother-dk',
    name: 'Brother DK · 90 × 29 mm',
    widthMm: 90,
    heightMm: 29,
    layout: 'single',
  },
  {
    id: 'square-50',
    name: 'Square thermal · 50 × 50 mm',
    widthMm: 50,
    heightMm: 50,
    layout: 'single',
  },
  {
    id: 'square-70',
    name: 'Square thermal · 70 × 70 mm',
    widthMm: 70,
    heightMm: 70,
    layout: 'single',
  },
  // ---- A4 sheet labels (office printers) ----
  {
    id: 'avery-l7159',
    name: 'Avery L7159 · 24-up · 63.5 × 33.9 mm',
    widthMm: 63.5,
    heightMm: 33.9,
    layout: 'sheet',
    perA4Cols: 3,
    perA4Rows: 8,
  },
  {
    id: 'avery-l7162',
    name: 'Avery L7162 · 16-up · 99.1 × 33.9 mm',
    widthMm: 99.1,
    heightMm: 33.9,
    layout: 'sheet',
    perA4Cols: 2,
    perA4Rows: 8,
  },
  {
    id: 'avery-l7163',
    name: 'Avery L7163 · 14-up · 99.1 × 38.1 mm',
    widthMm: 99.1,
    heightMm: 38.1,
    layout: 'sheet',
    perA4Cols: 2,
    perA4Rows: 7,
  },
  {
    id: 'avery-l7164',
    name: 'Avery L7164 · 12-up · 63.5 × 72 mm',
    widthMm: 63.5,
    heightMm: 72,
    layout: 'sheet',
    perA4Cols: 3,
    perA4Rows: 4,
  },
];

/** Find a size preset by id, or fall back to the first single-layout preset. */
export function findLabelSize(id: string | null | undefined): LabelSize {
  if (!id) return LABEL_SIZES[0];
  return LABEL_SIZES.find((s) => s.id === id) ?? LABEL_SIZES[0];
}

const MM_TO_PT = 2.83464567;
export function mm(value: number): number {
  return value * MM_TO_PT;
}
