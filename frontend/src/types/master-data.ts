export interface Farmer {
  id: string
  name: string
  phone?: string
  address?: string
  bankName?: string
  bankAccount?: string
  imageUrl?: string
  isDeleted?: boolean
}

export interface Employee {
  id: string
  name: string
  phone?: string
  address?: string
  bankName?: string
  bankAccount?: string
  imageUrl?: string
  isDeleted?: boolean
}

export interface Supplier {
  id: string
  name: string
  phone?: string
  address?: string
  bankName?: string
  bankAccount?: string
  imageUrl?: string
  isDeleted?: boolean
}

export interface Carrier {
  id: string
  name: string
  phone?: string
  address?: string
  bankName?: string
  bankAccount?: string
  imageUrl?: string
  isDeleted?: boolean
}

export interface Customer {
  id: string
  name: string
  phone?: string
  address?: string
  imageUrl?: string
  isDeleted?: boolean
}

export interface SimpleItem {
  id: string
  name: string
  imageUrl?: string
  isDeleted?: boolean
}

export interface ProcessingItem {
  id: string
  type: string
  name: string
  imageUrl?: string
}

export type ReceivingItem = SimpleItem
export type PackagingApplicableTo = 'RECEIVING_ORDER' | 'SALES_ORDER'
export interface PackagingItem extends SimpleItem {
  wageRate?: number | null
  applicableTo?: PackagingApplicableTo
}
export type PurchaseItem  = SimpleItem

export interface Product {
  id: string
  name: string
  imageUrl?: string
  unitWeight?: number | null
  isDeleted?: boolean
}
