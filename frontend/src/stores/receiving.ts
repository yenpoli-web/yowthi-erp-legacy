import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as api from '../api/receiving'

export const useReceivingStore = defineStore('receiving', () => {
  const orders = ref<any[]>([])
  const currentOrder = ref<any>(null)
  const loading = ref(false)
  const deletedOrders = ref<any[]>([])
  const error = ref<string | null>(null)

  async function loadOrders(params?: { itemId?: string; date?: string }) {
    loading.value = true
    error.value = null
    try {
      orders.value = await api.fetchOrders(params)
    } catch (e: any) {
      error.value = e?.message || '載入失敗'
    } finally {
      loading.value = false
    }
  }

  async function loadOrder(id: string) {
    loading.value = true
    error.value = null
    try {
      currentOrder.value = await api.fetchOrder(id)
    } catch (e: any) {
      error.value = e?.message || '載入失敗'
    } finally {
      loading.value = false
    }
  }

  async function addOrder(data: { orderDate: string; receivingItemId: string }) {
    const result = await api.createOrder(data)
    orders.value.unshift(result)
    return result
  }

  async function patchOrder(id: string, data: { h02Done?: boolean; h03Done?: boolean }) {
    const result = await api.updateOrder(id, data)
    const idx = orders.value.findIndex(o => o.id === id)
    if (idx !== -1) orders.value[idx] = { ...orders.value[idx], ...result }
    if (currentOrder.value?.id === id) currentOrder.value = { ...currentOrder.value, ...result }
    return result
  }

  async function removeOrder(id: string) {
    await api.softDeleteOrder(id)
    orders.value = orders.value.filter(o => o.id !== id)
    if (currentOrder.value?.id === id) currentOrder.value = null
  }

  async function loadDeletedOrders() {
    loading.value = true
    error.value = null
    try {
      deletedOrders.value = await api.fetchDeletedOrders()
    } catch (e: any) {
      error.value = e?.message || '載入失敗'
    } finally {
      loading.value = false
    }
  }

  async function addBatch(data: { orderId: string; farmerId: string }) {
    const result = await api.createBatch(data)
    if (currentOrder.value?.id === data.orderId) {
      currentOrder.value.batches = [...(currentOrder.value.batches || []), result]
    }
    return result
  }

  async function patchBatch(id: string, data: { processingDone?: boolean; salesConfirmed?: boolean }) {
    const result = await api.updateBatch(id, data)
    if (currentOrder.value) {
      const idx = currentOrder.value.batches?.findIndex((b: any) => b.id === id)
      if (idx !== -1 && idx !== undefined) {
        currentOrder.value.batches[idx] = { ...currentOrder.value.batches[idx], ...result }
      }
    }
    return result
  }

  async function removeBatch(id: string) {
    await api.softDeleteBatch(id)
    if (currentOrder.value) {
      currentOrder.value.batches = currentOrder.value.batches?.filter((b: any) => b.id !== id)
    }
  }

  async function addDetail(data: {
    batchId: string; itemId: string; farmerId: string
    quantity: number; unitPrice: number
  }) {
    const result = await api.createDetail(data)
    if (currentOrder.value) {
      const batch = currentOrder.value.batches?.find((b: any) => b.id === data.batchId)
      if (batch) batch.details = [...(batch.details || []), result]
    }
    return result
  }

  async function patchDetail(id: number, data: { quantity?: number; unitPrice?: number }) {
    const result = await api.updateDetail(id, data)
    if (currentOrder.value) {
      for (const batch of currentOrder.value.batches || []) {
        const idx = batch.details?.findIndex((d: any) => d.id === id)
        if (idx !== -1 && idx !== undefined) {
          batch.details[idx] = { ...batch.details[idx], ...result }
          break
        }
      }
    }
    return result
  }

  async function removeDetail(id: number) {
    await api.softDeleteDetail(id)
    if (currentOrder.value) {
      for (const batch of currentOrder.value.batches || []) {
        batch.details = batch.details?.filter((d: any) => d.id !== id)
      }
    }
  }

  return {
    orders, currentOrder, loading, error,
    loadOrders, loadOrder, addOrder, patchOrder, removeOrder,
    addBatch, patchBatch, removeBatch,
    addDetail, patchDetail, removeDetail,
    deletedOrders, loadDeletedOrders,
  }
})
