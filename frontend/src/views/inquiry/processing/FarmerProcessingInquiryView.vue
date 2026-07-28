<template>
  <div class="inq-view">
    <div class="filter-card">
      <div class="filter-row">
        <DatePicker v-model="startDate" :label="t('startDate')" />
        <DatePicker v-model="endDate" :label="t('endDate')" />
      </div>

      <div class="filter-row">
        <div class="field">
          <label class="field-label">{{ t('farmerMultiSelect') }}</label>
          <button class="select-btn" @click="farmerModalOpen = true">
            {{ selectedFarmerNames || t('allFarmers') }}
          </button>
        </div>
      </div>

      <div class="filter-actions">
        <button class="btn-primary" :disabled="store.loading" @click="search">
          <i class="pi pi-search"></i> {{ t('search') }}
        </button>
        <button class="btn-secondary" @click="resetFilters">{{ t('clearFilters') }}</button>
        <button
          v-if="store.farmerProcessingResult?.rows.length"
          class="btn-secondary"
          :disabled="exporting"
          @click="exportPdf"
        >
          <i class="pi pi-file-pdf"></i> {{ t('exportPdf') }}
        </button>
        <button
          v-if="store.farmerProcessingResult?.rows.length"
          class="btn-secondary"
          :disabled="sharingPdf"
          @click="sharePdf"
        >
          <i class="pi pi-cloud-upload"></i> 分享PDF（雲端硬碟）
        </button>
        <button
          v-if="store.farmerProcessingResult?.rows.length"
          class="btn-secondary"
          :disabled="exportingExcel"
          @click="exportExcel"
        >
          <i class="pi pi-file-excel"></i> 匯出 Excel
        </button>
      </div>
    </div>

    <div v-if="store.loading" class="loading-state"><div class="spinner"></div></div>

    <template v-else-if="store.farmerProcessingResult">
      <div class="summary-card">
        <div class="summary-item">
          <span class="summary-label">{{ t('totalQuantity') }}</span>
          <span class="summary-value">{{ store.farmerProcessingResult.summary.totalInputQty.toFixed(1) }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">{{ t('totalProcessingInputQty') }}</span>
          <span class="summary-value">{{ store.farmerProcessingResult.summary.totalProcessingInputQty.toFixed(1) }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">{{ t('colOutputQty') }}</span>
          <span class="summary-value">{{ store.farmerProcessingResult.summary.totalOutputQty.toFixed(1) }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">{{ t('colDefectQty') }}</span>
          <span class="summary-value">{{ store.farmerProcessingResult.summary.totalDefectQty.toFixed(1) }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">{{ t('totalAmount') }}</span>
          <span class="summary-value accent">฿{{ store.farmerProcessingResult.summary.totalAmount.toLocaleString() }}</span>
        </div>
      </div>

      <div v-if="store.farmerProcessingResult.rows.length === 0" class="empty-state">{{ t('noResultData') }}</div>

      <div v-else class="result-table">
        <div class="row head">
          <span>{{ t('colDate') }}</span><span>{{ t('colFarmerId') }}</span><span>{{ t('colFarmerName') }}</span><span>{{ t('totalQty') }}</span><span>{{ t('totalProcessingInputQty') }}</span><span>{{ t('colOutputQty') }}</span><span>{{ t('colDefectQty') }}</span><span>{{ t('colLoss') }}</span><span>{{ t('lossRate') }}</span><span>{{ t('completionRate') }}</span><span>{{ t('colAmount') }}</span>
        </div>
        <div v-for="(r, i) in store.farmerProcessingResult.rows" :key="i" class="row">
          <span>{{ formatDate(r.date) }}</span>
          <span>{{ r.farmerId }}</span>
          <span>{{ r.farmerName }}</span>
          <span>{{ r.inputQty.toFixed(1) }}</span>
          <span>{{ r.processingInputQty.toFixed(1) }}</span>
          <span>{{ r.outputQty.toFixed(1) }}</span>
          <span>{{ r.defectQty.toFixed(1) }}</span>
          <span>{{ r.loss.toFixed(1) }}</span>
          <span>{{ r.lossRate !== null ? r.lossRate.toFixed(1) + '%' : '—' }}</span>
          <span>{{ r.completionRate !== null ? r.completionRate.toFixed(1) + '%' : '—' }}</span>
          <span class="accent">฿{{ r.amount.toLocaleString() }}</span>
        </div>
      </div>
    </template>

    <div v-else class="empty-state">{{ t('setFiltersFirst') }}</div>

    <div v-if="farmerModalOpen" class="modal-backdrop" @click.self="farmerModalOpen = false">
      <div class="modal-panel">
        <div class="modal-header">
          <span class="modal-title">{{ t('selectFarmerTitle') }}</span>
          <button class="close-btn" @click="farmerModalOpen = false">✕</button>
        </div>
        <div class="item-grid">
          <button
            v-for="f in farmersStore.farmers"
            :key="f.id"
            class="item-card"
            :class="{ selected: selectedFarmerIds.includes(f.id) }"
            @click="toggleFarmer(f.id)"
          >
            <i v-if="selectedFarmerIds.includes(f.id)" class="pi pi-check check-icon"></i>
            <span class="item-name">{{ f.name }}</span>
            <span class="item-id">{{ f.id }}</span>
          </button>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="selectedFarmerIds = []">{{ t('clear') }}</button>
          <button class="btn-primary" @click="farmerModalOpen = false">{{ t('confirm') }}（{{ selectedFarmerIds.length }}）</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useInquiryStore } from '../../../stores/inquiry'
import { useFarmersStore } from '../../../stores/farmers'
import { useToastStore } from '../../../stores/toast'
import DatePicker from '../../../components/common/DatePicker.vue'
import { generatePdf, generatePdfBlob } from '../../../utils/pdfExport'
import { sharePdfBlob } from '../../../utils/shareExport'
import { generateExcel } from '../../../utils/excelExport'

const { t } = useI18n()
const store = useInquiryStore()
const farmersStore = useFarmersStore()
const toast = useToastStore()

const startDate = ref('')
const endDate = ref('')
const selectedFarmerIds = ref<string[]>([])
const farmerModalOpen = ref(false)
const exporting = ref(false)
const sharingPdf = ref(false)
const exportingExcel = ref(false)

const selectedFarmerNames = computed(() =>
  farmersStore.farmers
    .filter((f) => selectedFarmerIds.value.includes(f.id))
    .map((f) => f.name)
    .join('、'),
)

function toggleFarmer(id: string) {
  const idx = selectedFarmerIds.value.indexOf(id)
  if (idx === -1) selectedFarmerIds.value.push(id)
  else selectedFarmerIds.value.splice(idx, 1)
}

function formatDate(d: string) {
  if (!d) return ''
  const [y, m, day] = d.slice(0, 10).split('-')
  return `${parseInt(day)}/${parseInt(m)}/${y.slice(2)}`
}

function search() {
  store.searchFarmerProcessing({
    startDate: startDate.value || undefined,
    endDate: endDate.value || undefined,
    farmerIds: selectedFarmerIds.value.length ? selectedFarmerIds.value.join(',') : undefined,
  })
}

function resetFilters() {
  startDate.value = ''
  endDate.value = ''
  selectedFarmerIds.value = []
  store.farmerProcessingResult = null
}

function buildPdfOptions() {
  if (!store.farmerProcessingResult) return null
  return {
    title: 'รายงานการแปรรูปเกษตรกร',
    subtitle: `ช่วงวันที่ ${startDate.value || 'ไม่จำกัด'} ~ ${endDate.value || 'ไม่จำกัด'}`,
    columns: [
      { header: 'วันที่', key: 'date' },
      { header: 'รหัสเกษตรกร', key: 'farmerId' },
      { header: 'ชื่อเกษตรกร', key: 'farmerName' },
      { header: 'ปริมาณการรับ', key: 'inputQty', align: 'right' as const },
      { header: 'ปริมาณที่ใช้แปรรูป', key: 'processingInputQty', align: 'right' as const },
      { header: 'สินค้าสำเร็จ', key: 'outputQty', align: 'right' as const },
      { header: 'สินค้าไม่ได้มาตรฐาน', key: 'defectQty', align: 'right' as const },
      { header: 'สูญเสีย', key: 'loss', align: 'right' as const },
      { header: 'จำนวนเงิน', key: 'amount', align: 'right' as const },
    ],
    rows: store.farmerProcessingResult.rows.map((r) => ({
      date: formatDate(r.date),
      farmerId: r.farmerId,
      farmerName: r.farmerName,
      inputQty: r.inputQty.toFixed(1),
      processingInputQty: r.processingInputQty.toFixed(1),
      outputQty: r.outputQty.toFixed(1),
      defectQty: r.defectQty.toFixed(1),
      loss: r.loss.toFixed(1),
      amount: r.amount.toLocaleString(),
    })),
    summary: [
      { label: 'ปริมาณการรับรวม', value: store.farmerProcessingResult.summary.totalInputQty.toFixed(1) },
      { label: 'ปริมาณที่ใช้แปรรูปรวม', value: store.farmerProcessingResult.summary.totalProcessingInputQty.toFixed(1) },
      { label: 'สินค้าสำเร็จรวม', value: store.farmerProcessingResult.summary.totalOutputQty.toFixed(1) },
      { label: 'สินค้าไม่ได้มาตรฐานรวม', value: store.farmerProcessingResult.summary.totalDefectQty.toFixed(1) },
      { label: 'ยอดเงินรวม', value: `฿${store.farmerProcessingResult.summary.totalAmount.toLocaleString()}` },
    ],
    fileName: `farmer-processing-inquiry_${new Date().toISOString().slice(0, 10)}.pdf`,
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
    const result = await sharePdfBlob(blob, opts.fileName, '農民加工查詢')
    if (!result.shared) toast.showToast('裝置不支援分享，已改為下載 PDF', 'success')
  } catch (e: any) {
    if (e?.name !== 'AbortError') toast.showToast('分享失敗，請重試', 'danger')
  } finally {
    sharingPdf.value = false
  }
}

function exportExcel() {
  if (!store.farmerProcessingResult) return
  exportingExcel.value = true
  try {
    generateExcel({
      columns: [
        { header: '日期', key: 'date' },
        { header: '農民ID', key: 'farmerId' },
        { header: '農民姓名', key: 'farmerName' },
        { header: '進貨量', key: 'inputQty' },
        { header: '加工投入量', key: 'processingInputQty' },
        { header: '完成品', key: 'outputQty' },
        { header: '瑕疵品', key: 'defectQty' },
        { header: '失重', key: 'loss' },
        { header: '金額', key: 'amount' },
      ],
      rows: store.farmerProcessingResult.rows.map((r) => ({
        date: formatDate(r.date),
        farmerId: r.farmerId,
        farmerName: r.farmerName,
        inputQty: r.inputQty,
        processingInputQty: r.processingInputQty,
        outputQty: r.outputQty,
        defectQty: r.defectQty,
        loss: r.loss,
        amount: r.amount,
      })),
      groupKey: (row) => String(row.farmerName),
      sumKeys: ['outputQty', 'amount'],
      labelKey: 'farmerName',
      fileName: `加工查詢-依農民_${new Date().toISOString().slice(0, 10)}.xlsx`,
    })
  } finally {
    exportingExcel.value = false
  }
}

onMounted(() => {
  farmersStore.fetchFarmers()
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
.row { display: grid; grid-template-columns: 0.6fr 0.6fr 0.8fr 0.6fr 0.6fr 0.6fr 0.6fr 0.6fr 0.6fr 0.6fr 0.7fr; gap: 8px; padding: 10px 14px; font-size: 13px; border-bottom: 1px solid var(--color-border); min-width: 980px; }
.row:last-child { border-bottom: none; }
.row.head { background: var(--color-surface); font-weight: 700; color: var(--color-text-muted); font-size: 12px; }

.loading-state { display: flex; justify-content: center; padding: 60px; }
.spinner { width: 32px; height: 32px; border: 3px solid var(--color-border); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-state { text-align: center; padding: 48px; color: var(--color-text-muted); font-size: 14px; }

.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.72); z-index: 1000; display: flex; align-items: center; justify-content: center; }
.modal-panel { width: 100%; max-width: 640px; max-height: 78vh; background: var(--color-drawer); border-radius: 16px; display: flex; flex-direction: column; overflow: hidden; margin: 16px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px; border-bottom: 1px solid var(--color-border); }
.modal-title { font-size: 15px; font-weight: 700; color: var(--color-text); }
.close-btn { background: none; border: none; color: var(--color-text-muted); font-size: 18px; cursor: pointer; }
.modal-footer { display: flex; gap: 10px; padding: 14px 16px; border-top: 1px solid var(--color-border); justify-content: flex-end; }

.item-grid { flex: 1; overflow-y: auto; padding: 14px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
@media (min-width: 768px) { .item-grid { grid-template-columns: repeat(3, 1fr); } }
.item-card { position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 14px 8px; background: var(--color-card); border: 2px solid var(--color-border); border-radius: 12px; cursor: pointer; }
.item-card.selected { border-color: var(--color-accent); background: var(--color-card-hover); }
.check-icon { position: absolute; top: 8px; right: 8px; color: var(--color-accent); font-size: 14px; }
.item-name { font-size: 13px; font-weight: 600; color: var(--color-text); text-align: center; }
.item-id { font-size: 10px; font-weight: 700; color: var(--color-text-muted); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 4px; padding: 1px 6px; }
</style>
