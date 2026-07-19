import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getSalesOrders, getDeletedSalesOrders, getSalesOrder,
} from '../api/sales'

export const useSalesStore = defineStore('sales', () => {
  const orders = ref<any[]>([])
  const deletedOrders = ref<any[]>([])
  const currentOrder = ref<any>(null)
  const loading = ref(false)

  async function loadOrders(params?: { customerId?: string; date?: string }) {
    loading.value = true
    try {
      const res = await getSalesOrders(params)
      orders.value = res.data
    } finally {
      loading.value = false
    }
  }

  async function loadDeletedOrders() {
    const res = await getDeletedSalesOrders()
    deletedOrders.value = res.data
  }

  async function loadOrder(id: string) {
    const res = await getSalesOrder(id)
    currentOrder.value = res.data
  }

  return { orders, deletedOrders, currentOrder, loading, loadOrders, loadDeletedOrders, loadOrder }
})
