import axios from 'axios'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string | undefined) ?? '/api',
})

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const getPackagingOrders = () => api.get('/packaging/orders')
export const getDeletedPackagingOrders = () => api.get('/packaging/orders/deleted')
export const getPackagingOrder = (id: string) => api.get(`/packaging/orders/${id}`)
export const createPackagingOrder = (dto: { orderDate: string; salesOrderId?: string; receivingOrderId?: string }) =>
  api.post('/packaging/orders', dto)
export const updatePackagingOrder = (id: string, dto: { salesOrderId?: string | null; receivingOrderId?: string | null }) =>
  api.patch(`/packaging/orders/${id}`, dto)
export const getAvailableReceivingOrdersForPackaging = () =>
  api.get('/packaging/orders/available-receiving-orders')
export const markPackagingSalesDone = (id: string, done: boolean) =>
  api.patch(`/packaging/orders/${id}/sales-done`, { done })
export const softDeletePackagingOrder = (id: string) => api.delete(`/packaging/orders/${id}/soft`)
export const hardDeletePackagingOrder = (id: string) => api.delete(`/packaging/orders/${id}/hard`)

export const createPackagingDetail = (dto: {
  orderId: string
  employeeId: string
  itemId: string
  quantity: number
  wageRate: number
  notes?: string
}) => api.post('/packaging/details', dto)

export const updatePackagingDetail = (id: number, dto: Partial<{
  itemId: string
  quantity: number
  wageRate: number
  notes: string
}>) => api.patch(`/packaging/details/${id}`, dto)

export const softDeletePackagingDetail = (id: number) => api.delete(`/packaging/details/${id}/soft`)
export const hardDeletePackagingDetail = (id: number) => api.delete(`/packaging/details/${id}/hard`)
