import axios from 'axios'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string | undefined) ?? '/api',
})
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const getPurchaseOrders = () => api.get('/purchase/orders')
export const getDeletedPurchaseOrders = () => api.get('/purchase/orders/deleted')
export const getPurchaseOrder = (id: string) => api.get(`/purchase/orders/${id}`)
export const createPurchaseOrder = (dto: { orderDate: string }) => api.post('/purchase/orders', dto)
export const softDeletePurchaseOrder = (id: string) => api.delete(`/purchase/orders/${id}/soft`)
export const hardDeletePurchaseOrder = (id: string) => api.delete(`/purchase/orders/${id}/hard`)

export const createPurchaseDetail = (dto: {
  orderId: string; itemId: string; quantity: number; unitPrice: number; notes?: string
}) => api.post('/purchase/details', dto)
export const updatePurchaseDetail = (id: number, dto: Partial<{
  itemId: string; quantity: number; unitPrice: number; notes: string
}>) => api.patch(`/purchase/details/${id}`, dto)
export const softDeletePurchaseDetail = (id: number) => api.delete(`/purchase/details/${id}/soft`)
export const hardDeletePurchaseDetail = (id: number) => api.delete(`/purchase/details/${id}/hard`)
