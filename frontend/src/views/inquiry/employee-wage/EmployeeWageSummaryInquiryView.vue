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
          v-if="store.employeeWageSummaryResult?.rows.length"
          class="btn-secondary"
          :disabled="exporting"
          @click="exportPdf"
        >
          <i class="pi pi-file-pdf"></i> {{ t('exportPdf') }}
        </button>
        <button
          v-if="store.employeeWageSummaryResult?.rows.length"
          class="btn-secondary"
          :disabled="sharingPdf"
          @click="sharePdf"
        >
          <i class="pi pi-cloud-upload"></i> 分享PDF（雲端硬碟）
        </button>
        <button
          v-if="store.employeeWageSummaryResult?.rows.length"
          class="btn-secondary"
          :disabled="exportingExcel"
          @click="exportExcel"
        >
          <i class="pi pi-file-excel"></i> 匯出 Excel
        </button>
      </div>
    </div>

    <div v-if="store.loading" class="loading-state"><div class="spinner"></div></div>

    <template v-else-if="store.employeeWageSummaryResult">
      <div class="summary-card">
        <div class="summary-item">
          <span class="summary-label">{{ t('totalAmount') }}</span>
          <span class="summary-value accent">฿{{ store.employeeWageSummaryResult.summary.totalAmount.toLocaleString() }}</span>
        </div>
      </div>

      <div v-if="store.employeeWageSummaryResult.rows.length === 0" class="empty-state">{{ t('noResultData') }}</div>

      <div v-else class="result-table">
        <div class="row head">
          <span>{{ t('colDate') }}</span><span>{{ t('colEmployeeId') }}</span><span>{{ t('colEmployeeName') }}</span><span>{{ t('colAmount') }}</span>
        </div>
        <div v-for="(r, i) in store.employeeWageSummaryResult.rows" :key="i" class="row">
          <span>{{ formatDate(r.date) }}</span>
          <span>{{ r.employeeId }}</span>
          <span>{{ r.employeeName }}</span>
          <span class="accent">฿{{ r.amount.toLocaleString() }}</span>
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
import { sharePdfBlob } from '../../../utils/shareExport'
import { generateExcel } from '../../../utils/excelExport'
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
const sharingPdf = ref(false)
const exportingExcel = ref(false)
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
  store.searchEmployeeWageSummary({
    startDate: startDate.value || undefined,
    endDate: endDate.value || undefined,
    employeeId: selectedEmployeeId.value || undefined,
  })
}

function resetFilters() {
  startDate.value = ''
  endDate.value = ''
  selectedEmployeeId.value = ''
  store.employeeWageSummaryResult = null
}

function buildPdfOptions() {
  if (!store.employeeWageSummaryResult) return null
  return {
    title: 'สรุปค่าจ้างพนักงาน',
    subtitle: `ช่วงวันที่ ${startDate.value || 'ไม่จำกัด'} ~ ${endDate.value || 'ไม่จำกัด'}${selectedEmployeeName.value ? ' / ' + selectedEmployeeName.value : ''}`,
    columns: [
      { header: 'วันที่', key: 'date' },
      { header: 'รหัสพนักงาน', key: 'employeeId' },
      { header: 'ชื่อพนักงาน', key: 'employeeName' },
      { header: 'จำนวนเงิน', key: 'amount', align: 'right' as const },
    ],
    rows: store.employeeWageSummaryResult.rows.map((r) => ({
      date: formatDate(r.date),
      employeeId: r.employeeId,
      employeeName: r.employeeName,
      amount: r.amount.toLocaleString(),
    })),
    summary: [
      { label: 'ยอดเงินรวม', value: `฿${store.employeeWageSummaryResult.summary.totalAmount.toLocaleString()}` },
    ],
    fileName: `employee-wage-summary_${new Date().toISOString().slice(0, 10)}.pdf`,
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
    const result = await sharePdfBlob(blob, opts.fileName, '員工薪資總表')
    if (!result.shared) toast.showToast('裝置不支援分享，已改為下載 PDF', 'success')
  } catch (e: any) {
    if (e?.name !== 'AbortError') toast.showToast('分享失敗，請重試', 'danger')
  } finally {
    sharingPdf.value = false
  }
}

function exportExcel() {
  if (!store.employeeWageSummaryResult) return
  exportingExcel.value = true
  try {
    generateExcel({
      columns: [
        { header: '日期', key: 'date' },
        { header: '員工ID', key: 'employeeId' },
        { header: '員工姓名', key: 'employeeName' },
        { header: '金額', key: 'amount' },
      ],
      rows: store.employeeWageSummaryResult.rows.map((r) => ({
        date: formatDate(r.date),
        employeeId: r.employeeId,
        employeeName: r.employeeName,
        amount: r.amount,
      })),
      groupKey: (row) => String(row.employeeName),
      sumKeys: ['amount'],
      labelKey: 'employeeName',
      fileName: `員工薪資總表_${new Date().toISOString().slice(0, 10)}.xlsx`,
    })
  } finally {
    exportingExcel.value = false
  }
}

onMounted(() => {
  employeesStore.fetchEmployees()
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
.row { display: grid; grid-template-columns: 0.8fr 0.8fr 1.2fr 1fr; gap: 8px; padding: 10px 14px; font-size: 13px; border-bottom: 1px solid var(--color-border); min-width: 520px; }
.row:last-child { border-bottom: none; }
.row.head { background: var(--color-surface); font-weight: 700; color: var(--color-text-muted); font-size: 12px; }

.loading-state { display: flex; justify-content: center; padding: 60px; }
.spinner { width: 32px; height: 32px; border: 3px solid var(--color-border); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-state { text-align: center; padding: 48px; color: var(--color-text-muted); font-size: 14px; }
</style>
