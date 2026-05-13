export type Tier = 'free' | 'pro' | 'kitchen' | 'group' | 'enterprise'
// Roles match what's stored in account_members.role (migration 007) and
// what AuthContext + the team UI already understand. Owner billing + admin;
// Manager edits everything + invites; Chef edits content (recipes/notes/
// waste/stock counts) but not menus or pricing; Viewer is read-only.
export type Role = 'owner' | 'manager' | 'chef' | 'viewer'
export type OutletType = 'restaurant' | 'pub' | 'cafe' | 'bar' | 'hotel' | 'central_kitchen' | 'other'

export interface Account {
  id: string
  name: string
  tier: Tier
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  logoUrl?: string
  createdAt: string
  updatedAt: string
}

export interface Outlet {
  id: string
  accountId: string
  name: string
  type: OutletType
  address?: string
  timezone?: string
  isCentralKitchen: boolean
  createdAt: string
  updatedAt: string
}

export interface Membership {
  id: string
  accountId: string
  userId: string
  outletId?: string
  role: Role
  invitedBy: string
  invitedAt: string
  acceptedAt?: string
}
