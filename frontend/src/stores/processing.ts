import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as api from '../api/processing'

export const useProcessingStore = defineStore('processing', () => {
  const orders = ref<any[]>([])
  const deletedOrders = ref<any[]>([])
  const currentOrder = ref<any>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadOrders(params?: { itemId?: string; date?: string }) {
    loading.value = true
    error.value = null
    try {
      const res = await api.getProcessingOrders(params)
      orders.value = res.data
    } catch (e: any) {
      error.value = e?.response?.data?.message ?? '載入失敗'
    } finally {
      loading.value = false
    }
  }

  async function loadDeletedOrders() {
    loading.value = true
    try {
      const res = await api.getDeletedProcessingOrders()
      deletedOrders.value = res.data
    } catch (e: any) {
      error.value = e?.response?.data?.message ?? '載入失敗'
    } finally {
      loading.value = false
    }
  }

  async function loadOrder(id: string) {
    const res = await api.getProcessingOrder(id)
    currentOrder.value = res.data
    return res.data
  }

  async function findOrCreateOrder(data: any) {
    const res = await api.findOrCreateOrder(data)
    return res.data
  }

  async function removeOrder(id: string) {
    await api.softDeleteProcessingOrder(id)
    orders.value = orders.value.filter(o => o.id !== id)
  }

  return {
    orders, deletedOrders, currentOrder, loading, error,
    loadOrders, loadDeletedOrders, loadOrder, findOrCreateOrder, removeOrder,
  }
})
