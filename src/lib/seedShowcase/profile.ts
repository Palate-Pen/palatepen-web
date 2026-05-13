import { generateInboxToken } from '../inboundToken';

// Showcase profile — sets sensible defaults so every settings surface displays
// something meaningful in a demo (currency symbol, GP target colouring, stock-
// day cadence, business name appearing in print headers). The inbox token is
// pre-generated so the Email Forwarding card shows the "in use" state rather
// than the empty Generate-address call-to-action.
export function buildShowcaseProfile(): Record<string, unknown> {
  return {
    businessName: 'The Palate Test Kitchen',
    name: 'Jack Harrison',
    location: 'London, UK',
    currencySymbol: '£',
    gpTarget: 72,
    stockDay: 1, // Monday
    stockFrequency: 'weekly',
    // Kitchen tier so the demo unlocks every showcase surface:
    // - Public menus (`/m/[slug]` — tier-gated to kitchen/group)
    // - API access (Settings → API key — kitchen+)
    // - My Team management (kitchen+ + owner role)
    tier: 'kitchen',
    invoiceInboxToken: generateInboxToken(),
  };
}
