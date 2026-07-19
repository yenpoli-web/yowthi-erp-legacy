<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useReceivingItemsStore } from '../stores/receiving-items'
import { useEmployeesStore } from '../stores/employees'
import { useFarmersStore } from '../stores/farmers'
import { useToastStore } from '../stores/toast'
import * as processingApi from '../api/processing'
import * as masterApi from '../api/masterData'
import NumericInputModal from '../components/common/NumericInputModal.vue'
import { useOfflineQueue } from '../composables/useOfflineQueue'
import { setTodayDetailsCache, getTodayDetailsCache, setQueryCache, getQueryCache } from '../utils/offlineDb'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const receivingItemsStore = useReceivingItemsStore()
const employeesStore = useEmployeesStore()
const farmersStore = useFarmersStore()
const toast = useToastStore()
const { isOffline, pendingCount, callOrQueue } = useOfflineQueue(() => {
  toast.showToast(t('offlineSyncDone'), 'success')
  loadTodayDetails()
})

// ── 步驟狀態 ──────────────────────────────────────────────────────
const step = ref(1)
const loading = ref(false)

// ── 已選取的資料 ──────────────────────────────────────────────────
const selectedItem = ref<any>(null)
const selectedEmployee = ref<any>(null)
const selectedType = ref<string>('')
const selectedFarmer = ref<any>(null)
const selectedBatch = ref<any>(null)
const selectedOrder = ref<any>(null)

// ── 數量輸入（H02/H03 直接輸入） ──────────────────────────────────
const outputQty = ref('')
const defectQty = ref('')
const wageRate = ref('')

// ── H01 秤重計算輸入 ──────────────────────────────────────────────
const h01InputWeight = ref('')    // 取用量秤重量
const h01InputBaskets = ref('')   // 取用量大籃子數
const h01OutputWeight = ref('')   // 完成品秤重量
const h01OutputBaskets = ref('') // 完成品小籃子數
const h01DefectWeight = ref('')   // 瑕疵品秤重量
const h01DefectBaskets = ref('')  // 瑕疵品大籃子數

// H02 秤重計算輸入
const h02OutputWeight = ref('')   // 完成品秤重量
const h02OutputBaskets = ref('') // 完成品小籃子數

type ActiveField = 'output' | 'defect' | 'wage'
  | 'inputWeight' | 'inputBaskets'
  | 'outputWeight' | 'outputBaskets'
  | 'defectWeight' | 'defectBaskets'
  | 'h02OutputWeight' | 'h02OutputBaskets'
const activeField = ref<ActiveField>('inputWeight')

// 正中央 Modal 鍵盤開關
const modalOpen = ref(false)

function openField(field: ActiveField) {
  activeField.value = field
  modalOpen.value = true
}

// 是否為整數欄位（籃子數）
const isBasketField = computed(() =>
  activeField.value === 'inputBaskets' ||
  activeField.value === 'outputBaskets' ||
  activeField.value === 'defectBaskets' ||
  activeField.value === 'h02OutputBaskets'
)

const currentFieldMode = computed(() => (isBasketField.value ? 'integer' : 'decimal'))

const currentFieldLabel = computed(() => {
  const labels: Record<ActiveField, string> = {
    output: t('outputQtyLabel'),
    defect: t('defectQtyLabel'),
    wage: t('wageRate'),
    inputWeight: t('scaleWeight'),
    inputBaskets: t('largeBasket'),
    outputWeight: t('scaleWeight'),
    outputBaskets: t('smallBasket'),
    defectWeight: t('scaleWeight'),
    defectBaskets: t('largeBasket'),
    h02OutputWeight: t('scaleWeight'),
    h02OutputBaskets: t('smallBasket'),
  }
  return labels[activeField.value]
})

// ── 可用資料 ──────────────────────────────────────────────────────
const availableBatches = ref<any[]>([])
const availableOrdersH02 = ref<any[]>([])
const availableOrdersH03 = ref<any[]>([])

// ── 當前加工單 ──────────────────────────────────────────────────────
const currentOrderId = ref<string>('')
const showTodayRecords = ref(false)
const todayDetails = ref<any[]>([])
const processingItems = ref<any[]>([])

async function loadTodayDetails() {
  try {
    const res = await processingApi.getTodayDetails()
    todayDetails.value = (res.data || []).sort((a: any, b: any) => b.id - a.id)
    await setTodayDetailsCache(todayDetails.value)
  } catch {
    // 離線時改從本地快取讀取（僅今天資料，其他日期不提供）
    const cached = await getTodayDetailsCache()
    if (cached) todayDetails.value = cached
  }
}

async function openTodayRecords() {
  await loadTodayDetails()
  showTodayRecords.value = true
}

function canSoftDelete(detail: any): boolean {
  const created = new Date(detail.createdAt).getTime()
  const now = Date.now()
  return (now - created) <= 5 * 60 * 1000
}

async function softDeleteDetail(id: number) {
  try {
    const result = await callOrQueue('softDelete', 'DELETE', `/api/processing/details/${id}`, {})
    todayDetails.value = todayDetails.value.filter(d => d.id !== id)
    if (result.queued) await setTodayDetailsCache(todayDetails.value)
    toast.showToast(result.queued ? t('savedOffline') : t('deleted'), 'success')
  } catch {
    toast.showToast(t('deleteFailed'), 'danger')
  }
}

function isAlreadyOffset(detail: any): boolean {
  return todayDetails.value.some((d: any) =>
    d.isOffset === true && d.batchCode && detail.batchCode &&
    d.batchCode.includes(detail.batchCode + '-OFFSET-')
  )
}

const pendingOffsetId = ref<number | null>(null)
const pinInput = ref('')
const pinError = ref(false)
const showPinOverlay = ref(false)

