import {
  lookingAheadTagLabel,
  type LookingAheadItem,
} from '@/lib/safety/home';

/**
 * Gold-left-border bar with rotating tagged Looking Ahead items —
 * mirrors the chef-shell pattern but with safety-specific derivations.
 * Items may contain inline <em> wrappers; we render the body verbatim
 * as HTML since the strings are author-controlled in lib/safety/home.ts.
 */
export function SafetyLookingAhead({ items }: { items: LookingAheadItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="bg-paper-warm border-l-[3px] border-gold pl-6 pr-6 py-5 mb-10 flex gap-6 items-start">
      <div className="text-gold flex-shrink-0 mt-0.5">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-[22px] h-[22px]"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display font-semibold text-[10px] tracking-[0.3em] uppercase text-gold mb-2.5">
          Looking Ahead
        </div>
        <div className="flex flex-col gap-2.5">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="font-serif text-[15px] text-ink-soft leading-[1.5]"
            >
              <span className="inline-block font-display font-semibold text-[8px] tracking-[0.25em] uppercase px-2 py-[3px] bg-gold text-paper mr-2.5 align-[1px]">
                {lookingAheadTagLabel(item.tag)}
              </span>
              <span
                dangerouslySetInnerHTML={{
                  __html: item.body.replace(
                    /<em>([^<]+)<\/em>/g,
                    '<em class="text-gold-dark not-italic font-medium italic">$1</em>',
                  ),
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
