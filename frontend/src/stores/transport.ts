import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getTransportOrders, getDeletedTransportOrders, getTransportOrder } from '../api/transport'

export const useTransportStore = defineStore('transport', () => {
  const orders = ref<any[]>([])
  const deletedOrders = ref<any[]>([])
  const currentOrder = ref<any>(null)
  const loading = ref(false)

  async function loadOrders() {
    loading.value = true
    try { orders.value = (await getTransportOrders()).data }
    finally { loading.value = false }
  }
  async function loadDeletedOrders() {
    deletedOrders.value = (await getDeletedTransportOrders()).data
  }
  async function loadOrder(id: string) {
    currentOrder.value = (await getTransportOrder(id)).data
  }

  return { orders, deletedOrders, currentOrder, loading, loadOrders, loadDeletedOrders, loadOrder }
})
