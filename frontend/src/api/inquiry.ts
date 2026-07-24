import axios from 'axios'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string | undefined) ?? '/api',
})

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export interface ReceivingInquiryQuery {
  startDate?: string
  endDate?: string
  farmerIds?: string
  receivingItemId?: string
}

export interface ReceivingInquiryRow {
  orderId: string
  date: string
  farmerId: string
  farmerName: string
  itemId: string
  itemName: string
  quantity: number
  unitPrice: number
  amount: number
}

export interface ReceivingInquiryResult {
  rows: ReceivingInquiryRow[]
  summary: {
    totalQuantity: number
    totalAmount: number
    avgUnitPrice: number
  }
}

export const getReceivingInquiry = (params: ReceivingInquiryQuery) =>
  api.get<ReceivingInquiryResult>('/inquiry/receiving', { params })

export interface ReceivingVolumeInquiryQuery {
  startDate?: string
  endDate?: string
  receivingItemId?: string
}

export interface ReceivingVolumeInquiryRow {
  date: string
  orderId: string
  quantity: number
  avgPrice: number
  amount: number
}

export interface ReceivingVolumeInquiryResult {
  rows: ReceivingVolumeInquiryRow[]
  summary: {
    totalQuantity: number
    totalAmount: number
    avgUnitPrice: number
  }
}

export const getReceivingVolumeInquiry = (params: ReceivingVolumeInquiryQuery) =>
  api.get<ReceivingVolumeInquiryResult>('/inquiry/receiving-volume', { params })

export interface ProcessingWageInquiryQuery {
  startDate?: string
  endDate?: string
  employeeId?: string
}

export interface ProcessingWageInquiryRow {
  date: string
  employeeId: string
  employeeName: string
  farmerId: string | null
  farmerName: string | null
  itemType: string
  itemName: string
  outputQty: number
  wageRate: number
  amount: number
}

export interface ProcessingWageInquiryResult {
  rows: ProcessingWageInquiryRow[]
  summary: {
    totalOutputQty: number
    totalAmount: number
  }
}

export const getProcessingWageInquiry = (params: ProcessingWageInquiryQuery) =>
  api.get<ProcessingWageInquiryResult>('/inquiry/processing-wage', { params })

export interface ProcessingWageEmployeeRow {
  id: string
  name: string
  imageUrl?: string | null
}

export const getProcessingWageEmployees = (params: { startDate?: string; endDate?: string }) =>
  api.get<ProcessingWageEmployeeRow[]>('/inquiry/processing-wage/employees', { params })

export interface EmployeeWageSummaryInquiryQuery {
  startDate?: string
  endDate?: string
  employeeId?: string
}

export interface EmployeeWageSummaryInquiryRow {
  date: string
  employeeId: string
  employeeName: string
  amount: number
}

export interface EmployeeWageSummaryInquiryResult {
  rows: EmployeeWageSummaryInquiryRow[]
  summary: {
    totalAmount: number
  }
}

export const getEmployeeWageSummaryInquiry = (params: EmployeeWageSummaryInquiryQuery) =>
  api.get<EmployeeWageSummaryInquiryResult>('/inquiry/employee-wage-summary', { params })

export interface FarmerProcessingInquiryQuery {
  startDate?: string
  endDate?: string
  farmerIds?: string
}

export interface FarmerProcessingInquiryRow {
  date: string
  farmerId: string
  farmerName: string
  inputQty: number
  outputQty: number
  defectQty: number
  loss: number
  lossRate: number | null
  completionRate: number | null
  amount: number
}

export interface FarmerProcessingInquiryResult {
  rows: FarmerProcessingInquiryRow[]
  summary: {
    totalInputQty: number
    totalOutputQty: number
    totalDefectQty: number
    totalAmount: number
  }
}

export const getFarmerProcessingInquiry = (params: FarmerProcessingInquiryQuery) =>
  api.get<FarmerProcessingInquiryResult>('/inquiry/farmer-processing', { params })

export interface H02ProcessingInquiryQuery {
  startDate?: string
  endDate?: string
  receivingItemId?: string
}

export interface H02ProcessingInquiryRow {
  date: string
  orderId: string
  receivingItemName: string
  inputQty: number
  h01Output: number
  h02Output: number
  h01CompletionRate: number | null
  h02CompletionRate: number | null
  amount: number
}

export interface H02ProcessingInquiryResult {
  rows: H02ProcessingInquiryRow[]
  summary: {
    totalH01Output: number
    totalH02Output: number
    totalAmount: number
  }
}

export const getH02ProcessingInquiry = (params: H02ProcessingInquiryQuery) =>
  api.get<H02ProcessingInquiryResult>('/inquiry/h02-processing', { params })

