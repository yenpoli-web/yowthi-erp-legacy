<template>
  <div class="create-wrap">
    <!-- Header -->
    <div class="create-header">
      <button v-if="state === 'B'" class="back-btn" @click="state = 'A'">←</button>
      <div v-else style="width: 40px;"></div>
      <div class="header-title">
        <template v-if="state === 'A'">{{ t('newOrder') }}</template>
        <template v-else>
          <span class="header-item-img">
            <img v-if="selectedItem?.imageUrl" :src="selectedItem.imageUrl" />
            <span v-else class="header-avatar" :style="avatarBg(form.receivingItemId)">{{ selectedItem?.id?.slice(0,2) }}</span>
          </span>
          <span>{{ selectedItem?.name }} · {{ formatDate(form.orderDate) }}</span>
        </template>
      </div>
      <button class="close-btn" @click="handleClose">✕</button>
    </div>

    <!-- ══════════ 狀態 A：建立主單 ══════════ -->
    <div v-if="state === 'A'" class="state-a">

      <!-- 進貨品項 -->
      <div class="section-label">{{ t('receivingItem') }}</div>
      <div class="item-grid">
        <div
          v-for="item in receivingItems"
          :key="item.id"
          class="item-card"
          :class="{ selected: form.receivingItemId === item.id }"
          @click="form.receivingItemId = item.id"
        >
          <div class="item-avatar" :style="avatarBg(item.id)">
            <img v-if="item.imageUrl" :src="item.imageUrl" class="avatar-img" />
            <span v-else>{{ item.id.slice(0,2) }}</span>
          </div>
          <div class="item-id">{{ item.id }}</div>
          <div class="item-name">{{ item.name }}</div>
          <div v-if="form.receivingItemId === item.id" class="item-check">✓</div>
        </div>
      </div>

      <!-- 進貨日期 -->
      <div class="section-label">{{ t('date') }}</div>
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

      <div v-if="stateAError" class="error-msg">{{ stateAError }}</div>

      <!-- 下一步按鈕 -->
      <button
        class="btn-next"
        :disabled="!form.receivingItemId || loadingOrder"
        @click="proceedToB"
      >
        {{ loadingOrder ? t('saving') : t('startAddDetail') }}
      </button>
    </div>

    <!-- ══════════ 狀態 B：明細列表 ══════════ -->
    <div v-if="state === 'B'" class="state-b">

      <!-- 明細列表（sub-flow 啟動時隱藏） -->
      <template v-if="!addingDetail">
        <div class="detail-list" ref="detailListRef">
          <div v-if="details.length === 0" class="detail-empty">
            {{ t('tapAddDetail') }}
          </div>

          <div
            v-for="(row, idx) in details"
            :key="row.localId"
            class="detail-row"
            :class="{ saving: row.saving, error: row.error }"
          >
            <!-- 農民 -->
            <div class="detail-farmer" @click="openFarmerPicker(idx)">
              <div class="cell-label">{{ t('farmer') }}</div>
              <div class="cell-value" v-if="row.farmerId">
                <img v-if="getFarmer(row.farmerId)?.imageUrl" :src="getFarmer(row.farmerId).imageUrl" class="farmer-thumb" />
                <span>{{ getFarmer(row.farmerId)?.name || row.farmerId }}</span>
                <span class="farmer-id-tag">{{ row.farmerId }}</span>
              </div>
              <div class="cell-empty" v-else>—</div>
            </div>

            <!-- stat grid -->
            <div class="detail-stats">
              <div class="detail-stat" @click="openKeypad(idx, 'quantity')">
                <span class="stat-label">{{ t('quantity') }}</span>
                <span class="stat-value" :class="{ accent: row.quantity }">{{ row.quantity || '—' }}</span>
              </div>
              <div class="detail-stat" @click="openKeypad(idx, 'unitPrice')">
                <span class="stat-label">{{ t('unitPrice') }}</span>
                <span class="stat-value" :class="{ accent: row.unitPrice }">{{ row.unitPrice || '—' }}</span>
              </div>
              <div class="detail-stat amount-stat">
                <span class="stat-label">{{ t('amount') }}</span>
                <span class="stat-value accent">{{ calcRowAmount(row) }}</span>
              </div>
            </div>

            <!-- 操作按鈕 -->
            <div class="detail-actions">
              <button class="btn-row-add" @click="addRowAfter(idx)">+</button>
              <button class="btn-row-del" @click="deleteRow(idx)">−</button>
            </div>

            <!-- 儲存狀態 -->
            <div v-if="row.saving" class="row-status saving">⏳</div>
            <div v-else-if="row.savedId" class="row-status done">✓</div>
            <div v-else-if="row.error" class="row-status error-icon" :title="row.error">!</div>
          </div>
        </div>

        <!-- 底部操作列 -->
        <div class="state-b-footer">
          <button class="btn-add-row" @click="startAddDetail">+ {{ t('addDetail') }}</button>
          <button class="btn-done" @click="handleDone">{{ t('done') }}</button>
        </div>
      </template>

      <!-- ── 導引式新增明細 sub-flow ── -->
      <div v-if="addingDetail" class="gf-subflow">

        <!-- 進度條 -->
        <div class="gf-step-bar">
          <div class="gf-step-progress" :style="{ width: (Math.min(addStep, 3) / 3 * 100) + '%' }"></div>
        </div>
        <div class="gf-step-header">
          <span class="gf-step-counter">{{ Math.min(addStep, 3) }} / 3</span>
        </div>

        <!-- Step 1：選取農民 -->
        <template v-if="addStep === 1">
          <div class="gf-step-content">
            <input v-model="farmerSubSearch" class="gf-search" :placeholder="t('searchIdOrName')" />
            <div class="gf-farmer-grid">
              <button
                v-for="f in filteredFarmersNew"
                :key="f.id"
                class="gf-farmer-card"
                @click="selectNewFarmer(f)">
                <div class="gf-farmer-avatar" :style="avatarBg(f.id)">
                  <img v-if="f.imageUrl" :src="f.imageUrl" />
                  <span v-else>{{ f.name?.slice(0,2) }}</span>
                </div>
                <span class="gf-farmer-name">{{ f.name }}</span>
                <span class="gf-farmer-id">{{ f.id }}</span>
              </button>
            </div>
          </div>
        </template>

        <!-- Step 2：輸入數量 -->
        <template v-if="addStep === 2">
          <div class="gf-step-content">
            <div class="gf-input-tabs">
              <button
                class="gf-tab-btn"
                @click="openNewModal('quantity')">
                {{ t('quantity') }}
                <span class="gf-tab-value">{{ newQuantity || '0' }}</span>
              </button>
              <button
                class="gf-tab-btn"
                @click="openNewModal('unitPrice')">
                {{ t('unitPrice') }}
                <span class="gf-tab-value">{{ newUnitPrice || '0' }}</span>
              </button>
            </div>
            <div class="gf-amount-preview">
              {{ t('amount') }}：<span class="gf-amount-value">{{ newAmount }}</span>
            </div>
            <button class="gf-confirm-btn" @click="goToConfirmStep" :disabled="!canGoConfirm">
              {{ t('next') }} →
            </button>
          </div>
        </template>

        <!-- Step 3：確認 -->
        <template v-if="addStep === 3">
          <div class="gf-step-content">
            <div class="gf-confirm-card">
              <div class="gf-confirm-row">
                <span class="gf-confirm-label">{{ t('farmer') }}</span>
                <span class="gf-confirm-value">
                  {{ newFarmerName }}
                  <span class="gf-confirm-id">{{ newFarmerId }}</span>
                </span>
              </div>
              <div class="gf-confirm-row">
                <span class="gf-confirm-label">{{ t('quantity') }}</span>
                <span class="gf-confirm-value">{{ newQuantity }}</span>
              </div>
              <div class="gf-confirm-row">
                <span class="gf-confirm-label">{{ t('unitPrice') }}</span>
                <span class="gf-confirm-value">{{ newUnitPrice }}</span>
              </div>
              <div class="gf-confirm-row">
                <span class="gf-confirm-label">{{ t('amount') }}</span>
                <span class="gf-confirm-value accent">{{ newAmount }}</span>
              </div>
            </div>
            <button class="gf-confirm-btn" @click="saveNewDetail" :disabled="addSaving">
              {{ addSaving ? '...' : '✓ ' + t('confirm') }}
            </button>
          </div>
        </template>

        <!-- Step 4：儲存後詢問 -->
        <template v-if="addStep === 4">
          <div class="gf-step-content gf-after-save">
            <p class="gf-after-save-msg">{{ t('continueAddDetail') }}</p>
            <div class="gf-after-btns">
              <button class="gf-btn-continue" @click="continueAdding">+ {{ t('addDetail') }}</button>
              <button class="gf-btn-finish" @click="finishAdding">✓ {{ t('done') }}</button>
            </div>
          </div>
        </template>

        <!-- 上一步 -->
        <div v-if="addStep <= 3" class="gf-bottom">
          <button class="gf-prev-btn" @click="newPrevStep">← {{ t('prevStep') }}</button>
        </div>
      </div>

    </div>

    <!-- 當日已有進貨單確認 Overlay -->
    <div v-if="confirmExistingOpen" class="overlay">
      <div class="exist-dialog">
        <div class="exist-title">{{ t('orderExistsToday') }}</div>
        <div class="exist-order-id">{{ existingOrderId }}</div>
        <div class="exist-msg">{{ t('continueAddToExisting') }}</div>
        <div class="exist-btns">
          <button class="exist-btn-cancel" @click="cancelUseExisting">{{ t('cancel') }}</button>
          <button class="exist-btn-ok" @click="confirmUseExisting">✓ {{ t('confirm') }}</button>
        </div>
      </div>
    </div>

    <!-- 農民選單 Overlay -->
    <div v-if="farmerPickerOpen" class="overlay" @click.self="farmerPickerOpen = false">
      <div class="picker-modal">
        <div class="picker-header">
          <span>{{ t('selectFarmer') }}</span>
          <button @click="farmerPickerOpen = false">✕</button>
        </div>
        <input v-model="farmerSearch" class="picker-search" :placeholder="t('searchIdOrName')" />
        <div class="picker-grid">
          <div
            v-for="f in filteredFarmers"
            :key="f.id"
            class="picker-card"
            :class="{ selected: details[pickerTargetIdx]?.farmerId === f.id }"
            @click="selectFarmer(f)"
          >
            <div class="picker-avatar" :style="avatarBg(f.id)">
              <img v-if="f.imageUrl" :src="f.imageUrl" class="avatar-img" />
              <span v-else>{{ f.id.slice(0,2) }}</span>
            </div>
            <div class="picker-id">{{ f.id }}</div>
            <div class="picker-name">{{ f.name }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 正中央 Modal 鍵盤（列表裌明細編輯） -->
    <NumericInputModal :show="keypadOpen" mode="decimal"
      :label="keypadField === 'quantity' ? t('quantity') : t('unitPrice')"
      :model-value="keypadValue"
      @confirm="onRowKeypadConfirm"
      @close="closeKeypad" />

    <!-- 正中央 Modal 鍵盤（導引式新增明細） -->
    <NumericInputModal :show="newModalOpen" mode="decimal"
      :label="newModalField === 'quantity' ? t('quantity') : t('unitPrice')"
      :model-value="newModalField === 'quantity' ? newQuantity : newUnitPrice"
      @confirm="onNewModalConfirm"
      @close="newModalOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive, nextTick } from 'vue'
import { useReceivingStore } from '../../../stores/receiving'
import { useAuthStore } from '../../../stores/auth'
import { useToastStore } from '../../../stores/toast'
import { useI18n } from 'vue-i18n'
import * as api from '../../../api/receiving'
import NumericInputModal from '../../../components/common/NumericInputModal.vue'

const props = withDefaults(defineProps<{
  initialOrderId?: string
  initialItemId?: string
  initialDate?: string
}>(), {
  initialOrderId: '',
  initialItemId: '',
  initialDate: '',
})

const emit = defineEmits(['close', 'created'])
const { t } = useI18n()
const store = useReceivingStore()
const auth = useAuthStore()
const toast = useToastStore()

// ── 基礎資料 ──
const receivingItems = ref<any[]>([])
const farmers = ref<any[]>([])

// ── 狀態 ──
const state = ref<'A' | 'B'>('A')
const loadingOrder = ref(false)
const stateAError = ref('')

// ── 主單表單 ──
const today = new Date()
const form = reactive({
  receivingItemId: '',
  orderDate: '',
})
const dateDay = ref(today.getDate())
const dateMonth = ref(today.getMonth() + 1)
const dateYear = ref(today.getFullYear())
const years = Array.from({ length: 7 }, (_, i) => today.getFullYear() - 2 + i)

const currentOrderId = ref('')

// ── 當日已有進貨單確認 ──
const confirmExistingOpen = ref(false)
const existingOrderId = ref('')

function confirmUseExisting() {
  currentOrderId.value = existingOrderId.value
  confirmExistingOpen.value = false
  state.value = 'B'
  startAddDetail()
}

function cancelUseExisting() {
  confirmExistingOpen.value = false
  existingOrderId.value = ''
}

// ── 明細列表 ──
interface DetailRow {
  localId: number
  farmerId: string
  quantity: string
  unitPrice: string
  saving: boolean
  savedId: number | null
  error: string
}
let localIdCounter = 0
const details = ref<DetailRow[]>([])
const detailListRef = ref<HTMLElement>()

// ── 農民選單 ──
const farmerPickerOpen = ref(false)
const farmerSearch = ref('')
const pickerTargetIdx = ref(0)

// ── 數字鍵盤 ──
const keypadOpen = ref(false)
const keypadValue = ref('')
const keypadTargetIdx = ref(0)
const keypadField = ref<'quantity' | 'unitPrice'>('quantity')

// ── Computed ──
const selectedItem = computed(() => receivingItems.value.find(i => i.id === form.receivingItemId))

const filteredFarmers = computed(() => {
  const q = farmerSearch.value.toLowerCase()
  if (!q) return farmers.value
  return farmers.value.filter(f => f.id.toLowerCase().includes(q) || f.name.toLowerCase().includes(q))
})

// ── Helpers ──
const COLORS = ['#e8820c','#2dd4bf','#818cf8','#f472b6','#34d399','#60a5fa']
function avatarBg(id: string) {
  const code = id.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % COLORS.length
  return { background: COLORS[code] }
}
function getFarmer(id: string) {
  return farmers.value.find(f => f.id === id)
}
function formatDate(d: string) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${parseInt(day)}/${parseInt(m)}/${y.slice(2)}`
}
function buildOrderDate() {
  const y = dateYear.value
  const m = String(dateMonth.value).padStart(2, '0')
  const d = String(dateDay.value).padStart(2, '0')
  return `${y}-${m}-${d}`
}
function calcRowAmount(row: DetailRow) {
  const q = parseFloat(row.quantity)
  const p = parseFloat(row.unitPrice)
  if (isNaN(q) || isNaN(p)) return '—'
  return Math.floor(q * p).toLocaleString()
}

// ── 狀態 A：進入狀態 B ──
async function proceedToB() {
  if (!form.receivingItemId) return
  stateAError.value = ''
  loadingOrder.value = true
  form.orderDate = buildOrderDate()
  try {
    // 嘗試建立主單，409 則沿用既有
    try {
      const result = await api.createOrder({
        orderDate: form.orderDate,
        receivingItemId: form.receivingItemId,
      })
      currentOrderId.value = result.id
    } catch (e: any) {
      if (e?.statusCode === 409 || e?.message?.includes('409') || e?.error === 'Conflict') {
        const orders = await api.fetchOrders({
          itemId: form.receivingItemId,
          date: form.orderDate,
        })
        if (orders.length > 0) {
          // 當日已有同品項進貨單 → 先詢問是否繼續新增明細
          existingOrderId.value = orders[0].id
          confirmExistingOpen.value = true
          return
        } else {
          throw e
        }
      } else {
        throw e
      }
    }
    // 切換到狀態 B，加入第一列空白明細
    state.value = 'B'
    startAddDetail()
  } catch (e: any) {
    stateAError.value = e?.message || t('saveFailed')
  } finally {
    loadingOrder.value = false
  }
}

// ── 明細操作 ──
function addRow() {
  details.value.push({
    localId: ++localIdCounter,
    farmerId: '',
    quantity: '',
    unitPrice: '',
    saving: false,
    savedId: null,
    error: '',
  })
  nextTick(() => {
    detailListRef.value?.scrollTo({ top: detailListRef.value.scrollHeight, behavior: 'smooth' })
  })
}

function addRowAfter(idx: number) {
  details.value.splice(idx + 1, 0, {
    localId: ++localIdCounter,
    farmerId: '',
    quantity: '',
    unitPrice: '',
    saving: false,
    savedId: null,
    error: '',
  })
}

async function deleteRow(idx: number) {
  const row = details.value[idx]
  if (row.savedId) {
    try {
      await api.softDeleteDetail(row.savedId)
      toast.showToast(t('deleted'), 'success')
    } catch (e: any) {
      toast.showToast(e?.message || t('deleteFailed'), 'error')
      return
    }
  }
  details.value.splice(idx, 1)
}

// ── 農民選單 ──
function openFarmerPicker(idx: number) {
  pickerTargetIdx.value = idx
  farmerSearch.value = ''
  farmerPickerOpen.value = true
}

async function selectFarmer(farmer: any) {
  const row = details.value[pickerTargetIdx.value]
  row.farmerId = farmer.id
  farmerPickerOpen.value = false
  await trySaveRow(pickerTargetIdx.value)
}

// ── 數字鍵盤 ──
function openKeypad(idx: number, field: 'quantity' | 'unitPrice') {
  keypadTargetIdx.value = idx
  keypadField.value = field
  keypadValue.value = details.value[idx][field] || ''
  keypadOpen.value = true
}

function pressKey(key: string) {
  let val = keypadValue.value
  if (key === 'C') { val = '' }
  else if (key === '←') { val = val.slice(0, -1) }
  else if (key === '.') {
    if (val.includes('.')) return
    val = (val || '0') + '.'
  } else {
    if (!val.includes('.') && val === '0') { val = key }
    else if (val.includes('.') && val.split('.')[1].length >= 1) return
    else { val = val + key }
  }
  keypadValue.value = val
}

async function confirmKeypad() {
  const row = details.value[keypadTargetIdx.value]
  row[keypadField.value] = keypadValue.value
  keypadOpen.value = false
  await trySaveRow(keypadTargetIdx.value)
}

async function onRowKeypadConfirm(val: string) {
  const row = details.value[keypadTargetIdx.value]
  row[keypadField.value] = val
  keypadOpen.value = false
  await trySaveRow(keypadTargetIdx.value)
}

function closeKeypad() {
  keypadOpen.value = false
}

// ── 導引式新增明細 ──
const addingDetail = ref(false)
const addStep = ref(1)
const newFarmerId = ref('')
const newFarmerName = ref('')
const newQuantity = ref('')
const newUnitPrice = ref('')
const newActiveField = ref<'quantity' | 'unitPrice'>('quantity')
const farmerSubSearch = ref('')
const addSaving = ref(false)

const filteredFarmersNew = computed(() => {
  const q = farmerSubSearch.value.toLowerCase()
  if (!q) return farmers.value
  return farmers.value.filter(f => f.id.toLowerCase().includes(q) || f.name.toLowerCase().includes(q))
})

const newCurrentValue = computed(() =>
  newActiveField.value === 'quantity' ? newQuantity.value : newUnitPrice.value
)

const newAmount = computed(() => {
  const q = parseFloat(newQuantity.value)
  const p = parseFloat(newUnitPrice.value)
  if (isNaN(q) || isNaN(p)) return '—'
  return Math.floor(q * p).toLocaleString()
})

function startAddDetail() {
  newFarmerId.value = ''
  newFarmerName.value = ''
  newQuantity.value = ''
  newUnitPrice.value = ''
  newActiveField.value = 'quantity'
  farmerSubSearch.value = ''
  addStep.value = 1
  addingDetail.value = true
}

function selectNewFarmer(farmer: any) {
  newFarmerId.value = farmer.id
  newFarmerName.value = farmer.name
  addStep.value = 2
}

const newModalOpen = ref(false)
const newModalField = ref<'quantity' | 'unitPrice'>('quantity')
function openNewModal(f: 'quantity' | 'unitPrice') { newActiveField.value = f; newModalField.value = f; newModalOpen.value = true }
function onNewModalConfirm(val: string) {
  if (newModalField.value === 'quantity') newQuantity.value = val
  else newUnitPrice.value = val
  newModalOpen.value = false
}
const canGoConfirm = computed(() => parseFloat(newQuantity.value) > 0 && parseFloat(newUnitPrice.value) > 0)
function goToConfirmStep() {
  if (!canGoConfirm.value) return
  addStep.value = 3
}

function pressNewKey(key: string) {
  const isQty = newActiveField.value === 'quantity'
  let val = isQty ? newQuantity.value : newUnitPrice.value
  if (key === 'C') { val = '' }
  else if (key === '←') { val = val.slice(0, -1) }
  else if (key === '.') {
    if (val.includes('.')) return
    val = (val || '0') + '.'
  } else if (key === '✓') {
    advanceNewField()
    return
  } else {
    if (!val.includes('.') && val === '0') { val = key }
    else if (val.includes('.') && val.split('.')[1].length >= 1) return
    else { val = val + key }
  }
  if (isQty) newQuantity.value = val
  else newUnitPrice.value = val
}

function advanceNewField() {
  if (newActiveField.value === 'quantity') {
    if (!newQuantity.value || parseFloat(newQuantity.value) <= 0) return
    newActiveField.value = 'unitPrice'
  } else {
    if (!newUnitPrice.value || parseFloat(newUnitPrice.value) <= 0) return
    addStep.value = 3
  }
}

async function saveNewDetail() {
  if (!newFarmerId.value || !newQuantity.value || !newUnitPrice.value) return
  addSaving.value = true
  try {
    const batchResult = await api.createBatch({
      orderId: currentOrderId.value,
      farmerId: newFarmerId.value,
    })
    const detailResult = await api.createDetail({
      batchId: batchResult.id,
      itemId: form.receivingItemId,
      farmerId: newFarmerId.value,
      quantity: parseFloat(newQuantity.value),
      unitPrice: parseFloat(newUnitPrice.value),
    })
    details.value.push({
      localId: ++localIdCounter,
      farmerId: newFarmerId.value,
      quantity: newQuantity.value,
      unitPrice: newUnitPrice.value,
      saving: false,
      savedId: detailResult.id,
      error: '',
    })
    toast.showToast(t('detailAdded'), 'success')
    addStep.value = 4
  } catch (e: any) {
    toast.showToast(e?.message || t('saveFailed'), 'danger')
  } finally {
    addSaving.value = false
  }
}

function continueAdding() {
  newFarmerId.value = ''
  newFarmerName.value = ''
  newQuantity.value = ''
  newUnitPrice.value = ''
  newActiveField.value = 'quantity'
  farmerSubSearch.value = ''
  addStep.value = 1
}

function finishAdding() {
  addingDetail.value = false
  handleDone()
}

function newPrevStep() {
  if (addStep.value <= 1) {
    addingDetail.value = false
  } else {
    addStep.value--
  }
}

// ── 即時儲存 ──
async function trySaveRow(idx: number) {
  const row = details.value[idx]
  if (!row.farmerId || !row.quantity || !row.unitPrice) return
  if (parseFloat(row.quantity) <= 0 || parseFloat(row.unitPrice) <= 0) return

  row.saving = true
  row.error = ''
  try {
    if (row.savedId) {
      // 更新既有明細
      await api.updateDetail(row.savedId, {
        quantity: parseFloat(row.quantity),
        unitPrice: parseFloat(row.unitPrice),
      })
    } else {
      // 建立批次 + 明細
      const batchResult = await api.createBatch({
        orderId: currentOrderId.value,
        farmerId: row.farmerId,
      })
      const batchId = batchResult.id
      const detailResult = await api.createDetail({
        batchId,
        itemId: form.receivingItemId,
        farmerId: row.farmerId,
        quantity: parseFloat(row.quantity),
        unitPrice: parseFloat(row.unitPrice),
      })
      row.savedId = detailResult.id
    }
    toast.showToast(t('detailAdded'), 'success')
  } catch (e: any) {
    row.error = e?.message || t('saveFailed')
  } finally {
    row.saving = false
  }
}

// ── 完成 ──
async function handleDone() {
  emit('created', currentOrderId.value)
}

function handleClose() {
  if (state.value === 'B' && details.value.some(r => r.savedId)) {
    emit('created', currentOrderId.value)
  } else {
    emit('close')
  }
}

// ── 載入 ──
async function loadData() {
  try {
    const headers = { Authorization: `Bearer ${auth.token}` }
    const [itemsRes, farmersRes] = await Promise.all([
      fetch('/api/master-data/receiving-items', { headers }),
      fetch('/api/master-data/farmers', { headers }),
    ])
    if (itemsRes.ok) receivingItems.value = await itemsRes.json()
    if (farmersRes.ok) farmers.value = await farmersRes.json()
  } catch {}
}

onMounted(async () => {
  await loadData()
  // 若帶入既有主單，直接進入狀態 B
  if (props.initialOrderId && props.initialItemId && props.initialDate) {
    currentOrderId.value = props.initialOrderId
    form.receivingItemId = props.initialItemId
    form.orderDate = props.initialDate
    state.value = 'B'
    startAddDetail()
  }
})
</script>

<style scoped>
.create-wrap {
  display: flex; flex-direction: column;
  height: 100%;
  background: var(--color-bg);
}

/* Header */
.create-header {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}
.back-btn {
  background: none; border: none;
  color: var(--color-success); font-size: 20px;
  cursor: pointer; padding: 4px 8px;
  transition: opacity 0.15s;
}
.back-btn:hover { opacity: 0.75; }
.header-title {
  flex: 1; font-size: 15px; font-weight: 700; color: var(--color-text);
  display: flex; align-items: center; gap: 8px;
}
.header-item-img { display: flex; align-items: center; }
.header-item-img img { width: 24px; height: 24px; border-radius: 4px; object-fit: cover; }
.header-avatar {
  width: 24px; height: 24px; border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700; color: #fff;
}
.close-btn {
  background: none; border: none;
  color: var(--color-text-muted); font-size: 18px; cursor: pointer;
}

/* ── 狀態 A ── */
.state-a {
  flex: 1; overflow-y: auto; padding: 16px;
  display: flex; flex-direction: column; gap: 14px;
}
.section-label {
  font-size: 11px; font-weight: 700; color: var(--color-text-muted);
  text-transform: uppercase; letter-spacing: 0.06em;
}

/* 品項 Grid */
.item-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  max-height: 280px;
  overflow-y: auto;
  padding-right: 4px;
}
.item-grid::-webkit-scrollbar { width: 4px; }
.item-grid::-webkit-scrollbar-track { background: transparent; }
.item-grid::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 4px; }

@media (max-width: 480px) {
  .item-grid { grid-template-columns: repeat(2, 1fr); }
}

.item-card {
  position: relative;
  display: flex; flex-direction: column; align-items: center;
  gap: 5px; padding: 12px 8px;
  background: var(--color-surface); border: 2px solid var(--color-border);
  border-radius: 12px; cursor: pointer; transition: all 0.15s;
}
.item-card:hover { border-color: var(--color-accent); }
.item-card.selected { border-color: var(--color-accent); background: var(--color-accent-glow); }
.item-check {
  position: absolute; top: 6px; right: 6px;
  width: 18px; height: 18px; border-radius: 50%;
  background: var(--color-accent); color: #fff;
  font-size: 10px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.item-avatar {
  width: 48px; height: 48px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 700; color: #fff;
  overflow: hidden; position: relative;
}
.avatar-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.item-id { font-size: 10px; color: var(--color-text-muted); font-weight: 700; }
.item-name { font-size: 12px; font-weight: 700; color: var(--color-text); text-align: center; }

/* 日期下拉 */
.date-selects {
  display: flex; align-items: center; gap: 6px;
}
.date-sel {
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: 8px; padding: 10px 8px;
  color: var(--color-text); font-size: 16px; font-weight: 600;
  cursor: pointer; flex: 1;
}
.date-sel-year { flex: 1.5; }
.date-sep { font-size: 18px; color: var(--color-text-muted); font-weight: 700; }

.btn-next {
  width: 100%; background: var(--color-accent); color: #fff; border: none;
  border-radius: 12px; padding: 16px; font-size: 16px; font-weight: 700;
  cursor: pointer; margin-top: 8px; transition: opacity 0.15s;
}
.btn-next:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-next:hover:not(:disabled) { opacity: 0.88; }

.error-msg {
  padding: 8px 12px; background: rgba(248,113,113,0.1);
  border: 1px solid var(--color-danger); border-radius: 8px;
  color: var(--color-danger); font-size: 13px;
}

/* ── 狀態 B ── */
.state-b {
  flex: 1; display: flex; flex-direction: column; overflow: hidden;
}

.detail-list {
  flex: 1; overflow-y: auto; padding: 12px;
  display: flex; flex-direction: column; gap: 8px;
}

.detail-empty {
  text-align: center; padding: 40px;
  color: var(--color-text-dim); font-size: 14px;
}

.detail-row {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  transition: border-color 0.15s;
}
.detail-row.saving { border-color: var(--color-accent); opacity: 0.8; }
.detail-row.error { border-color: var(--color-danger); }

.detail-farmer {
  display: flex; flex-direction: column; gap: 3px;
  cursor: pointer; padding: 4px 6px;
  border-radius: 6px; transition: background 0.1s;
  background: var(--color-card); border: 1px solid var(--color-border);
}
.detail-farmer:hover { border-color: var(--color-accent); }

.detail-stats {
  display: flex; gap: 0;
  background: var(--color-card); border-radius: 6px;
  border: 1px solid var(--color-border); overflow: hidden;
}
.detail-stat {
  display: flex; flex-direction: column; align-items: center;
  gap: 3px; flex: 1; padding: 6px 4px;
  border-right: 1px solid var(--color-border);
  cursor: pointer; transition: background 0.1s;
}
.detail-stat:hover { background: var(--color-surface-hover); }
.detail-stat.amount-stat { cursor: default; }
.detail-stat.amount-stat:hover { background: none; }
.detail-stat:last-child { border-right: none; }

.stat-label { font-size: 10px; color: var(--color-text-muted); text-transform: uppercase; text-align: center; }
.stat-value { font-size: 14px; font-weight: 700; color: var(--color-text); }
.stat-value.accent { color: var(--color-accent); }

.cell-label { font-size: 10px; color: var(--color-text-muted); text-transform: uppercase; font-weight: 600; }
.cell-value { font-size: 14px; font-weight: 700; color: var(--color-text); display: flex; align-items: center; gap: 4px; }
.cell-empty { font-size: 13px; color: var(--color-text-dim); }
.farmer-thumb { width: 20px; height: 20px; border-radius: 50%; object-fit: cover; }
.farmer-id-tag {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 1px 5px;
  letter-spacing: 0.04em;
}

.detail-actions {
  display: flex; gap: 6px; justify-content: flex-end;
}
.btn-row-add, .btn-row-del {
  width: 32px; height: 32px; border-radius: 8px; border: none;
  font-size: 18px; font-weight: 700; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: opacity 0.1s;
}
.btn-row-add { background: var(--color-accent); color: #fff; }
.btn-row-del { background: var(--color-danger-bg); color: #fff; }
.btn-row-add:hover, .btn-row-del:hover { opacity: 0.82; }

.row-status {
  position: absolute; top: 8px; right: 8px;
  font-size: 11px; font-weight: 700;
}
.row-status.done { color: var(--color-success); }
.row-status.error-icon { color: var(--color-danger); cursor: help; }

/* 底部操作列 */
.state-b-footer {
  display: flex; gap: 10px; padding: 12px 16px;
  border-top: 1px solid var(--color-border); flex-shrink: 0;
}
.btn-add-row {
  flex: 1; background: var(--color-surface); color: var(--color-accent);
  border: 1px solid var(--color-accent); border-radius: 10px;
  padding: 12px; font-size: 14px; font-weight: 700; cursor: pointer;
}
.btn-done {
  flex: 1; background: var(--color-success); color: #fff; border: none;
  border-radius: 10px; padding: 12px; font-size: 14px; font-weight: 700; cursor: pointer;
}

/* ── 農民選單 Overlay ── */
.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.72); z-index: 400;
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.picker-modal {
  background: var(--color-card); border-radius: 16px;
  width: 100%; max-width: 480px; max-height: 75vh;
  display: flex; flex-direction: column;
  animation: modalIn 0.18s ease-out;
}
@keyframes modalIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.picker-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 18px 10px;
  border-bottom: 1px solid var(--color-border);
  font-size: 15px; font-weight: 700; color: var(--color-text);
}
.picker-header button {
  background: none; border: none; color: var(--color-text-muted);
  font-size: 16px; cursor: pointer;
}
.picker-search {
  margin: 10px 16px; padding: 9px 12px;
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: 8px; color: var(--color-text); font-size: 14px;
}
.picker-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
  padding: 8px 16px 16px; overflow-y: auto;
}
.picker-card {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 10px 6px; background: var(--color-surface);
  border: 1px solid var(--color-border); border-radius: 10px;
  cursor: pointer; transition: all 0.15s;
}
.picker-card:hover, .picker-card.selected {
  border-color: var(--color-accent); background: var(--color-accent-glow);
}
.picker-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; color: #fff; overflow: hidden; position: relative;
}
.picker-id { font-size: 10px; color: var(--color-text-muted); font-weight: 700; }
.picker-name { font-size: 12px; font-weight: 600; color: var(--color-text); text-align: center; }

/* ── 數字鍵盤 ── */
.keypad-overlay {
  position: fixed; inset: 0; z-index: 500;
  display: flex; flex-direction: column; justify-content: flex-end;
}
.keypad-backdrop {
  position: absolute; inset: 0; background: rgba(0,0,0,0.55);
}
.keypad-sheet {
  position: relative; background: var(--color-drawer);
  border-radius: 16px 16px 0 0; border-top: 1px solid var(--color-border);
  padding: 0 0 env(safe-area-inset-bottom);
}
.keypad-display {
  padding: 16px 20px 12px; text-align: right;
  font-size: 36px; font-weight: 700; color: var(--color-text);
  border-bottom: 1px solid var(--color-border);
}
.kpad-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;
  padding: 12px 12px 16px;
}
.kpad-btn {
  height: 56px; background: var(--color-surface);
  border: 1px solid var(--color-border); border-radius: 10px;
  color: var(--color-text); font-size: 22px; font-weight: 500;
  cursor: pointer; transition: background 0.1s;
}
.kpad-btn:active { background: var(--color-surface-hover); }
.kpad-secondary { color: var(--color-text-muted); font-size: 18px; }
.kpad-confirm {
  background: var(--color-accent); border-color: var(--color-accent);
  color: #fff; font-size: 20px;
}
.kpad-span2 { grid-column: span 2; }

/* ── 導引式新增明細 sub-flow ── */
.gf-subflow {
  flex: 1; display: flex; flex-direction: column; overflow: hidden;
}

.gf-step-bar {
  height: 4px; background: var(--color-border); flex-shrink: 0;
}
.gf-step-progress {
  height: 100%; background: var(--color-accent); transition: width 0.3s ease;
}

.gf-step-header {
  padding: 10px 16px 4px; flex-shrink: 0;
}
.gf-step-counter {
  font-size: 12px; font-weight: 700; color: var(--color-text-muted);
  text-transform: uppercase; letter-spacing: 0.06em;
}

.gf-step-content {
  flex: 1; overflow-y: auto; padding: 10px 16px;
  display: flex; flex-direction: column; gap: 10px;
}

.gf-search {
  width: 100%; padding: 10px 12px; box-sizing: border-box;
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: 8px; color: var(--color-text); font-size: 14px;
  flex-shrink: 0;
}

.gf-farmer-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
  overflow-y: auto;
}
.gf-farmer-card {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 10px 6px; background: var(--color-surface);
  border: 1px solid var(--color-border); border-radius: 10px;
  cursor: pointer; transition: all 0.15s;
}
.gf-farmer-card:active { border-color: var(--color-accent); background: var(--color-accent-glow); }
.gf-farmer-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; color: #fff; overflow: hidden; position: relative;
}
.gf-farmer-avatar img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.gf-farmer-name { font-size: 11px; font-weight: 600; color: var(--color-text); text-align: center; }
.gf-farmer-id { font-size: 10px; color: var(--color-text-muted); font-weight: 700; }

.gf-input-tabs {
  display: flex; gap: 8px; flex-shrink: 0;
}
.gf-tab-btn {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 10px 8px; background: var(--color-surface);
  border: 2px solid var(--color-border); border-radius: 10px;
  cursor: pointer; transition: all 0.15s; color: var(--color-text-muted);
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
}
.gf-tab-btn.active { border-color: var(--color-accent); color: var(--color-accent); }
.gf-tab-value { font-size: 20px; font-weight: 700; color: var(--color-text); }

.gf-amount-preview {
  text-align: center; font-size: 12px; color: var(--color-text-muted);
  flex-shrink: 0;
}
.gf-amount-value {
  font-size: 18px; font-weight: 700; color: var(--color-accent);
}

.gf-inline-keypad {
  display: flex; flex-direction: column; gap: 8px; flex-shrink: 0;
}
.gf-keypad-display {
  text-align: right; font-size: 32px; font-weight: 700; color: var(--color-text);
  padding: 8px 12px; background: var(--color-surface);
  border: 1px solid var(--color-border); border-radius: 10px;
}
.gf-keypad-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;
}
.gf-kkey {
  height: 52px; background: var(--color-surface);
  border: 1px solid var(--color-border); border-radius: 10px;
  color: var(--color-text); font-size: 20px; font-weight: 500;
  cursor: pointer; transition: background 0.1s;
}
.gf-kkey:active { background: var(--color-surface-hover); }
.gf-kkey-secondary { color: var(--color-text-muted); font-size: 16px; }
.gf-kkey-confirm {
  background: var(--color-accent); border-color: var(--color-accent);
  color: #fff; font-size: 18px;
}
.gf-kkey-span2 { grid-column: span 2; }

.gf-confirm-card {
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 12px;
}
.gf-confirm-row {
  display: flex; justify-content: space-between; align-items: center;
}
.gf-confirm-label {
  font-size: 12px; color: var(--color-text-muted); font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.04em;
}
.gf-confirm-value {
  font-size: 16px; font-weight: 700; color: var(--color-text);
  display: flex; align-items: center; gap: 6px;
}
.gf-confirm-value.accent { color: var(--color-accent); }
.gf-confirm-id {
  font-size: 10px; font-weight: 700; color: var(--color-text-muted);
  background: var(--color-card); border: 1px solid var(--color-border);
  border-radius: 4px; padding: 1px 5px;
}
.gf-confirm-btn {
  width: 100%; padding: 16px; background: var(--color-accent);
  color: #fff; border: none; border-radius: 12px;
  font-size: 16px; font-weight: 700; cursor: pointer; transition: opacity 0.15s;
  flex-shrink: 0;
}
.gf-confirm-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.gf-confirm-btn:hover:not(:disabled) { opacity: 0.88; }

.gf-after-save {
  align-items: center; justify-content: center; flex: 1;
}
.gf-after-save-msg {
  font-size: 15px; font-weight: 600; color: var(--color-text);
  text-align: center; padding: 0 8px;
}
.gf-after-btns {
  display: flex; flex-direction: column; gap: 10px; width: 100%;
}
.gf-btn-continue {
  width: 100%; padding: 16px; background: var(--color-surface);
  color: var(--color-accent); border: 1px solid var(--color-accent);
  border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer;
}
.gf-btn-finish {
  width: 100%; padding: 16px; background: var(--color-success);
  color: #fff; border: none; border-radius: 12px;
  font-size: 15px; font-weight: 700; cursor: pointer;
}

.gf-bottom {
  padding: 10px 16px 14px; border-top: 1px solid var(--color-border); flex-shrink: 0;
}
.gf-prev-btn {
  background: none; border: none; color: var(--color-text-muted);
  font-size: 14px; font-weight: 600; cursor: pointer; padding: 6px 0;
}
.gf-prev-btn:hover { color: var(--color-text); }

/* ── 當日已有進貨單確認 Dialog ── */
.exist-dialog {
  background: var(--color-card); border-radius: 16px;
  width: 100%; max-width: 360px; padding: 22px 20px;
  display: flex; flex-direction: column; gap: 12px; align-items: center;
  animation: modalIn 0.18s ease-out;
}
.exist-title { font-size: 15px; font-weight: 700; color: var(--color-text); text-align: center; }
.exist-order-id {
  font-size: 18px; font-weight: 700; color: var(--color-accent);
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: 8px; padding: 8px 16px; letter-spacing: 0.03em;
}
.exist-msg { font-size: 13px; color: var(--color-text-muted); text-align: center; }
.exist-btns { display: flex; gap: 10px; width: 100%; margin-top: 4px; }
.exist-btn-cancel {
  flex: 1; padding: 13px; background: var(--color-surface); color: var(--color-text);
  border: 1px solid var(--color-border); border-radius: 10px;
  font-size: 14px; font-weight: 700; cursor: pointer;
}
.exist-btn-ok {
  flex: 1; padding: 13px; background: var(--color-accent); color: #fff;
  border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer;
}
</style>
