import axios from 'axios'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string | undefined) ?? '/api',
})

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const getInventoryOrders = () => api.get('/inventory/orders')
export const getDeletedInventoryOrders = () => api.get('/inventory/orders/deleted')
export const getInventoryOrder = (id: string) => api.get(`/inventory/orders/${id}`)
export const createInventoryOrder = (dto: { orderDate: string; notes?: string }) =>
  api.post('/inventory/orders', dto)
export const softDeleteInventoryOrder = (id: string) => api.delete(`/inventory/orders/${id}/soft`)
export const hardDeleteInventoryOrder = (id: string) => api.delete(`/inventory/orders/${id}/hard`)

export const createInventoryDetail = (dto: { orderId: string; productId: string; quantity: number; weight: number; unitPrice: number }) =>
  api.post('/inventory/details', dto)
export const updateInventoryDetail = (id: number, dto: Partial<{ productId: string; quantity: number; weight: number; unitPrice: number }>) =>
  api.patch(`/inventory/details/${id}`, dto)
export const softDeleteInventoryDetail = (id: number) => api.delete(`/inventory/details/${id}/soft`)
export const hardDeleteInventoryDetail = (id: number) => api.delete(`/inventory/details/${id}/hard`)
export const updateInventoryDetailSalesStatus = (id: number, salesStatus: string) =>
  api.patch(`/inventory/details/${id}/sales-status`, { salesStatus })

export const getAvailableInventoryDetails = (productType?: string) =>
  api.get('/inventory/details/available', { params: productType ? { productType } : undefined })

export const addInventoryReceivingOrders = (orderId: string, receivingOrderIds: string[]) =>
  api.post(`/inventory/orders/${orderId}/receiving-orders`, { receivingOrderIds })
export const removeInventoryReceivingOrder = (orderId: string, receivingOrderId: string) =>
  api.delete(`/inventory/orders/${orderId}/receiving-orders/${receivingOrderId}`)

export const getAvailableReceivingOrders = (processingType?: string) =>
  api.get('/inventory/orders/available-receiving-orders', { params: processingType ? { processingType } : undefined })
export const getAvailableContractOrders = () =>
  api.get('/inventory/orders/available-contract-orders')

export const addInventoryContractOrders = (orderId: string, contractOrderIds: string[]) =>
  api.post(`/inventory/orders/${orderId}/contract-orders`, { contractOrderIds })

export const removeInventoryContractOrder = (orderId: string, contractOrderId: string) =>
  api.delete(`/inventory/orders/${orderId}/contract-orders/${contractOrderId}`)

export const getStockSummary = () =>
  api.get('/inventory/orders/stock-summary')
export const markSalesDone = (receivingOrderId: string, done: boolean) =>
  api.patch(`/inventory/receiving-orders/${receivingOrderId}/sales-done`, { done })
export const markContractSalesDone = (contractOrderId: string, done: boolean) =>
  api.patch(`/inventory/contract-orders/${contractOrderId}/sales-done`, { done })
