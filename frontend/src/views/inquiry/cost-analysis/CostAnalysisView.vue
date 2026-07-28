<template>
  <div class="cost-view">
    <div class="filter-card">
      <div class="filter-row">
        <DatePicker v-model="startDate" :label="t('startDate')" />
        <DatePicker v-model="endDate" :label="t('endDate')" />
      </div>
      <div class="filter-actions">
        <button class="btn-primary" :disabled="loadingOrders" @click="loadCandidates">
          <i class="pi pi-search"></i> {{ t('costLoadCandidates') }}
        </button>
        <button class="btn-secondary" @click="resetAll">{{ t('clearFilters') }}</button>
      </div>
    </div>

    <!-- 出口銷售單選取 -->
    <div class="group-section">
      <div class="group-title">{{ t('costChannelExport') }}</div>
      <div v-if="loadingOrders" class="loading-state-sm"><div class="spinner"></div></div>
      <div v-else-if="exportCandidates.length === 0" class="empty-state-sm">{{ t('costNoCandidates') }}</div>
      <div v-else class="order-pick-list">
        <button v-for="o in exportCandidates" :key="o.id" class="order-pick-card"
          :class="{ selected: selectedExportIds.includes(o.id) }" @click="toggleExport(o.id)">
          <span class="opc-id">{{ o.id }}</span>
          <span class="opc-date">{{ formatDate(o.orderDate) }}</span>
          <span class="opc-customer">{{ o.customerName }}</span>
          <span class="opc-amount">฿{{ o.amount.toLocaleString() }}</span>
          <i v-if="selectedExportIds.includes(o.id)" class="pi pi-check opc-check"></i>
        </button>
      </div>
    </div>

    <!-- 境內銷售單選取 -->
    <div class="group-section">
      <div class="group-title">{{ t('costChannelDomestic') }}</div>
      <div v-if="loadingOrders" class="loading-state-sm"><div class="spinner"></div></div>
      <div v-else-if="domesticCandidates.length === 0" class="empty-state-sm">{{ t('costNoCandidates') }}</div>
      <div v-else class="order-pick-list">
        <button v-for="o in domesticCandidates" :key="o.id" class="order-pick-card"
          :class="{ selected: selectedDomesticIds.includes(o.id) }" @click="toggleDomestic(o.id)">
          <span class="opc-id">{{ o.id }}</span>
          <span class="opc-date">{{ formatDate(o.orderDate) }}</span>
          <span class="opc-customer">{{ o.customerName }}</span>
          <span class="opc-amount">฿{{ o.amount.toLocaleString() }}</span>
          <i v-if="selectedDomesticIds.includes(o.id)" class="pi pi-check opc-check"></i>
        </button>
      </div>
    </div>

    <div class="filter-actions">
      <button class="btn-primary" :disabled="store.loading || (selectedExportIds.length === 0 && selectedDomesticIds.length === 0)" @click="runAnalysis">
        <i class="pi pi-calculator"></i> {{ t('costRunAnalysis') }}
      </button>
      <button v-if="store.costAnalysisResult" class="btn-secondary" :disabled="exporting" @click="exportPdf">
        <i class="pi pi-file-pdf"></i> {{ t('exportPdf') }}
      </button>
      <button v-if="store.costAnalysisResult" class="btn-secondary" :disabled="sharingPdf" @click="sharePdf">
        <i class="pi pi-cloud-upload"></i> 分享PDF（雲端硬碟）
      </button>
    </div>

    <div v-if="store.loading" class="loading-state"><div class="spinner"></div></div>

    <template v-else-if="store.costAnalysisResult">
      <!-- 出口結果 -->
      <div v-if="store.costAnalysisResult.exportResult" class="group-section">
        <div class="group-title">{{ t('costChannelExport') }}</div>
        <div class="card-grid">
          <div class="metric-card plus">
            <div class="metric-label">{{ t('costSales') }}</div>
            <div class="metric-value">฿{{ formatMoney(store.costAnalysisResult.exportResult.totalSales) }}</div>
          </div>
          <div class="metric-card minus">
            <div class="metric-label">{{ t('costRealCost') }}</div>
            <div class="metric-value">-฿{{ formatMoney(store.costAnalysisResult.exportResult.totalRealCost) }}</div>
          </div>
          <div class="metric-card minus">
            <div class="metric-label">{{ t('costContractWork') }}</div>
            <div class="metric-value">-฿{{ formatMoney(store.costAnalysisResult.exportResult.totalContractCost) }}</div>
          </div>
          <div class="metric-card minus">
            <div class="metric-label">{{ t('costPackaging') }}</div>
            <div class="metric-value">-฿{{ formatMoney(store.costAnalysisResult.exportResult.totalPackaging) }}</div>
          </div>
        </div>
        <div class="result-card sub" :class="{ negative: store.costAnalysisResult.exportResult.grossProfit < 0 }">
          <div class="result-label">{{ t('costGrossProfit') }}</div>
          <div class="result-value">฿{{ formatMoney(store.costAnalysisResult.exportResult.grossProfit) }}</div>
        </div>
      </div>

      <!-- 境內結果 -->
      <div v-if="store.costAnalysisResult.domesticResult" class="group-section">
        <div class="group-title">{{ t('costChannelDomestic') }}</div>
        <div class="card-grid">
          <div class="metric-card plus">
            <div class="metric-label">{{ t('costSales') }}</div>
            <div class="metric-value">฿{{ formatMoney(store.costAnalysisResult.domesticResult.totalSales) }}</div>
          </div>
          <div class="metric-card minus">
            <div class="metric-label">{{ t('costH03Wage') }}</div>
            <div class="metric-value">-฿{{ formatMoney(store.costAnalysisResult.domesticResult.totalH03Wage) }}</div>
          </div>
        </div>
        <div class="result-card sub" :class="{ negative: store.costAnalysisResult.domesticResult.grossProfit < 0 }">
          <div class="result-label">{{ t('costGrossProfit') }}</div>
          <div class="result-value">฿{{ formatMoney(store.costAnalysisResult.domesticResult.grossProfit) }}</div>
        </div>
      </div>

      <div v-if="store.costAnalysisResult.exportResult && store.costAnalysisResult.domesticResult"
        class="result-card main" :class="{ negative: store.costAnalysisResult.combinedGrossProfit < 0 }">
        <div class="result-label">{{ t('costGrossProfitCombined') }}</div>
        <div class="result-value">฿{{ formatMoney(store.costAnalysisResult.combinedGrossProfit) }}</div>
      </div>

      <p class="cost-note">{{ t('costFormulaNote') }}</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useInquiryStore } from '../../../stores/inquiry'
