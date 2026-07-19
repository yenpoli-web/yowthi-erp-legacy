<template>
  <div class="inv-create">
    <button class="btn-close" @click="$emit('close')">✕ {{ t('cancel') }}</button>

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
        <select v-model="dateDay" class="date-sel"><option v-for="d in 31" :key="d" :value="d">{{ d }}</option></select>
        <span class="date-sep">/</span>
        <select v-model="dateMonth" class="date-sel"><option v-for="m in 12" :key="m" :value="m">{{ m }}</option></select>
        <span class="date-sep">/</span>
        <select v-model="dateYear" class="date-sel date-sel-year"><option v-for="y in years" :key="y" :value="y">{{ y }}</option></select>
      </div>
    </div>

    <!-- Step 1：選類型 H02/H03 -->
    <div v-else-if="currentStep === 1" class="step-content">
      <div class="step-title">{{ t('selectInventoryType') }}</div>
      <p class="step-hint">{{ t('invTypeHint') }}</p>
      <div class="type-select-grid">
        <button class="type-select-card" :class="{ selected: selectedType === 'H02' }" @click="selectedType = 'H02'">
          <div class="type-icon">📦</div>
          <div class="type-label">H02</div>
          <div class="type-desc">{{ t('exportSales') }}</div>
        </button>
        <button class="type-select-card" :class="{ selected: selectedType === 'H03' }" @click="selectedType = 'H03'">
          <div class="type-icon">🌿</div>
          <div class="type-label">H03</div>
          <div class="type-desc">{{ t('domesticSales') }}</div>
        </button>
      </div>
    </div>

    <!-- Step 2：選來源（進貨單 or 代工單） -->
    <div v-else-if="currentStep === 2" class="step-content">
      <div class="step-title">{{ t('selectSource') }}</div>
      <div class="type-badge-row">
        <span class="type-badge" :class="selectedType === 'H02' ? 'h02' : 'h03'">
          {{ selectedType }} · {{ selectedType === 'H02' ? t('exportSales') : t('domesticSales') }}
        </span>
      </div>

      <!-- 來源切換 -->
      <div class="source-tabs">
        <button class="source-tab" :class="{ active: sourceType === 'receiving' }"
          @click="onSourceTypeChange('receiving')">
          📋 {{ t('receivingOrder') }}
        </button>
        <button class="source-tab" :class="{ active: sourceType === 'contract', disabled: selectedType === 'H03' }"
          :disabled="selectedType === 'H03'"
          @click="selectedType !== 'H03' && onSourceTypeChange('contract')">
          🔧 {{ t('contractWork') }}
        </button>
      </div>

      <!-- 進貨單列表 -->
      <template v-if="sourceType === 'receiving'">
        <div v-if="loadingOrders" class="loading-small"><div class="spinner-small"></div></div>
        <div v-else-if="availableOrders.length === 0" class="empty-small">{{ t('invNoAvailable') }}</div>
        <div v-else class="order-select-list">
          <div v-for="order in availableOrders" :key="order.id"
            class="order-select-card" :class="{ selected: selectedOrderIds.has(order.id) }"
            @click="toggleOrder(order.id)">
            <div class="osc-left">
              <div class="osc-avatar">
                <img v-if="order.receivingItem?.imageUrl" :src="order.receivingItem.imageUrl" />
                <span v-else>{{ order.receivingItem?.name?.slice(0, 2) }}</span>
              </div>
              <div class="osc-info">
                <div class="osc-id accent">{{ order.id }}</div>
                <div class="osc-date">{{ formatDate(order.orderDate) }}</div>
                <div class="osc-item">{{ order.receivingItem?.name }}</div>
                <div class="osc-item" v-if="selectedType === 'H02' && order.costUnitPrice">{{ t('icBaseUnitPrice') }}：฿{{ Number(order.costUnitPrice).toFixed(2) }}</div>
              </div>
            </div>
            <div class="osc-check" v-if="selectedOrderIds.has(order.id)">✓</div>
          </div>
        </div>
        <div class="selected-count" v-if="selectedOrderIds.size > 0">
          ✓ {{ selectedOrderIds.size }} {{ t('records') }} {{ t('select') }}
        </div>
      </template>

      <!-- 代工單列表 -->
      <template v-else>
        <div v-if="loadingContracts" class="loading-small"><div class="spinner-small"></div></div>
        <div v-else-if="availableContractOrders.length === 0" class="empty-small">{{ t('noContractOrders') }}</div>
        <div v-else class="order-select-list">
          <div v-for="co in availableContractOrders" :key="co.id"
            class="order-select-card" :class="{ selected: selectedContractIds.has(co.id) }"
            @click="toggleContract(co.id, co)">
            <div class="osc-left">
              <div class="osc-avatar contract-avatar">🔧</div>
              <div class="osc-info">
                <div class="osc-id accent">{{ co.id }}</div>
                <div class="osc-date">{{ formatDate(co.orderDate) }}</div>
                <div v-for="d in co.details" :key="d.id" class="osc-item">
                  {{ d.supplier?.name }} × {{ d.product?.name }} × {{ Number(d.quantity) }}件
                </div>
              </div>
            </div>
            <div class="osc-check" v-if="selectedContractIds.has(co.id)">✓</div>
          </div>
        </div>
        <div class="selected-count" v-if="selectedContractIds.size > 0">
          ✓ {{ selectedContractIds.size }} {{ t('records') }} {{ t('select') }}
        </div>
      </template>
    </div>

    <!-- Step 3：新增入庫明細 -->
    <div v-else-if="currentStep === 3" class="step-content">
      <div class="step-title">{{ t('invAddDetails') }}</div>
      <div class="type-badge-row">
        <span class="type-badge" :class="selectedType === 'H02' ? 'h02' : 'h03'">
          {{ selectedType }} · {{ selectedType === 'H02' ? t('exportSales') : t('domesticSales') }}
        </span>
        <span class="type-badge source-badge">
          {{ sourceType === 'contract' ? '🔧 ' + t('contractWork') : '📋 ' + t('receivingOrder') }}
        </span>
      </div>

      <!-- 代工單來源：顯示自動帶入的明細，單價為鎖定的代工成本，不可修改 -->
      <template v-if="sourceType === 'contract' && details.length > 0 && !showManualAdd">
        <div class="detail-list">
          <div v-for="(d, i) in details" :key="i" class="detail-row auto-detail">
            <div class="detail-row-info">
              <span class="detail-product">{{ d.productName }}</span>
              <span class="detail-qty accent">× {{ d.quantity }}</span>
            </div>
            <span class="price-set-btn locked">{{ d.weight.toFixed(1) }} kg × ฿{{ d.unitPrice.toFixed(2) }}</span>
            <span class="auto-badge">{{ t('icLocked') }}</span>
          </div>
        </div>
        <button class="btn-add-more" @click="showManualAdd = true">+ {{ t('addDetail') }}</button>
      </template>

      <!-- 手動新增 / 進貨單來源 -->
      <template v-if="sourceType === 'receiving' || showManualAdd || details.length === 0">
        <div v-if="details.length > 0" class="detail-list">
          <div v-for="(d, i) in details" :key="i" class="detail-row">
            <div class="detail-row-info">
              <span class="detail-product">{{ d.productName }}</span>
              <span class="detail-qty accent">× {{ d.quantity }}</span>
            </div>
            <button class="btn-icon-danger" @click="details.splice(i, 1)">✕</button>
          </div>
        </div>

        <div class="add-detail-form">
          <button class="product-select-btn" @click="showProductModal = true">
            <span class="product-label">{{ t('product') }}</span>
            <span class="product-value" :class="{ accent: newProductId }">{{ newProductName || t('selectProduct') }}</span>
          </button>
          <button class="qty-select-btn" @click="modalOpen = true">
            <span class="product-label">{{ t('salesQty') }}</span>
            <span class="product-value" :class="{ accent: newQty }">{{ newQty || '0' }}</span>
          </button>
          <button class="qty-select-btn" @click="openWeightModal">
            <span class="product-label">{{ t('weight') }}</span>
            <span class="product-value" :class="{ accent: newWeight }">{{ newWeight || '0' }} kg</span>
          </button>
          <button class="qty-select-btn" @click="priceModalOpen = true" v-if="!(sourceType === 'receiving' && selectedType === 'H02')">
            <span class="product-label">{{ t('unitPrice') }}</span>
            <span class="product-value" :class="{ accent: newUnitPrice }">฿{{ newUnitPrice || '0' }}</span>
          </button>
          <div class="qty-select-btn locked-price" v-else>
            <span class="product-label">{{ t('icBaseUnitPrice') }}（{{ t('icLocked') }}）</span>
            <span class="product-value accent">฿{{ lockedUnitPrice.toFixed(2) }}</span>
          </div>
          <button class="btn-add-detail-confirm" @click="addDetail" :disabled="!canAdd">✓ {{ t('addDetail') }}</button>
        </div>
      </template>

      <TouchSelectorModal v-if="showProductModal" :title="t('selectProduct')" :items="filteredProducts"
        :model-value="newProductId"
        @select="p => { newProductId = p.id; newProductName = p.name; newProductUnitWeight = p.unitWeight ? Number(p.unitWeight) : 0; if (newProductUnitWeight && !newWeight) { newWeight = newProductUnitWeight.toFixed(1) }; showProductModal = false }"
        @close="showProductModal = false" />
      <NumericInputModal :show="modalOpen" mode="integer" :label="t('salesQty')"
        :model-value="newQty"
        @confirm="v => { newQty = v; if (newProductUnitWeight && !newWeight) { newWeight = newProductUnitWeight.toFixed(1) }; modalOpen = false }"
        @close="modalOpen = false" />
      <NumericInputModal :show="weightModalOpen" mode="decimal" :label="t('weight')"
        :model-value="newWeight"
        @confirm="v => { newWeight = v; weightModalOpen = false }"
        @close="weightModalOpen = false" />
      <NumericInputModal :show="priceModalOpen" mode="decimal" :label="t('unitPrice')"
        :model-value="newUnitPrice"
        @confirm="v => { newUnitPrice = v; priceModalOpen = false }"
        @close="priceModalOpen = false" />
      <NumericInputModal :show="priceEditIndex !== null" mode="decimal" :label="t('unitPrice')"
        :model-value="priceEditValue"
        @confirm="confirmPriceEdit"
        @close="priceEditIndex = null" />
      <NumericInputModal :show="weightEditIndex !== null" mode="decimal" :label="t('weight')"
        :model-value="weightEditValue"
        @confirm="confirmWeightEdit"
        @close="weightEditIndex = null" />
    </div>

    <!-- Step 4：確認 -->
    <div v-else-if="currentStep === 4" class="step-content">
      <div class="step-title">{{ t('stepConfirm') }}</div>
      <div class="summary-card">
        <div class="summary-row">
          <span class="summary-label">{{ t('date') }}</span>
          <span class="summary-value accent">{{ formatDate(orderDate) }}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">{{ t('type') }}</span>
          <span class="summary-value">
            <span class="type-badge" :class="selectedType === 'H02' ? 'h02' : 'h03'">
              {{ selectedType }} {{ selectedType === 'H02' ? t('exportSales') : t('domesticSales') }}
            </span>
          </span>
        </div>
        <div class="summary-row">
          <span class="summary-label">來源</span>
          <span class="summary-value">{{ sourceType === 'contract' ? '🔧 代工單 ×' + selectedContractIds.size : '📋 進貨單 ×' + selectedOrderIds.size }}</span>
        </div>
        <div class="summary-row" v-for="(d, i) in details" :key="i">
          <span class="summary-label">{{ d.productName }}</span>
          <span class="summary-value">{{ d.weight.toFixed(1) }}kg × {{ d.quantity }} &middot; <span class="accent">฿{{ d.unitPrice.toFixed(1) }}</span></span>
        </div>
      </div>
    </div>

    <!-- 底部按鈕 -->
    <div class="step-actions">
      <button class="btn-secondary" @click="onPrev" :disabled="currentStep === 0">← {{ t('prev') }}</button>
      <button v-if="currentStep < steps.length - 1 && currentStep !== 3"
        class="btn-primary" @click="onNext" :disabled="!canNext">
        {{ t('next') }} →
      </button>
      <button v-else-if="currentStep === 3"
        class="btn-primary" @click="onNext" :disabled="details.length === 0 && !canAdd">
        {{ details.length }} {{ t('records') }} · {{ t('next') }} →
      </button>
      <button v-else
        class="btn-primary" @click="onSubmit" :disabled="submitting">
        {{ submitting ? t('saving') : t('save') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToastStore } from '../../../stores/toast'
import { useAuthStore } from '../../../stores/auth'
import {
  createInventoryOrder, createInventoryDetail,
  addInventoryReceivingOrders, addInventoryContractOrders,
  getAvailableReceivingOrders, getAvailableContractOrders,
} from '../../../api/inventory'
import TouchSelectorModal from '../../../components/common/TouchSelectorModal.vue'
import NumericInputModal from '../../../components/common/NumericInputModal.vue'

const { t } = useI18n()
const toast = useToastStore()
const auth = useAuthStore()
const emit = defineEmits<{ close: []; created: [orderId: string] }>()

const steps = computed(() => [
  t('selectDate'),
  t('selectInventoryType'),
  t('selectSource'),
  t('invAddDetails'),
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
const orderDate = ref('')
watch([dateDay, dateMonth, dateYear], () => {
  const y = dateYear.value
  const m = String(dateMonth.value).padStart(2, '0')
  const d = String(dateDay.value).padStart(2, '0')
  orderDate.value = `${y}-${m}-${d}`
}, { immediate: true })

// 類型
const selectedType = ref<'H02' | 'H03'>('H02')

// 來源類型
const sourceType = ref<'receiving' | 'contract'>('receiving')

// 進貨單
const availableOrders = ref<any[]>([])
const selectedOrderIds = ref(new Set<string>())
const loadingOrders = ref(false)

// 代工單
const availableContractOrders = ref<any[]>([])
const selectedContractIds = ref(new Set<string>())
const loadingContracts = ref(false)

// 入庫明細
interface DetailItem { productId: string; productName: string; quantity: number; weight: number; unitPrice: number }
const details = ref<DetailItem[]>([])
const newProductId = ref('')
const newProductName = ref('')
const newProductUnitWeight = ref(0)
const newQty = ref('')
const newWeight = ref('')
const newUnitPrice = ref('')
const lockedUnitPrice = ref(0) // H02（出口）進貨單來源：自動帶入進貨單鎖定的單位成本，不可手動修改
const showProductModal = ref(false)
const modalOpen = ref(false)
const weightModalOpen = ref(false)
const priceModalOpen = ref(false)
const showManualAdd = ref(false)
const products = ref<any[]>([])

function openWeightModal() {
  if (!newWeight.value && newProductUnitWeight.value) {
    newWeight.value = newProductUnitWeight.value.toFixed(1)
  }
  weightModalOpen.value = true
}

// 設定代工自動帶入明細的單價
const priceEditIndex = ref<number | null>(null)
const priceEditValue = ref('')
function openPriceEdit(i: number) {
  priceEditIndex.value = i
  priceEditValue.value = details.value[i].unitPrice > 0 ? String(details.value[i].unitPrice) : ''
}
function confirmPriceEdit(v: string) {
  if (priceEditIndex.value !== null) {
    details.value[priceEditIndex.value].unitPrice = parseFloat(v) || 0
  }
  priceEditIndex.value = null
}

// 設定代工自動帶入明細的重量
const weightEditIndex = ref<number | null>(null)
const weightEditValue = ref('')
function openWeightEdit(i: number) {
  weightEditIndex.value = i
  const d = details.value[i]
  weightEditValue.value = d.weight > 0 ? String(d.weight) : ''
}
function confirmWeightEdit(v: string) {
  if (weightEditIndex.value !== null) {
    details.value[weightEditIndex.value].weight = parseFloat(v) || 0
  }
  weightEditIndex.value = null
}

const filteredProducts = computed(() => {
  const typeMap = { H02: 'EXPORT', H03: 'DOMESTIC' }
  const pt = typeMap[selectedType.value]
  return products.value.filter((p: any) => !p.isDeleted && p.productType === pt)
})

function toggleOrder(id: string) {
  // H02（出口）進貨單來源：鎖定成本是縺在特定一張進貨單，為了讓單價引用清楚不模篡，改為單選
  if (selectedType.value === 'H02') {
    const wasSelected = selectedOrderIds.value.has(id)
    selectedOrderIds.value = new Set(wasSelected ? [] : [id])
    const order = availableOrders.value.find((o: any) => o.id === id)
    lockedUnitPrice.value = !wasSelected && order?.costUnitPrice ? Number(order.costUnitPrice) : 0
    return
  }
  const s = new Set(selectedOrderIds.value)
  if (s.has(id)) s.delete(id); else s.add(id)
  selectedOrderIds.value = s
}

function toggleContract(id: string, co: any) {
  const s = new Set(selectedContractIds.value)
  if (s.has(id)) {
    s.delete(id)
    // 移除此代工單帶入的明細
    details.value = details.value.filter(d => d.productId !== '_from_contract_' + id)
  } else {
    s.add(id)
    // 自動從代工明細帶入（重量、單價直接使用該明細鎖定的生產成本，不可修改）
    for (const d of (co.details || [])) {
      if (!d.isDeleted) {
        const rawQty = Number(d.quantity) || 0
        const qtyCeil = Math.ceil(rawQty)
        details.value.push({
          productId: d.productId,
          productName: d.product?.name || d.productId,
          quantity: qtyCeil,
          weight: Number(d.weight) || 0,
          unitPrice: d.costUnitPrice ? Number(d.costUnitPrice) : 0,
        })
      }
    }
  }
  selectedContractIds.value = s
}

async function onSourceTypeChange(type: 'receiving' | 'contract') {
  sourceType.value = type
  selectedOrderIds.value = new Set()
  selectedContractIds.value = new Set()
  details.value = []
  showManualAdd.value = false
  if (type === 'receiving') {
    await loadReceivingOrders()
  } else {
    await loadContractOrders()
  }
}

const canAdd = computed(() => {
  const priceOk = (sourceType.value === 'receiving' && selectedType.value === 'H02')
    ? lockedUnitPrice.value > 0
    : parseFloat(newUnitPrice.value) > 0
  return !!newProductId.value && parseInt(newQty.value) > 0 && parseFloat(newWeight.value) > 0 && priceOk
})
function addDetail() {
  if (!canAdd.value) return
  const unitPrice = (sourceType.value === 'receiving' && selectedType.value === 'H02')
    ? lockedUnitPrice.value
    : parseFloat(newUnitPrice.value)
  details.value.push({ productId: newProductId.value, productName: newProductName.value, quantity: parseInt(newQty.value), weight: parseFloat(newWeight.value), unitPrice })
  newProductId.value = ''; newProductName.value = ''; newProductUnitWeight.value = 0; newQty.value = ''; newWeight.value = ''; newUnitPrice.value = ''
}

function formatDate(d: string) {
  if (!d) return ''
  const [y, m, day] = d.slice(0, 10).split('-')
  return `${parseInt(day)}/${parseInt(m)}/${y.slice(2)}`
}

function getProductUnitWeight(productId: string): number {
  const p = products.value.find((x: any) => x.id === productId)
  return p?.unitWeight ? Number(p.unitWeight) : 0
}

const canNext = computed(() => {
  if (currentStep.value === 0) return !!orderDate.value
  if (currentStep.value === 1) return !!selectedType.value
  if (currentStep.value === 2) {
    if (sourceType.value === 'receiving') return true // 進貨單可以不選
    return selectedContractIds.value.size > 0
  }
  if (currentStep.value === 3) return (details.value.length > 0 && details.value.every(d => d.weight > 0 && d.unitPrice > 0)) || canAdd.value
  return true
})

async function onNext() {
  if (currentStep.value === 1) {
    if (selectedType.value === 'H03') sourceType.value = 'receiving'
    await loadReceivingOrders()
  }
  if (currentStep.value === 3) {
    if (canAdd.value) addDetail()
    if (details.value.length === 0) return
    if (!details.value.every(d => d.weight > 0 && d.unitPrice > 0)) {
      toast.showToast(t('inputWeightPriceFirst'), 'error')
      return
    }
  }
  currentStep.value++
}
function onPrev() { if (currentStep.value > 0) currentStep.value-- }

async function loadReceivingOrders() {
  loadingOrders.value = true
  try { availableOrders.value = (await getAvailableReceivingOrders(selectedType.value)).data }
  catch {} finally { loadingOrders.value = false }
}
async function loadContractOrders() {
  loadingContracts.value = true
  try { availableContractOrders.value = (await getAvailableContractOrders()).data }
  catch {} finally { loadingContracts.value = false }
}

async function onSubmit() {
  submitting.value = true
  try {
    const [y, m, d] = orderDate.value.split('-')
    const orderRes = await createInventoryOrder({ orderDate: `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}` })
    const orderId: string = orderRes.data.id

    for (const det of details.value) {
      await createInventoryDetail({ orderId, productId: det.productId, quantity: det.quantity, weight: det.weight, unitPrice: det.unitPrice })
    }
    if (sourceType.value === 'receiving' && selectedOrderIds.value.size > 0) {
      await addInventoryReceivingOrders(orderId, Array.from(selectedOrderIds.value))
    }
    if (sourceType.value === 'contract' && selectedContractIds.value.size > 0) {
      await addInventoryContractOrders(orderId, Array.from(selectedContractIds.value))
    }

    toast.showToast(t('orderCreated'), 'success')
    emit('created', orderId)
  } catch (e: any) {
    toast.showToast(e?.response?.data?.message || t('saveFailed'), 'error')
  } finally { submitting.value = false }
}

async function loadProducts() {
  try {
    const headers = { Authorization: `Bearer ${auth.token}` }
    const res = await fetch('/api/master-data/products', { headers })
    if (res.ok) products.value = await res.json()
  } catch {}
}

onMounted(async () => {
  await loadProducts()
  await loadReceivingOrders()
})
</script>

<style scoped>
.inv-create { padding: 16px; padding-bottom: 120px; }
.btn-close { position: fixed; top: 62px; right: 16px; z-index: 20; background: none; border: 1px solid var(--color-border); border-radius: 8px; padding: 7px 12px; color: var(--color-text-muted); font-size: 13px; cursor: pointer; }
.btn-close:hover { border-color: var(--color-danger); color: var(--color-danger); }
.step-bar { display: flex; gap: 4px; margin-bottom: 24px; overflow-x: auto; }
.step-dot { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; min-width: 48px; }
.dot-circle { width: 28px; height: 28px; border-radius: 50%; background: var(--color-surface); border: 2px solid var(--color-border); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--color-text-muted); transition: all 0.18s; }
.step-dot.active .dot-circle { background: var(--color-accent); border-color: var(--color-accent); color: #fff; }
.step-dot.done .dot-circle { background: var(--color-success); border-color: var(--color-success); color: #fff; }
.dot-label { font-size: 9px; color: var(--color-text-muted); text-align: center; white-space: nowrap; }
.step-dot.active .dot-label { color: var(--color-accent); font-weight: 600; }
.step-content { margin-bottom: 20px; }
.step-title { font-size: 16px; font-weight: 700; margin-bottom: 16px; }
.step-hint { font-size: 13px; color: var(--color-text-muted); margin-bottom: 12px; }
.type-select-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.type-select-card { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 24px 16px; background: var(--color-card); border: 2px solid var(--color-border); border-radius: 14px; cursor: pointer; transition: all 0.18s; }
.type-select-card.selected { border-color: var(--color-accent); background: rgba(232,130,12,0.08); }
.type-icon { font-size: 36px; }
.type-label { font-size: 18px; font-weight: 700; color: var(--color-accent); }
.type-desc { font-size: 12px; color: var(--color-text-muted); }
.type-badge-row { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.type-badge { display: inline-block; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 6px; }
.type-badge.h02 { background: rgba(99,179,237,0.15); color: #63b3ed; }
.type-badge.h03 { background: rgba(154,230,180,0.15); color: #9ae6b4; }
.source-badge { background: rgba(129,140,248,0.15); color: #818cf8; }
/* 來源切換 */
.source-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; }
.source-tab { padding: 12px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 10px; color: var(--color-text-muted); font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.18s; }
.source-tab.active { border-color: var(--color-accent); color: var(--color-accent); background: rgba(232,130,12,0.08); }
.source-tab.disabled { opacity: 0.35; cursor: not-allowed; }
.date-selects { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.date-sel { flex: 1; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 10px; padding: 14px 10px; color: var(--color-text); font-size: 16px; appearance: none; text-align: center; cursor: pointer; }
.date-sel:focus { outline: none; border-color: var(--color-accent); }
.date-sel-year { flex: 1.8; }
.date-sep { font-size: 20px; font-weight: 700; color: var(--color-text-muted); }
.order-select-list { display: flex; flex-direction: column; gap: 8px; }
.order-select-card { display: flex; align-items: center; justify-content: space-between; background: var(--color-card); border: 2px solid var(--color-border); border-radius: 12px; padding: 14px; cursor: pointer; transition: all 0.18s; }
.order-select-card.selected { border-color: var(--color-accent); background: var(--color-card-hover); }
.osc-left { display: flex; align-items: center; gap: 12px; flex: 1; }
.osc-avatar { width: 44px; height: 44px; border-radius: 8px; background: var(--color-surface); overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; }
.osc-avatar img { width: 100%; height: 100%; object-fit: cover; }
.contract-avatar { font-size: 20px; }
.osc-info { flex: 1; }
.osc-id { font-size: 13px; font-weight: 700; }
.osc-date { font-size: 11px; color: var(--color-text-muted); }
.osc-item { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }
.osc-check { color: var(--color-accent); font-size: 20px; font-weight: 700; }
.accent { color: var(--color-accent); }
.selected-count { margin-top: 10px; padding: 10px 14px; background: rgba(232,130,12,0.08); border: 1px solid var(--color-accent); border-radius: 8px; font-size: 13px; font-weight: 600; color: var(--color-accent); }
.detail-list { margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px; }
.detail-row { display: flex; align-items: center; justify-content: space-between; background: var(--color-card); border: 1px solid var(--color-border); border-radius: 10px; padding: 12px 14px; }
.auto-detail { border-color: rgba(129,140,248,0.3); background: rgba(129,140,248,0.05); }
.detail-row-info { flex: 1; display: flex; align-items: center; gap: 12px; }
.detail-product { font-size: 14px; font-weight: 700; }
.detail-qty { font-size: 16px; font-weight: 700; }
.auto-badge { font-size: 10px; padding: 2px 7px; background: rgba(129,140,248,0.2); color: #818cf8; border-radius: 4px; font-weight: 700; }
.price-set-btn { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 6px; padding: 4px 10px; font-size: 12px; font-weight: 700; color: var(--color-text-muted); cursor: pointer; }
.price-set-btn.locked { cursor: default; color: var(--color-text); }
.btn-icon-danger { background: none; border: none; color: var(--color-danger); font-size: 16px; cursor: pointer; }
.btn-add-more { width: 100%; margin-top: 8px; background: none; border: 1px dashed var(--color-border); border-radius: 10px; padding: 10px; font-size: 13px; font-weight: 600; color: var(--color-text-muted); cursor: pointer; }
.btn-add-more:hover { border-color: var(--color-accent); color: var(--color-accent); }
.add-detail-form { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; padding: 16px; }
.product-select-btn { width: 100%; display: flex; justify-content: space-between; align-items: center; background: var(--color-card); border: 1px solid var(--color-border); border-radius: 10px; padding: 14px 16px; cursor: pointer; margin-bottom: 14px; }
.qty-select-btn { width: 100%; display: flex; justify-content: space-between; align-items: center; background: var(--color-card); border: 1px solid var(--color-border); border-radius: 10px; padding: 14px 16px; cursor: pointer; margin-bottom: 14px; }
.qty-select-btn.locked-price { cursor: default; border-color: rgba(232,130,12,0.3); background: rgba(232,130,12,0.06); }
.btn-add-detail-confirm { width: 100%; background: var(--color-accent); color: #fff; border: none; border-radius: 10px; padding: 13px; font-size: 15px; font-weight: 700; cursor: pointer; }
.btn-add-detail-confirm:disabled { opacity: 0.35; cursor: not-allowed; }
.product-label { font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; }
.product-value { font-size: 15px; font-weight: 700; color: var(--color-text-muted); }
.product-value.accent { color: var(--color-text); }
.inline-keypad { margin-top: 8px; }
.inline-keypad-display { font-size: 32px; font-weight: 700; text-align: right; padding: 8px 12px; color: var(--color-text); min-height: 52px; border-bottom: 1px solid var(--color-border); margin-bottom: 8px; }
.inline-keypad-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.ik-btn { height: 52px; display: flex; align-items: center; justify-content: center; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 10px; color: var(--color-text); font-size: 20px; cursor: pointer; }
.ik-btn:active { background: var(--color-surface-hover); }
.ik-secondary { color: var(--color-text-muted); font-size: 16px; }
.ik-confirm { background: var(--color-accent); border-color: var(--color-accent); color: #fff; font-size: 15px; font-weight: 700; }
.ik-confirm:disabled { opacity: 0.35; cursor: not-allowed; }
.ik-span3 { grid-column: span 3; }
.summary-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; overflow: hidden; }
.summary-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--color-border); }
.summary-row:last-child { border-bottom: none; }
.summary-label { font-size: 13px; color: var(--color-text-muted); }
.summary-value { font-size: 15px; font-weight: 700; }
.step-actions { position: fixed; bottom: 64px; left: 0; right: 0; display: flex; gap: 12px; padding: 12px 16px; background: var(--color-bg); border-top: 1px solid var(--color-border); z-index: 10; }
.btn-primary { flex: 1; background: var(--color-accent); color: #fff; border: none; border-radius: 10px; padding: 13px; font-size: 15px; font-weight: 700; cursor: pointer; }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-secondary { flex: 1; background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 10px; padding: 13px; font-size: 15px; font-weight: 600; cursor: pointer; }
.btn-secondary:disabled { opacity: 0.3; cursor: not-allowed; }
.loading-small { display: flex; justify-content: center; padding: 30px; }
.spinner-small { width: 24px; height: 24px; border: 2px solid var(--color-border); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-small { text-align: center; padding: 30px; color: var(--color-text-muted); font-size: 14px; }
</style>
