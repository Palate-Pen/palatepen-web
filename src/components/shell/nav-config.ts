import type { NavSection, NavItem } from './Sidebar';

export const CHEF_SECTIONS: NavSection[] = [
  {
    label: 'Kitchen',
    items: [
      { href: '/', label: 'Home', icon: 'home' },
      { href: '/prep', label: 'Prep', icon: 'prep' },
      { href: '/recipes', label: 'Recipes', icon: 'recipes' },
      { href: '/menus', label: 'Menus', icon: 'menus' },
      { href: '/margins', label: 'Margins', icon: 'margins' },
      {
        href: '/stock-suppliers',
        label: 'Stock & Suppliers',
        icon: 'stock-suppliers',
      },
      { href: '/notebook', label: 'Notebook', icon: 'notebook' },
    ],
  },
  {
    label: 'Intelligence',
    items: [{ href: '/inbox', label: 'Inbox', icon: 'inbox' }],
  },
];

export const CHEF_ACCOUNT_ITEMS: NavItem[] = [
  { href: '/settings', label: 'Settings', icon: 'settings' },
  { href: '/connections', label: 'Connections', icon: 'connections' },
];

export const MANAGER_SECTIONS: NavSection[] = [
  {
    label: 'Site',
    items: [
      { href: '/manager', label: 'Home', icon: 'home' },
      {
        href: '/manager/menu-builder',
        label: 'Menu Builder',
        icon: 'menu-builder',
      },
      { href: '/manager/team', label: 'Team', icon: 'team' },
      { href: '/manager/pl', label: 'P&L', icon: 'pl' },
      {
        href: '/manager/deliveries',
        label: 'Deliveries',
        icon: 'deliveries',
      },
      {
        href: '/manager/suppliers',
        label: 'Suppliers',
        icon: 'suppliers',
      },
      {
        href: '/manager/service-notes',
        label: 'Service Notes',
        icon: 'service-notes',
      },
      {
        href: '/manager/compliance',
        label: 'Compliance',
        icon: 'compliance',
      },
      { href: '/manager/reports', label: 'Reports', icon: 'reports' },
    ],
  },
  {
    label: 'Intelligence',
    items: [{ href: '/manager/inbox', label: 'Inbox', icon: 'inbox' }],
  },
];

export const MANAGER_ACCOUNT_ITEMS: NavItem[] = [
  { href: '/manager/settings', label: 'Settings', icon: 'settings' },
];

export const OWNER_SECTIONS: NavSection[] = [
  {
    label: 'Business',
    items: [
      { href: '/owner', label: 'Home', icon: 'home' },
      { href: '/owner/sites', label: 'Sites', icon: 'sites' },
      { href: '/owner/revenue', label: 'Revenue', icon: 'revenue' },
      { href: '/owner/margins', label: 'Margins', icon: 'margins' },
      { href: '/owner/suppliers', label: 'Suppliers', icon: 'suppliers' },
      { href: '/owner/cash', label: 'Cash', icon: 'cash' },
      { href: '/owner/reports', label: 'Reports', icon: 'reports' },
    ],
  },
  {
    label: 'Intelligence',
    items: [{ href: '/owner/inbox', label: 'Inbox', icon: 'inbox' }],
  },
];

export const OWNER_ACCOUNT_ITEMS: NavItem[] = [
  { href: '/owner/settings', label: 'Settings', icon: 'settings' },
];

export const BARTENDER_SECTIONS: NavSection[] = [
  {
    label: 'Bar',
    items: [
      { href: '/bartender', label: 'Home', icon: 'home' },
      { href: '/bartender/mise', label: 'Mise', icon: 'prep' },
      { href: '/bartender/specs', label: 'Specs', icon: 'recipes' },
      { href: '/bartender/menus', label: 'Menus', icon: 'menus' },
      { href: '/bartender/margins', label: 'Margins', icon: 'margins' },
      {
        href: '/bartender/back-bar',
        label: 'Back Bar',
        icon: 'stock-suppliers',
      },
      { href: '/bartender/notebook', label: 'Notebook', icon: 'notebook' },
    ],
  },
  {
    label: 'Intelligence',
    items: [{ href: '/bartender/inbox', label: 'Inbox', icon: 'inbox' }],
  },
];

export const BARTENDER_ACCOUNT_ITEMS: NavItem[] = [
  { href: '/bartender/settings', label: 'Settings', icon: 'settings' },
  {
    href: '/bartender/connections',
    label: 'Connections',
    icon: 'connections',
  },
];
