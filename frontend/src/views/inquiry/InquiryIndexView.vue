<template>
  <div class="index-wrap">
    <div class="module-grid">
      <button
        v-for="m in modules"
        :key="m.path"
        class="module-card"
        @click="router.push(m.path)"
      >
        <svg class="module-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
          <g v-html="m.icon"></g>
        </svg>
        <span class="module-names">
          <span class="module-primary">{{ locale === 'th' ? m.th : m.zh }}</span>
          <span class="module-secondary">{{ locale === 'th' ? m.zh : m.th }}</span>
        </span>
        <i class="pi pi-chevron-right module-arrow"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { locale } = useI18n()

const modules = [
  {
    zh: '進貨查詢', th: 'ค้นหาข้อมูลรับสินค้า',
    path: '/queries/receiving',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"/>`,
  },
  {
    zh: '進貨量查詢', th: 'ตรวจสอบปริมาณการรับ',
    path: '/queries/receiving-volume',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>`,
  },
  {
    zh: '員工薪資查詢', th: 'ตรวจสอบค่าจ้างพนักงาน',
    path: '/queries/processing-wage',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 11-12 0 6 6 0 0112 0zM12 7.5v3.75m0 0H9.75m2.25 0h2.25M2.25 19.5h19.5"/>`,
  },
  {
    zh: '員工薪資總表', th: 'สรุปค่าจ้างพนักงาน',
    path: '/queries/employee-wage-summary',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 3.75h6M6.75 5.25h10.5A2.25 2.25 0 0119.5 7.5v9a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 16.5v-9a2.25 2.25 0 012.25-2.25z"/>`,
  },
  {
    zh: '農民加工查詢', th: 'ตรวจสอบการแปรรูปเกษตรกร',
    path: '/queries/farmer-processing',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>`,
  },
  {
    zh: 'H02 完成品加工查詢', th: 'ตรวจสอบการแปรรูป H02',
    path: '/queries/h02-processing',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>`,
  },
  {
    zh: 'H03 完成品加工查詢', th: 'ตรวจสอบการแปรรูป H03',
    path: '/queries/h03-processing',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>`,
  },
  {
    zh: '包裝查詢', th: 'ตรวจสอบการบรรจุภัณฑ์',
    path: '/queries/packaging',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"/>`,
  },
  {
    zh: '代工查詢', th: 'ตรวจสอบการจ้างผลิตภายนอก',
    path: '/queries/contract-work',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75a4.5 4.5 0 01-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.49a2.25 2.25 0 11-3.214-3.214l8.49-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 016.336-4.486l-3.276 3.276a3.004 3.004 0 002.25 2.25l3.276-3.276c.256.565.41 1.193.41 1.857v.001z"/>`,
  },
  {
    zh: '運輸查詢', th: 'ตรวจสอบการขนส่ง',
    path: '/queries/transport',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 10-3 0m3 0h13.5m-13.5 0a1.5 1.5 0 01-3 0m16.5 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 10-3 0m-9.75 0h9.75M3.75 6.75h10.5v9.75M3.75 6.75v9.75m0-9.75h-.375a.375.375 0 00-.375.375v8.625a.75.75 0 00.75.75h.375m13.5-9.75h2.25l2.25 4.5v4.5h-4.5m-13.5 0h13.5"/>`,
  },
  {
    zh: '採購查詢', th: 'ตรวจสอบการจัดซื้อ',
    path: '/queries/purchase',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 1.94-4.726 2.43-7.235.094-.475-.291-.915-.776-.915H5.106M7.5 14.25L5.106 5.272M6 18.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"/>`,
  },
  {
    zh: '銷售查詢', th: 'ตรวจสอบการขาย',
    path: '/queries/sales',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m13.5-3.75h-3v4.5h3v-4.5zm-1.5-9.75v-1.5a3 3 0 013-3v0a3 3 0 013 3v1.5"/>`,
  },
  {
    zh: '成本分析', th: 'การวิเคราะห์ต้นทุน',
    path: '/queries/cost-analysis',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182.553-.44 1.278-.659 2.003-.659.725 0 1.45.22 2.003.659l.181.122M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>`,
  },
  {
    zh: '異常關聯總覽', th: 'สรุปความผิดปกติของการเชื่อมต่อ',
    path: '/queries/anomalies',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>`,
  },
]
</script>

<style scoped>
.index-wrap { padding: 16px; }
.module-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.module-card {
  display: flex; align-items: center; gap: 14px;
  padding: 16px; background: var(--color-card);
  border: 1px solid var(--color-border); border-radius: 12px;
  cursor: pointer; transition: all 0.18s; width: 100%;
}
.module-card:hover { border-color: var(--color-accent); background: var(--color-card-hover); }
.module-icon { width: 28px; height: 28px; flex-shrink: 0; color: var(--color-accent); }
.module-names { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; text-align: left; }
.module-primary { font-size: 15px; font-weight: 700; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.module-secondary { font-size: 12px; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.module-arrow { color: var(--color-text-dim); flex-shrink: 0; }
</style>
