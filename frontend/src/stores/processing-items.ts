import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ProcessingItem } from '../types/master-data'
import * as api from '../api/masterData'

export const useProcessingItemsStore = defineStore('processingItems', () => {
  const processingItems = ref<ProcessingItem[]>([])
  const loading         = ref(false)
  const error           = ref<string | null>(null)

  async function fetchProcessingItems() {
    loading.value = true
    error.value   = null
    try {
      const res             = await api.getProcessingItems()
      processingItems.value = res.data
    } catch (e: unknown) {
      error.value = (e as any)?.response?.data?.message ?? '載入失敗'
    } finally {
      loading.value = false
    }
  }

  async function updateProcessingItem(id: string, dto: Partial<ProcessingItem>): Promise<ProcessingItem> {
    const res = await api.updateProcessingItem(id, dto)
    const idx = processingItems.value.findIndex((i) => i.id === id)
    if (idx !== -1) processingItems.value[idx] = res.data
    return res.data
  }

  return { processingItems, loading, error, fetchProcessingItems, updateProcessingItem }
})
