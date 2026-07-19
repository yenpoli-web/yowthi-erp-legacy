<template>
  <div class="sales-create">
    <button class="btn-close" @click="$emit('close')">✕ {{ t('cancel') }}</button>

    <div class="step-bar">
      <div v-for="(s, i) in steps" :key="i" class="step-dot"
        :class="{ active: currentStep === i, done: currentStep > i }">
        <span class="dot-circle">{{ currentStep > i ? '✓' : i + 1 }}</span>
        <span class="dot-label">{{ s }}</span>
      </div>
    </div>

    <!-- Step 0：選取日期 -->
    <div v-if="currentStep === 0" class="step-content">
      <div class="step-title">{{ t('stepSelectDate') }}</div>
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

    <!-- Step 1：選取客戶 -->
    <div v-else-if="currentStep === 1" class="step-content">
      <div class="step-title">{{ t('stepSelectCustomer') }}</div>
      <button class="select-btn big" @click="showCustomerModal = true">
        <div v-if="selectedCustomer" class="selected-item">
          <div class="sel-avatar" :style="{ background: getAvatarColor(selectedCustomer.id) }">
            {{ selectedCustomer.id.slice(0, 2) }}
          </div>
          <div class="sel-info">
            <div class="sel-id">{{ selectedCustomer.id }}</div>
            <div class="sel-name">{{ selectedCustomer.name }}</div>
          </div>
        </div>
        <span v-else class="placeholder-text">{{ t('selectCustomer') }}</span>
      </button>
      <TouchSelectorModal
        v-if="showCustomerModal"
        :title="t('selectCustomer')"
        :items="customers"
        :model-value="form.customerId"
        @select="c => { selectedCustomer = c; form.customerId = c.id; showCustomerModal = false }"
        @close="showCustomerModal = false"
      />
    </div>

    <!-- Step 2：新增銷售明細 -->
    <div v-else-if="currentStep === 2" class="step-content">
      <div class="step-title">{{ t('stepAddDetails') }}</div>

      <!-- H02 / H03 銷售類型選擇 -->
      <div class="filter-row">
        <button class="type-btn" :class="{ active: salesType === 'H02' }"
          @click="onSalesTypeChange('H02')">
          H02 {{ t('exportSales') }}
        </button>
        <button class="type-btn" :class="{ active: salesType === 'H03' }"
          @click="onSalesTypeChange('H03')">
          H03 {{ t('domesticSales') }}
        </button>
      </div>

      <!-- 已新增明細列表 -->
      <div v-if="details.length > 0" class="detail-list">
        <div v-for="(d, i) in details" :key="i" class="detail-row">
          <div class="detail-row-info">
            <span class="detail-product">{{ d.productName }}</span>
            <span class="detail-type-badge" :class="d.salesType === 'H02' ? 'h02' : 'h03'">{{ d.salesType }}</span>
            <span class="detail-nums" v-if="d.salesType === 'H02'">
              {{ d.weight }}kg × {{ d.quantity }} × ฿{{ d.unitPrice }} =
              <strong class="accent">฿{{ d.amount.toLocaleString() }}</strong>
            </span>
            <span class="detail-nums" v-else>
              {{ d.quantity }} {{ t('units') }} × ฿{{ d.unitPrice }} =
              <strong class="accent">฿{{ d.amount.toLocaleString() }}</strong>
            </span>
          </div>
          <button class="btn-icon-danger" @click="details.splice(i, 1)">✕</button>
        </div>
      </div>

      <!-- 新增表單 -->
      <div class="add-detail-form">
        <button class="product-select-btn" @click="showProductModal = true">
          <span class="product-label">{{ t('product') }}</span>
          <span class="product-value" :class="{ accent: newDetail.productId }">
            {{ newDetail.productName || t('selectProduct') }}
          </span>
        </button>

        <!-- H02: 重量 × 數量 × 單價 | H03: 數量 × 單價 -->
        <div class="input-tabs" v-if="salesType === 'H02'">
          <button class="input-tab" :class="{ active: activeField === 'weight' }" @click="openModal('weight')">
            <span class="tab-label">{{ t('weight') }} (kg)</span>
            <span class="tab-value" :class="{ accent: newDetail.weight }">{{ newDetail.weight || '0' }}</span>
          </button>
          <button class="input-tab" :class="{ active: activeField === 'quantity' }" @click="openModal('quantity')">
            <span class="tab-label">{{ t('salesQty') }}</span>
            <span class="tab-value" :class="{ accent: newDetail.quantity }">{{ newDetail.quantity || '0' }}</span>
          </button>
          <button class="input-tab" :class="{ active: activeField === 'unitPrice' }" @click="openModal('unitPrice')">
            <span class="tab-label">{{ t('unitPrice') }} (฿)</span>
            <span class="tab-value" :class="{ accent: newDetail.unitPrice }">{{ newDetail.unitPrice || '0' }}</span>
          </button>
        </div>
        <div class="input-tabs" v-else>
          <button class="input-tab ik-span2-tab" :class="{ active: activeField === 'quantity' }" @click="openModal('quantity')">
            <span class="tab-label">{{ t('salesQty') }}</span>
            <span class="tab-value" :class="{ accent: newDetail.quantity }">{{ newDetail.quantity || '0' }}</span>
          </button>
          <button class="input-tab" :class="{ active: activeField === 'unitPrice' }" @click="openModal('unitPrice')">
            <span class="tab-label">{{ t('unitPrice') }} (฿)</span>
            <span class="tab-value" :class="{ accent: newDetail.unitPrice }">{{ newDetail.unitPrice || '0' }}</span>
          </button>
        </div>

        <div class="amount-preview" v-if="newDetail.quantity && newDetail.unitPrice">
          {{ t('amount') }}：<strong class="accent">฿{{ calcNewDetailAmount().toLocaleString() }}</strong>
        </div>

        <button class="btn-add-detail-confirm" @click="addDetail" :disabled="!canAddDetail">
          ✓ {{ t('addSalesDetail') }}
        </button>
      </div>

      <TouchSelectorModal
        v-if="showProductModal"
        :title="t('selectProduct')"
        :items="filteredProducts"
        :model-value="newDetail.productId"
        @select="p => { newDetail.productId = p.id; newDetail.productName = p.name; if (p.unitWeight && salesType === 'H02') { newDetail.weight = String(p.unitWeight) }; showProductModal = false }"
        @close="showProductModal = false"
      />

      <!-- 正中央 Modal 鍵盤 -->
      <NumericInputModal
        :show="modalOpen"
        mode="decimal"
        :label="modalLabel"
        :model-value="newDetail[modalField]"
        @confirm="onModalConfirm"
        @close="modalOpen = false"
      />
    </div>

    <!-- Step 3：選取庫存明細（跟隨 salesType 自動篩選） -->
    <div v-else-if="currentStep === 3" class="step-content">
      <div class="step-title">{{ t('stepSelectInventory') }}</div>

      <!-- 目前篩選類型提示 -->
      <div class="type-indicator">
        <span class="type-badge-sm" :class="salesType === 'H02' ? 'h02' : 'h03'">
          {{ salesType }} · {{ salesType === 'H02' ? t('exportSales') : t('domesticSales') }}
        </span>
        <span class="type-hint">{{ t('invAutoFilter') }}</span>
      </div>

      <div v-if="loadingAvailable" class="loading-small">
        <div class="spinner-small"></div>
      </div>
      <template v-else>
        <div v-if="availableInventoryDetails.length === 0" class="empty-small">{{ t('noInventory') }}</div>
        <div
          v-for="detail in availableInventoryDetails"
          :key="detail.id"
          class="inventory-card"
          :class="{ selected: isInventorySelected(detail.id) }"
          @click="toggleInventorySelect(detail)"
        >
          <div class="inv-avatar">
            <img v-if="detail.productImageUrl" :src="detail.productImageUrl" />
            <span v-else>{{ detail.productName?.slice(0, 2) }}</span>
          </div>
          <div class="inv-info">
            <div class="inv-product accent">{{ detail.productName }}</div>
            <div class="inv-order">{{ detail.orderId }} · {{ detail.orderDate }}</div>
            <div class="inv-qty">{{ t('availableQty') }}：{{ detail.availableQty }} {{ t('units') }}</div>
            <div v-if="detail.unitWeight" class="inv-weight">{{ detail.unitWeight }} kg/{{ t('units') }}</div>
          </div>
          <div class="inv-check" v-if="isInventorySelected(detail.id)">✓</div>
        </div>
      </template>
      <div class="selected-count" v-if="selectedInventory.length > 0">
        ✓ {{ selectedInventory.length }} {{ t('records') }} {{ t('selected') }}
      </div>
    </div>

    <!-- Step 4：確認摘要 -->
    <div v-else-if="currentStep === 4" class="step-content">
      <div class="step-title">{{ t('stepConfirm') }}</div>
      <div class="summary-card">
        <div class="summary-row">
          <span class="summary-label">{{ t('date') }}</span>
          <span class="summary-value accent">{{ form.orderDate ? formatDate(form.orderDate) : '-' }}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">{{ t('customer') }}</span>
          <span class="summary-value">{{ selectedCustomer?.name || '-' }}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">{{ t('salesDetails') }}</span>
          <span class="summary-value">{{ details.length }} {{ t('records') }}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">{{ t('totalAmount') }}</span>
          <span class="summary-value accent">฿{{ totalAmount.toLocaleString() }}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">{{ t('linkedInventory') }}</span>
          <span class="summary-value">{{ selectedInventory.length }} {{ t('records') }}</span>
        </div>
      </div>
      <div class="detail-summary" v-if="details.length > 0">
        <div class="section-label">{{ t('salesDetails') }}</div>
        <div v-for="(d, i) in details" :key="i" class="summary-detail-row">
          <span>{{ d.productName }} <span class="type-badge-sm" :class="d.salesType === 'H02' ? 'h02' : 'h03'">{{ d.salesType }}</span></span>
          <span class="accent">฿{{ d.amount.toLocaleString() }}</span>
        </div>
      </div>
    </div>

    <!-- 底部按鈕 -->
    <div class="step-actions">
      <button class="btn-secondary" @click="onPrev" :disabled="currentStep === 0">← {{ t('prev') }}</button>
      <button v-if="currentStep < steps.length - 1" class="btn-primary" @click="onNext" :disabled="!canNext">
        {{ currentStep === 2 && (details.length > 0 || canAddDetail) ? `${details.length + (canAddDetail ? 1 : 0)} ${t('records')} · ` : '' }}{{ t('next') }} →
      </button>
      <button v-else class="btn-primary" @click="onSubmit" :disabled="submitting">
        {{ submitting ? t('saving') : t('save') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToastStore } from '../../../stores/toast'
import { useAuthStore } from '../../../stores/auth'
import {
  createSalesOrder, createSalesDetail,
  getAvailableInventoryDetails, addSalesInventoryDetails,
} from '../../../api/sales'
import TouchSelectorModal from '../../../components/common/TouchSelectorModal.vue'
import NumericInputModal from '../../../components/common/NumericInputModal.vue'

const { t } = useI18n()
const toast = useToastStore()
const auth = useAuthStore()

const emit = defineEmits<{ close: []; created: [orderId: string] }>()

const steps = computed(() => [
  t('stepSelectDate'),
  t('stepSelectCustomer'),
  t('stepAddDetails'),
  t('stepSelectInventory'),
  t('stepConfirm'),
])

const currentStep = ref(0)
const submitting = ref(false)

// 日期
const now = new Date()
const dateDay = ref(now.getDate())
const dateMonth = ref(now.getMonth() + 1)
const dateYear = ref(now.getFullYear())
const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)

