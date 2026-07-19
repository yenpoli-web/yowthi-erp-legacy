import axios from 'axios'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string | undefined) ?? '/api',
})

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const getContractWorkOrders = () => api.get('/contract-work/orders')
export const getDeletedContractWorkOrders = () => api.get('/contract-work/orders/deleted')
export const getContractWorkOrder = (id: string) => api.get(`/contract-work/orders/${id}`)
export const createContractWorkOrder = (dto: { orderDate: string }) => api.post('/contract-work/orders', dto)
export const softDeleteContractWorkOrder = (id: string) => api.delete(`/contract-work/orders/${id}/soft`)
export const hardDeleteContractWorkOrder = (id: string) => api.delete(`/contract-work/orders/${id}/hard`)

export const createContractWorkDetail = (dto: {
  orderId: string; supplierId: string; productId: string
  quantity: number; weight: number; unitPrice: number; notes?: string
}) => api.post('/contract-work/details', dto)

export const updateContractWorkDetail = (id: number, dto: Partial<{
  supplierId: string; productId: string
  quantity: number; weight: number; unitPrice: number; notes: string
}>) => api.patch(`/contract-work/details/${id}`, dto)

export const softDeleteContractWorkDetail = (id: number) => api.delete(`/contract-work/details/${id}/soft`)
export const hardDeleteContractWorkDetail = (id: number) => api.delete(`/contract-work/details/${id}/hard`)
