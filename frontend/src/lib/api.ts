import { getToken } from './auth'

export type AdminMe = { email: string; id?: string | number | null }

export type UserRow = {
  id: string
  email: string
  username?: string | null
  full_name?: string | null
  plan?: string | null
  subscription_status?: string | null
  email_verified?: boolean
  is_active?: boolean
  last_login_at?: string | null
  created_at?: string | null
}

export type SubscriptionRow = {
  id: string
  user_id: string
  user_email?: string | null
  user_username?: string | null
  plan: string
  status: string
  amount: string | number
  currency: string
  start_date?: string | null
  end_date?: string | null
  auto_renew?: boolean
  cancelled_at?: string | null
  cancel_reason?: string | null
  created_at?: string | null
}

export type PaymentRow = {
  id: string
  user_id?: string | null
  user_email?: string | null
  subscription_id?: string | null
  subscription_plan?: string | null
  amount: string | number
  currency: string
  payment_method?: string | null
  payment_gateway?: string | null
  merchant_trade_no?: string | null
  transaction_id?: string | null
  status: string
  paid_at?: string | null
  created_at?: string | null
}

export type AuditLogRow = {
  id: string
  user_id?: string | null
  user_email?: string | null
  action: string
  entity_type?: string | null
  entity_id?: string | number | null
  ip_address?: string | null
  user_agent?: string | null
  details?: any
  created_at?: string | null
}

const API_BASE = import.meta.env.VITE_ADMIN_API_BASE || 'http://localhost:4010'

async function request(path: string, init?: RequestInit) {
  const token = getToken()
  const headers = new Headers(init?.headers || undefined)
  if (!headers.has('Content-Type') && init?.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `${res.status} ${res.statusText}`)
  }

  return res.json()
}

export async function login(email: string, password: string): Promise<{ token: string; admin: AdminMe }> {
  const json = await request('/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    headers: { 'Content-Type': 'application/json' },
  })
  return json?.data
}

export async function me(): Promise<AdminMe> {
  const json = await request('/admin/me')
  return json?.data?.admin
}

export async function status(): Promise<any> {
  const json = await request('/admin/status')
  return json?.data
}

export async function users(params: { q?: string; limit?: number; offset?: number } = {}): Promise<UserRow[]> {
  const sp = new URLSearchParams()
  if (params.q) sp.set('q', params.q)
  if (params.limit != null) sp.set('limit', String(params.limit))
  if (params.offset != null) sp.set('offset', String(params.offset))
  const json = await request(`/admin/users?${sp.toString()}`)
  return json?.data?.users || []
}

export async function subscriptions(params: { q?: string; status?: string; plan?: string; limit?: number; offset?: number } = {}): Promise<SubscriptionRow[]> {
  const sp = new URLSearchParams()
  if (params.q) sp.set('q', params.q)
  if (params.status) sp.set('status', params.status)
  if (params.plan) sp.set('plan', params.plan)
  if (params.limit != null) sp.set('limit', String(params.limit))
  if (params.offset != null) sp.set('offset', String(params.offset))
  const json = await request(`/admin/subscriptions?${sp.toString()}`)
  return json?.data?.subscriptions || []
}

export async function payments(params: { q?: string; status?: string; gateway?: string; limit?: number; offset?: number } = {}): Promise<PaymentRow[]> {
  const sp = new URLSearchParams()
  if (params.q) sp.set('q', params.q)
  if (params.status) sp.set('status', params.status)
  if (params.gateway) sp.set('gateway', params.gateway)
  if (params.limit != null) sp.set('limit', String(params.limit))
  if (params.offset != null) sp.set('offset', String(params.offset))
  const json = await request(`/admin/payments?${sp.toString()}`)
  return json?.data?.payments || []
}

export async function auditLogs(params: { q?: string; action?: string; limit?: number; offset?: number } = {}): Promise<AuditLogRow[]> {
  const sp = new URLSearchParams()
  if (params.q) sp.set('q', params.q)
  if (params.action) sp.set('action', params.action)
  if (params.limit != null) sp.set('limit', String(params.limit))
  if (params.offset != null) sp.set('offset', String(params.offset))
  const json = await request(`/admin/audit-logs?${sp.toString()}`)
  return json?.data?.auditLogs || []
}

export { API_BASE }
