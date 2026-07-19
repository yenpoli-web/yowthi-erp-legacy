import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PackagingItem } from '../types/master-data'
import * as api from '../api/masterData'

export const usePackagingItemsStore = defineStore('packagingItems', () => {
  const packagingItems = ref<PackagingItem[]>([])
  const deletedPackagingItems = ref<PackagingItem[]>([])
  const loading        = ref(false)
  const error          = ref<string | null>(null)

  async function fetchPackagingItems() {
    loading.value = true
    error.value   = null
    try {
      const res            = await api.getPackagingItems()
      packagingItems.value = res.data
    } catch (e: unknown) {
      error.value = (e as any)?.response?.data?.message ?? '載入失敗'
    } finally {
      loading.value = false
    }
  }

  async function createPackagingItem(dto: Omit<PackagingItem, 'isDeleted'>): Promise<PackagingItem> {
    const res = await api.createPackagingItem(dto)
    packagingItems.value.push(res.data)
    return res.data
  }

  async function updatePackagingItem(id: string, dto: Partial<PackagingItem>): Promise<PackagingItem> {
    const res = await api.updatePackagingItem(id, dto)
    const idx = packagingItems.value.findIndex((i) => i.id === id)
    if (idx !== -1) packagingItems.value[idx] = res.data
    return res.data
  }

  async function softDeletePackagingItem(id: string) {
    await api.deletePackagingItem(id)
    packagingItems.value = packagingItems.value.filter((i) => i.id !== id)
  }

  async function hardDeletePackagingItem(id: string) {
    await api.hardDeletePackagingItem(id)
    packagingItems.value = packagingItems.value.filter((i) => i.id !== id)
  }

  async function fetchDeletedPackagingItems() {
    loading.value = true
    try {
      const res = await api.getDeletedPackagingItems()
      deletedPackagingItems.value = res.data
    } catch (e: unknown) {
      error.value = (e as any)?.response?.data?.message ?? '載入失敗'
    } finally {
      loading.value = false
    }
  }

  return { packagingItems, deletedPackagingItems, loading, error, fetchPackagingItems, createPackagingItem, updatePackagingItem, softDeletePackagingItem, hardDeletePackagingItem, fetchDeletedPackagingItems }
})
