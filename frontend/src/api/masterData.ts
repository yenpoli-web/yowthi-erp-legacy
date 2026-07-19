import axios from 'axios'
import type {
  Farmer, Employee, Supplier, Carrier, Customer,
  ProcessingItem, SimpleItem,
} from '../types/master-data'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string | undefined) ?? '/api',
})

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Upload ───────────────────────────────────────────────────────
export const uploadImage = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return api.post<{ url: string }>('/upload', form)
}

// ── Farmers ──────────────────────────────────────────────────────
export const getFarmers      = ()                          => api.get<Farmer[]>('/master-data/farmers')
export const getFarmer       = (id: string)                => api.get<Farmer>(`/master-data/farmers/${id}`)
export const createFarmer    = (dto: Omit<Farmer, 'isDeleted'>) => api.post<Farmer>('/master-data/farmers', dto)
export const updateFarmer    = (id: string, dto: Partial<Farmer>) => api.patch<Farmer>(`/master-data/farmers/${id}`, dto)
export const deleteFarmer    = (id: string)                => api.delete(`/master-data/farmers/${id}`)
export const hardDeleteFarmer = (id: string)               => api.delete(`/master-data/farmers/${id}/hard`)
export const getDeletedFarmers = ()                        => api.get('/master-data/farmers/deleted')

// ── Employees ─────────────────────────────────────────────────────
export const getEmployees       = ()                                   => api.get<Employee[]>('/master-data/employees')
export const createEmployee     = (dto: Omit<Employee, 'isDeleted'>)   => api.post<Employee>('/master-data/employees', dto)
export const updateEmployee     = (id: string, dto: Partial<Employee>) => api.patch<Employee>(`/master-data/employees/${id}`, dto)
export const deleteEmployee     = (id: string)                         => api.delete(`/master-data/employees/${id}`)
export const hardDeleteEmployee = (id: string)                         => api.delete(`/master-data/employees/${id}/hard`)
export const getDeletedEmployees = ()                                  => api.get('/master-data/employees/deleted')

// ── Suppliers ─────────────────────────────────────────────────────
export const getSuppliers       = ()                                   => api.get<Supplier[]>('/master-data/suppliers')
export const createSupplier     = (dto: Omit<Supplier, 'isDeleted'>)   => api.post<Supplier>('/master-data/suppliers', dto)
export const updateSupplier     = (id: string, dto: Partial<Supplier>) => api.patch<Supplier>(`/master-data/suppliers/${id}`, dto)
export const deleteSupplier     = (id: string)                         => api.delete(`/master-data/suppliers/${id}`)
export const hardDeleteSupplier = (id: string)                         => api.delete(`/master-data/suppliers/${id}/hard`)
export const getDeletedSuppliers = ()                                  => api.get('/master-data/suppliers/deleted')

// ── Carriers ──────────────────────────────────────────────────────
export const getCarriers       = ()                                  => api.get<Carrier[]>('/master-data/carriers')
export const createCarrier     = (dto: Omit<Carrier, 'isDeleted'>)   => api.post<Carrier>('/master-data/carriers', dto)
export const updateCarrier     = (id: string, dto: Partial<Carrier>) => api.patch<Carrier>(`/master-data/carriers/${id}`, dto)
export const deleteCarrier     = (id: string)                        => api.delete(`/master-data/carriers/${id}`)
export const hardDeleteCarrier = (id: string)                        => api.delete(`/master-data/carriers/${id}/hard`)
export const getDeletedCarriers = ()                                 => api.get('/master-data/carriers/deleted')

// ── Customers ─────────────────────────────────────────────────────
export const getCustomers       = ()                                   => api.get<Customer[]>('/master-data/customers')
export const createCustomer     = (dto: Omit<Customer, 'isDeleted'>)   => api.post<Customer>('/master-data/customers', dto)
export const updateCustomer     = (id: string, dto: Partial<Customer>) => api.patch<Customer>(`/master-data/customers/${id}`, dto)
export const deleteCustomer     = (id: string)                         => api.delete(`/master-data/customers/${id}`)
export const hardDeleteCustomer = (id: string)                         => api.delete(`/master-data/customers/${id}/hard`)
export const getDeletedCustomers = ()                                  => api.get('/master-data/customers/deleted')

