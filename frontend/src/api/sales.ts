import axios from 'axios'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string | undefined) ?? '/api',
})

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── 主單 ──────────────────────────────────────────────────────────
export const getSalesOrders = (params?: { customerId?: string; date?: string }) =>
  api.get('/sales/orders', { params })

export const getDeletedSalesOrders = () =>
  api.get('/sales/orders/deleted')

export const getSalesOrder = (id: string) =>
  api.get(`/sales/orders/${id}`)

export const createSalesOrder = (dto: { orderDate: string; customerId: string }) =>
  api.post('/sales/orders', dto)

export const softDeleteSalesOrder = (id: string) =>
  api.delete(`/sales/orders/${id}/soft`)

export const hardDeleteSalesOrder = (id: string) =>
  api.delete(`/sales/orders/${id}/hard`)

export const getNextSalesOrderNo = (date: string) =>
  api.get('/sales/orders/next-no', { params: { date } })

// ── 明細 ──────────────────────────────────────────────────────────
export const createSalesDetail = (dto: {
  orderId: string
  productId: string
  weight: number
  quantity: number
  unitPrice: number
}) => api.post('/sales/details', dto)

export const updateSalesDetail = (id: number, dto: Partial<{
  productId: string
  weight: number
  quantity: number
  unitPrice: number
}>) => api.patch(`/sales/details/${id}`, dto)

export const softDeleteSalesDetail = (id: number) =>
  api.delete(`/sales/details/${id}/soft`)

export const hardDeleteSalesDetail = (id: number) =>
  api.delete(`/sales/details/${id}/hard`)

// ── 進貨批次關聯 ───────────────────────────────────────────────────
export const addSalesBatches = (orderId: string, receivingBatchIds: string[]) =>
  api.post(`/sales/orders/${orderId}/batches`, { receivingBatchIds })

export const removeSalesBatch = (orderId: string, batchId: string) =>
  api.delete(`/sales/orders/${orderId}/batches/${batchId}`)

// ── 可選資料 ───────────────────────────────────────────────────────
export const getAvailableBatches = (processingType?: string, receivingItemId?: string) =>
  api.get('/sales/available-batches', { params: { processingType, receivingItemId } })

export const getAvailableOrders = (processingType?: string, receivingItemId?: string) =>
  api.get('/sales/available-orders', { params: { processingType, receivingItemId } })

export const getAvailableInventoryDetails = (productType?: string) =>
  api.get('/inventory/details/available', { params: productType ? { productType } : undefined })

export const addSalesInventoryDetails = (orderId: string, items: { inventoryDetailId: number; quantity: number; unitPrice: number }[]) =>
  api.post(`/sales/orders/${orderId}/inventory-details`, { items })

export const removeSalesInventoryDetailById = (id: number) =>
  api.delete(`/sales/inventory-details/${id}`)

export const toggleSalesPackagingDone = (id: string, packagingDone: boolean) =>
  api.patch(`/sales/orders/${id}/packaging-done`, { packagingDone })
