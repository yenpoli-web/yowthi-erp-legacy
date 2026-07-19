<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { locale } = useI18n()

const COLORS = ['#2dd4bf', '#818cf8', '#f472b6', '#34d399', '#60a5fa', '#e8820c', '#facc15']

const modules = [
  {
    zh: '進貨管理', th: 'รับสินค้า',
    path: '/receiving',
    icon: `<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>`,
  },
  {
    zh: '加工管理', th: 'การแปรรูป',
    path: '/processing',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"/>`,
  },
  {
    zh: '成品入庫', th: 'สินค้าเข้าคลัง',
    path: '/inventory',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"/>`,
  },
  {
    zh: '銷售管理', th: 'การขาย',
    path: '/sales',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"/>`,
  },
  {
    zh: '代工管理', th: 'งานจ้างผลิต',
    path: '/contract-work',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z"/>`,
  },
  {
    zh: '包裝管理', th: 'การบรรจุหีบห่อ',
    path: '/packaging',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"/>`,
  },
  {
    zh: '運輸管理', th: 'การขนส่ง',
    path: '/transport',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"/>`,
  },
  {
    zh: '採購管理', th: 'การจัดซื้อ',
    path: '/purchase',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>`,
  },
  {
    zh: '進貨加工監控', th: 'ตรวจสอบการรับ-แปรรูป',
    path: '/monitoring',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>`,
  },
  {
    zh: '庫存成本分析', th: 'วิเคราะห์ต้นทุนสินค้าคงเหลือ',
    path: '/inventory-cost',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>`,
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
          width="42" height="42" viewBox="0 0 24 24"
          fill="none" :stroke="COLORS[i % 7]"
          stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
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
.index-wrap { padding: 16px; }
.module-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.module-card {
  display: flex; align-items: center; gap: 14px;
  padding: 16px; background: var(--color-card);
  border: 1px solid var(--color-border); border-radius: 12px;
  color: var(--color-text); text-align: left;
  transition: background 0.15s, border-color 0.15s, transform 0.1s; width: 100%;
}
.module-card:hover { background: var(--color-card-hover); border-color: var(--color-text-dim); }
.module-card:active { transform: scale(0.98); }
.module-icon { flex-shrink: 0; }
.module-names { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.module-primary { font-size: 16px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.module-secondary { font-size: 13px; font-weight: 400; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.module-arrow { color: var(--color-text-dim); font-size: 13px; flex-shrink: 0; }
</style>
