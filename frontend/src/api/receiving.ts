import axios from 'axios'
import { useAuthStore } from '../stores/auth'

const BASE = '/api/receiving'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string | undefined) ?? '/api',
})

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

function getHeaders() {
  const token = useAuthStore().token
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

function getDeleteHeaders() {
  const token = useAuthStore().token
  return { Authorization: `Bearer ${token}` }
}

// Orders
export async function fetchOrders(params?: { itemId?: string; date?: string }) {
  const q = new URLSearchParams()
  if (params?.itemId) q.set('itemId', params.itemId)
  if (params?.date) q.set('date', params.date)
  const res = await fetch(`${BASE}/orders?${q}`, { headers: getHeaders() })
  if (!res.ok) throw await res.json()
  return res.json()
}

export async function fetchDeletedOrders() {
  const res = await fetch(`${BASE}/orders/deleted`, { headers: getHeaders() })
  if (!res.ok) throw await res.json()
  return res.json()
}

export async function fetchOrder(id: string) {
  const res = await fetch(`${BASE}/orders/${id}`, { headers: getHeaders() })
  if (!res.ok) throw await res.json()
  return res.json()
}

export async function createOrder(data: { orderDate: string; receivingItemId: string }) {
  const res = await fetch(`${BASE}/orders`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw await res.json()
  return res.json()
}

export async function updateOrder(id: string, data: { h02Done?: boolean; h03Done?: boolean }) {
  const res = await fetch(`${BASE}/orders/${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw await res.json()
  return res.json()
}

export async function softDeleteOrder(id: string) {
  const res = await fetch(`${BASE}/orders/${id}`, { method: 'DELETE', headers: getDeleteHeaders() })
  if (!res.ok) throw await res.json()
  return res.json()
}

export async function hardDeleteOrder(id: string) {
  const res = await fetch(`${BASE}/orders/${id}/hard`, { method: 'DELETE', headers: getDeleteHeaders() })
  if (!res.ok) throw await res.json()
  return res.json()
}

export async function fetchOrderWithDeleted(id: string) {
  const res = await fetch(`${BASE}/orders/${id}/with-deleted`, { headers: getHeaders() })
  if (!res.ok) throw await res.json()
  return res.json()
}

export async function hardDeleteBatch(id: string) {
  const res = await fetch(`${BASE}/batches/${id}/hard`, { method: 'DELETE', headers: getDeleteHeaders() })
  if (!res.ok) throw await res.json()
  return res.json()
}

export async function hardDeleteDetail(id: number) {
  const res = await fetch(`${BASE}/details/${id}/hard`, { method: 'DELETE', headers: getDeleteHeaders() })
  if (!res.ok) throw await res.json()
  return res.json()
}

// Batches
export async function fetchBatches(orderId?: string) {
  const q = orderId ? `?orderId=${orderId}` : ''
  const res = await fetch(`${BASE}/batches${q}`, { headers: getHeaders() })
  if (!res.ok) throw await res.json()
  return res.json()
}

export async function createBatch(data: { orderId: string; farmerId: string }) {
  const res = await fetch(`${BASE}/batches`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw await res.json()
  return res.json()
}

export async function updateBatch(id: string, data: { processingDone?: boolean; salesConfirmed?: boolean }) {
  const res = await fetch(`${BASE}/batches/${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw await res.json()
  return res.json()
}

export async function softDeleteBatch(id: string) {
  const res = await fetch(`${BASE}/batches/${id}`, { method: 'DELETE', headers: getDeleteHeaders() })
  if (!res.ok) throw await res.json()
  return res.json()
}

// Details
export async function createDetail(data: {
  batchId: string
  itemId: string
  farmerId: string
  quantity: number
  unitPrice: number
}) {
  const res = await fetch(`${BASE}/details`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw await res.json()
  return res.json()
}

export async function updateDetail(id: number, data: { quantity?: number; unitPrice?: number }) {
  const res = await fetch(`${BASE}/details/${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw await res.json()
  return res.json()
}

export async function softDeleteDetail(id: number) {
  const res = await fetch(`${BASE}/details/${id}`, { method: 'DELETE', headers: getDeleteHeaders() })
  if (!res.ok) throw await res.json()
  return res.json()
}

export const markInSales = (id: string, inSales: boolean) =>
  api.patch(`/receiving/orders/${id}/in-sales`, { inSales })

export const markSalesDone = (id: string, done: boolean) =>
  api.patch(`/receiving/orders/${id}/sales-done`, { done })
