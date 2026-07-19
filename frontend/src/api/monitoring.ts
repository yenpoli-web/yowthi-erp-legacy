import axios from 'axios'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string | undefined) ?? '/api',
})

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export interface MonitoringBatch {
  batchId: string
  farmer: { id: string; name: string }
  inputQty: number
  processingDone: boolean
  h01Output: number | null
  h01Defect: number | null
  h01Amount: number | null
  loss: number | null
  lossRate: number | null
  completionRate: number | null
}

export interface MonitoringTypeStats {
  totalQty: number
  outputQty: number
  amount: number
  completionRate: number | null
}

export interface MonitoringH01Stats {
  outputQty: number
  defectQty: number
  amount: number
}

export interface MonitoringOrder {
  orderId: string
  orderDate: string
  receivingItem: { id: string; name: string; imageUrl: string | null }
  h02Done: boolean
  h03Done: boolean
  totalInputQty: number
  totalAmount: number
  h01Stats: MonitoringH01Stats
  h02Stats: MonitoringTypeStats
  h03Stats: MonitoringTypeStats
  batches: MonitoringBatch[]
}

export interface MonitoringQuery {
  startDate?: string
  endDate?: string
  receivingItemId?: string
  status?: 'ALL' | 'PENDING' | 'DONE'
}

export const getMonitoringOrders = (params?: MonitoringQuery) =>
  api.get<MonitoringOrder[]>('/monitoring/orders', { params })

export const getMonitoringOrder = (orderId: string) =>
  api.get<MonitoringOrder>(`/monitoring/orders/${orderId}`)
