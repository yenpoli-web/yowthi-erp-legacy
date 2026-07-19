import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getPackagingOrders, getDeletedPackagingOrders, getPackagingOrder } from '../api/packaging'

export const usePackagingStore = defineStore('packaging', () => {
  const orders = ref<any[]>([])
  const deletedOrders = ref<any[]>([])
  const currentOrder = ref<any>(null)
  const loading = ref(false)

  async function loadOrders() {
    loading.value = true
    try { orders.value = (await getPackagingOrders()).data }
    finally { loading.value = false }
  }

  async function loadDeletedOrders() {
    deletedOrders.value = (await getDeletedPackagingOrders()).data
  }

  async function loadOrder(id: string) {
    currentOrder.value = (await getPackagingOrder(id)).data
  }

  return { orders, deletedOrders, currentOrder, loading, loadOrders, loadDeletedOrders, loadOrder }
})
