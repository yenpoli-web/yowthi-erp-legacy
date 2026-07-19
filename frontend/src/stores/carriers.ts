import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Carrier } from '../types/master-data'
import * as api from '../api/masterData'

export const useCarriersStore = defineStore('carriers', () => {
  const carriers = ref<Carrier[]>([])
  const deletedCarriers = ref<Carrier[]>([])
  const loading  = ref(false)
  const error    = ref<string | null>(null)

  async function fetchCarriers() {
    loading.value = true
    error.value   = null
    try {
      const res      = await api.getCarriers()
      carriers.value = res.data
    } catch (e: unknown) {
      error.value = (e as any)?.response?.data?.message ?? '載入失敗'
    } finally {
      loading.value = false
    }
  }

  async function createCarrier(dto: Omit<Carrier, 'isDeleted'>): Promise<Carrier> {
    const res = await api.createCarrier(dto)
    carriers.value.push(res.data)
    return res.data
  }

  async function updateCarrier(id: string, dto: Partial<Carrier>): Promise<Carrier> {
    const res = await api.updateCarrier(id, dto)
    const idx = carriers.value.findIndex((c) => c.id === id)
    if (idx !== -1) carriers.value[idx] = res.data
    return res.data
  }

  async function softDeleteCarrier(id: string) {
    await api.deleteCarrier(id)
    carriers.value = carriers.value.filter((c) => c.id !== id)
  }

  async function hardDeleteCarrier(id: string) {
    await api.hardDeleteCarrier(id)
    carriers.value = carriers.value.filter((c) => c.id !== id)
  }

  async function fetchDeletedCarriers() {
    loading.value = true
    try {
      const res = await api.getDeletedCarriers()
      deletedCarriers.value = res.data
    } catch (e: unknown) {
      error.value = (e as any)?.response?.data?.message ?? '載入失敗'
    } finally {
      loading.value = false
    }
  }

  return { carriers, deletedCarriers, loading, error, fetchCarriers, createCarrier, updateCarrier, softDeleteCarrier, hardDeleteCarrier, fetchDeletedCarriers }
})