async function offsetDetail(id: number) {
  try {
    const result = await callOrQueue('offset', 'POST', `/api/processing/details/${id}/offset`, {})
    if (result.queued) {
      // 離線標記：本地標記為已沖銷，避免重複點擊
      const target = todayDetails.value.find(d => d.id === id)
      if (target) target.isOffset = true
      await setTodayDetailsCache(todayDetails.value)
    }
    toast.showToast(result.queued ? t('savedOffline') : t('offsetConfirmed'), 'success')
  } catch {
    toast.showToast(t('offsetFailed'), 'danger')
  }
}

function onPinKey(digit: string) {
  if (pinInput.value.length >= 4) return
  pinInput.value += digit
  pinError.value = false
  if (pinInput.value.length === 4) submitPin()
}

async function submitPin() {
  if (pinInput.value === '0000') {
    await offsetDetail(pendingOffsetId.value!)
    await loadTodayDetails()
    showPinOverlay.value = false
    pendingOffsetId.value = null
    pinInput.value = ''
    pinError.value = false
  } else {
    pinError.value = true
    pinInput.value = ''
  }
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
}

// ── H01 秤重計算結果 ──────────────────────────────────────────────
const h01InputQty = computed(() => {
  const w = parseFloat(h01InputWeight.value) || 0
  const b = parseInt(h01InputBaskets.value) || 0
  return parseFloat((w - b * 1.1).toFixed(3))
})
const h01OutputQty = computed(() => {
  const w = parseFloat(h01OutputWeight.value) || 0
  const b = parseInt(h01OutputBaskets.value) || 0
  return parseFloat((w - b * 2.5).toFixed(3))
})
const h01DefectQty = computed(() => {
  const w = parseFloat(h01DefectWeight.value) || 0
  const b = parseInt(h01DefectBaskets.value) || 0
  return parseFloat((w - b * 1.1).toFixed(3))
})

// H02 秤重計算結果
const h02OutputQty = computed(() => {
  const w = parseFloat(h02OutputWeight.value) || 0
  const b = parseInt(h02OutputBaskets.value) || 0
  return parseFloat((w - b * 2.5).toFixed(3))
})

// ── 計算金額 ──────────────────────────────────────────────────────
const amount = computed(() => {
  let out: number
  if (selectedType.value === 'H01') out = h01OutputQty.value
  else if (selectedType.value === 'H02') out = h02OutputQty.value
  else out = parseFloat(outputQty.value) || 0
  const wage = parseFloat(wageRate.value) || 0
  return Math.floor(out * wage)
})

// ── inputQty（自動計算）──────────────────────────────────────────
const inputQty = computed(() => {
  if (selectedType.value === 'H01') return h01InputQty.value
  if (selectedType.value === 'H02') return h02OutputQty.value
  return parseFloat(outputQty.value) || 0
})

// ── 步驟名稱 ──────────────────────────────────────────────────────
const stepTitle = computed(() => {
  const titles: Record<number, string> = {
    1: t('selectReceivingItem'),
    2: t('selectEmployee'),
    3: t('selectProcessingType'),
    4: selectedType.value === 'H01' ? t('selectFarmer') : t('selectReceivingOrder'),
    5: t('inputQty'),
    6: t('confirmSubmit'),
  }
  return titles[step.value] || ''
})

// ── 總步驟數 ──────────────────────────────────────────────────────
const totalSteps = computed(() => 6)

// ── 載入主資料 ──────────────────────────────────────────────────────
function getProcessingItemName(id: string): string {
  const item = processingItems.value.find((p: any) => p.id === id)
  return item?.name || id
}

onMounted(async () => {
  try {
    const [piRes] = await Promise.all([
      masterApi.getProcessingItems(),
      farmersStore.fetchFarmers(),
      employeesStore.fetchEmployees(),
      receivingItemsStore.fetchReceivingItems(),
    ])
    processingItems.value = piRes.data
    console.log('receivingItems:', receivingItemsStore.receivingItems)
    console.log('employees:', employeesStore.employees)
    console.log('farmers:', farmersStore.farmers)
  } catch (e) {
    console.error('載入失敗:', e)
  }
  await loadTodayDetails()
})

// ── 格式化進貨日期顯示 ──────────────────────────────────────────────
function formatOrderDate(orderId: string) {
  try {
    const parts = orderId.split('-')
    const dateStr = parts[1]
    const n = parts[2]
    const y = dateStr.slice(2, 4)
    const m = parseInt(dateStr.slice(4, 6))
    const d = parseInt(dateStr.slice(6, 8))
    return `${d}/${m}/${y} (${n})`
  } catch { return orderId }
}

// ── Step 1：選取進貨品項 ──────────────────────────────────────────
async function selectItem(item: any) {
  selectedItem.value = item
  step.value = 2
}

// ── Step 2：選取員工 ──────────────────────────────────────────────
async function selectEmployee(emp: any) {
  selectedEmployee.value = emp
  step.value = 3
}

