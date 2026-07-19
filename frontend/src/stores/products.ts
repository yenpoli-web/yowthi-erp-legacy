import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SimpleItem } from '../types/master-data'
import * as api from '../api/masterData'

export const useProductsStore = defineStore('products', () => {
  const products = ref<SimpleItem[]>([])
  const deletedProducts = ref<SimpleItem[]>([])
  const loading  = ref(false)
  const error    = ref<string | null>(null)

  async function fetchProducts() {
    loading.value = true
    error.value   = null
    try {
      const res      = await api.getProducts()
      products.value = res.data
    } catch (e: unknown) {
      error.value = (e as any)?.response?.data?.message ?? '載入失敗'
    } finally {
      loading.value = false
    }
  }

  async function createProduct(dto: Omit<SimpleItem, 'isDeleted'>): Promise<SimpleItem> {
    const res = await api.createProduct(dto)
    products.value.push(res.data)
    return res.data
  }

  async function updateProduct(id: string, dto: Partial<SimpleItem>): Promise<SimpleItem> {
    const res = await api.updateProduct(id, dto)
    const idx = products.value.findIndex((p) => p.id === id)
    if (idx !== -1) products.value[idx] = res.data
    return res.data
  }

  async function softDeleteProduct(id: string) {
    await api.deleteProduct(id)
    products.value = products.value.filter((p) => p.id !== id)
  }

  async function hardDeleteProduct(id: string) {
    await api.hardDeleteProduct(id)
    products.value = products.value.filter((p) => p.id !== id)
  }

  async function fetchDeletedProducts() {
    loading.value = true
    try {
      const res = await api.getDeletedProducts()
      deletedProducts.value = res.data
    } catch (e: unknown) {
      error.value = (e as any)?.response?.data?.message ?? '載入失敗'
    } finally {
      loading.value = false
    }
  }

  return { products, deletedProducts, loading, error, fetchProducts, createProduct, updateProduct, softDeleteProduct, hardDeleteProduct, fetchDeletedProducts }
})
