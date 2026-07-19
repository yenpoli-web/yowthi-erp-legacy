import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getMonitoringOrders, getMonitoringOrder } from '../api/monitoring'
import type { MonitoringOrder, MonitoringQuery } from '../api/monitoring'

export const useMonitoringStore = defineStore('monitoring', () => {
  const orders = ref<MonitoringOrder[]>([])
  const currentOrder = ref<MonitoringOrder | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadOrders(query?: MonitoringQuery) {
    loading.value = true
    error.value = null
    try {
      orders.value = (await getMonitoringOrders(query)).data
    } catch (e: any) {
      error.value = e?.response?.data?.message || '監控資料載入失敗'
    } finally {
      loading.value = false
    }
  }

  async function loadOrder(orderId: string) {
    currentOrder.value = (await getMonitoringOrder(orderId)).data
  }

  return { orders, currentOrder, loading, error, loadOrders, loadOrder }
})
