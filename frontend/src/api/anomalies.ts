import axios from 'axios'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string | undefined) ?? '/api',
})

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export interface UnlinkedSalesRow {
  id: string
  orderDate: string
  customerName: string
  totalAmount: number
}

export interface UnlinkedPackagingRow {
  id: string
  orderDate: string
  totalAmount: number
}

export interface UnlinkedInventoryRow {
  id: string
  orderDate: string
  totalQty: number
}

export interface StaleProcessingRow {
  id: string
  orderDate: string
  receivingItemName: string
  daysSince: number
  h02Done: boolean
  h03Done: boolean
}

export interface AnomaliesSummaryResult {
  unlinkedSales: UnlinkedSalesRow[]
  unlinkedPackaging: UnlinkedPackagingRow[]
  unlinkedInventory: UnlinkedInventoryRow[]
  staleProcessing: StaleProcessingRow[]
}

export const getAnomaliesSummary = () =>
  api.get<AnomaliesSummaryResult>('/anomalies/summary')
