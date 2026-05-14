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
      { href: '#', label: 'Team', icon: 'team', pending: true },
      { href: '#', label: 'P&L', icon: 'pl', pending: true },
      {
        href: '#',
        label: 'Deliveries',
        icon: 'deliveries',
        pending: true,
      },
      { href: '#', label: 'Suppliers', icon: 'suppliers', pending: true },
      {
        href: '#',
        label: 'Service Notes',
        icon: 'service-notes',
        pending: true,
      },
      {
        href: '#',
        label: 'Compliance',
        icon: 'compliance',
        pending: true,
      },
      { href: '#', label: 'Reports', icon: 'reports', pending: true },
    ],
  },
];

export const MANAGER_ACCOUNT_ITEMS: NavItem[] = [
  { href: '#', label: 'Settings', icon: 'settings', pending: true },
];

export const OWNER_SECTIONS: NavSection[] = [
  {
    label: 'Business',
    items: [
      { href: '/owner', label: 'Home', icon: 'home' },
      { href: '/owner/sites', label: 'Sites', icon: 'sites' },
      {
        href: '/owner/revenue',
        label: 'Revenue',
        icon: 'revenue',
        pending: true,
      },
      {
        href: '/owner/margins',
        label: 'Margins',
        icon: 'margins',
        pending: true,
      },
      {
        href: '/owner/suppliers',
        label: 'Suppliers',
        icon: 'suppliers',
        pending: true,
      },
      {
        href: '/owner/cash',
        label: 'Cash',
        icon: 'cash',
        pending: true,
      },
      {
        href: '/owner/reports',
        label: 'Reports',
        icon: 'reports',
        pending: true,
      },
    ],
  },
];

export const OWNER_ACCOUNT_ITEMS: NavItem[] = [
  { href: '/owner/settings', label: 'Settings', icon: 'settings' },
];
