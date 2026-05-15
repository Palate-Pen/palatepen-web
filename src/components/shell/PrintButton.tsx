'use client';

/**
 * Triggers the browser's native print dialog. Pages opt into print
 * styling by wrapping content with class="printable" + tagging chrome
 * with class="print-hide" (handled in globals.css @media print block).
 */
export function PrintButton({
  label = 'Print',
  variant = 'subtle',
}: {
  label?: string;
  variant?: 'subtle' | 'primary';
}) {
  const buttonClass =
    variant === 'primary'
      ? 'font-display font-semibold text-xs tracking-[0.18em] uppercase px-5 py-2.5 bg-gold text-paper border border-gold hover:bg-gold-dark transition-colors'
      : 'font-display font-semibold text-xs tracking-[0.18em] uppercase px-4 py-2 bg-transparent text-ink border border-rule hover:border-gold hover:text-gold transition-colors';
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={buttonClass}
    >
      ⎙ {label}
    </button>
  );
}
