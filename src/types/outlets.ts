export type OutletType = 'restaurant' | 'pub' | 'cafe' | 'bar' | 'hotel' | 'central_kitchen' | 'other'
export type MemberRole = 'owner' | 'admin' | 'editor' | 'viewer'
export type POStatus = 'draft' | 'sent' | 'received' | 'flagged' | 'cancelled'
export type Tier = 'free' | 'pro' | 'kitchen' | 'group' | 'enterprise'

export interface Account {
  id: string
  name: string
  tier: Tier
  owner_id: string
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

export interface Membership {
  id: string
  account_id: string
  user_id: string
  outlet_id?: string
  role: MemberRole
  invited_by?: string
  invited_at: string
  accepted_at?: string
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