// ── Step 3：選取加工品項 ──────────────────────────────────────────
async function selectType(type: string) {
  selectedType.value = type
  loading.value = true
  try {
    const today = new Date()
    const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
    const orderCacheKey = `order:${dateStr}:${selectedItem.value.id}:${type}`

    if (navigator.onLine) {
      try {
        const res = await processingApi.findOrCreateOrder({
          orderDate: dateStr,
          receivingItemId: selectedItem.value.id,
          sourceType: type === 'H03' ? 'DEFECT' : 'RECEIVING',
        })
        currentOrderId.value = res.data.id
        await setQueryCache(orderCacheKey, res.data.id)
      } catch {
        const cached = await getQueryCache<string>(orderCacheKey)
        if (!cached) throw new Error('offline-no-cache')
        currentOrderId.value = cached
      }
    } else {
      const cached = await getQueryCache<string>(orderCacheKey)
      if (!cached) {
        toast.showToast(t('offlineNoCache'), 'danger')
        loading.value = false
        return
      }
      currentOrderId.value = cached
    }

    if (type === 'H01') {
      const cacheKey = `batches:${selectedFarmer.value?.id || ''}`
      if (navigator.onLine) {
        const bRes = await processingApi.getAvailableBatches(selectedFarmer.value?.id || '')
        availableBatches.value = bRes.data
        await setQueryCache(cacheKey, bRes.data)
      } else {
        availableBatches.value = (await getQueryCache(cacheKey)) || []
      }
    } else if (type === 'H02') {
      const cacheKey = `ordersH02:${selectedItem.value.id}`
      if (navigator.onLine) {
        const oRes = await processingApi.getAvailableOrdersH02(selectedItem.value.id)
        availableOrdersH02.value = oRes.data
        await setQueryCache(cacheKey, oRes.data)
      } else {
        availableOrdersH02.value = (await getQueryCache(cacheKey)) || []
      }
    } else if (type === 'H03') {
      const cacheKey = `ordersH03:${selectedItem.value.id}`
      if (navigator.onLine) {
        const oRes = await processingApi.getAvailableOrdersH03(selectedItem.value.id)
        availableOrdersH03.value = oRes.data
        await setQueryCache(cacheKey, oRes.data)
      } else {
        availableOrdersH03.value = (await getQueryCache(cacheKey)) || []
      }
    }
    step.value = 4
  } catch (e) {
    toast.showToast(t('errorRetry'), 'danger')
  } finally {
    loading.value = false
  }
}

// ── Step 4：選取農民（H01）──────────────────────────────────────
async function selectFarmer(farmer: any) {
  selectedFarmer.value = farmer
  loading.value = true
  try {
    const cacheKey = `batches:${farmer.id}`
    let data: any[]
    if (navigator.onLine) {
      const res = await processingApi.getAvailableBatches(farmer.id)
      data = res.data
      await setQueryCache(cacheKey, data)
    } else {
      data = (await getQueryCache(cacheKey)) || []
    }
    availableBatches.value = data
    if (data.length === 1) {
      selectedBatch.value = data[0]
      activeField.value = 'inputWeight'
      step.value = 5
    } else if (data.length === 0) {
      toast.showToast(t('noBatches'), 'danger')
    } else {
      step.value = 4.5 as any
    }
  } catch {
    toast.showToast(t('loadFailed'), 'danger')
  } finally {
    loading.value = false
  }
}

// ── Step 4.5：選取批次（H01 多筆時）────────────────────────────────
function selectBatch(batch: any) {
  selectedBatch.value = batch
  activeField.value = 'inputWeight'
  step.value = 5
}

// ── Step 4：選取進貨單（H02/H03）──────────────────────────────────
function selectReceivingOrder(order: any) {
  selectedOrder.value = order
  activeField.value = selectedType.value === 'H02' ? 'h02OutputWeight' : 'output'
  step.value = 5
}

// ── Step 5：驗證並前往確認（由「下一步」按鈕觸發，不再自動鏈接欄位）─────
function goToConfirmStep() {
  if (selectedType.value === 'H01') {
    if (h01OutputQty.value <= 0) {
      toast.showToast(t('inputOutputFirst'), 'danger')
      return
    }
    if (!wageRate.value || parseFloat(wageRate.value) <= 0) {
      toast.showToast(t('inputWageFirst'), 'danger')
      return
    }
    step.value = 6
    return
  }
  if (selectedType.value === 'H02') {
    if (h02OutputQty.value <= 0) {
      toast.showToast(t('inputOutputFirst'), 'danger')
      return
    }
    if (!wageRate.value || parseFloat(wageRate.value) <= 0) {
      toast.showToast(t('inputWageFirst'), 'danger')
      return
    }
    step.value = 6
    return
  }
  // H03
  if (!outputQty.value || parseFloat(outputQty.value) <= 0) {
    toast.showToast(t('inputOutputFirst'), 'danger')
    return
  }
  if (!wageRate.value || parseFloat(wageRate.value) <= 0) {
    toast.showToast(t('inputWageFirst'), 'danger')
    return
  }
  step.value = 6
}

const currentFieldValue = computed(() => {
  switch (activeField.value) {
    case 'output': return outputQty.value
    case 'defect': return defectQty.value
    case 'wage': return wageRate.value
    case 'inputWeight': return h01InputWeight.value
    case 'inputBaskets': return h01InputBaskets.value
    case 'outputWeight': return h01OutputWeight.value
    case 'outputBaskets': return h01OutputBaskets.value
    case 'defectWeight': return h01DefectWeight.value
    case 'defectBaskets': return h01DefectBaskets.value
    case 'h02OutputWeight': return h02OutputWeight.value
    case 'h02OutputBaskets': return h02OutputBaskets.value
    default: return ''
  }
})

function setCurrentField(val: string) {
  switch (activeField.value) {
    case 'output': outputQty.value = val; break
    case 'defect': defectQty.value = val; break
    case 'wage': wageRate.value = val; break
    case 'inputWeight': h01InputWeight.value = val; break
    case 'inputBaskets': h01InputBaskets.value = val; break
    case 'outputWeight': h01OutputWeight.value = val; break
    case 'outputBaskets': h01OutputBaskets.value = val; break
    case 'defectWeight': h01DefectWeight.value = val; break
    case 'defectBaskets': h01DefectBaskets.value = val; break
    case 'h02OutputWeight': h02OutputWeight.value = val; break
    case 'h02OutputBaskets': h02OutputBaskets.value = val; break
  }
}

// 確認某欄位輸入後，自動帶入相鄰欄位 / 工資率預設值（仍可手動修改）
function applyFieldDefaults() {
  if (activeField.value === 'inputWeight' && h01InputBaskets.value === '') h01InputBaskets.value = '1'
  if (activeField.value === 'outputWeight' && h01OutputBaskets.value === '') h01OutputBaskets.value = '4'
  if (activeField.value === 'defectWeight' && h01DefectBaskets.value === '') h01DefectBaskets.value = '1'
  if (activeField.value === 'h02OutputWeight' && h02OutputBaskets.value === '') h02OutputBaskets.value = '4'
  if (activeField.value === 'outputWeight' && wageRate.value === '') wageRate.value = '9'
  if (activeField.value === 'h02OutputWeight' && wageRate.value === '') wageRate.value = '2'
  if (activeField.value === 'output' && wageRate.value === '') wageRate.value = '8'
}

