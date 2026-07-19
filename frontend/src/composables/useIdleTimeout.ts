import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const IDLE_TIMEOUT = 30 * 60 * 1000
const WARNING_BEFORE = 60 * 1000

export function useIdleTimeout() {
  const router = useRouter()
  const authStore = useAuthStore()

  let timer: ReturnType<typeof setTimeout>
  let warningTimer: ReturnType<typeof setTimeout>

  function reset() {
    clearTimeout(timer)
    clearTimeout(warningTimer)
    warningTimer = setTimeout(() => {
      console.warn('Idle warning: auto-logout in 1 minute')
    }, IDLE_TIMEOUT - WARNING_BEFORE)
    timer = setTimeout(() => {
      authStore.logout()
      router.push('/login')
    }, IDLE_TIMEOUT)
  }

  const events = ['mousemove', 'keydown', 'touchstart'] as const

  onMounted(() => {
    events.forEach(e => window.addEventListener(e, reset))
    reset()
  })

  onUnmounted(() => {
    events.forEach(e => window.removeEventListener(e, reset))
    clearTimeout(timer)
    clearTimeout(warningTimer)
  })
}
