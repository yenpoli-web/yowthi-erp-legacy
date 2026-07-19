<template>
  <div class="inq-view">
    <div class="filter-card">
      <div class="filter-row">
        <DatePicker v-model="startDate" :label="t('startDate')" />
        <DatePicker v-model="endDate" :label="t('endDate')" />
      </div>

      <div class="filter-row">
        <div class="field">
          <label class="field-label">{{ t('receivingItem') }}</label>
          <button class="select-btn" @click="itemModalOpen = true">
            {{ selectedItemName || t('allItems') }}
          </button>
        </div>
      </div>

      <div class="filter-actions">
        <button class="btn-primary" :disabled="store.loading" @click="search">
          <i class="pi pi-search"></i> {{ t('search') }}
        </button>
        <button class="btn-secondary" @click="resetFilters">{{ t('clearFilters') }}</button>
        <button
          v-if="store.h02ProcessingResult?.rows.length"
          class="btn-secondary"
          :disabled="exporting"
          @click="exportPdf"
        >
          <i class="pi pi-file-pdf"></i> {{ t('exportPdf') }}
        </button>
        <button
          v-if="store.h02ProcessingResult?.rows.length"
          class="btn-secondary"
          :disabled="sharingPdf"
          @click="sharePdf"
        >
          <i class="pi pi-cloud-upload"></i> 分享PDF（雲端硬碟）
        </button>
      </div>
    </div>

    <div v-if="store.loading" class="loading-state"><div class="spinner"></div></div>

    <template v-else-if="store.h02ProcessingResult">
      <div class="summary-card">
        <div class="summary-item">
          <span class="summary-label">{{ t('colH01Output') }}</span>
          <span class="summary-value">{{ store.h02ProcessingResult.summary.totalH01Output.toFixed(1) }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">{{ t('colH02Output') }}</span>
          <span class="summary-value">{{ store.h02ProcessingResult.summary.totalH02Output.toFixed(1) }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">{{ t('totalAmount') }}</span>
          <span class="summary-value accent">฿{{ store.h02ProcessingResult.summary.totalAmount.toLocaleString() }}</span>
        </div>
      </div>

      <div v-if="store.h02ProcessingResult.rows.length === 0" class="empty-state">{{ t('noResultData') }}</div>

      <div v-else class="result-table">
        <div class="row head">
          <span>{{ t('colDate') }}</span><span>{{ t('totalQty') }}</span><span>{{ t('colItem') }}</span><span>{{ t('colH01Output') }}</span><span>{{ t('colH02Output') }}</span><span>H01 {{ t('completionRate') }}</span><span>H02 {{ t('completionRate') }}</span><span>{{ t('colAmount') }}</span>
        </div>
        <div v-for="(r, i) in store.h02ProcessingResult.rows" :key="i" class="row">
          <span>{{ formatDate(r.date) }}</span>
          <span>{{ r.inputQty.toFixed(1) }}</span>
          <span>{{ r.receivingItemName }}</span>
          <span>{{ r.h01Output.toFixed(1) }}</span>
          <span>{{ r.h02Output.toFixed(1) }}</span>
          <span>{{ r.h01CompletionRate !== null ? r.h01CompletionRate.toFixed(1) + '%' : '—' }}</span>
          <span>{{ r.h02CompletionRate !== null ? r.h02CompletionRate.toFixed(1) + '%' : '—' }}</span>
          <span class="accent">฿{{ r.amount.toLocaleString() }}</span>
        </div>
      </div>
    </template>

    <div v-else class="empty-state">{{ t('setFiltersFirst') }}</div>

    <TouchSelectorModal
      v-if="itemModalOpen"
      :title="t('selectReceivingItemTitle')"
      :items="receivingItemsStore.receivingItems"
      :model-value="selectedItemId"
      @select="(item) => (selectedItemId = item.id)"
      @close="itemModalOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useInquiryStore } from '../../../stores/inquiry'
import { useReceivingItemsStore } from '../../../stores/receiving-items'
import { useToastStore } from '../../../stores/toast'
import DatePicker from '../../../components/common/DatePicker.vue'
import TouchSelectorModal from '../../../components/common/TouchSelectorModal.vue'
import { generatePdf, generatePdfBlob } from '../../../utils/pdfExport'
import { sharePdfBlob } from '../../../utils/shareExport'

const { t } = useI18n()
const store = useInquiryStore()
const receivingItemsStore = useReceivingItemsStore()
const toast = useToastStore()

const startDate = ref('')
const endDate = ref('')
const selectedItemId = ref('')
const itemModalOpen = ref(false)
const exporting = ref(false)
const sharingPdf = ref(false)

const selectedItemName = computed(
  () => receivingItemsStore.receivingItems.find((i) => i.id === selectedItemId.value)?.name || '',
)

function formatDate(d: string) {
  if (!d) return ''
  const [y, m, day] = d.slice(0, 10).split('-')
  return `${parseInt(day)}/${parseInt(m)}/${y.slice(2)}`
}

function search() {
  store.searchH02Processing({
    startDate: startDate.value || undefined,
    endDate: endDate.value || undefined,
    receivingItemId: selectedItemId.value || undefined,
  })
}

function resetFilters() {
  startDate.value = ''
  endDate.value = ''
  selectedItemId.value = ''
  store.h02ProcessingResult = null
}

function buildPdfOptions() {
  if (!store.h02ProcessingResult) return null
  return {
    title: 'รายงานการแปรรูป H02',
    subtitle: `ช่วงวันที่ ${startDate.value || 'ไม่จำกัด'} ~ ${endDate.value || 'ไม่จำกัด'}`,
    columns: [
      { header: 'วันที่', key: 'date' },
      { header: 'ปริมาณการรับ', key: 'inputQty', align: 'right' as const },
      { header: 'สินค้า', key: 'itemName' },
      { header: 'สำเร็จ (H01)', key: 'h01Output', align: 'right' as const },
      { header: 'สำเร็จ (H02)', key: 'h02Output', align: 'right' as const },
      { header: '% H01', key: 'h01Rate', align: 'right' as const },
      { header: '% H02', key: 'h02Rate', align: 'right' as const },
      { header: 'จำนวนเงิน', key: 'amount', align: 'right' as const },
    ],
    rows: store.h02ProcessingResult.rows.map((r) => ({
      date: formatDate(r.date),
      inputQty: r.inputQty.toFixed(1),
      itemName: r.receivingItemName.split('/')[0].trim(),
      h01Output: r.h01Output.toFixed(1),
      h02Output: r.h02Output.toFixed(1),
      h01Rate: r.h01CompletionRate !== null ? r.h01CompletionRate.toFixed(1) + '%' : '-',
      h02Rate: r.h02CompletionRate !== null ? r.h02CompletionRate.toFixed(1) + '%' : '-',
      amount: r.amount.toLocaleString(),
    })),
    summary: [
      { label: 'สำเร็จรวม (H01)', value: store.h02ProcessingResult.summary.totalH01Output.toFixed(1) },
      { label: 'สำเร็จรวม (H02)', value: store.h02ProcessingResult.summary.totalH02Output.toFixed(1) },
      { label: 'ยอดเงินรวม', value: `฿${store.h02ProcessingResult.summary.totalAmount.toLocaleString()}` },
    ],
    fileName: `h02-processing-inquiry_${new Date().toISOString().slice(0, 10)}.pdf`,
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
    const result = await sharePdfBlob(blob, opts.fileName, 'H02 完成品加工查詢')
    if (!result.shared) toast.showToast('裝置不支援分享，已改為下載 PDF', 'success')
  } catch (e: any) {
    if (e?.name !== 'AbortError') toast.showToast('分享失敗，請重試', 'danger')
  } finally {
    sharingPdf.value = false
  }
}

onMounted(() => {
  receivingItemsStore.fetchReceivingItems()
})
</script>

<style scoped>
.inq-view { padding: 16px; display: flex; flex-direction: column; gap: 16px; }

.filter-card { background: var(--color-card); border: 1px solid var(--color-border); border-radius: 14px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.filter-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 12px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.select-btn {
  background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px;
  padding: 11px 14px; font-size: 14px; color: var(--color-text); text-align: left; cursor: pointer;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.select-btn:hover { border-color: var(--color-accent); }

.filter-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.btn-primary { background: var(--color-accent); color: #fff; border: none; border-radius: 10px; padding: 11px 22px; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-primary:disabled { opacity: 0.6; }
.btn-secondary { background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 10px; padding: 11px 22px; font-size: 14px; cursor: pointer; }

.summary-card { display: flex; gap: 16px; background: var(--color-card); border: 1px solid var(--color-border); border-radius: 14px; padding: 16px; flex-wrap: wrap; }
.summary-item { display: flex; flex-direction: column; gap: 4px; }
.summary-label { font-size: 12px; color: var(--color-text-muted); }
.summary-value { font-size: 18px; font-weight: 700; color: var(--color-text); }
.accent { color: var(--color-accent); }

.result-table { background: var(--color-card); border: 1px solid var(--color-border); border-radius: 14px; overflow: hidden; overflow-x: auto; }
.row { display: grid; grid-template-columns: 0.7fr 0.7fr 1fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr; gap: 8px; padding: 10px 14px; font-size: 13px; border-bottom: 1px solid var(--color-border); min-width: 860px; }
.row:last-child { border-bottom: none; }
.row.head { background: var(--color-surface); font-weight: 700; color: var(--color-text-muted); font-size: 12px; }

.loading-state { display: flex; justify-content: center; padding: 60px; }
.spinner { width: 32px; height: 32px; border: 3px solid var(--color-border); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-state { text-align: center; padding: 48px; color: var(--color-text-muted); font-size: 14px; }
</style>