function onModalConfirm(val: string) {
  setCurrentField(val)
  applyFieldDefaults()
  modalOpen.value = false
}

// ── 確認送出 ──────────────────────────────────────────────────────
async function submitDetail() {
  loading.value = true
  try {
    let outputQtyVal: number
    let defectQtyVal: number
    if (selectedType.value === 'H01') {
      outputQtyVal = h01OutputQty.value
      defectQtyVal = h01DefectQty.value
    } else if (selectedType.value === 'H02') {
      outputQtyVal = h02OutputQty.value
      defectQtyVal = 0
    } else {
      outputQtyVal = parseFloat(outputQty.value)
      defectQtyVal = 0
    }
    const payload: any = {
      orderId: currentOrderId.value,
      itemId: selectedType.value,
      employeeId: selectedEmployee.value.id,
      outputQty: outputQtyVal,
      defectQty: defectQtyVal,
      wasteQty: 0,
      wageRate: parseFloat(wageRate.value),
      amount: amount.value,
      inputQty: inputQty.value,
    }
    if (selectedType.value === 'H01') {
      payload.batchId = selectedBatch.value.id
      payload.farmerId = selectedFarmer.value.id
    } else {
      payload.receivingOrderId = selectedOrder.value.id
    }
    const result = await callOrQueue('create', 'POST', '/api/processing/details', payload)
    if (result.queued) {
      // 離線標記：插入一筆本地暫存明細，讓員工看到已記錄（無 id/createdAt，以 tempKey 標記）
      todayDetails.value.unshift({
        id: `tmp-${Date.now()}`,
        itemId: selectedType.value,
        employee: { id: selectedEmployee.value?.id, name: selectedEmployee.value?.name },
        outputQty: outputQtyVal,
        isOffset: false,
        createdAt: new Date().toISOString(),
        pendingSync: true,
      })
      await setTodayDetailsCache(todayDetails.value)
      toast.showToast(t('savedOffline'), 'success')
    } else {
      toast.showToast(t('savedOk'), 'success')
      await loadTodayDetails()
    }
    resetForm()
  } catch (e: any) {
    console.error('submitDetail error:', e, e?.response?.status, e?.response?.data)
    toast.showToast(e?.response?.data?.message || `儲存失敗(${e?.response?.status || e?.message || 'unknown'})`, 'danger')
  } finally {
    loading.value = false
  }
}

// ── 重置（完成後回 Step 1）────────────────────────────────────────
function resetForm() {
  step.value = 1
  selectedItem.value = null
  selectedEmployee.value = null
  selectedType.value = ''
  selectedFarmer.value = null
  selectedBatch.value = null
  selectedOrder.value = null
  outputQty.value = ''
  defectQty.value = ''
  wageRate.value = ''
  h01InputWeight.value = ''
  h01InputBaskets.value = ''
  h01OutputWeight.value = ''
  h01OutputBaskets.value = ''
  h01DefectWeight.value = ''
  h01DefectBaskets.value = ''
  h02OutputWeight.value = ''
  h02OutputBaskets.value = ''
  currentOrderId.value = ''
  activeField.value = 'inputWeight'
}

// ── 上一步 ────────────────────────────────────────────────────────
function prevStep() {
  if (step.value === 4.5) { step.value = 4; return }
  if (step.value <= 1) return
  step.value--
}

