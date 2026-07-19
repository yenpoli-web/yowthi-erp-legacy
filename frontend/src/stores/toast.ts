import { defineStore } from 'pinia'
import { ref } from 'vue'

type ToastType = 'success' | 'danger'

export const useToastStore = defineStore('toast', () => {
  const message = ref('')
  const type    = ref<ToastType>('success')
  const visible = ref(false)

  let timer: ReturnType<typeof setTimeout> | null = null

  function showToast(msg: string, toastType: ToastType = 'success', duration = 2200) {
    if (timer) clearTimeout(timer)
    message.value = msg
    type.value    = toastType
    visible.value = true
    timer = setTimeout(() => {
      visible.value = false
    }, duration)
  }

  return { message, type, visible, showToast }
})
