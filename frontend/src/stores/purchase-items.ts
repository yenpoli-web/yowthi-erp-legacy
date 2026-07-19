import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SimpleItem } from '../types/master-data'
import * as api from '../api/masterData'

export const usePurchaseItemsStore = defineStore('purchaseItems', () => {
  const purchaseItems = ref<SimpleItem[]>([])
  const deletedPurchaseItems = ref<SimpleItem[]>([])
  const loading       = ref(false)
  const error         = ref<string | null>(null)

  async function fetchPurchaseItems() {
    loading.value = true
    error.value   = null
    try {
      const res           = await api.getPurchaseItems()
      purchaseItems.value = res.data
    } catch (e: unknown) {
      error.value = (e as any)?.response?.data?.message ?? '載入失敗'
    } finally {
      loading.value = false
    }
  }

  async function createPurchaseItem(dto: Omit<SimpleItem, 'isDeleted'>): Promise<SimpleItem> {
    const res = await api.createPurchaseItem(dto)
    purchaseItems.value.push(res.data)
    return res.data
  }

  async function updatePurchaseItem(id: string, dto: Partial<SimpleItem>): Promise<SimpleItem> {
    const res = await api.updatePurchaseItem(id, dto)
    const idx = purchaseItems.value.findIndex((i) => i.id === id)
    if (idx !== -1) purchaseItems.value[idx] = res.data
    return res.data
  }

  async function softDeletePurchaseItem(id: string) {
    await api.deletePurchaseItem(id)
    purchaseItems.value = purchaseItems.value.filter((i) => i.id !== id)
  }

  async function hardDeletePurchaseItem(id: string) {
    await api.hardDeletePurchaseItem(id)
    purchaseItems.value = purchaseItems.value.filter((i) => i.id !== id)
  }

  async function fetchDeletedPurchaseItems() {
    loading.value = true
    try {
      const res = await api.getDeletedPurchaseItems()
      deletedPurchaseItems.value = res.data
    } catch (e: unknown) {
      error.value = (e as any)?.response?.data?.message ?? '載入失敗'
    } finally {
      loading.value = false
    }
  }

  return { purchaseItems, deletedPurchaseItems, loading, error, fetchPurchaseItems, createPurchaseItem, updatePurchaseItem, softDeletePurchaseItem, hardDeletePurchaseItem, fetchDeletedPurchaseItems }
})
