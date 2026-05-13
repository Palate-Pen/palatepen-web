export type Tier = 'free' | 'pro' | 'kitchen' | 'group' | 'enterprise'
export type Role = 'owner' | 'admin' | 'editor' | 'viewer'
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