const form = ref({ orderDate: '', customerId: '' })
const selectedCustomer = ref<any>(null)

watch([dateDay, dateMonth, dateYear], () => {
  const y = dateYear.value
  const m = String(dateMonth.value).padStart(2, '0')
  const d = String(dateDay.value).padStart(2, '0')
  form.value.orderDate = `${y}-${m}-${d}`
}, { immediate: true })

// 銷售類型
const salesType = ref<'H02' | 'H03'>('H02')

function onSalesTypeChange(type: 'H02' | 'H03') {
  salesType.value = type
  newDetail.value = { productId: '', productName: '', weight: '', quantity: '', unitPrice: '' }
  activeField.value = salesType.value === 'H02' ? 'weight' : 'quantity'
}

// 依類型篩選商品
const filteredProducts = computed(() => {
  const typeMap: Record<string, string> = { H02: 'EXPORT', H03: 'DOMESTIC' }
  const pt = typeMap[salesType.value]
  return products.value.filter((p: any) => !p.isDeleted && p.productType === pt)
})

// 明細
interface DetailItem {
  productId: string; productName: string; salesType: 'H02' | 'H03'
  weight: string; quantity: string; unitPrice: string; amount: number
}
const details = ref<DetailItem[]>([])
const newDetail = ref<Record<string, string>>({
  productId: '', productName: '', weight: '', quantity: '', unitPrice: '',
})
const activeField = ref<'weight' | 'quantity' | 'unitPrice'>('weight')
const modalOpen = ref(false)
const modalField = ref<'weight' | 'quantity' | 'unitPrice'>('weight')
function openModal(f: 'weight' | 'quantity' | 'unitPrice') { activeField.value = f; modalField.value = f; modalOpen.value = true }
const modalLabel = computed(() => modalField.value === 'weight' ? t('weight') : modalField.value === 'quantity' ? t('salesQty') : t('unitPrice'))
function onModalConfirm(val: string) { newDetail.value[modalField.value] = val; modalOpen.value = false }
const currentInputValue = computed(() => newDetail.value[activeField.value] || '')



