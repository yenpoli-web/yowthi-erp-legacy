<template>
  <div class="inq-view">
    <div class="filter-card">
      <div class="filter-row">
        <DatePicker v-model="startDate" :label="t('startDate')" />
        <DatePicker v-model="endDate" :label="t('endDate')" />
      </div>

      <div class="filter-actions">
        <button class="btn-primary" :disabled="store.loading" @click="search">
          <i class="pi pi-search"></i> {{ t('search') }}
        </button>
        <button class="btn-secondary" @click="resetFilters">{{ t('clearFilters') }}</button>
        <button
          v-if="store.purchaseResult?.rows.length"
          class="btn-secondary"
          :disabled="exporting"
          @click="exportPdf"
        >
          <i class="pi pi-file-pdf"></i> {{ t('exportPdf') }}
        </button>
        <button
          v-if="store.purchaseResult?.rows.length"
          class="btn-secondary"
          :disabled="sharingPdf"
          @click="sharePdf"
        >
          <i class="pi pi-cloud-upload"></i> 分享PDF（雲端硬碟）
        </button>
        <button
          v-if="store.purchaseResult?.rows.length"
          class="btn-secondary"
          :disabled="exportingExcel"
          @click="exportExcel"
        >
          <i class="pi pi-file-excel"></i> 匯出 Excel
        </button>
      </div>
    </div>

    <div v-if="store.loading" class="loading-state"><div class="spinner"></div></div>

    <template v-else-if="store.purchaseResult">
      <div class="summary-card">
        <div class="summary-item">
          <span class="summary-label">{{ t('totalQuantity') }}</span>
          <span class="summary-value">{{ store.purchaseResult.summary.totalQuantity.toFixed(1) }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">{{ t('totalAmount') }}</span>
          <span class="summary-value accent">฿{{ store.purchaseResult.summary.totalAmount.toLocaleString() }}</span>
        </div>
      </div>

      <div v-if="store.purchaseResult.rows.length === 0" class="empty-state">{{ t('noResultData') }}</div>

      <div v-else class="result-table">
        <div class="row head">
          <span>{{ t('colDate') }}</span><span>{{ t('colPurchaseItem') }}</span><span>{{ t('colQty') }}</span><span>{{ t('colUnitPrice') }}</span><span>{{ t('colAmount') }}</span>
        </div>
        <div v-for="(r, i) in store.purchaseResult.rows" :key="i" class="row">
          <span>{{ formatDate(r.date) }}</span>
          <span>{{ r.itemName }}</span>
          <span>{{ r.quantity.toFixed(1) }}</span>
          <span>฿{{ r.unitPrice.toFixed(1) }}</span>
          <span class="accent">฿{{ r.amount.toLocaleString() }}</span>
        </div>
      </div>
    </template>

    <div v-else class="empty-state">{{ t('setFiltersFirst') }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useInquiryStore } from '../../../stores/inquiry'
import { useToastStore } from '../../../stores/toast'
import DatePicker from '../../../components/common/DatePicker.vue'
import { generatePdf, generatePdfBlob } from '../../../utils/pdfExport'
import { sharePdfBlob } from '../../../utils/shareExport'
import { generateExcel } from '../../../utils/excelExport'

const { t } = useI18n()
const store = useInquiryStore()
const toast = useToastStore()

const startDate = ref('')
const endDate = ref('')
const exporting = ref(false)
const sharingPdf = ref(false)
const exportingExcel = ref(false)

function formatDate(d: string) {
  if (!d) return ''
  const [y, m, day] = d.slice(0, 10).split('-')
  return `${parseInt(day)}/${parseInt(m)}/${y.slice(2)}`
}

function search() {
  store.searchPurchase({
    startDate: startDate.value || undefined,
    endDate: endDate.value || undefined,
  })
}

function resetFilters() {
  startDate.value = ''
  endDate.value = ''
  store.purchaseResult = null
}

function buildPdfOptions() {
  if (!store.purchaseResult) return null
  return {
    title: 'รายงานการจัดซื้อ',
    subtitle: `ช่วงวันที่ ${startDate.value || 'ไม่จำกัด'} ~ ${endDate.value || 'ไม่จำกัด'}`,
    columns: [
      { header: 'วันที่', key: 'date' },
      { header: 'รายการจัดซื้อ', key: 'itemName' },
      { header: 'จำนวน', key: 'quantity', align: 'right' as const },
      { header: 'ราคา/หน่วย', key: 'unitPrice', align: 'right' as const },
      { header: 'จำนวนเงิน', key: 'amount', align: 'right' as const },
    ],
    rows: store.purchaseResult.rows.map((r) => ({
      date: formatDate(r.date),
      itemName: r.itemName,
      quantity: r.quantity.toFixed(1),
      unitPrice: r.unitPrice.toFixed(1),
      amount: r.amount.toLocaleString(),
    })),
    summary: [
      { label: 'จำนวนรวม', value: store.purchaseResult.summary.totalQuantity.toFixed(1) },
      { label: 'ยอดเงินรวม', value: `฿${store.purchaseResult.summary.totalAmount.toLocaleString()}` },
    ],
    fileName: `purchase-inquiry_${new Date().toISOString().slice(0, 10)}.pdf`,
  }
}

async function exportPdf() {
  const opts = buildPdfOptions()
  if (!opts) return
  exporting.value = true
  try {
    await generatePdf(opts)
  } finally {
    exporting.value = false
  }
}

async function sharePdf() {
  const opts = buildPdfOptions()
  if (!opts) return
  sharingPdf.value = true
  try {
    const blob = await generatePdfBlob(opts)
    const result = await sharePdfBlob(blob, opts.fileName, '採購查詢')
    if (!result.shared) toast.showToast('裝置不支援分享，已改為下載 PDF', 'success')
  } catch (e: any) {
    if (e?.name !== 'AbortError') toast.showToast('分享失敗，請重試', 'danger')
  } finally {
    sharingPdf.value = false
  }
}

function exportExcel() {
  if (!store.purchaseResult) return
  exportingExcel.value = true
  try {
    generateExcel({
      columns: [
        { header: '日期', key: 'date' },
        { header: '採購項目', key: 'itemName' },
        { header: '數量', key: 'quantity' },
        { header: '單價', key: 'unitPrice' },
        { header: '金額', key: 'amount' },
      ],
      rows: store.purchaseResult.rows.map((r) => ({
        date: formatDate(r.date),
        itemName: r.itemName,
        quantity: r.quantity,
        unitPrice: r.unitPrice,
        amount: r.amount,
      })),
      sumKeys: ['quantity', 'amount'],
      fileName: `採購查詢_${new Date().toISOString().slice(0, 10)}.xlsx`,
    })
  } finally {
    exportingExcel.value = false
  }
}
</script>

<style scoped>
.inq-view { padding: 16px; display: flex; flex-direction: column; gap: 16px; }

.filter-card { background: var(--color-card); border: 1px solid var(--color-border); border-radius: 14px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.filter-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; }

.filter-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.btn-primary { background: var(--color-accent); color: #fff; border: none; border-radius: 10px; padding: 11px 22px; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-primary:disabled { opacity: 0.6; }
.btn-secondary { background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 10px; padding: 11px 22px; font-size: 14px; cursor: pointer; }

.summary-card { display: flex; gap: 16px; background: var(--color-card); border: 1px solid var(--color-border); border-radius: 14px; padding: 16px; flex-wrap: wrap; }
.summary-item { display: flex; flex-direction: column; gap: 4px; }
.summary-label { font-size: 12px; color: var(--color-text-muted); }
.summary-value { font-size: 18px; font-weight: 700; color: var(--color-text); }
.accent { color: var(--color-accent); }

.result-table { background: var(--color-card); border: 1px solid var(--color-border); border-radius: 14px; overflow: hidden; }
.row { display: grid; grid-template-columns: 0.8fr 1fr 0.7fr 0.8fr 0.9fr; gap: 8px; padding: 10px 14px; font-size: 13px; border-bottom: 1px solid var(--color-border); }
.row:last-child { border-bottom: none; }
.row.head { background: var(--color-surface); font-weight: 700; color: var(--color-text-muted); font-size: 12px; }

.loading-state { display: flex; justify-content: center; padding: 60px; }
.spinner { width: 32px; height: 32px; border: 3px solid var(--color-border); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-state { text-align: center; padding: 48px; color: var(--color-text-muted); font-size: 14px; }
</style>
