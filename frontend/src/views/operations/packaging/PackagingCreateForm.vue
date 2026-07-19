<template>
  <div class="pkg-create">
    <button class="btn-close" @click="$emit('close')">✕ {{ t('cancel') }}</button>

    <!-- 步驟條 -->
    <div class="step-bar">
      <div v-for="(s, i) in steps" :key="i" class="step-dot"
        :class="{ active: currentStep === i, done: currentStep > i }">
        <span class="dot-circle">{{ currentStep > i ? '✓' : i + 1 }}</span>
        <span class="dot-label">{{ s }}</span>
      </div>
    </div>

    <!-- Step 0：日期 -->
    <div v-if="currentStep === 0" class="step-content">
      <div class="step-title">{{ t('selectDate') }}</div>
      <div class="date-selects">
        <select v-model="dateDay" class="date-sel">
          <option v-for="d in 31" :key="d" :value="d">{{ d }}</option>
        </select>
        <span class="date-sep">/</span>
        <select v-model="dateMonth" class="date-sel">
          <option v-for="m in 12" :key="m" :value="m">{{ m }}</option>
        </select>
        <span class="date-sep">/</span>
        <select v-model="dateYear" class="date-sel date-sel-year">
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>
    </div>

    <!-- Step 1：員工 -->
    <div v-else-if="currentStep === 1" class="step-content">
      <div class="step-title">{{ t('selectEmployee') }}</div>
      <button class="select-btn big" @click="showEmployeeModal = true">
        <div v-if="selectedEmployee" class="selected-item">
          <div class="sel-avatar" :style="{ background: getColor(selectedEmployee.id) }">
            <img v-if="selectedEmployee.imageUrl" :src="selectedEmployee.imageUrl" class="sel-img" />
            <span v-else>{{ selectedEmployee.id.slice(0, 2) }}</span>
          </div>
          <div class="sel-info">
            <div class="sel-id">{{ selectedEmployee.id }}</div>
            <div class="sel-name">{{ selectedEmployee.name }}</div>
          </div>
        </div>
        <span v-else class="placeholder-text">{{ t('tapToSelect') }}</span>
      </button>
      <TouchSelectorModal v-if="showEmployeeModal" :title="t('selectEmployee')" :items="employees"
        :model-value="form.employeeId"
        @select="e => { selectedEmployee = e; form.employeeId = e.id; showEmployeeModal = false }"
        @close="showEmployeeModal = false" />
    </div>

    <!-- Step 2：包裝項目 -->
    <div v-else-if="currentStep === 2" class="step-content">
      <div class="step-title">{{ t('selectPackagingItem') }}</div>
      <button class="select-btn big" @click="showItemModal = true">
        <div v-if="selectedItem" class="selected-item">
          <div class="sel-avatar" :style="{ background: getColor(selectedItem.id) }">
            <img v-if="selectedItem.imageUrl" :src="selectedItem.imageUrl" class="sel-img" />
            <span v-else>{{ selectedItem.id.slice(0, 2) }}</span>
          </div>
          <div class="sel-info">
            <div class="sel-id">{{ selectedItem.id }}</div>
            <div class="sel-name">{{ selectedItem.name }}</div>
          </div>
        </div>
        <span v-else class="placeholder-text">{{ t('tapToSelect') }}</span>
      </button>
      <TouchSelectorModal v-if="showItemModal" :title="t('selectPackagingItem')" :items="packagingItems"
        :model-value="form.itemId"
        @select="p => { selectedItem = p; form.itemId = p.id; form.wageRate = p.wageRate ? String(p.wageRate) : ''; showItemModal = false }"
        @close="showItemModal = false" />
    </div>

    <!-- Step 3：數量 + 工資 -->
    <div v-else-if="currentStep === 3" class="step-content">
      <div class="step-title">{{ t('inputQuantities') }}</div>
      <div class="input-tabs">
        <button class="input-tab" :class="{ active: activeField === 'quantity' }" @click="openModal('quantity')">
          <span class="tab-label">{{ quantityLabel }}</span>
          <span class="tab-value" :class="{ accent: form.quantity }">{{ form.quantity || '0' }}</span>
        </button>
        <button class="input-tab" :class="{ active: activeField === 'wageRate' }" @click="openModal('wageRate')">
          <span class="tab-label">{{ t('wageRate') }}</span>
          <span class="tab-value" :class="{ accent: form.wageRate }">{{ form.wageRate || '0' }}</span>
        </button>
      </div>
      <div class="amount-preview" v-if="calcAmount() > 0">
        {{ t('amount') }}：<strong class="accent">฿{{ calcAmount().toLocaleString() }}</strong>
      </div>
    </div>

    <!-- Step 4：確認 + 銷售單關聯 -->
    <div v-else-if="currentStep === 4" class="step-content">
      <div class="step-title">{{ t('stepConfirm') }}</div>
      <div class="summary-card">
        <div class="summary-row">
          <span class="summary-label">{{ t('date') }}</span>
          <span class="summary-value accent">{{ formatDate(orderDate) }}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">{{ t('employee') }}</span>
          <span class="summary-value">{{ selectedEmployee?.name }}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">{{ t('packagingItem') }}</span>
          <span class="summary-value">{{ selectedItem?.name }}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">{{ quantityLabel }}</span>
          <span class="summary-value">{{ form.quantity }}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">{{ t('wageRate') }}</span>
          <span class="summary-value">{{ form.wageRate }}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">{{ t('amount') }}</span>
          <span class="summary-value accent">฿{{ calcAmount().toLocaleString() }}</span>
        </div>
      </div>

      <!-- 銷售單關聯（SALES_ORDER 類型） -->
      <div v-if="selectedItem?.applicableTo !== 'RECEIVING_ORDER'" class="sales-link-section">
        <div class="sales-link-title">{{ t('linkSalesOrder') }}</div>
        <button class="sales-select-btn" @click="showSalesModal = true">
          <div v-if="selectedSalesOrder" class="sales-selected">
            <span class="sales-id accent">{{ selectedSalesOrder.id }}</span>
            <span class="sales-info">{{ formatDate(selectedSalesOrder.orderDate) }} · {{ selectedSalesOrder.customer?.name }}</span>
            <button class="btn-clear-sales" @click.stop="selectedSalesOrder = null; form.salesOrderId = ''">✕</button>
          </div>
          <span v-else class="sales-placeholder">{{ t('skipOrSelect') }}</span>
        </button>
      </div>

      <!-- 進貨單關聯（RECEIVING_ORDER 類型，K01/K02/K04） -->
      <div v-else class="sales-link-section">
        <div class="sales-link-title">{{ t('linkReceivingOrder') }} <span class="required">*</span></div>
        <button class="sales-select-btn" @click="showReceivingModal = true">
          <div v-if="selectedReceivingOrder" class="sales-selected">
            <span class="sales-id accent">{{ selectedReceivingOrder.id }}</span>
            <span class="sales-info">{{ formatDate(selectedReceivingOrder.orderDate) }} · {{ selectedReceivingOrder.receivingItem?.name }}</span>
          </div>
          <span v-else class="sales-placeholder">{{ t('tapToSelect') }}</span>
        </button>
      </div>

      <!-- 儲存成功後的繼續選項 -->
      <div v-if="savedOrderId" class="continue-box">
        <div class="continue-msg">✅ {{ t('savedSuccess') }}</div>
        <div class="continue-btns">
          <button class="btn-continue" @click="continueAdd">+ {{ t('continueAdd') }}</button>
          <button class="btn-done" @click="$emit('created', savedOrderId)">{{ t('done') }}</button>
        </div>
      </div>
    </div>

    <!-- 銷售單選取 Modal -->
    <div v-if="showSalesModal" class="sales-modal-overlay" @click.self="showSalesModal = false">
      <div class="sales-modal">
        <div class="sales-modal-header">
          <span>{{ t('linkSalesOrder') }}</span>
          <button @click="showSalesModal = false">✕</button>
        </div>
        <div class="sales-modal-search">
          <input v-model="salesSearch" class="search-input" :placeholder="t('searchIdOrName')" autofocus />
        </div>
        <div class="sales-modal-list">
          <div v-if="filteredSalesOrders.length === 0" class="empty-modal">{{ t('noOrders') }}</div>
          <div v-for="s in filteredSalesOrders" :key="s.id"
            class="sales-modal-item" :class="{ active: form.salesOrderId === s.id }"
            @click="selectSalesOrder(s)">
            <div class="smi-top">
              <div>
                <div class="smi-id accent">{{ s.id }}</div>
                <div class="smi-info">{{ formatDate(s.orderDate) }} · {{ s.customer?.name }}</div>
              </div>
              <!-- 已選取則顯示 linked badge，未選取才顯示標記完成 -->
              <button v-if="form.salesOrderId !== s.id" class="btn-mark-done" @click.stop="markPackagingDone(s.id)">
                ✓ {{ t('markPackagingDone') }}
              </button>
              <span v-else class="badge-linked">✔ {{ t('selected') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 進貨單選取 Modal -->
    <div v-if="showReceivingModal" class="sales-modal-overlay" @click.self="showReceivingModal = false">
      <div class="sales-modal">
        <div class="sales-modal-header">
          <span>{{ t('linkReceivingOrder') }}</span>
          <button @click="showReceivingModal = false">✕</button>
        </div>
        <div class="sales-modal-search">
          <input v-model="receivingSearch" class="search-input" :placeholder="t('searchIdOrName')" autofocus />
        </div>
        <div class="sales-modal-list">
          <div v-if="filteredReceivingOrders.length === 0" class="empty-modal">{{ t('noOrders') }}</div>
          <div v-for="r in filteredReceivingOrders" :key="r.id"
            class="sales-modal-item" :class="{ active: form.receivingOrderId === r.id }"
            @click="selectReceivingOrder(r)">
            <div class="smi-top">
              <div>
                <div class="smi-id accent">{{ r.id }}</div>
                <div class="smi-info">{{ formatDate(r.orderDate) }} · {{ r.receivingItem?.name }}</div>
              </div>
              <span v-if="form.receivingOrderId === r.id" class="badge-linked">✔ {{ t('selected') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部按鈕 -->
    <div class="step-actions" v-if="!savedOrderId">
      <button class="btn-secondary" @click="onPrev" :disabled="currentStep === 0">← {{ t('prev') }}</button>
      <button v-if="currentStep < steps.length - 1"
        class="btn-primary" @click="onNext" :disabled="!canNext">
        {{ t('next') }} →
      </button>
      <button v-else-if="currentStep === steps.length - 1"
        class="btn-primary" @click="onSubmit" :disabled="!canNext || submitting">
        {{ submitting ? t('saving') : t('save') }}
      </button>
    </div>

    <!-- 正中央 Modal 鍵盤 -->
    <NumericInputModal
      :show="modalOpen"
      mode="decimal"
      :label="modalLabel"
      :model-value="form[modalField]"
      @confirm="onModalConfirm"
      @close="modalOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToastStore } from '../../../stores/toast'
import { useAuthStore } from '../../../stores/auth'
import { createPackagingOrder, createPackagingDetail } from '../../../api/packaging'
import { toggleSalesPackagingDone } from '../../../api/sales'
import TouchSelectorModal from '../../../components/common/TouchSelectorModal.vue'
import NumericInputModal from '../../../components/common/NumericInputModal.vue'

const { t } = useI18n()
const toast = useToastStore()
const auth = useAuthStore()
const emit = defineEmits<{ close: []; created: [orderId: string] }>()

const steps = computed(() => [
  t('selectDate'), t('employee'), t('packagingItem'), t('inputQuantities'), t('stepConfirm'),
])
const currentStep = ref(0)
const submitting = ref(false)
const savedOrderId = ref('')
const existingOrderId = ref('')

// 日期
const now = new Date()
const dateDay = ref(now.getDate())
const dateMonth = ref(now.getMonth() + 1)
const dateYear = ref(now.getFullYear())
const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)
const orderDate = ref('')
watch([dateDay, dateMonth, dateYear], () => {
  const y = dateYear.value
  const m = String(dateMonth.value).padStart(2, '0')
  const d = String(dateDay.value).padStart(2, '0')
  orderDate.value = `${y}-${m}-${d}`
}, { immediate: true })

// 表單
const form = ref<Record<string, string>>({ employeeId: '', itemId: '', quantity: '', wageRate: '', salesOrderId: '', receivingOrderId: '' })
const selectedEmployee = ref<any>(null)
const selectedItem = ref<any>(null)
const selectedSalesOrder = ref<any>(null)
const selectedReceivingOrder = ref<any>(null)
const quantityLabel = computed(() => selectedItem.value?.id === 'K04' ? t('weight') : t('packagingQty'))
const activeField = ref<'quantity' | 'wageRate'>('quantity')
const modalOpen = ref(false)
const modalField = ref<'quantity' | 'wageRate'>('quantity')
function openModal(f: 'quantity' | 'wageRate') { activeField.value = f; modalField.value = f; modalOpen.value = true }
const modalLabel = computed(() => modalField.value === 'quantity' ? t('packagingQty') : t('wageRate'))
function onModalConfirm(val: string) { form.value[modalField.value] = val; modalOpen.value = false }

// Modal
const showEmployeeModal = ref(false)
const showItemModal = ref(false)
const showSalesModal = ref(false)
const showReceivingModal = ref(false)
const salesSearch = ref('')
const receivingSearch = ref('')
const employees = ref<any[]>([])
const packagingItems = ref<any[]>([])
const salesOrders = ref<any[]>([])
const receivingOrders = ref<any[]>([])

const filteredSalesOrders = computed(() => {
  const q = salesSearch.value.toLowerCase()
  if (!q) return salesOrders.value
  return salesOrders.value.filter(s =>
    s.id.toLowerCase().includes(q) ||
    s.customer?.name?.toLowerCase().includes(q)
  )
})

const filteredReceivingOrders = computed(() => {
  const q = receivingSearch.value.toLowerCase()
  if (!q) return receivingOrders.value
  return receivingOrders.value.filter(r =>
    r.id.toLowerCase().includes(q) ||
    r.receivingItem?.name?.toLowerCase().includes(q)
  )
})

const COLORS = ['#e8820c', '#2dd4bf', '#818cf8', '#f472b6', '#34d399', '#60a5fa']
function getColor(id: string) {
  return COLORS[id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 6]
}
function formatDate(d: string) {
  if (!d) return ''
  const s = d.slice(0, 10)
  const [y, m, day] = s.split('-')
  return `${parseInt(day)}/${parseInt(m)}/${y.slice(2)}`
}
function calcAmount() {
  return Math.floor(Number(form.value.quantity) * Number(form.value.wageRate))
}

function selectSalesOrder(s: any) {
  selectedSalesOrder.value = s
  form.value.salesOrderId = s.id
  showSalesModal.value = false
}

function selectReceivingOrder(r: any) {
  selectedReceivingOrder.value = r
  form.value.receivingOrderId = r.id
  showReceivingModal.value = false
}

async function markPackagingDone(salesOrderId: string) {
  try {
    await toggleSalesPackagingDone(salesOrderId, true)
    toast.showToast(t('packagingMarkedDone'), 'success')
    // 移除出選單
    salesOrders.value = salesOrders.value.filter(s => s.id !== salesOrderId)
    // 若目前已選取該項則清除
    if (form.value.salesOrderId === salesOrderId) {
      form.value.salesOrderId = ''
      selectedSalesOrder.value = null
    }
  } catch { toast.showToast(t('saveFailed'), 'error') }
}



const canNext = computed(() => {
  if (currentStep.value === 0) return !!orderDate.value
  if (currentStep.value === 1) return !!form.value.employeeId
  if (currentStep.value === 2) return !!form.value.itemId
  if (currentStep.value === 3) return Number(form.value.quantity) > 0 && Number(form.value.wageRate) > 0
  if (currentStep.value === 4 && selectedItem.value?.applicableTo === 'RECEIVING_ORDER') {
    return !!form.value.receivingOrderId
  }
  return true
})

function onNext() { if (canNext.value) currentStep.value++ }
function onPrev() { if (currentStep.value > 0) currentStep.value-- }

async function onSubmit() {
  submitting.value = true
  try {
    let orderId = existingOrderId.value
    if (!orderId) {
      const isReceivingType = selectedItem.value?.applicableTo === 'RECEIVING_ORDER'
      const orderRes = await createPackagingOrder({
        orderDate: orderDate.value,
        salesOrderId: isReceivingType ? undefined : (form.value.salesOrderId || undefined),
        receivingOrderId: isReceivingType ? form.value.receivingOrderId : undefined,
      })
      orderId = orderRes.data.id
      existingOrderId.value = orderId
    }
    await createPackagingDetail({
      orderId,
      employeeId: form.value.employeeId,
      itemId: form.value.itemId,
      quantity: Number(form.value.quantity),
      wageRate: Number(form.value.wageRate),
    })
    savedOrderId.value = orderId
    toast.showToast(t('savedSuccess'), 'success')
  } catch (e: any) {
    toast.showToast(e?.response?.data?.message || t('saveFailed'), 'error')
  } finally { submitting.value = false }
}

function continueAdd() {
  form.value.quantity = ''
  form.value.wageRate = selectedItem.value?.wageRate ? String(selectedItem.value.wageRate) : ''
  activeField.value = 'quantity'
  savedOrderId.value = ''
  currentStep.value = 1
}

async function loadMasterData() {
  try {
    const headers = { Authorization: `Bearer ${auth.token}` }
    const [eRes, iRes, sRes, rRes] = await Promise.all([
      fetch('/api/master-data/employees', { headers }),
      fetch('/api/master-data/packaging-items', { headers }),
      fetch('/api/sales/orders', { headers }),
      fetch('/api/packaging/orders/available-receiving-orders', { headers }),
    ])
    if (eRes.ok) employees.value = (await eRes.json()).filter((e: any) => !e.isDeleted)
    if (iRes.ok) packagingItems.value = (await iRes.json()).filter((i: any) => !i.isDeleted)
    if (sRes.ok) salesOrders.value = (await sRes.json()).filter((s: any) => !s.isDeleted && !s.packagingDone)
    if (rRes.ok) receivingOrders.value = await rRes.json()
  } catch {}
}
onMounted(loadMasterData)
</script>

<style scoped>
.pkg-create { padding: 16px; padding-bottom: 120px; }
.btn-close { position: fixed; top: 62px; right: 16px; z-index: 20; background: none; border: 1px solid var(--color-border); border-radius: 8px; padding: 7px 12px; color: var(--color-text-muted); font-size: 13px; cursor: pointer; transition: all 0.15s; }
.btn-close:hover { border-color: var(--color-danger); color: var(--color-danger); }
.step-bar { display: flex; gap: 4px; margin-bottom: 24px; overflow-x: auto; }
.step-dot { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; min-width: 52px; }
.dot-circle { width: 28px; height: 28px; border-radius: 50%; background: var(--color-surface); border: 2px solid var(--color-border); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: var(--color-text-muted); transition: all 0.18s; }
.step-dot.active .dot-circle { background: var(--color-accent); border-color: var(--color-accent); color: #fff; }
.step-dot.done .dot-circle { background: var(--color-success); border-color: var(--color-success); color: #fff; }
.dot-label { font-size: 10px; color: var(--color-text-muted); text-align: center; white-space: nowrap; }
.step-dot.active .dot-label { color: var(--color-accent); font-weight: 600; }
.step-content { margin-bottom: 20px; }
.step-title { font-size: 16px; font-weight: 700; margin-bottom: 16px; }
.date-selects { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.date-sel { flex: 1; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 10px; padding: 14px 10px; color: var(--color-text); font-size: 16px; appearance: none; text-align: center; cursor: pointer; }
.date-sel:focus { outline: none; border-color: var(--color-accent); }
.date-sel-year { flex: 1.8; }
.date-sep { font-size: 20px; font-weight: 700; color: var(--color-text-muted); }
.select-btn { width: 100%; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; padding: 14px 16px; color: var(--color-text); font-size: 15px; text-align: left; cursor: pointer; transition: border-color 0.15s; }
.select-btn.big { min-height: 72px; display: flex; align-items: center; gap: 12px; }
.select-btn:hover { border-color: var(--color-accent); }
.placeholder-text { color: var(--color-text-muted); }
.selected-item { display: flex; align-items: center; gap: 12px; }
.sel-avatar { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: #fff; flex-shrink: 0; overflow: hidden; }
.sel-img { width: 100%; height: 100%; object-fit: cover; }
.sel-id { font-size: 11px; color: var(--color-text-muted); }
.sel-name { font-size: 15px; font-weight: 700; }
.input-tabs { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 10px; }
.input-tab { display: flex; flex-direction: column; align-items: center; gap: 4px; background: var(--color-surface); border: 2px solid var(--color-border); border-radius: 10px; padding: 10px 6px; cursor: pointer; transition: all 0.15s; }
.input-tab.active { border-color: var(--color-accent); background: rgba(232,130,12,0.08); }
.tab-label { font-size: 10px; color: var(--color-text-muted); text-transform: uppercase; font-weight: 600; }
.tab-value { font-size: 18px; font-weight: 700; color: var(--color-text-dim); }
.tab-value.accent { color: var(--color-accent); }
.amount-preview { font-size: 14px; color: var(--color-text-muted); margin-bottom: 8px; }
.accent { color: var(--color-accent); }
.inline-keypad { margin-top: 8px; }
.inline-keypad-display { font-size: 32px; font-weight: 700; text-align: right; padding: 8px 12px; color: var(--color-text); min-height: 52px; border-bottom: 1px solid var(--color-border); margin-bottom: 8px; }
.inline-keypad-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.ik-btn { height: 52px; display: flex; align-items: center; justify-content: center; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 10px; color: var(--color-text); font-size: 20px; font-weight: 500; cursor: pointer; transition: background 0.1s; }
.ik-btn:active { background: var(--color-surface-hover); }
.ik-secondary { color: var(--color-text-muted); font-size: 16px; }
.ik-confirm { background: var(--color-accent); border-color: var(--color-accent-dim); color: #fff; font-size: 15px; font-weight: 700; }
.ik-confirm:disabled { opacity: 0.35; cursor: not-allowed; }
.ik-span2 { grid-column: span 2; }
.summary-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; overflow: hidden; margin-bottom: 14px; }
.summary-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--color-border); }
.summary-row:last-child { border-bottom: none; }
.summary-label { font-size: 13px; color: var(--color-text-muted); }
.summary-value { font-size: 15px; font-weight: 700; }
/* 銷售單關聯 */
.sales-link-section { margin-bottom: 14px; }
.sales-link-title { font-size: 11px; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; }
.sales-select-btn { width: 100%; background: var(--color-surface); border: 1px dashed var(--color-border); border-radius: 10px; padding: 14px 16px; text-align: left; cursor: pointer; transition: border-color 0.15s; display: flex; align-items: center; justify-content: space-between; }
.sales-select-btn:hover { border-color: var(--color-accent); }
.sales-selected { display: flex; align-items: center; gap: 10px; width: 100%; }
.sales-id { font-size: 14px; font-weight: 700; flex-shrink: 0; }
.sales-info { font-size: 12px; color: var(--color-text-muted); flex: 1; }
.btn-clear-sales { background: none; border: none; color: var(--color-text-muted); font-size: 14px; cursor: pointer; padding: 2px 6px; flex-shrink: 0; }
.btn-clear-sales:hover { color: var(--color-danger); }
.sales-placeholder { color: var(--color-text-muted); font-size: 14px; }
/* 銷售單 Modal */
.sales-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 300; display: flex; align-items: flex-end; }
.sales-modal { width: 100%; max-height: 70vh; background: var(--color-drawer); border-radius: 16px 16px 0 0; display: flex; flex-direction: column; }
.sales-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px; border-bottom: 1px solid var(--color-border); font-size: 15px; font-weight: 700; }
.sales-modal-header button { background: none; border: none; color: var(--color-text-muted); font-size: 18px; cursor: pointer; }
.sales-modal-search { padding: 10px 16px; border-bottom: 1px solid var(--color-border); }
.search-input { width: 100%; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; padding: 10px 14px; font-size: 14px; color: var(--color-text); font-family: inherit; }
.search-input:focus { outline: none; border-color: var(--color-accent); }
.sales-modal-list { flex: 1; overflow-y: auto; padding: 8px 12px; display: flex; flex-direction: column; gap: 6px; }
.sales-modal-item { background: var(--color-card); border: 1px solid var(--color-border); border-radius: 10px; padding: 12px 14px; cursor: pointer; transition: all 0.15s; }
.sales-modal-item:hover, .sales-modal-item.active { border-color: var(--color-accent); background: var(--color-card-hover); }
.smi-id { font-size: 14px; font-weight: 700; margin-bottom: 3px; }
.smi-info { font-size: 12px; color: var(--color-text-muted); }
.smi-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.btn-mark-done { background: rgba(45,212,191,0.1); border: 1px solid rgba(45,212,191,0.3); color: var(--color-success); border-radius: 6px; padding: 5px 10px; font-size: 11px; font-weight: 700; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
.btn-mark-done:hover { background: rgba(45,212,191,0.2); }
.badge-linked { background: rgba(232,130,12,0.15); border: 1px solid rgba(232,130,12,0.3); color: var(--color-accent); border-radius: 6px; padding: 5px 10px; font-size: 11px; font-weight: 700; white-space: nowrap; flex-shrink: 0; }
.empty-modal { text-align: center; padding: 30px; color: var(--color-text-muted); font-size: 14px; }
/* 繼續 */
.continue-box { background: rgba(45,212,191,0.08); border: 1px solid rgba(45,212,191,0.3); border-radius: 12px; padding: 16px; margin-top: 14px; }
.continue-msg { font-size: 14px; color: var(--color-success); font-weight: 600; margin-bottom: 12px; }
.continue-btns { display: flex; gap: 10px; }
.btn-continue { flex: 1; background: var(--color-accent); color: #fff; border: none; border-radius: 10px; padding: 12px; font-size: 14px; font-weight: 700; cursor: pointer; }
.btn-done { flex: 1; background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 10px; padding: 12px; font-size: 14px; font-weight: 600; cursor: pointer; }
.step-actions { position: fixed; bottom: 64px; left: 0; right: 0; display: flex; gap: 12px; padding: 12px 16px; background: var(--color-bg); border-top: 1px solid var(--color-border); z-index: 10; }
.btn-primary { flex: 1; background: var(--color-accent); color: #fff; border: none; border-radius: 10px; padding: 13px; font-size: 15px; font-weight: 700; cursor: pointer; transition: opacity 0.15s; }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-secondary { flex: 1; background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 10px; padding: 13px; font-size: 15px; font-weight: 600; cursor: pointer; }
.btn-secondary:disabled { opacity: 0.3; cursor: not-allowed; }
</style>