function calcNewDetailAmount() {
  if (salesType.value === 'H02') {
    return Math.floor(Number(newDetail.value.weight) * Number(newDetail.value.quantity) * Number(newDetail.value.unitPrice))
  }
  // H03: 數量 × 單價
  return Math.floor(Number(newDetail.value.quantity) * Number(newDetail.value.unitPrice))
}

const canAddDetail = computed(() => {
  if (salesType.value === 'H02') {
    return !!newDetail.value.productId && Number(newDetail.value.weight) > 0 &&
      Number(newDetail.value.quantity) > 0 && Number(newDetail.value.unitPrice) > 0
  }
  return !!newDetail.value.productId && Number(newDetail.value.quantity) > 0 && Number(newDetail.value.unitPrice) > 0
})

function addDetail() {
  if (!canAddDetail.value) return
  const w = salesType.value === 'H02' ? newDetail.value.weight : '1'
  const item: DetailItem = {
    productId: newDetail.value.productId,
    productName: newDetail.value.productName,
    salesType: salesType.value,
    weight: w,
    quantity: newDetail.value.quantity,
    unitPrice: newDetail.value.unitPrice,
    amount: calcNewDetailAmount(),
  }
  details.value = [...details.value, item]
  newDetail.value = { productId: '', productName: '', weight: '', quantity: '', unitPrice: '' }
  activeField.value = salesType.value === 'H02' ? 'weight' : 'quantity'
}

