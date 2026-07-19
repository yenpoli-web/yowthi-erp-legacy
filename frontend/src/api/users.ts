import axios from 'axios'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string | undefined) ?? '/api',
})

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export type Role = 'ADMIN' | 'OFFICE' | 'FACTORY' | 'GUIDED'

export interface User {
  id: number
  username: string
  role: Role
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export const getUsers = () => api.get<User[]>('/users')

export const createUser = (dto: { username: string; password: string; role: Role; isActive?: boolean }) =>
  api.post<User>('/users', dto)

export const updateUser = (id: number, dto: Partial<{ username: string; role: Role; isActive: boolean }>) =>
  api.patch<User>(`/users/${id}`, dto)

export const resetUserPassword = (id: number, newPassword: string) =>
  api.patch(`/users/${id}/reset-password`, { newPassword })

export const deleteUser = (id: number) =>
  api.delete(`/users/${id}`)
