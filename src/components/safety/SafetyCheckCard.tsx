type State = 'done' | 'flagged' | 'pending';

export type CheckDatum = {
  label: string;
  value: string;
  tone?: 'healthy' | 'warn';
};

/**
 * Single safety check tile. Three states:
 *  - done     green left border, ticked circle, optional reading data
 *  - flagged  attention left border, alert circle, value rendered warn
 *  - pending  dashed border, muted "tap to log" CTA
 */
export function SafetyCheckCard({
  state,
  title,
  detail,
  data,
  timestamp,
  loggedBy,
  cta,
  onClickHref,
}: {
  state: State;
  title: string;
  detail?: string;
  data?: CheckDatum[];
  timestamp?: string;
  loggedBy?: string;
  cta?: string;
  onClickHref?: string;
}) {
  const wrapper =
    state === 'done'
      ? 'bg-healthy/[0.08] border border-healthy/40 border-l-[3px] border-l-healthy pl-[19px] pr-[22px] py-5'
      : state === 'flagged'
        ? 'bg-attention/[0.08] border border-attention/40 border-l-[3px] border-l-attention pl-[19px] pr-[22px] py-5'
        : 'bg-card border border-dashed border-rule px-[22px] py-5';

  const mark =
    state === 'done' ? (
      <div className="w-6 h-6 rounded-full bg-healthy border-2 border-healthy text-paper flex items-center justify-center flex-shrink-0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3.5 h-3.5">
          <path d="M5 12l5 5L20 7" />
        </svg>
      </div>
    ) : state === 'flagged' ? (
      <div className="w-6 h-6 rounded-full bg-attention border-2 border-attention text-paper flex items-center justify-center flex-shrink-0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
    ) : (
      <div className="w-6 h-6 rounded-full border-2 border-rule bg-paper-warm flex-shrink-0" />
    );

  const titleClass =
    'font-serif font-semibold text-base leading-tight mb-1 ' +
    (state === 'pending' ? 'text-muted' : 'text-ink');

  const body = (
    <div className={'transition-colors ' + wrapper + (onClickHref ? ' hover:border-gold cursor-pointer' : '')}>
      <div className="flex items-start gap-3.5">
        {mark}
        <div className="flex-1 min-w-0">
          <div className={titleClass}>{title}</div>
          {detail && (
            <div className="font-sans text-[13px] text-muted mb-2">{detail}</div>
          )}
          {data && data.length > 0 && (
            <div className="flex flex-wrap items-end gap-3.5 mt-2">
              {data.map((d, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                  <div className="font-display font-semibold text-[9px] tracking-[0.2em] uppercase text-muted">
                    {d.label}
                  </div>
                  <div
                    className={
                      'font-mono font-medium text-sm ' +
                      (d.tone === 'warn'
                        ? 'text-attention'
                        : d.tone === 'healthy'
                          ? 'text-healthy'
                          : 'text-ink')
                    }
                  >
                    {d.value}
                  </div>
                </div>
              ))}
              {(timestamp || loggedBy) && (
                <div className="ml-auto text-right">
                  <div className="font-sans text-xs text-muted-soft">
                    {timestamp && (
                      <span className="font-display font-semibold text-[10px] tracking-[0.2em] text-ink-soft">
                        {timestamp}
                      </span>
                    )}
                    {loggedBy && (
                      <>
                        <span className="mx-1.5">·</span>
                        <span>{loggedBy}</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          {state === 'pending' && cta && (
            <div className="font-display font-semibold text-[10px] tracking-[0.25em] uppercase text-gold pt-1">
              {cta}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (onClickHref) {
    return (
      <a href={onClickHref} className="block">
        {body}
      </a>
    );
  }
  return body;
}