function logout() {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="guided-page">
    <!-- Top Bar -->
    <div class="guided-top">
      <span class="guided-title">{{ authStore.user?.username }}</span>
      <button class="logout-btn" @click="logout">⏻</button>
    </div>

    <!-- 離線状態橫幅 -->
    <div v-if="isOffline" class="offline-banner">
      ⚠️ {{ t('offlineBanner') }}（{{ pendingCount }}）
    </div>

    <!-- 步驟進度條 + 今日記錄按鈕 -->
    <div class="step-bar">
      <div class="step-progress" :style="{ width: (step / totalSteps * 100) + '%' }"></div>
    </div>
    <div class="step-header-row">
      <div class="step-label-block">
        <span class="step-counter">{{ step }} / {{ totalSteps }}</span>
        <span class="step-title-text">{{ stepTitle }}</span>
      </div>
      <button class="today-btn" @click="openTodayRecords">
        📋 {{ todayDetails.length }}
      </button>
    </div>

    <!-- Content -->
    <div class="guided-content">

      <!-- Step 1：選取進貨品項 -->
      <div v-if="step === 1" class="item-grid">
        <button
          v-for="item in receivingItemsStore.receivingItems.filter((i: any) => !i.isDeleted)"
          :key="item.id"
          class="item-btn"
          @click="selectItem(item)">
          <img v-if="item.imageUrl" :src="item.imageUrl" class="item-img" />
          <div v-else class="item-avatar">{{ item.name?.slice(0,2) }}</div>
          <span class="item-name">{{ item.name }}</span>
          <span class="item-id">{{ item.id }}</span>
        </button>
      </div>

      <!-- Step 2：選取員工 -->
      <div v-if="step === 2" class="item-grid">
        <button
          v-for="emp in employeesStore.employees.filter((e: any) => !e.isDeleted)"
          :key="emp.id"
          class="item-btn"
          @click="selectEmployee(emp)">
          <img v-if="emp.imageUrl" :src="emp.imageUrl" class="item-img" />
          <div v-else class="item-avatar">{{ emp.name?.slice(0,2) }}</div>
          <span class="item-name">{{ emp.name }}</span>
          <span class="item-id">{{ emp.id }}</span>
        </button>
      </div>

      <!-- Step 3：選取加工品項 -->
      <div v-if="step === 3" class="type-grid">
        <button class="type-btn h01" @click="selectType('H01')" :disabled="loading">
          <span class="type-code">H01</span>
          <span class="type-name">{{ getProcessingItemName('H01') }}</span>
        </button>
        <button class="type-btn h02" @click="selectType('H02')" :disabled="loading">
          <span class="type-code">H02</span>
          <span class="type-name">{{ getProcessingItemName('H02') }}</span>
        </button>
        <button class="type-btn h03" @click="selectType('H03')" :disabled="loading">
          <span class="type-code">H03</span>
          <span class="type-name">{{ getProcessingItemName('H03') }}</span>
        </button>
      </div>

      <!-- Step 4：H01 選取農民 -->
      <div v-if="step === 4 && selectedType === 'H01'" class="item-grid">
        <button
          v-for="farmer in farmersStore.farmers.filter((f: any) => !f.isDeleted)"
          :key="farmer.id"
          class="item-btn"
          @click="selectFarmer(farmer)">
          <img v-if="farmer.imageUrl" :src="farmer.imageUrl" class="item-img" />
          <div v-else class="item-avatar">{{ farmer.name?.slice(0,2) }}</div>
          <span class="item-name">{{ farmer.name }}</span>
          <span class="item-id">{{ farmer.id }}</span>
        </button>
      </div>

      <!-- Step 4.5：H01 選取批次（多筆） -->
      <div v-if="step === 4.5" class="order-list">
        <button
          v-for="batch in availableBatches"
          :key="batch.id"
          class="order-btn"
          @click="selectBatch(batch)">
          <img v-if="selectedItem?.imageUrl" :src="selectedItem.imageUrl" class="order-img" />
          <div v-else class="order-avatar">{{ selectedItem?.name?.slice(0,2) }}</div>
          <span class="order-date">{{ formatOrderDate(batch.orderId) }}</span>
        </button>
      </div>

      <!-- Step 4：H02/H03 選取進貨單 -->
      <div v-if="step === 4 && (selectedType === 'H02' || selectedType === 'H03')" class="order-list">
        <button
          v-for="order in (selectedType === 'H02' ? availableOrdersH02 : availableOrdersH03)"
          :key="order.id"
          class="order-btn"
          @click="selectReceivingOrder(order)">
          <img v-if="selectedItem?.imageUrl" :src="selectedItem.imageUrl" class="order-img" />
          <div v-else class="order-avatar">{{ selectedItem?.name?.slice(0,2) }}</div>
          <span class="order-date">{{ formatOrderDate(order.id) }}</span>
        </button>
      </div>

      <!-- Step 5：H01 秤重計算模式（卡片點擊 → 正中央 Modal 鍵盤） -->
      <div v-if="step === 5 && selectedType === 'H01'" class="input-section">
        <!-- 取用量區塊 -->
        <div class="weight-block">
          <div class="weight-block-label">{{ t('inputSection') }}</div>
          <div class="weight-tabs">
            <button class="tab-btn" @click="openField('inputWeight')">
              {{ t('scaleWeight') }}
              <span class="tab-value">{{ h01InputWeight || '0' }}</span>
            </button>
            <button class="tab-btn" @click="openField('inputBaskets')">
              {{ t('largeBasket') }}
              <span class="tab-value">{{ h01InputBaskets || '0' }}</span>
            </button>
          </div>
          <div class="weight-result">= <span :class="h01InputQty < 0 ? 'weight-result-neg' : 'weight-result-val'">{{ h01InputQty }}</span> kg</div>
        </div>

        <!-- 完成品區塊 -->
        <div class="weight-block">
          <div class="weight-block-label">{{ t('outputSection') }}</div>
          <div class="weight-tabs">
            <button class="tab-btn" @click="openField('outputWeight')">
              {{ t('scaleWeight') }}
              <span class="tab-value">{{ h01OutputWeight || '0' }}</span>
            </button>
            <button class="tab-btn" @click="openField('outputBaskets')">
              {{ t('smallBasket') }}
              <span class="tab-value">{{ h01OutputBaskets || '0' }}</span>
            </button>
          </div>
          <div class="weight-result">= <span :class="h01OutputQty < 0 ? 'weight-result-neg' : 'weight-result-val'">{{ h01OutputQty }}</span> kg</div>
        </div>

        <!-- 瑕疵品區塊 -->
        <div class="weight-block">
          <div class="weight-block-label">{{ t('defectSection') }}</div>
          <div class="weight-tabs">
            <button class="tab-btn" @click="openField('defectWeight')">
              {{ t('scaleWeight') }}
              <span class="tab-value">{{ h01DefectWeight || '0' }}</span>
            </button>
            <button class="tab-btn" @click="openField('defectBaskets')">
              {{ t('largeBasket') }}
              <span class="tab-value">{{ h01DefectBaskets || '0' }}</span>
            </button>
          </div>
          <div class="weight-result">= <span :class="h01DefectQty < 0 ? 'weight-result-neg' : 'weight-result-val'">{{ h01DefectQty }}</span> kg</div>
        </div>

        <!-- 工資 -->
        <div class="input-tabs">
          <button class="tab-btn" @click="openField('wage')">
            {{ t('wageRate') }}
            <span class="tab-value">{{ wageRate || '0' }}</span>
          </button>
        </div>

        <div class="amount-preview">
          {{ t('amount') }}：<span class="amount-value">{{ amount.toLocaleString() }}</span>
        </div>
      </div>

      <!-- Step 5：H02 秤重計算模式 -->
      <div v-if="step === 5 && selectedType === 'H02'" class="input-section">
        <!-- 完成品區塊 -->
        <div class="weight-block">
          <div class="weight-block-label">{{ t('outputSection') }}</div>
          <div class="weight-tabs">
            <button class="tab-btn" @click="openField('h02OutputWeight')">
              {{ t('scaleWeight') }}
              <span class="tab-value">{{ h02OutputWeight || '0' }}</span>
            </button>
            <button class="tab-btn" @click="openField('h02OutputBaskets')">
              {{ t('smallBasket') }}
              <span class="tab-value">{{ h02OutputBaskets || '0' }}</span>
            </button>
          </div>
          <div class="weight-result">= <span :class="h02OutputQty < 0 ? 'weight-result-neg' : 'weight-result-val'">{{ h02OutputQty }}</span> kg</div>
        </div>

        <!-- 工資 -->
        <div class="input-tabs">
          <button class="tab-btn" @click="openField('wage')">
            {{ t('wageRate') }}
            <span class="tab-value">{{ wageRate || '0' }}</span>
          </button>
        </div>

        <div class="amount-preview">
          {{ t('amount') }}：<span class="amount-value">{{ amount.toLocaleString() }}</span>
        </div>
      </div>

      <!-- Step 5：H03 數量輸入 -->
      <div v-if="step === 5 && selectedType === 'H03'" class="input-section">
        <div class="input-tabs">
          <button class="tab-btn" @click="openField('output')">
            {{ t('outputQtyLabel') }}
            <span class="tab-value">{{ outputQty || '0' }}</span>
          </button>
          <button class="tab-btn" @click="openField('wage')">
            {{ t('wageRate') }}
            <span class="tab-value">{{ wageRate || '0' }}</span>
          </button>
        </div>
        <div class="amount-preview">
          {{ t('amount') }}：<span class="amount-value">{{ amount.toLocaleString() }}</span>
        </div>
      </div>

      <!-- Step 6：確認 -->
      <div v-if="step === 6" class="confirm-section">
        <div class="confirm-card">
          <div class="confirm-row">
            <span class="confirm-label">{{ t('receivingItem') }}</span>
            <span class="confirm-value">{{ selectedItem?.name }}</span>
          </div>
          <div class="confirm-row">
            <span class="confirm-label">{{ t('employee') }}</span>
            <span class="confirm-value">{{ selectedEmployee?.name }}</span>
          </div>
          <div class="confirm-row">
            <span class="confirm-label">{{ t('processingType') }}</span>
            <span class="confirm-value">{{ selectedType }}</span>
          </div>
          <div v-if="selectedType === 'H01'" class="confirm-row">
            <span class="confirm-label">{{ t('farmer') }}</span>
            <span class="confirm-value">{{ selectedFarmer?.name }}</span>
          </div>
          <div class="confirm-row">
            <span class="confirm-label">{{ t('outputQtyLabel') }}</span>
            <span class="confirm-value">{{ selectedType === 'H01' ? h01OutputQty : selectedType === 'H02' ? h02OutputQty : outputQty }}</span>
          </div>
          <div v-if="selectedType === 'H01'" class="confirm-row">
            <span class="confirm-label">{{ t('defectQtyLabel') }}</span>
            <span class="confirm-value">{{ h01DefectQty }}</span>
          </div>
          <div class="confirm-row">
            <span class="confirm-label">{{ t('wageRate') }}</span>
            <span class="confirm-value">{{ wageRate }}</span>
          </div>
          <div class="confirm-row amount-row">
            <span class="confirm-label">{{ t('amount') }}</span>
            <span class="confirm-value accent">{{ amount.toLocaleString() }}</span>
          </div>
        </div>
        <button class="confirm-btn" @click="submitDetail" :disabled="loading">
          {{ loading ? '...' : '✓ ' + t('confirm') }}
        </button>
      </div>

    </div>

    <!-- Bottom Nav：上一步 / 下一步（Step 5） -->
    <div class="guided-bottom" v-if="step > 1">
      <button class="prev-btn" @click="prevStep">← {{ t('prevStep') }}</button>
      <button v-if="step === 5" class="next-btn" @click="goToConfirmStep">{{ t('next') }} →</button>
    </div>

    <!-- 今日記錄 Modal -->
    <div v-if="showTodayRecords" class="today-modal" @click.self="showTodayRecords = false">
      <div class="today-panel">
        <div class="today-header">
          <span class="today-title">{{ t('todayRecords') }}</span>
          <button class="today-close" @click="showTodayRecords = false">✕</button>
        </div>
        <div class="today-list">
          <div v-if="todayDetails.length === 0" class="today-empty">{{ t('noLastEntry') }}</div>
          <div
            v-for="(d, idx) in todayDetails"
            :key="d.id"
            class="today-item"
            :class="{ 'today-item-latest': idx === 0 }">
            <div class="today-item-left">
              <span
                class="today-type-badge"
                :class="[`badge-${d.itemId?.toLowerCase()}`, { 'badge-lg': idx === 0 }]">
                {{ d.itemId }}
              </span>
              <div class="today-item-info">
                <span class="today-emp" :class="{ 'today-emp-lg': idx === 0 }">{{ d.employee?.name }}</span>
                <span class="today-time">{{ formatTime(d.createdAt) }}</span>
              </div>
            </div>
            <div class="today-item-right">
              <span
                class="today-qty"
                :class="[{ 'qty-negative': d.isOffset }, { 'today-qty-lg': idx === 0 }]">
                {{ d.outputQty }}
              </span>
              <span v-if="d.isOffset" class="today-offset-badge">沖 / ยกเลิก</span>
              <button
                v-if="!d.isOffset && idx === 0 && canSoftDelete(d)"
                class="today-del-btn-lg"
                @click="softDeleteDetail(d.id)">✕</button>
              <span v-else-if="!d.isOffset && isAlreadyOffset(d)" class="today-locked">🔒</span>
              <button
                v-if="!d.isOffset && !isAlreadyOffset(d) && !(idx === 0 && canSoftDelete(d))"
                class="today-lock-btn"
                @click="pendingOffsetId = d.id; showPinOverlay = true; pinInput = ''; pinError = false">🔒</button>
            </div>
          </div>
        </div>

        <!-- PIN overlay (inside the panel) -->
        <div
          v-if="showPinOverlay"
          class="pin-overlay"
          @click.self="showPinOverlay = false; pinInput = ''; pinError = false">
          <div class="pin-card">
            <p class="pin-label">{{ t('enterPinToOffset') }}</p>
            <div class="pin-boxes">
              <div v-for="i in 4" :key="i" class="pin-box">{{ pinInput[i-1] ? '●' : '' }}</div>
            </div>
            <p v-if="pinError" class="pin-error-msg">{{ t('pinError') }}</p>
            <div class="pin-numpad">
              <button v-for="n in [1,2,3,4,5,6,7,8,9]" :key="n" class="pin-key" @click="onPinKey(String(n))">{{ n }}</button>
              <button class="pin-key pin-key-action" @click="showPinOverlay = false; pinInput = ''; pinError = false">{{ t('cancel') }}</button>
              <button class="pin-key" @click="onPinKey('0')">0</button>
              <button class="pin-key pin-key-action" @click="pinInput = pinInput.slice(0, -1); pinError = false">←</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 正中央 Modal 數字鍵盤（Step 5 共用） -->
    <NumericInputModal
      :show="modalOpen"
      :mode="currentFieldMode"
      :label="currentFieldLabel"
      :model-value="currentFieldValue"
      @confirm="onModalConfirm"
      @close="modalOpen = false"
    />
  </div>
</template>

<style scoped>
.guided-page {
  height: 100vh;
  background: var(--color-bg);
  display: flex;
  flex-direction: column;
  color: var(--color-text);
  overflow: hidden;
}

/* Top Bar */
.guided-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 56px;
  background: var(--color-topbar);
  flex-shrink: 0;
}
.guided-title { font-size: 16px; font-weight: 700; color: var(--color-accent); }
.logout-btn { background: transparent; border: none; color: var(--color-danger); font-size: 22px; cursor: pointer; padding: 8px; }

