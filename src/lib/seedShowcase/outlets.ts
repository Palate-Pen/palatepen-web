// Showcase outlets — 3 sites so the demo exhibits multi-outlet at every
// surface (sidebar switcher, dashboard greeting, per-outlet filtering of
// stock/invoices/waste/menus). Soho is the main restaurant, Marylebone is
// the sister bar/small-plates site, and Central Kitchen is the prep hub
// that buys bulk produce and supplies the other two.
//
// IDs are stable across runs so re-seeding doesn't accumulate duplicate
// outlets. The seed-showcase route deletes existing outlet rows for the
// account before inserting these, so the active outlet selection in
// localStorage will reconcile cleanly against the new list.

export const OUTLET_IDS = {
  soho:          'seed-outlet-soho',
  marylebone:    'seed-outlet-marylebone',
  centralKitchen:'seed-outlet-ck',
} as const;

export interface ShowcaseOutlet {
  id: string;
  name: string;
  type: 'restaurant' | 'bar' | 'central_kitchen';
  address: string;
  timezone: string;
  is_central_kitchen: boolean;
}

export const SHOWCASE_OUTLETS: ShowcaseOutlet[] = [
  {
    id: OUTLET_IDS.soho,
    name: 'The Palate — Soho',
    type: 'restaurant',
    address: '14 Dean Street, London W1D 3RW',
    timezone: 'Europe/London',
    is_central_kitchen: false,
  },
  {
    id: OUTLET_IDS.marylebone,
    name: 'The Palate — Marylebone',
    type: 'bar',
    address: '38 Marylebone Lane, London W1U 2NL',
    timezone: 'Europe/London',
    is_central_kitchen: false,
  },
  {
    id: OUTLET_IDS.centralKitchen,
    name: 'Palate Central Kitchen',
    type: 'central_kitchen',
    address: 'Unit 7, Bermondsey Trading Estate, London SE16 3LL',
    timezone: 'Europe/London',
    is_central_kitchen: true,
  },
];
