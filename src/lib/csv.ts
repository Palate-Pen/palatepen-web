/**
 * Server-free CSV helpers. UTF-8 BOM prefix so Excel reads accented
 * UK ingredient names correctly. Quotes any field containing a comma,
 * quote, or newline; doubles internal quotes per RFC 4180.
 */

const BOM = '﻿';

function escapeCell(value: unknown): string {
  if (value == null) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildCsv(headers: string[], rows: Array<Array<unknown>>): string {
  const lines: string[] = [];
  lines.push(headers.map(escapeCell).join(','));
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(','));
  }
  return BOM + lines.join('\r\n');
}

/**
 * Filename-safe slug for a downloaded CSV. Today's date + the dataset
 * name, e.g. `palatable-bank-2026-05-15.csv`.
 */
export function csvFilename(dataset: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `palatable-${dataset}-${date}.csv`;
}
