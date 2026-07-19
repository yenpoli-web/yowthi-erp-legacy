import axios from 'axios'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string | undefined) ?? '/api',
})
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const getTransportOrders = () => api.get('/transport/orders')
export const getDeletedTransportOrders = () => api.get('/transport/orders/deleted')
export const getTransportOrder = (id: string) => api.get(`/transport/orders/${id}`)
export const createTransportOrder = (dto: {
  orderDate: string; carrierId: string; quantity: number; unitPrice: number; notes?: string
}) => api.post('/transport/orders', dto)
export const updateTransportOrder = (id: string, dto: Partial<{
  carrierId: string; quantity: number; unitPrice: number; notes: string
}>) => api.patch(`/transport/orders/${id}`, dto)
export const softDeleteTransportOrder = (id: string) => api.delete(`/transport/orders/${id}/soft`)
export const hardDeleteTransportOrder = (id: string) => api.delete(`/transport/orders/${id}/hard`)