/* 離線橫幅 */
.offline-banner {
  background: var(--color-warning-bg);
  color: #1a1200;
  font-size: 13px;
  font-weight: 700;
  text-align: center;
  padding: 8px 12px;
  flex-shrink: 0;
}

/* 步驟進度條 */
.step-bar {
  height: 4px;
  background: var(--color-border);
  flex-shrink: 0;
}
.step-progress {
  height: 100%;
  background: var(--color-accent);
  transition: width 0.3s ease;
}

/* Content */
.guided-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px;
  min-height: 0;
}

/* 品項 Grid */
.item-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.item-btn {
  background: var(--color-card);
  border: 2px solid var(--color-border);
  border-radius: 14px;
  padding: 16px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.18s;
  color: var(--color-text);
}
.item-btn:active { border-color: var(--color-accent); background: var(--color-card-hover); transform: scale(0.97); }
.item-img { width: 56px; height: 56px; border-radius: 10px; object-fit: cover; }
.item-avatar {
  width: 56px; height: 56px; border-radius: 10px;
  background: var(--color-accent); display: flex; align-items: center; justify-content: center;
  font-size: 18px; font-weight: 700; color: #fff;
}
.item-name { font-size: 14px; font-weight: 700; text-align: center; }
.item-id { font-size: 11px; color: var(--color-text-muted); }

