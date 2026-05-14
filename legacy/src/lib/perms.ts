import { useAuth, type Role } from '@/context/AuthContext';

export interface Perms {
  role: Role | null;
  canRead: boolean;            // viewer+ — anyone in the account
  canEditContent: boolean;     // chef+ — recipes, notes, waste log, stock counts
  canEditPricing: boolean;     // manager+ — costing sheets, bank unit prices, GP target
  canEditMenus: boolean;       // manager+ — create/edit menus, menu designer
  canEditInvoices: boolean;    // chef+ — scan / delete invoices
  canManageBank: boolean;      // chef+ — add/edit ingredients (price still pricing-only)
  canManageTeam: boolean;      // manager+ — invite, remove members, change roles
  canManageBilling: boolean;   // owner only — tier upgrade, delete account
  canManageSettings: boolean;  // manager+ — profile defaults, currency, stock cadence
  isReadOnly: boolean;         // viewer (or no role)
  reason: string | null;       // human label for why an action is disabled
}

const DEFAULT_PERMS: Perms = {
  role: null,
  canRead: false, canEditContent: false, canEditPricing: false, canEditMenus: false,
  canEditInvoices: false, canManageBank: false, canManageTeam: false, canManageBilling: false,
  canManageSettings: false, isReadOnly: true,
  reason: 'No active account',
};

export function permsForRole(role: Role | null): Perms {
  if (!role) return DEFAULT_PERMS;
  const isOwner   = role === 'owner';
  const isManager = isOwner || role === 'manager';
  const isChef    = isManager || role === 'chef';
  // viewer is everyone
  return {
    role,
    canRead: true,
    canEditContent: isChef,
    canEditPricing: isManager,
    canEditMenus: isManager,
    canEditInvoices: isChef,
    canManageBank: isChef,
    canManageTeam: isManager,
    canManageBilling: isOwner,
    canManageSettings: isManager,
    isReadOnly: role === 'viewer',
    reason: role === 'viewer' ? 'Viewer role — read only'
          : role === 'chef'   ? 'Chef role — pricing and menus locked'
          : null,
  };
}

export function usePerms(): Perms {
  const { currentRole } = useAuth();
  return permsForRole(currentRole);
}
