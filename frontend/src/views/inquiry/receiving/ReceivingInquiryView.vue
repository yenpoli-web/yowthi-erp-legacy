<template>
  <div class="inq-view">
    <!-- 篩選條件 -->
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
          v-if="store.receivingResult?.rows.length"
          class="btn-secondary"
          :disabled="exporting"
          @click="exportPdf"
        >
          <i class="pi pi-file-pdf"></i> {{ t('exportPdf') }}
        </button>
        <button
          v-if="store.receivingResult?.rows.length"
          class="btn-secondary"
          :disabled="sharingPdf"
          @click="sharePdf"
        >
          <i class="pi pi-cloud-upload"></i> 分享PDF（雲端硬碟）
        </button>
        <button
          v-if="store.receivingResult?.rows.length"
          class="btn-secondary"
          :disabled="exportingExcel"
          @click="exportExcel"
        >
          <i class="pi pi-file-excel"></i> 匯出 Excel
        </button>
      </div>
    </div>

    <!-- 結果 -->
    <div v-if="store.loading" class="loading-state"><div class="spinner"></div></div>

    <template v-else-if="store.receivingResult">
      <div class="summary-card">
        <div class="summary-item">
          <span class="summary-label">{{ t('totalQuantity') }}</span>
          <span class="summary-value">{{ store.receivingResult.summary.totalQuantity.toFixed(1) }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">{{ t('totalAmount') }}</span>
          <span class="summary-value accent">฿{{ store.receivingResult.summary.totalAmount.toLocaleString() }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">{{ t('avgUnitPrice') }}</span>
          <span class="summary-value">฿{{ store.receivingResult.summary.avgUnitPrice.toFixed(2) }}</span>
        </div>
      </div>

      <div v-if="store.receivingResult.rows.length === 0" class="empty-state">{{ t('noResultData') }}</div>

      <div v-else class="result-table">
        <div class="row head">
          <span>{{ t('colDate') }}</span><span>{{ t('colFarmer') }}</span><span>{{ t('colItem') }}</span><span>{{ t('colQty') }}</span><span>{{ t('colUnitPrice') }}</span><span>{{ t('colAmount') }}</span>
        </div>
        <div v-for="(r, i) in store.receivingResult.rows" :key="i" class="row">
          <span>{{ formatDate(r.date) }}</span>
          <span>{{ r.farmerName }}</span>
          <span>{{ r.itemName }}</span>
          <span>{{ r.quantity.toFixed(1) }}</span>
          <span>฿{{ r.unitPrice.toFixed(1) }}</span>
          <span class="accent">฿{{ r.amount.toLocaleString() }}</span>
        </div>
      </div>
    </template>

    <div v-else class="empty-state">{{ t('setFiltersFirst') }}</div>

    <!-- 農民多選 Modal -->
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

    <!-- 進貨品項單選 Modal -->
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
import { useFarmersStore } from '../../../stores/farmers'
import { useReceivingItemsStore } from '../../../stores/receiving-items'
import { useToastStore } from '../../../stores/toast'
import DatePicker from '../../../components/common/DatePicker.vue'
import TouchSelectorModal from '../../../components/common/TouchSelectorModal.vue'
import { generatePdf, generatePdfBlob } from '../../../utils/pdfExport'
import { sharePdfBlob } from '../../../utils/shareExport'
import { generateExcel } from '../../../utils/excelExport'

const { t } = useI18n()
const store = useInquiryStore()
const farmersStore = useFarmersStore()
const receivingItemsStore = useReceivingItemsStore()
const toast = useToastStore()

const startDate = ref('')
const endDate = ref('')
const selectedFarmerIds = ref<string[]>([])
const selectedItemId = ref('')
const farmerModalOpen = ref(false)
const itemModalOpen = ref(false)
const exporting = ref(false)
const sharingPdf = ref(false)
const exportingExcel = ref(false)

const selectedFarmerNames = computed(() =>
  farmersStore.farmers
    .filter((f) => selectedFarmerIds.value.includes(f.id))
    .map((f) => f.name)
    .join('、'),
)
const selectedItemName = computed(
  () => receivingItemsStore.receivingItems.find((i) => i.id === selectedItemId.value)?.name || '',
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
  store.searchReceiving({
    startDate: startDate.value || undefined,
    endDate: endDate.value || undefined,
    farmerIds: selectedFarmerIds.value.length ? selectedFarmerIds.value.join(',') : undefined,
    receivingItemId: selectedItemId.value || undefined,
  })
}

function resetFilters() {
  startDate.value = ''
  endDate.value = ''
  selectedFarmerIds.value = []
  selectedItemId.value = ''
  store.receivingResult = null
}

function buildPdfOptions() {
  if (!store.receivingResult) return null
  return {
    title: 'รายงานตรวจสอบการรับสินค้า',
    subtitle: `ช่วงวันที่ ${startDate.value || 'ไม่จำกัด'} ~ ${endDate.value || 'ไม่จำกัด'}`,
    columns: [
      { header: 'วันที่', key: 'date' },
      { header: 'เกษตรกร', key: 'farmerName' },
      { header: 'สินค้า', key: 'itemName' },
      { header: 'จำนวน', key: 'quantity', align: 'right' as const },
      { header: 'ราคา/หน่วย', key: 'unitPrice', align: 'right' as const },
      { header: 'จำนวนเงิน', key: 'amount', align: 'right' as const },
    ],
    rows: store.receivingResult.rows.map((r) => ({
      date: formatDate(r.date),
      farmerName: r.farmerName,
      itemName: r.itemName.split('/')[0].trim(),
      quantity: r.quantity.toFixed(1),
      unitPrice: r.unitPrice.toFixed(1),
      amount: r.amount.toLocaleString(),
    })),
    summary: [
      { label: 'จำนวนรวม', value: store.receivingResult.summary.totalQuantity.toFixed(1) },
      { label: 'ยอดเงินรวม', value: `฿${store.receivingResult.summary.totalAmount.toLocaleString()}` },
      { label: 'ราคาเฉลี่ย', value: `฿${store.receivingResult.summary.avgUnitPrice.toFixed(2)}` },
    ],
    fileName: `receiving-inquiry_${new Date().toISOString().slice(0, 10)}.pdf`,
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
    const result = await sharePdfBlob(blob, opts.fileName, '進貨查詢')
    if (!result.shared) toast.showToast('裝置不支援分享，已改為下載 PDF', 'success')
  } catch (e: any) {
    if (e?.name !== 'AbortError') toast.showToast('分享失敗，請重試', 'danger')
  } finally {
    sharingPdf.value = false
  }
}

function exportExcel() {
  if (!store.receivingResult) return
  exportingExcel.value = true
  try {
    generateExcel({
      columns: [
        { header: '日期', key: 'date' },
        { header: '農民', key: 'farmerName' },
        { header: '進貨品項', key: 'itemName' },
        { header: '數量', key: 'quantity' },
        { header: '單價', key: 'unitPrice' },
        { header: '金額', key: 'amount' },
      ],
      rows: store.receivingResult.rows.map((r) => ({
        date: formatDate(r.date),
        farmerName: r.farmerName,
        itemName: r.itemName.split('/')[0].trim(),
        quantity: r.quantity,
        unitPrice: r.unitPrice,
        amount: r.amount,
      })),
      groupKey: (row) => String(row.farmerName),
      sumKeys: ['quantity', 'amount'],
      fileName: `進貨明細查詢_${new Date().toISOString().slice(0, 10)}.xlsx`,
    })
  } finally {
    exportingExcel.value = false
  }
}

onMounted(() => {
  farmersStore.fetchFarmers()
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
.row { display: grid; grid-template-columns: 1fr 1.2fr 1.2fr 0.8fr 0.8fr 1fr; gap: 8px; padding: 10px 14px; font-size: 13px; border-bottom: 1px solid var(--color-border); min-width: 680px; }
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
