import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Customer } from '../types/master-data'
import * as api from '../api/masterData'

export const useCustomersStore = defineStore('customers', () => {
  const customers = ref<Customer[]>([])
  const deletedCustomers = ref<Customer[]>([])
  const loading   = ref(false)
  const error     = ref<string | null>(null)

  async function fetchCustomers() {
    loading.value = true
    error.value   = null
    try {
      const res       = await api.getCustomers()
      customers.value = res.data
    } catch (e: unknown) {
      error.value = (e as any)?.response?.data?.message ?? '載入失敗'
    } finally {
      loading.value = false
    }
  }

  async function createCustomer(dto: Omit<Customer, 'isDeleted'>): Promise<Customer> {
    const res = await api.createCustomer(dto)
    customers.value.push(res.data)
    return res.data
  }

  async function updateCustomer(id: string, dto: Partial<Customer>): Promise<Customer> {
    const res = await api.updateCustomer(id, dto)
    const idx = customers.value.findIndex((c) => c.id === id)
    if (idx !== -1) customers.value[idx] = res.data
    return res.data
  }

  async function softDeleteCustomer(id: string) {
    await api.deleteCustomer(id)
    customers.value = customers.value.filter((c) => c.id !== id)
  }

  async function hardDeleteCustomer(id: string) {
    await api.hardDeleteCustomer(id)
    customers.value = customers.value.filter((c) => c.id !== id)
  }

  async function fetchDeletedCustomers() {
    loading.value = true
    try {
      const res = await api.getDeletedCustomers()
      deletedCustomers.value = res.data
    } catch (e: unknown) {
      error.value = (e as any)?.response?.data?.message ?? '載入失敗'
    } finally {
      loading.value = false
    }
  }

  return { customers, deletedCustomers, loading, error, fetchCustomers, createCustomer, updateCustomer, softDeleteCustomer, hardDeleteCustomer, fetchDeletedCustomers }
})