/* 加工類型 Grid */
.type-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;
}
.type-btn {
  border: none;
  border-radius: 16px;
  padding: 28px 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  cursor: pointer;
  transition: all 0.18s;
  font-family: inherit;
}
.type-btn:active { transform: scale(0.98); }
.type-btn.h01 { background: rgba(45,212,191,0.15); border: 2px solid rgba(45,212,191,0.4); }
.type-btn.h02 { background: rgba(232,130,12,0.15); border: 2px solid rgba(232,130,12,0.4); }
.type-btn.h03 { background: rgba(248,113,113,0.15); border: 2px solid rgba(248,113,113,0.4); }
.type-code { font-size: 28px; font-weight: 900; color: var(--color-text); min-width: 60px; }
.type-name { font-size: 18px; font-weight: 600; color: var(--color-text); }

/* 進貨單列表 */
.order-list { display: flex; flex-direction: column; gap: 12px; }
.order-btn {
  background: var(--color-card);
  border: 2px solid var(--color-border);
  border-radius: 14px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.18s;
  color: var(--color-text);
}
.order-btn:active { border-color: var(--color-accent); transform: scale(0.98); }
.order-img { width: 48px; height: 48px; border-radius: 10px; object-fit: cover; }
.order-avatar {
  width: 48px; height: 48px; border-radius: 10px;
  background: var(--color-accent); display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 700; color: #fff;
}
.order-date { font-size: 20px; font-weight: 700; }

/* 數量輸入（卡片點擊 → 正中央 Modal 鍵盤） */
.input-section { display: flex; flex-direction: column; gap: 14px; }
.input-tabs { display: flex; flex-direction: column; gap: 10px; }
.tab-btn {
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: 12px;
  padding: 18px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  color: var(--color-text-muted);
  font-size: 16px;
  font-family: inherit;
  transition: all 0.15s;
  min-height: 64px;
}
.tab-btn:active { border-color: var(--color-accent); background: var(--color-card-hover); }
.tab-value { font-size: 26px; font-weight: 700; color: var(--color-accent); }
.amount-preview {
  text-align: center;
  font-size: 15px;
  color: var(--color-text-muted);
  padding: 4px 0;
}
.amount-value { font-size: 26px; font-weight: 700; color: var(--color-accent); }

