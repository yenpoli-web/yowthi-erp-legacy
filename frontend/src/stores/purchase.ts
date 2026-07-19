import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getPurchaseOrders, getDeletedPurchaseOrders, getPurchaseOrder } from '../api/purchase'

export const usePurchaseStore = defineStore('purchase', () => {
  const orders = ref<any[]>([])
  const deletedOrders = ref<any[]>([])
  const currentOrder = ref<any>(null)
  const loading = ref(false)

  async function loadOrders() {
    loading.value = true
    try { orders.value = (await getPurchaseOrders()).data }
    finally { loading.value = false }
  }
  async function loadDeletedOrders() {
    deletedOrders.value = (await getDeletedPurchaseOrders()).data
  }
  async function loadOrder(id: string) {
    currentOrder.value = (await getPurchaseOrder(id)).data
  }

  return { orders, deletedOrders, currentOrder, loading, loadOrders, loadDeletedOrders, loadOrder }
})
