import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Farmer } from '../types/master-data'
import * as api from '../api/masterData'

export const useFarmersStore = defineStore('farmers', () => {
  const farmers = ref<Farmer[]>([])
  const deletedFarmers = ref<Farmer[]>([])
  const loading = ref(false)
  const error   = ref<string | null>(null)

  async function fetchFarmers() {
    loading.value = true
    error.value   = null
    try {
      const res     = await api.getFarmers()
      farmers.value = res.data
    } catch (e: unknown) {
      error.value = (e as any)?.response?.data?.message ?? '載入失敗'
    } finally {
      loading.value = false
    }
  }

  async function createFarmer(dto: Omit<Farmer, 'isDeleted'>): Promise<Farmer> {
    const res = await api.createFarmer(dto)
    farmers.value.push(res.data)
    return res.data
  }

  async function updateFarmer(id: string, dto: Partial<Farmer>): Promise<Farmer> {
    const res = await api.updateFarmer(id, dto)
    const idx = farmers.value.findIndex((f) => f.id === id)
    if (idx !== -1) farmers.value[idx] = res.data
    return res.data
  }

  async function softDeleteFarmer(id: string) {
    await api.deleteFarmer(id)
    farmers.value = farmers.value.filter((f) => f.id !== id)
  }

  async function hardDeleteFarmer(id: string) {
    await api.hardDeleteFarmer(id)
    farmers.value = farmers.value.filter((f) => f.id !== id)
  }

  async function fetchDeletedFarmers() {
    loading.value = true
    try {
      const res = await api.getDeletedFarmers()
      deletedFarmers.value = res.data
    } catch (e: unknown) {
      error.value = (e as any)?.response?.data?.message ?? '載入失敗'
    } finally {
      loading.value = false
    }
  }

  return { farmers, deletedFarmers, loading, error, fetchFarmers, createFarmer, updateFarmer, softDeleteFarmer, hardDeleteFarmer, fetchDeletedFarmers }
})
