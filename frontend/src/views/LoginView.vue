<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'

const { t, locale } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const errorMsg = ref('')

async function handleSubmit() {
  errorMsg.value = ''
  try {
    await authStore.login(username.value, password.value)
    const role = authStore.user?.role
    router.push(role === 'GUIDED' ? '/guided' : '/')
  } catch (err: unknown) {
    const status = (err as any)?.response?.status
    if (status === 401) {
      const msg: string = (err as any)?.response?.data?.message ?? ''
      errorMsg.value = msg.toLowerCase().includes('inactive')
        ? t('login.error.inactive')
        : t('login.error.invalid')
    } else if ((err as any)?.code === 'ECONNABORTED' || !(err as any)?.response) {
      errorMsg.value = t('login.error.timeout')
    } else {
      errorMsg.value = t('login.error.invalid')
    }
  }
}
</script>

<template>
  <div class="login-page">
    <div class="lang-bar">
      <button :class="{ active: locale === 'th' }" @click="locale = 'th'">ไทย</button>
      <button :class="{ active: locale === 'zh-TW' }" @click="locale = 'zh-TW'">繁中</button>
    </div>

    <div class="login-card">
      <div class="brand-area">
        <h1 class="brand-main">YOW THI</h1>
        <p class="brand-thai">โย่ว ถี อินเตอร์เนชั่นแนล</p>
        <p class="brand-en">YOW THI INTERNATIONAL CO., LTD.</p>
      </div>

      <h2 class="login-title">{{ t('login.title') }}</h2>

      <form @submit.prevent="handleSubmit">
        <div class="field">
          <label>{{ t('login.username') }}</label>
          <input v-model="username" type="text" autocomplete="username" required />
        </div>
        <div class="field">
          <label>{{ t('login.password') }}</label>
          <input v-model="password" type="password" autocomplete="current-password" required />
        </div>
        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
        <button type="submit" :disabled="authStore.isLoading" class="submit-btn">
          {{ t('login.submit') }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
  position: relative;
}

.lang-bar {
  position: absolute;
  top: 1.25rem;
  right: 1.5rem;
  display: flex;
  gap: 0.25rem;
}

.lang-bar button {
  padding: 0.3rem 0.75rem;
  background: transparent;
  border: 1px solid #2a2a4a;
  border-radius: 4px;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.lang-bar button.active {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.login-card {
  background: var(--color-card);
  padding: 2.5rem;
  border-radius: 12px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.brand-area {
  text-align: center;
  margin-bottom: 2rem;
}

.brand-main {
  color: var(--color-accent);
  font-size: 2.25rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  margin: 0 0 0.25rem;
}

.brand-thai {
  color: var(--color-text-muted);
  font-size: 0.875rem;
  margin: 0 0 0.2rem;
}

.brand-en {
  color: var(--color-text-muted);
  font-size: 0.75rem;
  letter-spacing: 0.03em;
  margin: 0;
}

.login-title {
  color: var(--color-text-muted);
  font-size: 1rem;
  font-weight: 400;
  margin: 0 0 1.5rem;
  text-align: center;
}

.field {
  margin-bottom: 1.25rem;
}

label {
  display: block;
  color: var(--color-text-muted);
  font-size: 0.875rem;
  margin-bottom: 0.4rem;
}

input {
  width: 100%;
  padding: 0.65rem 0.875rem;
  background: #0f3460;
  border: 1px solid #2a2a4a;
  border-radius: 6px;
  color: var(--color-text);
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
}

input:focus {
  border-color: var(--color-accent);
}

.error-msg {
  color: #ff6b6b;
  font-size: 0.875rem;
  margin: 0 0 1rem;
}

.submit-btn {
  width: 100%;
  padding: 0.75rem;
  background: var(--color-accent);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.submit-btn:hover:not(:disabled) {
  opacity: 0.9;
}
</style>
