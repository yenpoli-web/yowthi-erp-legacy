import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

interface User {
  id: number
  username: string
  role: string
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(
    localStorage.getItem('token') ?? sessionStorage.getItem('token')
  )
  const user = ref<User | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  if (token.value) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
  }

  async function login(username: string, password: string) {
    isLoading.value = true
    error.value = null
    try {
      const res = await axios.post('/api/auth/login', { username, password })
      token.value = res.data.accessToken
      user.value = res.data.user
      if (res.data.user?.role === 'GUIDED') {
        localStorage.setItem('token', res.data.accessToken)
      } else {
        sessionStorage.setItem('token', res.data.accessToken)
      }
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.accessToken}`
    } catch (err: unknown) {
      error.value = (err as any)?.response?.data?.message ?? 'error'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    sessionStorage.removeItem('token')
    delete axios.defaults.headers.common['Authorization']
  }

  async function fetchMe() {
    try {
      const res = await axios.get('/api/auth/me')
      user.value = res.data
    } catch {
      logout()
    }
  }

  const role = computed(() => user.value?.role ?? null)

  return { token, user, role, isLoading, error, login, logout, fetchMe }
})
