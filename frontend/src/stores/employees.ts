import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Employee } from '../types/master-data'
import * as api from '../api/masterData'

export const useEmployeesStore = defineStore('employees', () => {
  const employees = ref<Employee[]>([])
  const deletedEmployees = ref<Employee[]>([])
  const loading   = ref(false)
  const error     = ref<string | null>(null)

  async function fetchEmployees() {
    loading.value = true
    error.value   = null
    try {
      const res       = await api.getEmployees()
      employees.value = res.data
    } catch (e: unknown) {
      error.value = (e as any)?.response?.data?.message ?? '載入失敗'
    } finally {
      loading.value = false
    }
  }

  async function createEmployee(dto: Omit<Employee, 'isDeleted'>): Promise<Employee> {
    const res = await api.createEmployee(dto)
    employees.value.push(res.data)
    return res.data
  }

  async function updateEmployee(id: string, dto: Partial<Employee>): Promise<Employee> {
    const res = await api.updateEmployee(id, dto)
    const idx = employees.value.findIndex((e) => e.id === id)
    if (idx !== -1) employees.value[idx] = res.data
    return res.data
  }

  async function softDeleteEmployee(id: string) {
    await api.deleteEmployee(id)
    employees.value = employees.value.filter((e) => e.id !== id)
  }

  async function hardDeleteEmployee(id: string) {
    await api.hardDeleteEmployee(id)
    employees.value = employees.value.filter((e) => e.id !== id)
  }

  async function fetchDeletedEmployees() {
    loading.value = true
    try {
      const res = await api.getDeletedEmployees()
      deletedEmployees.value = res.data
    } catch (e: unknown) {
      error.value = (e as any)?.response?.data?.message ?? '載入失敗'
    } finally {
      loading.value = false
    }
  }

  return { employees, deletedEmployees, loading, error, fetchEmployees, createEmployee, updateEmployee, softDeleteEmployee, hardDeleteEmployee, fetchDeletedEmployees }
})
