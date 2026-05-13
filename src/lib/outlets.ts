import { supabase } from './supabase'
import type { Account, Outlet, Membership, PurchaseOrder, PurchaseOrderItem } from '../types/outlets'

export const TIER_OUTLET_LIMITS: Record<string, number> = {
  free: 1,
  pro: 1,
  kitchen: 1,
  group: 5,
  enterprise: Infinity,
}

export const TIER_USER_LIMITS: Record<string, number> = {
  free: 1,
  pro: 1,
  kitchen: 5,
  group: 25,
  enterprise: Infinity,
}

export const GROUP_USERS_PER_OUTLET = 5
export const GROUP_MAX_OUTLETS = 5
export const GROUP_MAX_USERS = 25

// Get or create the account for the current user
export async function getOrCreateAccount(userId: string, tier: string, name?: string): Promise<Account | null> {
  const { data: existing } = await supabase
    .from('accounts')
    .select('*')
    .eq('owner_id', userId)
    .single()

  if (existing) return existing

  const { data: created, error } = await supabase
    .from('accounts')
    .insert({ name: name || 'My Kitchen', tier, owner_id: userId })
    .select()
    .single()

  if (error) { console.error('Failed to create account:', error); return null }
  return created
}

// Get all outlets for an account
export async function getOutlets(accountId: string): Promise<Outlet[]> {
  const { data, error } = await supabase
    .from('outlets')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: true })

  if (error) { console.error('Failed to get outlets:', error); return [] }
  return data || []
}

// Create a new outlet (enforces 5-outlet limit for group tier)
export async function createOutlet(
  accountId: string,
  tier: string,
  outletData: Partial<Outlet>
): Promise<{ outlet: Outlet | null; error: string | null }> {
  const existing = await getOutlets(accountId)
  const limit = TIER_OUTLET_LIMITS[tier] ?? 1

  if (existing.length >= limit) {
    if (tier === 'group') {
      return { outlet: null, error: 'Group tier is limited to 5 outlets. Upgrade to Enterprise for unlimited outlets.' }
    }
    return { outlet: null, error: `Your ${tier} plan supports ${limit} outlet${limit === 1 ? '' : 's'}.` }
  }

  const { data, error } = await supabase
    .from('outlets')
    .insert({ account_id: accountId, ...outletData })
    .select()
    .single()

  if (error) return { outlet: null, error: error.message }
  return { outlet: data, error: null }
}

// Get all memberships for an account
export async function getMemberships(accountId: string): Promise<Membership[]> {
  const { data, error } = await supabase
    .from('memberships')
    .select('*')
    .eq('account_id', accountId)

  if (error) { console.error('Failed to get memberships:', error); return [] }
  return data || []
}

// Check if adding a user would exceed the group limit (25 users, 5 per outlet)
export async function canAddUser(
  accountId: string,
  tier: string,
  outletId?: string
): Promise<{ allowed: boolean; reason?: string }> {
  const memberships = await getMemberships(accountId)
  const totalLimit = TIER_USER_LIMITS[tier] ?? 1

  if (memberships.length >= totalLimit) {
    if (tier === 'group') {
      return { allowed: false, reason: 'Group tier is limited to 25 users (5 per outlet). Upgrade to Enterprise for unlimited users.' }
    }
    return { allowed: false, reason: `Your ${tier} plan supports ${totalLimit} user${totalLimit === 1 ? '' : 's'}.` }
  }

  if (tier === 'group' && outletId) {
    const outletMembers = memberships.filter(m => m.outlet_id === outletId)
    if (outletMembers.length >= GROUP_USERS_PER_OUTLET) {
      return { allowed: false, reason: 'This outlet already has 5 users, which is the maximum per outlet on Group tier.' }
    }
  }

  return { allowed: true }
}

// Get purchase orders for an account, optionally filtered by outlet
export async function getPurchaseOrders(accountId: string, outletId?: string): Promise<PurchaseOrder[]> {
  let query = supabase
    .from('purchase_orders')
    .select('*')
    .eq('account_id', accountId)
    .order('raised_at', { ascending: false })

  if (outletId) query = query.eq('outlet_id', outletId)

  const { data, error } = await query
  if (error) { console.error('Failed to get purchase orders:', error); return [] }
  return data || []
}

// Create a purchase order
export async function createPurchaseOrder(
  po: Omit<PurchaseOrder, 'id' | 'created_at' | 'updated_at'>
): Promise<PurchaseOrder | null> {
  const { data, error } = await supabase
    .from('purchase_orders')
    .insert(po)
    .select()
    .single()

  if (error) { console.error('Failed to create PO:', error); return null }
  return data
}