export interface H03ProcessingInquiryQuery {
  startDate?: string
  endDate?: string
  receivingItemId?: string
}

export interface H03ProcessingInquiryRow {
  date: string
  orderId: string
  receivingItemName: string
  h01Defect: number
  h03Output: number
  amount: number
}

export interface H03ProcessingInquiryResult {
  rows: H03ProcessingInquiryRow[]
  summary: {
    totalH01Defect: number
    totalH03Output: number
    totalAmount: number
  }
}

export const getH03ProcessingInquiry = (params: H03ProcessingInquiryQuery) =>
  api.get<H03ProcessingInquiryResult>('/inquiry/h03-processing', { params })

export interface PackagingInquiryQuery {
  startDate?: string
  endDate?: string
  packagingItemIds?: string
}

export interface PackagingInquiryRow {
  date: string
  employeeId: string
  employeeName: string
  itemId: string
  itemName: string
  quantity: number
  wageRate: number
  amount: number
}

export interface PackagingInquiryResult {
  rows: PackagingInquiryRow[]
  summary: {
    totalQuantity: number
    totalAmount: number
  }
}

export const getPackagingInquiry = (params: PackagingInquiryQuery) =>
  api.get<PackagingInquiryResult>('/inquiry/packaging', { params })

export interface ContractWorkInquiryQuery {
  startDate?: string
  endDate?: string
  supplierIds?: string
  productIds?: string
}

export interface ContractWorkInquiryRow {
  date: string
  supplierId: string
  supplierName: string
  productId: string
  productName: string
  quantity: number
  weight: number
  unitPrice: number
  amount: number
}

export interface ContractWorkInquiryResult {
  rows: ContractWorkInquiryRow[]
  summary: {
    totalQuantity: number
    totalWeight: number
    totalAmount: number
  }
}

export const getContractWorkInquiry = (params: ContractWorkInquiryQuery) =>
  api.get<ContractWorkInquiryResult>('/inquiry/contract-work', { params })

export interface TransportInquiryQuery {
  startDate?: string
  endDate?: string
  carrierIds?: string
}

export interface TransportInquiryRow {
  date: string
  carrierId: string
  carrierName: string
  quantity: number
  unitPrice: number
  amount: number
}

export interface TransportInquiryResult {
  rows: TransportInquiryRow[]
  summary: {
    totalQuantity: number
    totalAmount: number
  }
}

export const getTransportInquiry = (params: TransportInquiryQuery) =>
  api.get<TransportInquiryResult>('/inquiry/transport', { params })

export interface PurchaseInquiryQuery {
  startDate?: string
  endDate?: string
}

export interface PurchaseInquiryRow {
  date: string
  itemId: string
  itemName: string
  quantity: number
  unitPrice: number
  amount: number
}

export interface PurchaseInquiryResult {
  rows: PurchaseInquiryRow[]
  summary: {
    totalQuantity: number
    totalAmount: number
  }
}

export const getPurchaseInquiry = (params: PurchaseInquiryQuery) =>
  api.get<PurchaseInquiryResult>('/inquiry/purchase', { params })

export interface SalesInquiryQuery {
  startDate?: string
  endDate?: string
  customerIds?: string
}

export interface SalesInquiryRow {
  date: string
  customerId: string
  customerName: string
  productId: string
  productName: string
  weight: number
  quantity: number
  unitPrice: number
  amount: number
}

export interface SalesInquiryResult {
  rows: SalesInquiryRow[]
  summary: {
    totalWeight: number
    totalQuantity: number
    totalAmount: number
  }
}

export const getSalesInquiry = (params: SalesInquiryQuery) =>
  api.get<SalesInquiryResult>('/inquiry/sales', { params })

export interface CostAnalysisQuery {
  exportOrderIds?: string
  domesticOrderIds?: string
}

export interface CostAnalysisExportResult {
  totalSales: number
  totalRealCost: number
  totalPackaging: number
  grossProfit: number
}

export interface CostAnalysisDomesticResult {
  totalSales: number
  totalH03Wage: number
  grossProfit: number
}

export interface CostAnalysisResult {
  exportResult: CostAnalysisExportResult | null
  domesticResult: CostAnalysisDomesticResult | null
  combinedGrossProfit: number
}

export const getCostAnalysis = (params: CostAnalysisQuery) =>
  api.get<CostAnalysisResult>('/inquiry/cost-analysis', { params })

export interface SalesOrderForCostRow {
  id: string
  orderDate: string
  customerName: string
  amount: number
}

export const getSalesOrdersForCost = (params: { startDate?: string; endDate?: string; channel: 'EXPORT' | 'DOMESTIC' }) =>
  api.get<SalesOrderForCostRow[]>('/inquiry/sales-orders-for-cost', { params })