// 庫存明細選取
const availableInventoryDetails = ref<any[]>([])
const selectedInventory = ref<{ detailId: number; productName: string; productImageUrl: string | null; orderId: string; maxQty: number; qty: number }[]>([])
const loadingAvailable = ref(false)

const showCustomerModal = ref(false)
const showProductModal = ref(false)
const customers = ref<any[]>([])
const products = ref<any[]>([])

const COLORS = ['#e8820c', '#2dd4bf', '#818cf8', '#f472b6', '#34d399', '#60a5fa']
function getAvatarColor(id: string) {
  const sum = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return COLORS[sum % 6]
}

function formatDate(d: string) {
  if (!d) return ''
  try {
    const s = d.slice(0, 10)
    const [y, m, day] = s.split('-')
    return `${parseInt(day)}/${parseInt(m)}/${y.slice(2)}`
  } catch { return d }
}

function toggleInventorySelect(detail: any) {
  const idx = selectedInventory.value.findIndex(s => s.detailId === detail.id)
  if (idx >= 0) {
    selectedInventory.value.splice(idx, 1)
  } else {
    selectedInventory.value.push({
      detailId: detail.id,
      productName: detail.productName,
      productImageUrl: detail.productImageUrl,
      orderId: detail.orderId,
      maxQty: detail.availableQty,
      qty: detail.availableQty,
    })
  }
}