import { getSalesOrdersForCost } from '../../../api/inquiry'
import type { SalesOrderForCostRow } from '../../../api/inquiry'
import { useToastStore } from '../../../stores/toast'
import DatePicker from '../../../components/common/DatePicker.vue'
import { generatePdf, generatePdfBlob, type GeneratePdfOptions } from '../../../utils/pdfExport'
import { sharePdfBlob } from '../../../utils/shareExport'

const { t } = useI18n()
const store = useInquiryStore()
const toast = useToastStore()

const startDate = ref('')
const endDate = ref('')
const loadingOrders = ref(false)
const exportCandidates = ref<SalesOrderForCostRow[]>([])
const domesticCandidates = ref<SalesOrderForCostRow[]>([])
const selectedExportIds = ref<string[]>([])
const selectedDomesticIds = ref<string[]>([])
const exporting = ref(false)
const sharingPdf = ref(false)

function formatDate(d: string) {
  if (!d) return ''
  const [y, m, day] = d.slice(0, 10).split('-')
  return `${parseInt(day)}/${parseInt(m)}/${y.slice(2)}`
}

function formatMoney(value: number) {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function toggleExport(id: string) {
  const i = selectedExportIds.value.indexOf(id)
  if (i === -1) selectedExportIds.value.push(id)
  else selectedExportIds.value.splice(i, 1)
}
function toggleDomestic(id: string) {
  const i = selectedDomesticIds.value.indexOf(id)
  if (i === -1) selectedDomesticIds.value.push(id)
  else selectedDomesticIds.value.splice(i, 1)
}

async function loadCandidates() {
  loadingOrders.value = true
  selectedExportIds.value = []
  selectedDomesticIds.value = []
  store.costAnalysisResult = null
  try {
    const params = { startDate: startDate.value || undefined, endDate: endDate.value || undefined }
    const [exp, dom] = await Promise.all([
      getSalesOrdersForCost({ ...params, channel: 'EXPORT' }),
      getSalesOrdersForCost({ ...params, channel: 'DOMESTIC' }),
    ])
    exportCandidates.value = exp.data
    domesticCandidates.value = dom.data
  } catch {}
  finally { loadingOrders.value = false }
}

function runAnalysis() {
  store.searchCostAnalysis({
    exportOrderIds: selectedExportIds.value.length ? selectedExportIds.value.join(',') : undefined,
    domesticOrderIds: selectedDomesticIds.value.length ? selectedDomesticIds.value.join(',') : undefined,
  })
}

function resetAll() {
  startDate.value = ''
  endDate.value = ''
  exportCandidates.value = []
  domesticCandidates.value = []
  selectedExportIds.value = []
  selectedDomesticIds.value = []
  store.costAnalysisResult = null
}

async function buildPdfOptions(): Promise<GeneratePdfOptions | null> {
  const result = store.costAnalysisResult
  if (!result) return null
  const rows: Record<string, string | number>[] = []
  if (result.exportResult) {
    const r = result.exportResult
    const g = 'การส่งออก'
    rows.push({ group: g, item: 'ยอดขาย', amount: formatMoney(r.totalSales) })
    rows.push({ group: g, item: 'ต้นทุนจริง', amount: '-' + formatMoney(r.totalRealCost) })
    rows.push({ group: g, item: 'ต้นทุนการจ้างผลิตภายนอก', amount: '-' + formatMoney(r.totalContractCost) })
    rows.push({ group: g, item: 'ค่าบรรจุภัณฑ์', amount: '-' + formatMoney(r.totalPackaging) })
    rows.push({ group: g, item: 'กำไรขั้นต้น (ส่งออก)', amount: formatMoney(r.grossProfit) })
  }
  if (result.domesticResult) {
    const r = result.domesticResult
    const g = 'การขายภายใน'
    rows.push({ group: g, item: 'ยอดขาย', amount: formatMoney(r.totalSales) })
    rows.push({ group: g, item: 'ต้นทุนการแปรรูป (H03)', amount: '-' + formatMoney(r.totalH03Wage) })
    rows.push({ group: g, item: 'กำไรขั้นต้น (ภายใน)', amount: formatMoney(r.grossProfit) })
  }

  const summary: { label: string; value: string }[] = []
  if (result.exportResult) summary.push({ label: 'กำไรส่งออก', value: '฿' + formatMoney(result.exportResult.grossProfit) })
  if (result.domesticResult) summary.push({ label: 'กำไรภายใน', value: '฿' + formatMoney(result.domesticResult.grossProfit) })
  if (result.exportResult && result.domesticResult) {
    summary.push({ label: 'กำไรขั้นต้น (รวม)', value: '฿' + formatMoney(result.combinedGrossProfit) })
  }

  return {
    title: 'การวิเคราะห์ต้นทุน',
    subtitle: `ช่วงวันที่ ${startDate.value || 'ไม่จำกัด'} ~ ${endDate.value || 'ไม่จำกัด'}`,
    columns: [
      { header: 'กลุ่ม', key: 'group' },
      { header: 'รายการ', key: 'item' },
      { header: 'จำนวนเงิน', key: 'amount', align: 'right' as const },
    ],
    rows,
    summary,
    fileName: `cost-analysis_${new Date().toISOString().slice(0, 10)}.pdf`,
  }
}

async function exportPdf() {
  const opts = await buildPdfOptions()
  if (!opts) return
  exporting.value = true
  try {
    await generatePdf(opts)
  } finally {
    exporting.value = false
  }
}

async function sharePdf() {
  const opts = await buildPdfOptions()
  if (!opts) return
  sharingPdf.value = true
  try {
    const blob = await generatePdfBlob(opts)
    const result = await sharePdfBlob(blob, opts.fileName, '成本分析')
    if (!result.shared) toast.showToast('裝置不支援分享，已改為下載 PDF', 'success')
  } catch (e: any) {
    if (e?.name !== 'AbortError') toast.showToast('分享失敗，請重試', 'danger')
  } finally {
    sharingPdf.value = false
  }
}
</script>

<style scoped>
.cost-view { padding: 16px; display: flex; flex-direction: column; gap: 20px; }

.filter-card { background: var(--color-card); border: 1px solid var(--color-border); border-radius: 14px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.filter-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; }

.filter-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.btn-primary { background: var(--color-accent); color: #fff; border: none; border-radius: 10px; padding: 11px 22px; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-primary:disabled { opacity: 0.6; }
.btn-secondary { background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 10px; padding: 11px 22px; font-size: 14px; cursor: pointer; }

.group-section { display: flex; flex-direction: column; gap: 12px; padding: 14px; border: 1px solid var(--color-border); border-radius: 16px; background: var(--color-surface); }
.group-title { font-size: 14px; font-weight: 700; color: var(--color-text); border-left: 3px solid var(--color-accent); padding-left: 8px; }

.order-pick-list { display: flex; flex-direction: column; gap: 8px; max-height: 320px; overflow-y: auto; }
.order-pick-card { display: grid; grid-template-columns: auto auto 1fr auto auto; align-items: center; gap: 10px; background: var(--color-card); border: 2px solid var(--color-border); border-radius: 10px; padding: 10px 12px; cursor: pointer; text-align: left; }
.order-pick-card.selected { border-color: var(--color-accent); background: var(--color-card-hover); }
.opc-id { font-size: 12px; font-weight: 700; color: var(--color-accent); }
.opc-date { font-size: 12px; color: var(--color-text-muted); }
.opc-customer { font-size: 12px; color: var(--color-text); }
.opc-amount { font-size: 12px; font-weight: 600; color: var(--color-text); }
.opc-check { color: var(--color-accent); }

.card-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
@media (min-width: 768px) { .card-grid { grid-template-columns: repeat(3, 1fr); } }
.metric-card { background: var(--color-card); border: 1px solid var(--color-border); border-radius: 14px; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.metric-card.plus { border-color: var(--color-success); background: rgba(45,212,191,0.06); }
.metric-card.minus { border-color: var(--color-danger); background: rgba(248,113,113,0.06); }
.metric-label { font-size: 12px; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
.metric-value { font-size: 18px; font-weight: 700; color: var(--color-text); }
.metric-card.plus .metric-value { color: var(--color-success); }
.metric-card.minus .metric-value { color: var(--color-danger); }

.result-card { border-radius: 14px; padding: 16px; display: flex; flex-direction: column; gap: 6px; align-items: center; border: 2px solid var(--color-accent); background: rgba(232,130,12,0.08); }
.result-card.sub { padding: 12px; }
.result-card.main { padding: 22px; }
.result-card.negative { border-color: var(--color-danger); background: rgba(248,113,113,0.08); }
.result-label { font-size: 12px; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.result-card.main .result-label { font-size: 13px; }
.result-value { font-size: 22px; font-weight: 700; color: var(--color-accent); }
.result-card.main .result-value { font-size: 30px; }
.result-card.negative .result-value { color: var(--color-danger); }

.cost-note { font-size: 12px; color: var(--color-text-muted); line-height: 1.7; }

.loading-state, .loading-state-sm { display: flex; justify-content: center; padding: 24px; }
.spinner { width: 28px; height: 28px; border: 3px solid var(--color-border); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-state-sm { text-align: center; padding: 16px; color: var(--color-text-muted); font-size: 13px; }
</style>
