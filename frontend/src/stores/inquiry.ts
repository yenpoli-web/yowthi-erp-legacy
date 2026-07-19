import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getReceivingInquiry,
  getReceivingVolumeInquiry,
  getProcessingWageInquiry,
  getFarmerProcessingInquiry,
  getH02ProcessingInquiry,
  getH03ProcessingInquiry,
  getPackagingInquiry,
  getContractWorkInquiry,
  getTransportInquiry,
  getPurchaseInquiry,
  getSalesInquiry,
  getCostAnalysis,
} from '../api/inquiry'
import type {
  ReceivingInquiryResult,
  ReceivingInquiryQuery,
  ReceivingVolumeInquiryResult,
  ReceivingVolumeInquiryQuery,
  ProcessingWageInquiryResult,
  ProcessingWageInquiryQuery,
  FarmerProcessingInquiryResult,
  FarmerProcessingInquiryQuery,
  H02ProcessingInquiryResult,
  H02ProcessingInquiryQuery,
  H03ProcessingInquiryResult,
  H03ProcessingInquiryQuery,
  PackagingInquiryResult,
  PackagingInquiryQuery,
  ContractWorkInquiryResult,
  ContractWorkInquiryQuery,
  TransportInquiryResult,
  TransportInquiryQuery,
  PurchaseInquiryResult,
  PurchaseInquiryQuery,
  SalesInquiryResult,
  SalesInquiryQuery,
  CostAnalysisResult,
  CostAnalysisQuery,
} from '../api/inquiry'

export const useInquiryStore = defineStore('inquiry', () => {
  const receivingResult = ref<ReceivingInquiryResult | null>(null)
  const receivingVolumeResult = ref<ReceivingVolumeInquiryResult | null>(null)
  const processingWageResult = ref<ProcessingWageInquiryResult | null>(null)
  const farmerProcessingResult = ref<FarmerProcessingInquiryResult | null>(null)
  const h02ProcessingResult = ref<H02ProcessingInquiryResult | null>(null)
  const h03ProcessingResult = ref<H03ProcessingInquiryResult | null>(null)
  const packagingResult = ref<PackagingInquiryResult | null>(null)
  const contractWorkResult = ref<ContractWorkInquiryResult | null>(null)
  const transportResult = ref<TransportInquiryResult | null>(null)
  const purchaseResult = ref<PurchaseInquiryResult | null>(null)
  const salesResult = ref<SalesInquiryResult | null>(null)
  const costAnalysisResult = ref<CostAnalysisResult | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function searchReceiving(query: ReceivingInquiryQuery) {
    loading.value = true
    error.value = null
    try {
      receivingResult.value = (await getReceivingInquiry(query)).data
    } catch (e: any) {
      error.value = e?.response?.data?.message || '查詢失敗'
    } finally {
      loading.value = false
    }
  }

  async function searchReceivingVolume(query: ReceivingVolumeInquiryQuery) {
    loading.value = true
    error.value = null
    try {
      receivingVolumeResult.value = (await getReceivingVolumeInquiry(query)).data
    } catch (e: any) {
      error.value = e?.response?.data?.message || '查詢失敗'
    } finally {
      loading.value = false
    }
  }

  async function searchProcessingWage(query: ProcessingWageInquiryQuery) {
    loading.value = true
    error.value = null
    try {
      processingWageResult.value = (await getProcessingWageInquiry(query)).data
    } catch (e: any) {
      error.value = e?.response?.data?.message || '查詢失敗'
    } finally {
      loading.value = false
    }
  }

  async function searchFarmerProcessing(query: FarmerProcessingInquiryQuery) {
    loading.value = true
    error.value = null
    try {
      farmerProcessingResult.value = (await getFarmerProcessingInquiry(query)).data
    } catch (e: any) {
      error.value = e?.response?.data?.message || '查詢失敗'
    } finally {
      loading.value = false
    }
  }

  async function searchH02Processing(query: H02ProcessingInquiryQuery) {
    loading.value = true
    error.value = null
    try {
      h02ProcessingResult.value = (await getH02ProcessingInquiry(query)).data
    } catch (e: any) {
      error.value = e?.response?.data?.message || '查詢失敗'
    } finally {
      loading.value = false
    }
  }

  async function searchH03Processing(query: H03ProcessingInquiryQuery) {
    loading.value = true
    error.value = null
    try {
      h03ProcessingResult.value = (await getH03ProcessingInquiry(query)).data
    } catch (e: any) {
      error.value = e?.response?.data?.message || '查詢失敗'
    } finally {
      loading.value = false
    }
  }

  async function searchPackaging(query: PackagingInquiryQuery) {
    loading.value = true
    error.value = null
    try {
      packagingResult.value = (await getPackagingInquiry(query)).data
    } catch (e: any) {
      error.value = e?.response?.data?.message || '查詢失敗'
    } finally {
      loading.value = false
    }
  }

  async function searchContractWork(query: ContractWorkInquiryQuery) {
    loading.value = true
    error.value = null
    try {
      contractWorkResult.value = (await getContractWorkInquiry(query)).data
    } catch (e: any) {
      error.value = e?.response?.data?.message || '查詢失敗'
    } finally {
      loading.value = false
    }
  }

  async function searchTransport(query: TransportInquiryQuery) {
    loading.value = true
    error.value = null
    try {
      transportResult.value = (await getTransportInquiry(query)).data
    } catch (e: any) {
      error.value = e?.response?.data?.message || '查詢失敗'
    } finally {
      loading.value = false
    }
  }

  async function searchPurchase(query: PurchaseInquiryQuery) {
    loading.value = true
    error.value = null
    try {
      purchaseResult.value = (await getPurchaseInquiry(query)).data
    } catch (e: any) {
      error.value = e?.response?.data?.message || '查詢失敗'
    } finally {
      loading.value = false
    }
  }

  async function searchSales(query: SalesInquiryQuery) {
    loading.value = true
    error.value = null
    try {
      salesResult.value = (await getSalesInquiry(query)).data
    } catch (e: any) {
      error.value = e?.response?.data?.message || '查詢失敗'
    } finally {
      loading.value = false
    }
  }

  async function searchCostAnalysis(query: CostAnalysisQuery) {
    loading.value = true
    error.value = null
    try {
      costAnalysisResult.value = (await getCostAnalysis(query)).data
    } catch (e: any) {
      error.value = e?.response?.data?.message || '查詢失敗'
    } finally {
      loading.value = false
    }
  }

  return {
    receivingResult,
    receivingVolumeResult,
    processingWageResult,
    farmerProcessingResult,
    h02ProcessingResult,
    h03ProcessingResult,
    packagingResult,
    contractWorkResult,
    transportResult,
    purchaseResult,
    salesResult,
    costAnalysisResult,
    loading,
    error,
    searchReceiving,
    searchReceivingVolume,
    searchProcessingWage,
    searchFarmerProcessing,
    searchH02Processing,
    searchH03Processing,
    searchPackaging,
    searchContractWork,
    searchTransport,
    searchPurchase,
    searchSales,
    searchCostAnalysis,
  }
})