function isInventorySelected(detailId: number) {
  return selectedInventory.value.some(s => s.detailId === detailId)
}

const totalAmount = computed(() => details.value.reduce((s, d) => s + d.amount, 0))

async function loadMasterData() {
  try {
    const headers = { Authorization: `Bearer ${auth.token}` }
    const [cRes, pRes] = await Promise.all([
      fetch('/api/master-data/customers', { headers }),
      fetch('/api/master-data/products', { headers }),
    ])
    if (cRes.ok) customers.value = (await cRes.json()).filter((c: any) => !c.isDeleted)
    if (pRes.ok) products.value = await pRes.json()
  } catch {}
}

async function loadAvailableInventory() {
  loadingAvailable.value = true
  try {
    const typeMap: Record<string, string> = { H02: 'EXPORT', H03: 'DOMESTIC' }
    const res = await getAvailableInventoryDetails(typeMap[salesType.value])
    availableInventoryDetails.value = res.data
  } catch {} finally {
    loadingAvailable.value = false
  }
}

const canNext = computed(() => {
  if (currentStep.value === 0) return !!form.value.orderDate
  if (currentStep.value === 1) return !!form.value.customerId
  if (currentStep.value === 2) return details.value.length > 0 || canAddDetail.value
  return true
})

async function onNext() {
  if (!canNext.value) return
  if (currentStep.value === 2) {
    if (canAddDetail.value) addDetail()
    if (details.value.length === 0) return
    await loadAvailableInventory()
  }
  currentStep.value++
}

function onPrev() {
  if (currentStep.value > 0) currentStep.value--
}

async function onSubmit() {
  submitting.value = true
  try {
    const [y, m, d] = form.value.orderDate.slice(0, 10).split('-')
    const orderDateForApi = `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`

    const orderRes = await createSalesOrder({ orderDate: orderDateForApi, customerId: form.value.customerId })
    const orderId: string = orderRes.data.id

    for (const det of details.value) {
      await createSalesDetail({
        orderId,
        productId: det.productId,
        weight: Number(det.weight),
        quantity: Number(det.quantity),
        unitPrice: Number(det.unitPrice),
      })
    }

    const inventoryLinks = selectedInventory.value.filter(s => s.qty > 0)
    if (inventoryLinks.length > 0) {
      await addSalesInventoryDetails(orderId, inventoryLinks.map(s => ({
        inventoryDetailId: s.detailId,
        quantity: s.qty,
        unitPrice: Number(details.value[0]?.unitPrice || 0),
      })))
    }

    toast.showToast(t('salesCreated'), 'success')
    emit('created', orderId)
  } catch (e: any) {
    toast.showToast(e?.response?.data?.message || t('saveFailed'), 'error')
  } finally { submitting.value = false }
}

onMounted(() => { loadMasterData() })
</script>

