import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getInventoryOrders, getDeletedInventoryOrders, getInventoryOrder, getStockSummary } from '../api/inventory'

export const useInventoryStore = defineStore('inventory', () => {
  const orders = ref<any[]>([])
  const deletedOrders = ref<any[]>([])
  const currentOrder = ref<any>(null)
  const stockSummary = ref<any>(null)
  const loading = ref(false)

  async function loadOrders() {
    loading.value = true
    try { orders.value = (await getInventoryOrders()).data }
    finally { loading.value = false }
  }
  async function loadDeletedOrders() {
    deletedOrders.value = (await getDeletedInventoryOrders()).data
  }
  async function loadOrder(id: string) {
    currentOrder.value = (await getInventoryOrder(id)).data
  }
  async function loadStockSummary() {
    stockSummary.value = (await getStockSummary()).data
  }

  return { orders, deletedOrders, currentOrder, stockSummary, loading, loadOrders, loadDeletedOrders, loadOrder, loadStockSummary }
})
