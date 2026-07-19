import axios from 'axios'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string | undefined) ?? '/api',
})

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export interface InventoryCostOrder {
  orderId: string
  orderDate: string
  receivingItem: { id: string; name: string; imageUrl: string | null }
  h02Done: boolean
  totalH01H02Amount: number
  totalH02OutputWeight: number
  costLocked: boolean
  costUnitPrice: number | null
  costUnitPriceEst: number | null
  costEstBasketQty: number | null
  costEstBoxQty: number | null
  costLockedAt: string | null
  costLockedByUsername: string | null
  realPackagingAmount: number
  realUnitPrice: number | null
}

export interface InventoryCostProcessingDetailRow {
  id: number
  itemType: string
  employeeName: string
  outputQty: number
  amount: number
}

export interface InventoryCostPackagingDetailRow {
  id: number
  itemId: string
  itemName: string
  employeeName: string
  quantity: number
  wageRate: number
  amount: number
  workTime: string
}

export interface InventoryCostOrderDetail extends InventoryCostOrder {
  processingDetails: InventoryCostProcessingDetailRow[]
  packagingDetails: InventoryCostPackagingDetailRow[]
}

export interface InventoryCostQuery {
  startDate?: string
  endDate?: string
  receivingItemId?: string
  status?: 'ALL' | 'LOCKED' | 'UNLOCKED'
}

export const getInventoryCostOrders = (params?: InventoryCostQuery) =>
  api.get<InventoryCostOrder[]>('/inventory-cost/orders', { params })

export const getInventoryCostOrder = (orderId: string) =>
  api.get<InventoryCostOrderDetail>(`/inventory-cost/orders/${orderId}`)

export const lockInventoryCost = (orderId: string, estBasketQty: number, estBoxQty: number) =>
  api.post<InventoryCostOrderDetail>(`/inventory-cost/orders/${orderId}/lock`, {
    estBasketQty,
    estBoxQty,
  })

export const unlockInventoryCost = (orderId: string) =>
  api.post<InventoryCostOrderDetail>(`/inventory-cost/orders/${orderId}/unlock`)

// ── 代工成本鎖定（2026-06-30）──

export interface ContractCostDetail {
  id: number
  orderId: string
  orderDate: string
  supplierName: string
  productName: string
  quantity: number
  weight: number
  unitPrice: number
  amount: number
  costLocked: boolean
  costUnitPrice: number | null
  costLockedAt: string | null
  costLockedByUsername: string | null
}

export const getContractCostDetails = (status?: 'ALL' | 'LOCKED' | 'UNLOCKED') =>
  api.get<ContractCostDetail[]>('/inventory-cost/contracts', { params: { status } })

export const lockContractCost = (detailId: number) =>
  api.post<ContractCostDetail>(`/inventory-cost/contracts/${detailId}/lock`)

export const unlockContractCost = (detailId: number) =>
  api.post<ContractCostDetail>(`/inventory-cost/contracts/${detailId}/unlock`)
