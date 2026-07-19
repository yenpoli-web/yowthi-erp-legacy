import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getInventoryCostOrders,
  getInventoryCostOrder,
  lockInventoryCost,
  unlockInventoryCost,
} from '../api/inventoryCost'
import type { InventoryCostOrder, InventoryCostOrderDetail, InventoryCostQuery } from '../api/inventoryCost'

export const useInventoryCostStore = defineStore('inventoryCost', () => {
  const orders = ref<InventoryCostOrder[]>([])
  const currentOrder = ref<InventoryCostOrderDetail | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadOrders(query?: InventoryCostQuery) {
    loading.value = true
    error.value = null
    try {
      orders.value = (await getInventoryCostOrders(query)).data
    } catch (e: any) {
      error.value = e?.response?.data?.message || '資料載入失敗'
    } finally {
      loading.value = false
    }
  }

  async function loadOrder(orderId: string) {
    currentOrder.value = (await getInventoryCostOrder(orderId)).data
  }

  async function lock(orderId: string, estBasketQty: number, estBoxQty: number) {
    currentOrder.value = (await lockInventoryCost(orderId, estBasketQty, estBoxQty)).data
  }

  async function unlock(orderId: string) {
    currentOrder.value = (await unlockInventoryCost(orderId)).data
  }

  return { orders, currentOrder, loading, error, loadOrders, loadOrder, lock, unlock }
})
