import { getToken } from './auth'

export const API_BASE = import.meta.env.VITE_ADMIN_API_BASE || 'http://localhost:4010'

async function request(path, init) {
  const token = getToken()
  const headers = new Headers((init && init.headers) || undefined)
  if (!headers.has('Content-Type') && init && init.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${API_BASE}${path}`, {
    ...(init || {}),
    headers,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `${res.status} ${res.statusText}`)
  }

  return res.json()
}

export async function login(email, password) {
  const json = await request('/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    headers: { 'Content-Type': 'application/json' },
  })
  return json && json.data
}

export async function exchangeKey(accessKey) {
  const json = await request('/admin/exchange-key', {
    method: 'POST',
    body: JSON.stringify({ accessKey }),
    headers: { 'Content-Type': 'application/json' },
  })
  return json && json.data
}

export async function me() {
  const json = await request('/admin/me')
  return json && json.data && json.data.admin
}

export async function status() {
  const json = await request('/admin/status')
  return json && json.data
}

export async function users(params = {}) {
  const sp = new URLSearchParams()
  if (params.q) sp.set('q', params.q)
  if (params.limit != null) sp.set('limit', String(params.limit))
  if (params.offset != null) sp.set('offset', String(params.offset))
  const json = await request(`/admin/users?${sp.toString()}`)
  return (json && json.data && json.data.users) || []
}

export async function subscriptions(params = {}) {
  const sp = new URLSearchParams()
  if (params.q) sp.set('q', params.q)
  if (params.status) sp.set('status', params.status)
  if (params.plan) sp.set('plan', params.plan)
  if (params.limit != null) sp.set('limit', String(params.limit))
  if (params.offset != null) sp.set('offset', String(params.offset))
  const json = await request(`/admin/subscriptions?${sp.toString()}`)
  return (json && json.data && json.data.subscriptions) || []
}

export async function payments(params = {}) {
  const sp = new URLSearchParams()
  if (params.q) sp.set('q', params.q)
  if (params.status) sp.set('status', params.status)
  if (params.gateway) sp.set('gateway', params.gateway)
  if (params.limit != null) sp.set('limit', String(params.limit))
  if (params.offset != null) sp.set('offset', String(params.offset))
  const json = await request(`/admin/payments?${sp.toString()}`)
  return (json && json.data && json.data.payments) || []
}

export async function auditLogs(params = {}) {
  const sp = new URLSearchParams()
  if (params.q) sp.set('q', params.q)
  if (params.action) sp.set('action', params.action)
  if (params.limit != null) sp.set('limit', String(params.limit))
  if (params.offset != null) sp.set('offset', String(params.offset))
  const json = await request(`/admin/audit-logs?${sp.toString()}`)
  return (json && json.data && json.data.auditLogs) || []
}
