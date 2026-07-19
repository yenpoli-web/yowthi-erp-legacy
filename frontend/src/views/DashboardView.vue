<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const { locale } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const modules = [
  { zh: '基本資料', th: 'ข้อมูลหลัก', icon: 'pi-database',  color: '#e8820c', path: '/master-data' },
  { zh: '作業系統', th: 'ระบบงาน',    icon: 'pi-cog',       color: '#2dd4bf', path: '/operations' },
  { zh: '資料查詢', th: 'ค้นหาข้อมูล', icon: 'pi-search',    color: '#818cf8', path: '/queries' },
  { zh: '使用者管理', th: 'จัดการผู้ใช้',  icon: 'pi-users', color: '#f472b6', path: '/users', adminOnly: true },
]

const visibleModules = computed(() => modules.filter((m: any) => !m.adminOnly || authStore.user?.role === 'ADMIN'))
</script>

<template>
  <div class="home-wrap">

      <!-- Welcome card -->
      <div class="welcome-card">
        <div class="brand-block">
          <span class="brand-main">YOW THI</span>
          <span class="brand-sub">โย่ว ถี อินเตอร์เนชั่นแนล</span>
        </div>
        <p class="welcome-text">
          {{ locale === 'th' ? 'ยินดีต้อนรับ' : '歡迎使用' }}，
          <strong class="username-highlight">{{ authStore.user?.username }}</strong>
        </p>
        <span class="role-badge">{{ authStore.user?.role }}</span>
      </div>

      <!-- Quick-launch grid -->
      <p class="section-label">
        {{ locale === 'th' ? 'เมนูหลัก' : '快速入口' }}
      </p>
      <div class="quick-grid">
        <button
          v-for="mod in visibleModules"
          :key="mod.path"
          class="quick-card"
          @click="router.push(mod.path)"
        >
          <span class="quick-icon" :style="{ background: mod.color }">
            <i class="pi" :class="mod.icon"></i>
          </span>
          <span class="quick-label">{{ locale === 'th' ? mod.th : mod.zh }}</span>
          <i class="pi pi-chevron-right quick-arrow"></i>
        </button>
      </div>

    </div>
</template>

<style scoped>
.home-wrap {
  padding: 16px;
  max-width: 640px;
  margin: 0 auto;
}

/* ── Welcome card ── */
.welcome-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.brand-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-main {
  font-size: 20px;
  font-weight: 800;
  color: var(--color-accent);
  letter-spacing: 0.06em;
}

.brand-sub {
  font-size: 11px;
  color: var(--color-text-muted);
}

.welcome-text {
  font-size: 15px;
  color: var(--color-text-muted);
}

.username-highlight {
  color: var(--color-text);
  font-weight: 700;
}

.role-badge {
  display: inline-block;
  background: var(--color-accent);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 20px;
  letter-spacing: 0.5px;
  align-self: flex-start;
}

/* ── Quick grid ── */
.section-label {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.quick-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quick-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  color: var(--color-text);
  text-align: left;
  width: 100%;
  transition: background 0.15s, border-color 0.15s;
}

.quick-card:hover {
  background: var(--color-card-hover);
  border-color: var(--color-text-dim);
}

.quick-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.quick-icon .pi {
  font-size: 18px;
  color: #fff;
}

.quick-label {
  flex: 1;
  font-size: 15px;
  font-weight: 500;
}

.quick-arrow {
  color: var(--color-text-dim);
  font-size: 13px;
}
</style>
