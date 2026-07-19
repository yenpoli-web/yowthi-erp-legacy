<template>
  <div class="inq-view">
    <div class="filter-card">
      <div class="filter-row">
        <DatePicker v-model="startDate" :label="t('startDate')" />
        <DatePicker v-model="endDate" :label="t('endDate')" />
      </div>

      <div class="filter-row">
        <div class="field">
          <label class="field-label">{{ t('employeeSingleSelect') }}</label>
          <button class="select-btn" @click="openEmployeeModal">
            {{ selectedEmployeeName || t('allEmployees') }}
          </button>
        </div>
      </div>

      <div class="filter-actions">
        <button class="btn-primary" :disabled="store.loading" @click="search">
          <i class="pi pi-search"></i> {{ t('search') }}
        </button>
        <button class="btn-secondary" @click="resetFilters">{{ t('clearFilters') }}</button>
        <button
          v-if="store.processingWageResult?.rows.length"
          class="btn-secondary"
          :disabled="exporting"
          @click="exportPdf"
        >
          <i class="pi pi-file-pdf"></i> {{ t('exportPdf') }}
        </button>
        <button
          v-if="store.processingWageResult?.rows.length"
          class="btn-secondary"
          :disabled="sharingImage"
          @click="shareImage"
        >
          <i class="pi pi-share-alt"></i> 分享圖片（LINE）
        </button>
        <button
          v-if="store.processingWageResult?.rows.length"
          class="btn-secondary"
          :disabled="sharingPdf"
          @click="sharePdf"
        >
          <i class="pi pi-cloud-upload"></i> 分享PDF（雲端硬碟）
        </button>
      </div>
    </div>

    <div v-if="store.loading" class="loading-state"><div class="spinner"></div></div>

    <template v-else-if="store.processingWageResult">
      <div ref="resultRef" class="share-capture-area">
        <div class="summary-card">
          <div class="summary-item">
            <span class="summary-label">{{ t('colOutputQty') }}</span>
            <span class="summary-value">{{ store.processingWageResult.summary.totalOutputQty.toFixed(1) }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">{{ t('totalAmount') }}</span>
            <span class="summary-value accent">฿{{ store.processingWageResult.summary.totalAmount.toLocaleString() }}</span>
          </div>
        </div>

        <div v-if="store.processingWageResult.rows.length === 0" class="empty-state">{{ t('noResultData') }}</div>

        <div v-else class="result-table">
          <div class="row head">
            <span>{{ t('colDate') }}</span><span>{{ t('colEmployeeId') }}</span><span>{{ t('colEmployeeName') }}</span><span>{{ t('colFarmerId') }}</span><span>{{ t('colFarmerName') }}</span><span>{{ t('colProcessingItem') }}</span><span>{{ t('colOutputQty') }}</span><span>{{ t('colWageRate') }}</span><span>{{ t('colAmount') }}</span>
          </div>
          <div v-for="(r, i) in store.processingWageResult.rows" :key="i" class="row">
            <span>{{ formatDate(r.date) }}</span>
            <span>{{ r.employeeId }}</span>
            <span>{{ r.employeeName }}</span>
            <span>{{ r.farmerId || '—' }}</span>
            <span>{{ r.farmerName || '—' }}</span>
            <span>{{ r.itemType }}</span>
            <span>{{ r.outputQty.toFixed(1) }}</span>
            <span>฿{{ r.wageRate.toFixed(1) }}</span>
            <span class="accent">฿{{ r.amount.toLocaleString() }}</span>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="empty-state">{{ t('setFiltersFirst') }}</div>

    <TouchSelectorModal
      v-if="employeeModalOpen"
      :title="t('selectEmployeeTitle')"
      :items="availableEmployees"
      :model-value="selectedEmployeeId"
      @select="(item) => (selectedEmployeeId = item.id)"
      @close="employeeModalOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useInquiryStore } from '../../../stores/inquiry'
import { useEmployeesStore } from '../../../stores/employees'
import { useToastStore } from '../../../stores/toast'
import DatePicker from '../../../components/common/DatePicker.vue'
import TouchSelectorModal from '../../../components/common/TouchSelectorModal.vue'
import { generatePdf, generatePdfBlob } from '../../../utils/pdfExport'
import { shareImageOfElement, sharePdfBlob } from '../../../utils/shareExport'
import { getProcessingWageEmployees, type ProcessingWageEmployeeRow } from '../../../api/inquiry'

const { t } = useI18n()
const store = useInquiryStore()
const employeesStore = useEmployeesStore()
const toast = useToastStore()

const startDate = ref('')
const endDate = ref('')
const selectedEmployeeId = ref('')
const employeeModalOpen = ref(false)
const exporting = ref(false)
const sharingImage = ref(false)
const sharingPdf = ref(false)
const resultRef = ref<HTMLElement | null>(null)
const loadingEmployeeFilter = ref(false)
// 點選「員工」時，若已選日期範圍，只顯示該範圍內有加工明細的員工；未選日期時顯示全部員工
const availableEmployees = ref<{ id: string; name: string }[]>([])

async function openEmployeeModal() {
  employeeModalOpen.value = true
  if (!startDate.value && !endDate.value) {
    availableEmployees.value = employeesStore.employees
    return
  }
  loadingEmployeeFilter.value = true
  try {
    const res = await getProcessingWageEmployees({
      startDate: startDate.value || undefined,
      endDate: endDate.value || undefined,
    })
    availableEmployees.value = res.data as ProcessingWageEmployeeRow[]
    // 若原本已選員工不在這個範圍內，不自動清除，讓使用者自行決定是否改選
  } catch (e: any) {
    availableEmployees.value = employeesStore.employees
    toast.showToast(`員工篩選資料載入失敗，已顯示全部員工：${e?.response?.status || ''} ${e?.message || e}`, 'danger', 6000)
  } finally {
    loadingEmployeeFilter.value = false
  }
}

const selectedEmployeeName = computed(
  () => employeesStore.employees.find((e) => e.id === selectedEmployeeId.value)?.name || '',
)

function formatDate(d: string) {
  if (!d) return ''
  const [y, m, day] = d.slice(0, 10).split('-')
  return `${parseInt(day)}/${parseInt(m)}/${y.slice(2)}`
}

function search() {
  store.searchProcessingWage({
    startDate: startDate.value || undefined,
    endDate: endDate.value || undefined,
    employeeId: selectedEmployeeId.value || undefined,
  })
}

function resetFilters() {
  startDate.value = ''
  endDate.value = ''
  selectedEmployeeId.value = ''
  store.processingWageResult = null
}

function buildPdfOptions() {
  if (!store.processingWageResult) return null
  return {
    title: 'รายงานค่าจ้างพนักงาน',
    subtitle: `ช่วงวันที่ ${startDate.value || 'ไม่จำกัด'} ~ ${endDate.value || 'ไม่จำกัด'}${selectedEmployeeName.value ? ' / ' + selectedEmployeeName.value : ''}`,
    columns: [
      { header: 'วันที่', key: 'date' },
      { header: 'รหัสพนักงาน', key: 'employeeId' },
      { header: 'ชื่อพนักงาน', key: 'employeeName' },
      { header: 'รหัสเกษตรกร', key: 'farmerId' },
      { header: 'ชื่อเกษตรกร', key: 'farmerName' },
      { header: 'รายการแปรรูป', key: 'itemType' },
      { header: 'สินค้าสำเร็จ', key: 'outputQty', align: 'right' as const },
      { header: 'ค่าจ้าง', key: 'wageRate', align: 'right' as const },
      { header: 'จำนวนเงิน', key: 'amount', align: 'right' as const },
    ],
    rows: store.processingWageResult.rows.map((r) => ({
      date: formatDate(r.date),
      employeeId: r.employeeId,
      employeeName: r.employeeName,
      farmerId: r.farmerId || '-',
      farmerName: r.farmerName || '-',
      itemType: r.itemType,
      outputQty: r.outputQty.toFixed(1),
      wageRate: r.wageRate.toFixed(1),
      amount: r.amount.toLocaleString(),
    })),
    summary: [
      { label: 'สินค้าสำเร็จรวม', value: store.processingWageResult.summary.totalOutputQty.toFixed(1) },
      { label: 'ยอดเงินรวม', value: `฿${store.processingWageResult.summary.totalAmount.toLocaleString()}` },
    ],
    fileName: `processing-wage-inquiry_${new Date().toISOString().slice(0, 10)}.pdf`,
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
    const result = await sharePdfBlob(blob, opts.fileName)
    if (!result.shared) toast.showToast('裝置不支援分享，已改為下載 PDF', 'success')
  } catch (e: any) {
    if (e?.name !== 'AbortError') toast.showToast('分享失敗，請重試', 'danger')
  } finally {
    sharingPdf.value = false
  }
}

async function shareImage() {
  if (!resultRef.value) return
  sharingImage.value = true
  try {
    const result = await shareImageOfElement(
      resultRef.value,
      `員工薪資查詢_${new Date().toISOString().slice(0, 10)}.png`,
    )
    if (!result.shared) toast.showToast('裝置不支援分享，已改為下載圖片', 'success')
  } catch (e: any) {
    if (e?.name !== 'AbortError') toast.showToast(`分享失敗：${e?.name || ''} ${e?.message || e}`, 'danger', 6000)
  } finally {
    sharingImage.value = false
  }
}

onMounted(() => {
  employeesStore.fetchEmployees()
})
</script>

<style scoped>
.inq-view { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
.share-capture-area { display: flex; flex-direction: column; gap: 16px; }

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
.row { display: grid; grid-template-columns: 0.7fr 0.6fr 0.9fr 0.6fr 0.9fr 0.7fr 0.7fr 0.7fr 0.8fr; gap: 8px; padding: 10px 14px; font-size: 13px; border-bottom: 1px solid var(--color-border); min-width: 900px; }
.row:last-child { border-bottom: none; }
.row.head { background: var(--color-surface); font-weight: 700; color: var(--color-text-muted); font-size: 12px; }

.loading-state { display: flex; justify-content: center; padding: 60px; }
.spinner { width: 32px; height: 32px; border: 3px solid var(--color-border); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-state { text-align: center; padding: 48px; color: var(--color-text-muted); font-size: 14px; }
</style>
