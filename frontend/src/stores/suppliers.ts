import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Supplier } from '../types/master-data'
import * as api from '../api/masterData'

export const useSuppliersStore = defineStore('suppliers', () => {
  const suppliers = ref<Supplier[]>([])
  const deletedSuppliers = ref<Supplier[]>([])
  const loading   = ref(false)
  const error     = ref<string | null>(null)

  async function fetchSuppliers() {
    loading.value = true
    error.value   = null
    try {
      const res       = await api.getSuppliers()
      suppliers.value = res.data
    } catch (e: unknown) {
      error.value = (e as any)?.response?.data?.message ?? '載入失敗'
    } finally {
      loading.value = false
    }
  }

  async function createSupplier(dto: Omit<Supplier, 'isDeleted'>): Promise<Supplier> {
    const res = await api.createSupplier(dto)
    suppliers.value.push(res.data)
    return res.data
  }

  async function updateSupplier(id: string, dto: Partial<Supplier>): Promise<Supplier> {
    const res = await api.updateSupplier(id, dto)
    const idx = suppliers.value.findIndex((s) => s.id === id)
    if (idx !== -1) suppliers.value[idx] = res.data
    return res.data
  }

  async function softDeleteSupplier(id: string) {
    await api.deleteSupplier(id)
    suppliers.value = suppliers.value.filter((s) => s.id !== id)
  }

  async function hardDeleteSupplier(id: string) {
    await api.hardDeleteSupplier(id)
    suppliers.value = suppliers.value.filter((s) => s.id !== id)
  }

  async function fetchDeletedSuppliers() {
    loading.value = true
    try {
      const res = await api.getDeletedSuppliers()
      deletedSuppliers.value = res.data
    } catch (e: unknown) {
      error.value = (e as any)?.response?.data?.message ?? '載入失敗'
    } finally {
      loading.value = false
    }
  }

  return { suppliers, deletedSuppliers, loading, error, fetchSuppliers, createSupplier, updateSupplier, softDeleteSupplier, hardDeleteSupplier, fetchDeletedSuppliers }
})
