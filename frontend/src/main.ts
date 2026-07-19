import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import 'primeicons/primeicons.css'
import axios from 'axios'
import router from './router'
import i18n from './i18n'
import App from './App.vue'
import { useAuthStore } from './stores/auth'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      darkModeSelector: '.dark',
    },
  },
})

axios.defaults.timeout = 15000

axios.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      useAuthStore().logout()
      router.push('/login')
    }
    return Promise.reject(err)
  }
)

// PWA Service Worker 手動控制註冊時機：
// - registerType 改為 'prompt'，新版本不會自動接管（避免中斷使用中的使用者）
// - 延後到頁面完全載入並靜默 3 秒後才註冊/檢查更新，避免剛開啟 App 馬上登入時剛好被資源下載拖慢網路
// - 有新版本時不強制 reload，留在背景待命，下次關掉完全重開 App 時自然生效
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    setTimeout(() => {
      import('virtual:pwa-register').then(({ registerSW }) => {
        registerSW({ immediate: false })
      }).catch(() => {})
    }, 3000)
  })
}

app.mount('#app')
