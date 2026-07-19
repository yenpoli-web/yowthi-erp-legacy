import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getContractWorkOrders, getDeletedContractWorkOrders, getContractWorkOrder } from '../api/contractWork'

export const useContractWorkStore = defineStore('contractWork', () => {
  const orders = ref<any[]>([])
  const deletedOrders = ref<any[]>([])
  const currentOrder = ref<any>(null)
  const loading = ref(false)

  async function loadOrders() {
    loading.value = true
    try { orders.value = (await getContractWorkOrders()).data }
    finally { loading.value = false }
  }

  async function loadDeletedOrders() {
    deletedOrders.value = (await getDeletedContractWorkOrders()).data
  }

  async function loadOrder(id: string) {
    currentOrder.value = (await getContractWorkOrder(id)).data
  }

  return { orders, deletedOrders, currentOrder, loading, loadOrders, loadDeletedOrders, loadOrder }
})
