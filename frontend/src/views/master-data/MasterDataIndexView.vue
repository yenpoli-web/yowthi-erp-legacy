<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { locale } = useI18n()

const COLORS = ['#e8820c', '#2dd4bf', '#818cf8', '#f472b6', '#34d399', '#60a5fa']

const modules = [
  {
    zh: '農民名冊', th: 'เกษตรกร',
    path: '/master-data/farmers',
    icon: `<circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>`,
  },
  {
    zh: '員工名冊', th: 'พนักงาน',
    path: '/master-data/employees',
    icon: `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
  },
  {
    zh: '廠商名冊', th: 'ซัพพลายเออร์',
    path: '/master-data/suppliers',
    icon: `<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>`,
  },
  {
    zh: '貨運名冊', th: 'ขนส่ง',
    path: '/master-data/carriers',
    icon: `<path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/><rect x="9" y="11" width="14" height="10" rx="2"/><circle cx="12" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>`,
  },
  {
    zh: '客戶名冊', th: 'ลูกค้า',
    path: '/master-data/customers',
    icon: `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>`,
  },
  {
    zh: '進貨品項', th: 'รับสินค้า',
    path: '/master-data/receiving-items',
    icon: `<rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>`,
  },
  {
    zh: '加工項目', th: 'แปรรูป',
    path: '/master-data/processing-items',
    icon: `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>`,
  },
  {
    zh: '包裝項目', th: 'บรรจุ',
    path: '/master-data/packaging-items',
    icon: `<line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>`,
  },
  {
    zh: '商品管理', th: 'สินค้า',
    path: '/master-data/products',
    icon: `<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>`,
  },
  {
    zh: '採購項目', th: 'จัดซื้อ',
    path: '/master-data/purchase-items',
    icon: `<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>`,
  },
]
</script>

<template>
  <div class="index-wrap">
    <div class="module-grid">
      <button
        v-for="(mod, i) in modules"
        :key="mod.path"
        class="module-card"
        @click="router.push(mod.path)"
      >
        <svg
          class="module-icon"
          width="42"
          height="42"
          viewBox="0 0 24 24"
          fill="none"
          :stroke="COLORS[i % 6]"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          v-html="mod.icon"
        />
        <div class="module-names">
          <span class="module-primary">{{ locale === 'th' ? mod.th : mod.zh }}</span>
          <span class="module-secondary">{{ locale === 'th' ? mod.zh : mod.th }}</span>
        </div>
        <i class="pi pi-chevron-right module-arrow"></i>
      </button>
    </div>
  </div>
</template>

<style scoped>
.index-wrap {
  padding: 16px;
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.module-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  color: var(--color-text);
  text-align: left;
  transition: background 0.15s, border-color 0.15s, transform 0.1s;
  width: 100%;
}

.module-card:hover {
  background: var(--color-card-hover);
  border-color: var(--color-text-dim);
}

.module-card:active {
  transform: scale(0.98);
}

.module-icon {
  flex-shrink: 0;
}

.module-names {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.module-primary {
  font-size: 16px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.module-secondary {
  font-size: 13px;
  font-weight: 400;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.module-arrow {
  color: var(--color-text-dim);
  font-size: 13px;
  flex-shrink: 0;
}
</style>
