// Multi-outlet TypeScript surface — reconciled against the live schema from
// migration 007 plus the Phase 3 additions. Account uses `owner_user_id`
// (not `owner_id`), Membership matches the `account_members` shape (no
// surrogate `id`, composite PK on (account_id, user_id), `added_at` /
// `added_by` not `invited_at` / `invited_by`), and MemberRole uses the live
// role values (owner / manager / chef / viewer — NOT admin / editor).
//
// If you want pending-invite data (token, expires_at, accepted_at) read
// from the existing `account_invites` table, not from Membership.

export type OutletType = 'restaurant' | 'pub' | 'cafe' | 'bar' | 'hotel' | 'central_kitchen' | 'other'
export type MemberRole = 'owner' | 'manager' | 'chef' | 'viewer'
export type POStatus = 'draft' | 'sent' | 'received' | 'flagged' | 'cancelled'
export type Tier = 'free' | 'pro' | 'kitchen' | 'group' | 'enterprise'

export interface Account {
  id: string
  name: string
  tier: Tier
  owner_user_id: string
  stripe_customer_id?: string
  stripe_subscription_id?: string
  logo_url?: string
  created_at: string
  updated_at: string
}

export interface Outlet {
  id: string
  account_id: string
  name: string
  type: OutletType
  address?: string
  timezone: string
  is_central_kitchen: boolean
  created_at: string
  updated_at: string
}

// Mirrors the `account_members` table (extended in this migration with
// `outlet_id`). No surrogate id — primary key is (account_id, user_id).
export interface Membership {
  account_id: string
  user_id: string
  outlet_id?: string
  role: MemberRole
  added_at: string
  added_by?: string
}

export interface PurchaseOrder {
  id: string
  account_id: string
  outlet_id?: string
  supplier_name: string
  status: POStatus
  total_amount?: number
  notes?: string
  raised_by?: string
  raised_at: string
  expected_at?: string
  received_at?: string
  created_at: string
  updated_at: string
}

export interface PurchaseOrderItem {
  id: string
  purchase_order_id: string
  ingredient_name: string
  quantity: number
  unit: string
  unit_price?: number
  total_price?: number
  received_quantity?: number
  notes?: string
}

export interface OutletSummary {
  outlet: Outlet
  memberCount: number
  recipeCount: number
  invoiceCount: number
  stockValue: number
  avgGP: number
  wasteTotal: number
  activeAlerts: number
}

export interface GroupSummary {
  account: Account
  outlets: OutletSummary[]
  totalRevenue: number
  totalSupplierSpend: number
  totalWaste: number
  groupAvgGP: number
  totalScansThisMonth: number
  activeAlerts: number
}
