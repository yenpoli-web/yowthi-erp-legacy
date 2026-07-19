import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SimpleItem } from '../types/master-data'
import * as api from '../api/masterData'

export const useReceivingItemsStore = defineStore('receivingItems', () => {
  const receivingItems = ref<SimpleItem[]>([])
  const deletedReceivingItems = ref<SimpleItem[]>([])
  const loading        = ref(false)
  const error          = ref<string | null>(null)

  async function fetchReceivingItems() {
    loading.value = true
    error.value   = null
    try {
      const res            = await api.getReceivingItems()
      receivingItems.value = res.data
    } catch (e: unknown) {
      error.value = (e as any)?.response?.data?.message ?? '載入失敗'
    } finally {
      loading.value = false
    }
  }

  async function createReceivingItem(dto: Omit<SimpleItem, 'isDeleted'>): Promise<SimpleItem> {
    const res = await api.createReceivingItem(dto)
    receivingItems.value.push(res.data)
    return res.data
  }

  async function updateReceivingItem(id: string, dto: Partial<SimpleItem>): Promise<SimpleItem> {
    const res = await api.updateReceivingItem(id, dto)
    const idx = receivingItems.value.findIndex((i) => i.id === id)
    if (idx !== -1) receivingItems.value[idx] = res.data
    return res.data
  }

  async function softDeleteReceivingItem(id: string) {
    await api.deleteReceivingItem(id)
    receivingItems.value = receivingItems.value.filter((i) => i.id !== id)
  }

  async function hardDeleteReceivingItem(id: string) {
    await api.hardDeleteReceivingItem(id)
    receivingItems.value = receivingItems.value.filter((i) => i.id !== id)
  }

  async function fetchDeletedReceivingItems() {
    loading.value = true
    try {
      const res = await api.getDeletedReceivingItems()
      deletedReceivingItems.value = res.data
    } catch (e: unknown) {
      error.value = (e as any)?.response?.data?.message ?? '載入失敗'
    } finally {
      loading.value = false
    }
  }

  return { receivingItems, deletedReceivingItems, loading, error, fetchReceivingItems, createReceivingItem, updateReceivingItem, softDeleteReceivingItem, hardDeleteReceivingItem, fetchDeletedReceivingItems }
})
