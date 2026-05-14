export type KpiTone = 'healthy' | 'attention';

/** Hero KPIs (text-3xl, 36px) are reserved for Home; everything else
 *  uses 'small' (text-2xl, 28px) per the locked type scale. */
export type KpiSize = 'small' | 'hero';

export function KpiCard({
  label,
  value,
  trend,
  sub,
  tone,
  size = 'small',
}: {
  label: string;
  value: string;
  trend?: string;
  sub: string;
  tone?: KpiTone;
  size?: KpiSize;
}) {
  const valueSize = size === 'hero' ? 'text-3xl' : 'text-2xl';
  const valueColor =
    tone === 'healthy'
      ? 'text-healthy'
      : tone === 'attention'
        ? 'text-attention'
        : 'text-ink';

  return (
    <div className="bg-card px-7 py-6">
      <div className="font-display text-xs font-semibold tracking-[0.4em] uppercase text-muted mb-3">
        {label}
      </div>
      <div
        className={`font-serif font-medium leading-none ${valueSize} ${valueColor}`}
      >
        {value}
        {trend && (
          <span className="font-serif italic text-sm text-muted ml-2">
            {trend}
          </span>
        )}
      </div>
      <div className="font-serif italic text-sm text-muted mt-2">{sub}</div>
    </div>
  );
}