/* H01 秤重計算區塊 */
.weight-block {
  background: var(--color-card);
  border-radius: 14px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex-shrink: 0;
}
.weight-block-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-muted);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.weight-tabs {
  display: flex;
  gap: 12px;
}
.weight-tabs .tab-btn {
  flex: 1;
  padding: 16px 14px;
}
.weight-tabs .tab-value { font-size: 22px; }
.weight-result { font-size: 13px; color: var(--color-text-muted); text-align: right; padding: 0; }
.weight-result-val { font-size: 19px; font-weight: 700; color: var(--color-accent); }
.weight-result-neg { font-size: 19px; font-weight: 700; color: var(--color-danger); }

/* 確認 */
.confirm-section { display: flex; flex-direction: column; gap: 20px; }
.confirm-card {
  background: var(--color-card);
  border-radius: 14px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.confirm-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid var(--color-border);
}
.confirm-row:last-child { border-bottom: none; }
.confirm-label { font-size: 13px; color: var(--color-text-muted); }
.confirm-value { font-size: 16px; font-weight: 600; }
.confirm-value.accent { color: var(--color-accent); font-size: 22px; }
.amount-row { padding: 18px 0 4px; }
.confirm-btn {
  background: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: 14px;
  padding: 22px;
  font-size: 20px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.confirm-btn:active { background: var(--color-accent-dim); transform: scale(0.98); }
.confirm-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Bottom */
.guided-bottom {
  flex-shrink: 0;
  padding: 12px 16px;
  background: var(--color-bottom-nav);
  border-top: 1px solid var(--color-border);
  display: flex;
  gap: 10px;
}
.prev-btn {
  background: var(--color-surface);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 12px 24px;
  font-size: 15px;
  cursor: pointer;
  font-family: inherit;
}
.next-btn {
  flex: 1;
  background: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
}

/* 步驟列 */
.step-header-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; flex-shrink: 0; }
.step-label-block { display: flex; flex-direction: column; gap: 2px; }
.step-counter { font-size: 11px; color: var(--color-text-muted); font-weight: 600; letter-spacing: 0.05em; }
.step-title-text { font-size: 18px; font-weight: 700; color: var(--color-text); }
.today-btn { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 10px; padding: 8px 14px; color: var(--color-text); font-size: 15px; cursor: pointer; flex-shrink: 0; }

/* 今日記錄 Modal */
.today-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 400; display: flex; align-items: flex-end; }
.today-panel { position: relative; background: var(--color-drawer); border-radius: 16px 16px 0 0; width: 100%; max-height: 70vh; display: flex; flex-direction: column; overflow: hidden; }
.today-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--color-border); flex-shrink: 0; }
.today-title { font-size: 16px; font-weight: 700; }
.today-close { background: transparent; border: none; color: var(--color-text-muted); font-size: 20px; cursor: pointer; padding: 4px 8px; }
.today-list { overflow-y: auto; padding: 12px 16px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
.today-empty { text-align: center; color: var(--color-text-muted); padding: 32px; }

/* List rows */
.today-item { display: flex; justify-content: space-between; align-items: center; background: var(--color-card); border-radius: 10px; padding: 12px 16px; }
.today-item-latest { background: var(--color-card-hover); border: 1px solid var(--color-accent-dim); border-radius: 12px; padding: 14px 16px; }
.today-item-left { display: flex; align-items: center; gap: 10px; }
.today-item-right { display: flex; align-items: center; gap: 10px; }
.today-type-badge { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; }
.badge-lg { font-size: 13px !important; padding: 5px 12px !important; border-radius: 8px !important; }
.badge-h01 { background: rgba(45,212,191,0.2); color: #2dd4bf; }
.badge-h02 { background: rgba(232,130,12,0.2); color: #e8820c; }
.badge-h03 { background: rgba(248,113,113,0.2); color: #f87171; }
.today-item-info { display: flex; flex-direction: column; gap: 2px; }
.today-emp { font-size: 14px; font-weight: 600; }
.today-emp-lg { font-size: 16px; font-weight: 700; }
.today-time { font-size: 12px; color: var(--color-text-muted); }
.today-qty { font-size: 18px; font-weight: 700; color: var(--color-accent); }
.today-qty-lg { font-size: 24px; font-weight: 800; }
.today-offset-badge { font-size: 11px; font-weight: 700; padding: 3px 7px; border-radius: 6px; background: rgba(251,191,36,0.2); color: #fbbf24; }
.qty-negative { color: #f87171 !important; }
.today-del-btn-lg { background: rgba(248,113,113,0.15); border: 1px solid rgba(248,113,113,0.4); color: #f87171; border-radius: 10px; padding: 8px 16px; cursor: pointer; font-size: 18px; font-weight: 700; font-family: inherit; }
.today-lock-btn { background: transparent; border: 1px solid var(--color-border); border-radius: 8px; padding: 6px 10px; font-size: 16px; cursor: pointer; color: var(--color-text-muted); font-family: inherit; }
.today-locked { font-size: 16px; color: var(--color-text-muted); }

/* PIN overlay */
.pin-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; z-index: 500; }
.pin-card { background: var(--color-drawer); border-radius: 16px; padding: 24px 20px; width: 300px; display: flex; flex-direction: column; align-items: center; }
.pin-label { font-size: 13px; color: var(--color-text-muted); text-align: center; margin: 0 0 20px; }
.pin-boxes { display: flex; gap: 10px; margin-bottom: 8px; }
.pin-box { width: 52px; height: 64px; border: 2px solid var(--color-border); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 22px; background: var(--color-surface); color: var(--color-text); }
.pin-error-msg { color: #f87171; font-size: 12px; text-align: center; margin: 4px 0 8px; }
.pin-numpad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 16px; width: 100%; }
.pin-key { height: 56px; display: flex; align-items: center; justify-content: center; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 10px; font-size: 20px; font-weight: 600; cursor: pointer; color: var(--color-text); font-family: inherit; }
.pin-key:active { background: var(--color-surface-hover); }
.pin-key-action { font-size: 13px; font-weight: 500; color: var(--color-text-muted); }
</style>