// ── Receiving Items ───────────────────────────────────────────────
export const getReceivingItems       = ()                                     => api.get<SimpleItem[]>('/master-data/receiving-items')
export const createReceivingItem     = (dto: Omit<SimpleItem, 'isDeleted'>)   => api.post<SimpleItem>('/master-data/receiving-items', dto)
export const updateReceivingItem     = (id: string, dto: Partial<SimpleItem>) => api.patch<SimpleItem>(`/master-data/receiving-items/${id}`, dto)
export const deleteReceivingItem     = (id: string)                           => api.delete(`/master-data/receiving-items/${id}`)
export const hardDeleteReceivingItem = (id: string)                           => api.delete(`/master-data/receiving-items/${id}/hard`)
export const getDeletedReceivingItems = ()                                    => api.get('/master-data/receiving-items/deleted')

// ── Processing Items ──────────────────────────────────────────────
export const getProcessingItems  = ()                                       => api.get<ProcessingItem[]>('/master-data/processing-items')
export const updateProcessingItem = (id: string, dto: Partial<ProcessingItem>) => api.patch<ProcessingItem>(`/master-data/processing-items/${id}`, dto)

// ── Packaging Items ───────────────────────────────────────────────
export const getPackagingItems       = ()                                     => api.get<SimpleItem[]>('/master-data/packaging-items')
export const createPackagingItem     = (dto: Omit<SimpleItem, 'isDeleted'>)   => api.post<SimpleItem>('/master-data/packaging-items', dto)
export const updatePackagingItem     = (id: string, dto: Partial<SimpleItem>) => api.patch<SimpleItem>(`/master-data/packaging-items/${id}`, dto)
export const deletePackagingItem     = (id: string)                           => api.delete(`/master-data/packaging-items/${id}`)
export const hardDeletePackagingItem = (id: string)                           => api.delete(`/master-data/packaging-items/${id}/hard`)
export const getDeletedPackagingItems = ()                                    => api.get('/master-data/packaging-items/deleted')

// ── Products ──────────────────────────────────────────────────────
export const getProducts       = ()                                     => api.get<SimpleItem[]>('/master-data/products')
export const createProduct     = (dto: Omit<SimpleItem, 'isDeleted'>)   => api.post<SimpleItem>('/master-data/products', dto)
export const updateProduct     = (id: string, dto: Partial<SimpleItem>) => api.patch<SimpleItem>(`/master-data/products/${id}`, dto)
export const deleteProduct     = (id: string)                           => api.delete(`/master-data/products/${id}`)
export const hardDeleteProduct = (id: string)                           => api.delete(`/master-data/products/${id}/hard`)
export const getDeletedProducts = ()                                    => api.get('/master-data/products/deleted')

// ── Purchase Items ────────────────────────────────────────────────
export const getPurchaseItems       = ()                                     => api.get<SimpleItem[]>('/master-data/purchase-items')
export const createPurchaseItem     = (dto: Omit<SimpleItem, 'isDeleted'>)   => api.post<SimpleItem>('/master-data/purchase-items', dto)
export const updatePurchaseItem     = (id: string, dto: Partial<SimpleItem>) => api.patch<SimpleItem>(`/master-data/purchase-items/${id}`, dto)
export const deletePurchaseItem     = (id: string)                           => api.delete(`/master-data/purchase-items/${id}`)
export const hardDeletePurchaseItem = (id: string)                           => api.delete(`/master-data/purchase-items/${id}/hard`)
export const getDeletedPurchaseItems = ()                                    => api.get('/master-data/purchase-items/deleted')
