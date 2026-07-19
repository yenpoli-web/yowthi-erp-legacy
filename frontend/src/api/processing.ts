import axios from 'axios'
import { useAuthStore } from '../stores/auth'

const BASE = '/api/processing'

function getHeaders() {
  const auth = useAuthStore()
  return { Authorization: `Bearer ${auth.token}` }
}

// ── 主單 ──────────────────────────────────────────────────────────
export const getProcessingOrders = (params?: { itemId?: string; date?: string }) =>
  axios.get(`${BASE}/orders`, { headers: getHeaders(), params })

export const getDeletedProcessingOrders = () =>
  axios.get(`${BASE}/orders/deleted`, { headers: getHeaders() })

export const getProcessingOrder = (id: string, includeDeleted = false) =>
  axios.get(`${BASE}/orders/${id}`, { headers: getHeaders(), params: { includeDeleted } })

export const findOrCreateOrder = (data: {
  orderDate: string
  receivingItemId: string
  sourceType: 'RECEIVING' | 'DEFECT'
}) => axios.post(`${BASE}/orders`, data, { headers: getHeaders() })

export const updateProcessingOrderDate = (id: string, orderDate: string) =>
  axios.patch(`${BASE}/orders/${id}/date`, { orderDate }, { headers: getHeaders() })

export const softDeleteProcessingOrder = (id: string) =>
  axios.delete(`${BASE}/orders/${id}`, { headers: getHeaders() })

export const hardDeleteProcessingOrder = (id: string) =>
  axios.delete(`${BASE}/orders/${id}/hard`, { headers: getHeaders() })

// ── 可用資料查詢 ──────────────────────────────────────────────────
export const getAvailableBatches = (farmerId: string) =>
  axios.get(`${BASE}/available/batches`, { headers: getHeaders(), params: { farmerId } })

export const getAvailableOrdersH02 = (receivingItemId?: string) =>
  axios.get(`${BASE}/available/orders-h02`, { headers: getHeaders(), params: { receivingItemId } })

export const getAvailableOrdersH03 = (receivingItemId?: string) =>
  axios.get(`${BASE}/available/orders-h03`, { headers: getHeaders(), params: { receivingItemId } })

export const getAvailableDefectPool = () =>
  axios.get(`${BASE}/available/defect-pool`, { headers: getHeaders() })

// ── 明細 ──────────────────────────────────────────────────────────
export const getTodayDetails = () =>
  axios.get(`${BASE}/details/today`, { headers: getHeaders() })

export const createOffsetDetail = (id: number) =>
  axios.post(`${BASE}/details/${id}/offset`, {}, { headers: getHeaders() })

export const createProcessingDetail = (data: any) =>
  axios.post(`${BASE}/details`, data, { headers: getHeaders() })

export const updateProcessingDetail = (id: number, data: any) =>
  axios.patch(`${BASE}/details/${id}`, data, { headers: getHeaders() })

export const softDeleteProcessingDetail = (id: number) =>
  axios.delete(`${BASE}/details/${id}`, { headers: getHeaders() })

export const hardDeleteProcessingDetail = (id: number) =>
  axios.delete(`${BASE}/details/${id}/hard`, { headers: getHeaders() })