<style scoped>
.sales-create { padding: 16px; padding-bottom: 120px; }
.btn-close { position: fixed; top: 62px; right: 16px; z-index: 20; background: none; border: 1px solid var(--color-border); border-radius: 8px; padding: 7px 12px; color: var(--color-text-muted); font-size: 13px; cursor: pointer; }
.btn-close:hover { border-color: var(--color-danger); color: var(--color-danger); }
.step-bar { display: flex; gap: 4px; margin-bottom: 24px; overflow-x: auto; padding-bottom: 4px; }
.step-dot { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; min-width: 48px; }
.dot-circle { width: 28px; height: 28px; border-radius: 50%; background: var(--color-surface); border: 2px solid var(--color-border); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--color-text-muted); transition: all 0.18s; }
.step-dot.active .dot-circle { background: var(--color-accent); border-color: var(--color-accent); color: #fff; }
.step-dot.done .dot-circle { background: var(--color-success); border-color: var(--color-success); color: #fff; }
.dot-label { font-size: 9px; color: var(--color-text-muted); text-align: center; white-space: nowrap; }
.step-dot.active .dot-label { color: var(--color-accent); font-weight: 600; }
.step-content { margin-bottom: 20px; }
.step-title { font-size: 16px; font-weight: 700; color: var(--color-text); margin-bottom: 16px; }

/* 類型篩選 */
.filter-row { display: flex; gap: 8px; margin-bottom: 12px; }
.type-btn { flex: 1; padding: 10px 6px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; color: var(--color-text-muted); font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.15s; }
.type-btn.active { border-color: var(--color-accent); color: var(--color-accent); background: rgba(232,130,12,0.1); }
.type-badge-sm { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
.type-badge-sm.h02 { background: rgba(99,179,237,0.15); color: #63b3ed; }
.type-badge-sm.h03 { background: rgba(154,230,180,0.15); color: #9ae6b4; }
.type-indicator { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.type-hint { font-size: 12px; color: var(--color-text-muted); }

/* 選取客戶 */
.select-btn { width: 100%; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; padding: 14px 16px; color: var(--color-text); font-size: 15px; text-align: left; cursor: pointer; transition: border-color 0.15s; }
.select-btn:hover { border-color: var(--color-accent); }
.select-btn.big { min-height: 72px; display: flex; align-items: center; gap: 12px; }
.placeholder-text { color: var(--color-text-muted); }
.selected-item { display: flex; align-items: center; gap: 12px; }
.sel-avatar { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: #fff; flex-shrink: 0; }
.sel-id { font-size: 11px; color: var(--color-text-muted); }
.sel-name { font-size: 15px; font-weight: 700; }

/* 明細 */
.detail-list { margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px; }
.detail-row { display: flex; align-items: center; justify-content: space-between; background: var(--color-card); border: 1px solid var(--color-border); border-radius: 10px; padding: 12px 14px; }
.detail-row-info { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.detail-product { font-size: 14px; font-weight: 700; }
.detail-nums { font-size: 12px; color: var(--color-text-muted); }
.accent { color: var(--color-accent); }
.btn-icon-danger { background: none; border: none; color: var(--color-danger); font-size: 16px; cursor: pointer; padding: 4px 8px; flex-shrink: 0; }

/* 新增明細表單 */
.add-detail-form { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; padding: 16px; margin-top: 4px; }
.amount-preview { font-size: 14px; color: var(--color-text-muted); margin-bottom: 12px; }
.btn-add-detail-confirm { width: 100%; margin-top: 10px; background: var(--color-accent); color: #fff; border: none; border-radius: 10px; padding: 13px; font-size: 15px; font-weight: 700; cursor: pointer; }
.btn-add-detail-confirm:disabled { opacity: 0.35; cursor: not-allowed; }

/* 商品選取 */
.product-select-btn { width: 100%; display: flex; justify-content: space-between; align-items: center; background: var(--color-card); border: 1px solid var(--color-border); border-radius: 12px; padding: 14px 16px; cursor: pointer; transition: border-color 0.15s; margin-bottom: 12px; }
.product-select-btn:hover { border-color: var(--color-accent); }
.product-label { font-size: 12px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; }
.product-value { font-size: 15px; font-weight: 700; color: var(--color-text-muted); }
.product-value.accent { color: var(--color-text); }

/* Tab 切換 */
.input-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 10px; }
.ik-span2-tab { grid-column: span 2; }
.input-tab { display: flex; flex-direction: column; align-items: center; gap: 4px; background: var(--color-surface); border: 2px solid var(--color-border); border-radius: 10px; padding: 10px 6px; cursor: pointer; transition: all 0.15s; }
.input-tab.active { border-color: var(--color-accent); background: rgba(232,130,12,0.08); }
.tab-label { font-size: 10px; color: var(--color-text-muted); text-transform: uppercase; font-weight: 600; }
.tab-value { font-size: 18px; font-weight: 700; color: var(--color-text-dim); }
.tab-value.accent { color: var(--color-accent); }

/* Keypad */
.inline-keypad { margin-top: 8px; }
.inline-keypad-display { font-size: 32px; font-weight: 700; text-align: right; padding: 8px 12px; color: var(--color-text); min-height: 52px; border-bottom: 1px solid var(--color-border); margin-bottom: 8px; }
.inline-keypad-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.ik-btn { height: 52px; display: flex; align-items: center; justify-content: center; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 10px; color: var(--color-text); font-size: 20px; font-weight: 500; cursor: pointer; transition: background 0.1s; }
.ik-btn:active { background: var(--color-surface-hover); }
.ik-secondary { color: var(--color-text-muted); font-size: 16px; }
.ik-confirm { background: var(--color-accent); border-color: var(--color-accent-dim); color: #fff; font-size: 15px; font-weight: 700; }
.ik-confirm:disabled { opacity: 0.35; cursor: not-allowed; }
.ik-span2 { grid-column: span 2; }

/* 庫存明細 */
.inventory-card { display: flex; align-items: center; gap: 12px; background: var(--color-card); border: 2px solid var(--color-border); border-radius: 12px; padding: 12px; cursor: pointer; transition: all 0.18s; margin-bottom: 8px; }
.inventory-card.selected { border-color: var(--color-accent); background: var(--color-card-hover); }
.inventory-card:hover:not(.selected) { border-color: var(--color-text-dim); }
.inv-avatar { width: 44px; height: 44px; border-radius: 8px; overflow: hidden; background: var(--color-surface); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; }
.inv-avatar img { width: 100%; height: 100%; object-fit: cover; }
.inv-info { flex: 1; }
.inv-product { font-size: 14px; font-weight: 700; margin-bottom: 2px; }
.inv-order { font-size: 11px; color: var(--color-text-muted); }
.inv-qty { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }
.inv-weight { font-size: 11px; color: var(--color-accent); margin-top: 2px; font-weight: 600; }
.inv-check { color: var(--color-accent); font-size: 20px; font-weight: 700; }
.selected-count { margin-top: 10px; padding: 10px 14px; background: rgba(232,130,12,0.08); border: 1px solid var(--color-accent); border-radius: 8px; font-size: 13px; font-weight: 600; color: var(--color-accent); }

/* 確認摘要 */
.summary-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; overflow: hidden; margin-bottom: 16px; }
.summary-row { display: flex; justify-content: space-between; align-items: center; padding: 13px 16px; border-bottom: 1px solid var(--color-border); }
.summary-row:last-child { border-bottom: none; }
.summary-label { font-size: 13px; color: var(--color-text-muted); }
.summary-value { font-size: 15px; font-weight: 700; }
.detail-summary { margin-top: 4px; }
.section-label { font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
.summary-detail-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--color-card); border-radius: 8px; margin-bottom: 6px; font-size: 14px; gap: 8px; }

/* 底部按鈕 */
.step-actions { position: fixed; bottom: 64px; left: 0; right: 0; display: flex; gap: 12px; padding: 12px 16px; background: var(--color-bg); border-top: 1px solid var(--color-border); z-index: 10; }
.btn-primary { flex: 1; background: var(--color-accent); color: #fff; border: none; border-radius: 10px; padding: 13px; font-size: 15px; font-weight: 700; cursor: pointer; transition: opacity 0.15s; }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-secondary { flex: 1; background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 10px; padding: 13px; font-size: 15px; font-weight: 600; cursor: pointer; }
.btn-secondary:disabled { opacity: 0.3; cursor: not-allowed; }

/* Loading */
.loading-small { display: flex; justify-content: center; padding: 30px; }
.spinner-small { width: 24px; height: 24px; border: 2px solid var(--color-border); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-small { text-align: center; padding: 30px; color: var(--color-text-muted); font-size: 14px; }

/* 日期 */
.date-selects { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.date-sel { flex: 1; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 10px; padding: 14px 10px; color: var(--color-text); font-size: 16px; appearance: none; text-align: center; cursor: pointer; }
.date-sel:focus { outline: none; border-color: var(--color-accent); }
.date-sel-year { flex: 1.8; }
.date-sep { font-size: 20px; font-weight: 700; color: var(--color-text-muted); }
</style>
