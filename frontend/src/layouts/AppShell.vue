<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useIdleTimeout } from '../composables/useIdleTimeout'
import NetworkOfflineOverlay from '../components/common/NetworkOfflineOverlay.vue'

defineProps<{
  title?: string
}>()

const router = useRouter()
const route = useRoute()
const { locale } = useI18n()
const authStore = useAuthStore()

useIdleTimeout()

const canGoBack = computed(() => !!window.history.state?.back)

function goBack() {
  router.back()
}

function toggleLocale() {
  locale.value = locale.value === 'th' ? 'zh-TW' : 'th'
  localStorage.setItem('app-locale', locale.value)
}

function logout() {
  localStorage.removeItem('app-locale')
  authStore.logout()
  router.push('/login')
}

const navItems = [
  { zh: '基本資料', th: 'ข้อมูลหลัก', icon: 'pi-database',  path: '/master-data' },
  { zh: '作業系統', th: 'ระบบงาน',    icon: 'pi-cog',       path: '/operations' },
  { zh: '資料查詢', th: 'ค้นหาข้อมูล', icon: 'pi-search',    path: '/queries' },
  { zh: '使用者管理', th: 'จัดการผู้ใช้', icon: 'pi-users', path: '/users', adminOnly: true },
]

const visibleNavItems = computed(() => navItems.filter((i: any) => !i.adminOnly || authStore.user?.role === 'ADMIN'))

function isActive(path: string) {
  return route.path === path || route.path.startsWith(path + '/')
}
</script>

<template>
  <NetworkOfflineOverlay />
  <div class="app-shell">
    <!-- Top Bar -->
    <header class="top-bar">
      <div class="top-bar-left">
        <button v-if="canGoBack" class="icon-btn back-btn" @click="goBack" aria-label="返回">
          <i class="pi pi-arrow-left"></i>
        </button>
      </div>

      <h1 class="page-title">{{ title ?? '' }}</h1>

      <div class="top-bar-right">
        <button class="lang-btn" @click="toggleLocale">
          {{ locale === 'th' ? 'TH' : '中' }}
        </button>
        <span class="username tablet-only">{{ authStore.user?.username }}</span>
        <button class="icon-btn logout-btn" @click="logout" aria-label="登出">
          <i class="pi pi-sign-out"></i>
        </button>
      </div>
    </header>

    <!-- Content Area -->
    <main class="content-area">
      <RouterView />
    </main>

    <!-- Bottom Nav -->
    <nav class="bottom-nav">
      <button
        v-for="item in visibleNavItems"
        :key="item.path"
        class="nav-item"
        :class="{ active: isActive(item.path) }"
        @click="router.push(item.path)"
      >
        <i class="pi" :class="item.icon"></i>
        <span>{{ locale === 'th' ? item.th : item.zh }}</span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
.app-shell {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
}

/* ── Top Bar ── */
.top-bar {
  flex-shrink: 0;
  height: 56px;
  background: var(--color-topbar);
  border-bottom: 1px solid var(--color-border);
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 0 8px;
}

.top-bar-left {
  display: flex;
  align-items: center;
}

.top-bar-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}

.page-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 8px;
}

.icon-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  border-radius: 8px;
  font-size: 16px;
  transition: color 0.15s, background 0.15s;
}

.icon-btn:hover {
  color: var(--color-text);
  background: var(--color-surface-hover);
}

.back-btn {
  color: var(--color-success);
}

.back-btn:hover {
  color: var(--color-success);
  background: rgba(45, 212, 191, 0.1);
}

.logout-btn {
  color: var(--color-danger);
}

.logout-btn:hover {
  color: var(--color-danger);
  background: rgba(248, 113, 113, 0.1);
}

.lang-btn {
  height: 30px;
  padding: 0 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
  transition: color 0.15s, border-color 0.15s;
}

.lang-btn:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.username {
  font-size: 13px;
  color: var(--color-text-muted);
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 4px;
}

.tablet-only {
  display: none;
}

@media (min-width: 768px) {
  .tablet-only {
    display: inline;
  }
}

/* ── Content Area ── */
.content-area {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

/* ── Bottom Nav ── */
.bottom-nav {
  flex-shrink: 0;
  height: 64px;
  background: var(--color-bottom-nav);
  border-top: 1px solid var(--color-border);
  display: flex;
}

@media (min-width: 768px) {
  .bottom-nav {
    height: 58px;
  }
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  background: transparent;
  border: none;
  color: var(--color-text-dim);
  font-size: 10px;
  font-weight: 500;
  position: relative;
  transition: color 0.15s, background 0.15s;
  letter-spacing: 0.2px;
}

.nav-item .pi {
  font-size: 19px;
}

.nav-item:hover {
  color: var(--color-text-muted);
}

.nav-item.active {
  color: var(--color-accent);
  background: var(--color-accent-glow);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--color-accent);
  border-radius: 0 0 2px 2px;
}
</style>
