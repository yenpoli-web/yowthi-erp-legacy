<template>
  <div class="create-wrap">
    <!-- Header -->
    <div class="create-header">
      <button v-if="step > 1" class="back-btn" @click="prevStep">←</button>
      <div v-else style="width:40px"></div>
      <span class="header-title">{{ t('newProcessingOrder') }}</span>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>

    <!-- 步驟進度條 -->
    <div class="step-bar">
      <div v-if="!dateConfirmed" class="step-info">{{ t('selectDate') }}</div>
      <div v-else class="step-info">Step {{ step }} / {{ totalSteps }}：{{ stepLabel }}</div>
      <div class="step-track">
        <div class="step-fill" :style="{ width: (!dateConfirmed ? 0 : (step / totalSteps * 100)) + '%' }"></div>
      </div>
    </div>

    <!-- Content -->
    <div class="create-body">

      <!-- Step 0：選擇加工日期（僅一般新建模式，補登 targetOrder 模式不顯示，因为補登日期已由原加工單決定） -->
      <div v-if="!dateConfirmed" class="step-content">
        <div class="step-title">{{ t('selectDate') }}</div>
        <DatePicker v-model="orderDate" :label="t('selectDate')" />
        <div class="date-hint">{{ formatDate(orderDate) }}</div>
      </div>

      <!-- Step 1：選取進貨品項 -->
      <div v-if="dateConfirmed && step === 1" class="step-content">
        <div class="item-grid">
          <div v-for="item in receivingItems" :key="item.id"
            class="selector-card" :class="{ selected: form.receivingItemId === item.id }"
            @click="selectReceivingItem(item)">
            <div class="selector-img" :style="!item.imageUrl ? { background: avatarColor(item.id) } : {}">
              <img v-if="item.imageUrl" :src="item.imageUrl" />
              <span v-else>{{ item.name.slice(0,2) }}</span>
            </div>
            <div class="selector-name">{{ item.name }}</div>
            <div class="selector-id">{{ item.id }}</div>
          </div>
        </div>
      </div>

      <!-- Step 2：選取員工 -->
      <div v-if="step === 2" class="step-content">
        <input v-model="employeeSearch" :placeholder="t('searchIdOrName')" class="search-input" />
        <div class="selector-grid">
          <div v-for="emp in filteredEmployees" :key="emp.id"
            class="selector-card" :class="{ selected: form.employeeId === emp.id }"
            @click="selectEmployee(emp)">
            <div class="selector-img" :style="!emp.imageUrl ? { background: avatarColor(emp.id) } : {}">
              <img v-if="emp.imageUrl" :src="emp.imageUrl" />
              <span v-else>{{ emp.name.charAt(0) }}</span>
            </div>
            <div class="selector-name">{{ emp.name }}</div>
            <div class="selector-id">{{ emp.id }}</div>
          </div>
        </div>
      </div>

      <!-- Step 3：選取加工品項 H01/H02/H03 -->
      <div v-if="step === 3" class="step-content">
        <div class="h-grid">
          <div v-for="item in processingItems" :key="item.id"
            class="h-card" :class="{ selected: form.itemId === item.id }"
            @click="selectProcessingType(item)">
            <div class="h-id">{{ item.id }}</div>
            <div class="h-name">{{ item.name }}</div>
          </div>
        </div>
      </div>

      <!-- Step 4a (H01)：選取農民 -->
      <div v-if="step === 4 && form.itemId === 'H01' && !showBatchSelect" class="step-content">
        <input v-model="farmerSearch" :placeholder="t('searchIdOrName')" class="search-input" />
        <div class="selector-grid">
          <div v-for="f in filteredFarmers" :key="f.id"
            class="selector-card" :class="{ selected: form.farmerId === f.id }"
            @click="selectFarmer(f)">
            <div class="selector-img" :style="!f.imageUrl ? { background: avatarColor(f.id) } : {}">
              <img v-if="f.imageUrl" :src="f.imageUrl" />
              <span v-else>{{ f.name.charAt(0) }}</span>
            </div>
            <div class="selector-name">{{ f.name }}</div>
            <div class="selector-id">{{ f.id }}</div>
          </div>
        </div>
      </div>

      <!-- Step 4b (H01)：選取批次 -->
      <div v-if="step === 4 && form.itemId === 'H01' && showBatchSelect" class="step-content">
        <div class="step-title">{{ t('selectBatch') }}</div>
        <div class="batch-list">
          <div v-for="batch in availableBatches" :key="batch.id"
            class="batch-card" :class="{ selected: form.batchId === batch.id }"
            @click="selectBatch(batch)">
            <div class="batch-img">
              <img v-if="batch.order?.receivingItem?.imageUrl" :src="batch.order.receivingItem.imageUrl" />
              <span v-else>{{ batch.order?.receivingItem?.name?.slice(0,2) }}</span>
            </div>
            <div class="batch-info">
              <div class="batch-date">{{ formatDate(batch.order?.orderDate) }}</div>
              <div class="batch-n">({{ batch.order?.id?.split('-')[2] }})</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 4c (H02/H03)：選取進貨單 -->
      <div v-if="step === 4 && (form.itemId === 'H02' || form.itemId === 'H03')" class="step-content">
        <div class="step-title">{{ t('selectReceivingOrder') }}</div>
        <div class="batch-list">
          <div v-for="order in availableOrders" :key="order.id"
            class="batch-card" :class="{ selected: form.receivingOrderId === order.id }"
            @click="selectReceivingOrder(order)">
            <div class="batch-img">
              <img v-if="order.receivingItem?.imageUrl" :src="order.receivingItem.imageUrl" />
              <span v-else>{{ order.receivingItem?.name?.slice(0,2) }}</span>
            </div>
            <div class="batch-info">
              <div class="batch-date">{{ formatDate(order.orderDate) }}</div>
              <div class="batch-n">({{ order.id?.split('-')[2] }})</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 5：產出量 + 不良品/廢料 + 工資率（卡片點擊 → 正中央 Modal 鍵盤） -->
      <div v-if="step === 5" class="step-content">

        <!-- H01：秤重計算模式 -->
        <template v-if="form.itemId === 'H01'">
          <!-- 取用量區塊 -->
          <div class="calc-section">
            <div class="calc-section-title">{{ t('inputSection') }}</div>
            <div class="gf-input-tabs">
              <button class="gf-tab-btn" @click="openField('h01InputWeight')">
                {{ t('scaleWeight') }}
                <span class="gf-tab-value">{{ h01InputWeight || '0' }}</span>
              </button>
              <button class="gf-tab-btn" @click="openField('h01InputBaskets')">
                {{ t('largeBasket') }}
                <span class="gf-tab-value">{{ h01InputBaskets || '0' }}</span>
              </button>
            </div>
            <div class="calc-result">
              {{ t('inputQtyLabel') }}：<span :class="calcInputQty < 0 ? 'calc-neg' : 'calc-pos'">{{ calcInputQty }}</span>
            </div>
          </div>

          <!-- 完成品區塊 -->
          <div class="calc-section">
            <div class="calc-section-title">{{ t('outputSection') }}</div>
            <div class="gf-input-tabs">
              <button class="gf-tab-btn" @click="openField('scaleOutput')">
                {{ t('scaleWeight') }}
                <span class="gf-tab-value">{{ scaleOutput || '0' }}</span>
              </button>
              <button class="gf-tab-btn" @click="openField('basketSmall')">
                {{ t('smallBasket') }}
                <span class="gf-tab-value">{{ basketSmall || '0' }}</span>
              </button>
            </div>
            <div class="calc-result">
              {{ t('outputQtyLabel') }}：<span :class="calcOutputQty < 0 ? 'calc-neg' : 'calc-pos'">{{ calcOutputQty }}</span>
            </div>
          </div>

          <!-- 瑕疵品區塊 -->
          <div class="calc-section">
            <div class="calc-section-title">{{ t('defectSection') }}</div>
            <div class="gf-input-tabs">
              <button class="gf-tab-btn" @click="openField('scaleDefect')">
                {{ t('scaleWeight') }}
                <span class="gf-tab-value">{{ scaleDefect || '0' }}</span>
              </button>
              <button class="gf-tab-btn" @click="openField('basketLarge')">
                {{ t('largeBasket') }}
                <span class="gf-tab-value">{{ basketLarge || '0' }}</span>
              </button>
            </div>
            <div class="calc-result">
              {{ t('defectQtyLabel') }}：<span :class="calcDefectQty < 0 ? 'calc-neg' : 'calc-pos'">{{ calcDefectQty }}</span>
            </div>
          </div>

          <!-- 工資 -->
          <div class="gf-input-tabs">
            <button class="gf-tab-btn" @click="openField('wageRate')">
              {{ t('wageRateLabel') }}
              <span class="gf-tab-value">{{ form.wageRate || '0' }}</span>
            </button>
          </div>
        </template>

        <!-- H02：秤重計算模式 -->
        <template v-else-if="form.itemId === 'H02'">
          <!-- 完成品區塊 -->
          <div class="calc-section">
            <div class="calc-section-title">{{ t('outputSection') }}</div>
            <div class="gf-input-tabs">
              <button class="gf-tab-btn" @click="openField('h02ScaleOutput')">
                {{ t('scaleWeight') }}
                <span class="gf-tab-value">{{ h02ScaleOutput || '0' }}</span>
              </button>
              <button class="gf-tab-btn" @click="openField('h02BasketSmall')">
                {{ t('smallBasket') }}
                <span class="gf-tab-value">{{ h02BasketSmall || '0' }}</span>
              </button>
            </div>
            <div class="calc-result">
              {{ t('outputQtyLabel') }}：<span :class="calcH02OutputQty < 0 ? 'calc-neg' : 'calc-pos'">{{ calcH02OutputQty }}</span>
            </div>
          </div>

          <!-- 工資 -->
          <div class="gf-input-tabs">
            <button class="gf-tab-btn" @click="openField('wageRate')">
              {{ t('wageRateLabel') }}
              <span class="gf-tab-value">{{ form.wageRate || '0' }}</span>
            </button>
          </div>
        </template>

        <!-- H03：直接輸入模式 -->
        <template v-else>
          <div class="gf-input-tabs">
            <button class="gf-tab-btn" @click="openField('outputQty')">
              {{ t('outputQtyLabel') }}
              <span class="gf-tab-value">{{ form.outputQty || '0' }}</span>
            </button>
            <button class="gf-tab-btn" @click="openField('wageRate')">
              {{ t('wageRateLabel') }}
              <span class="gf-tab-value">{{ form.wageRate || '0' }}</span>
            </button>
          </div>
        </template>

        <!-- 金額預覽 -->
        <div class="gf-amount-preview">
          {{ t('amount') }}：<span class="gf-amount-value">{{ calcAmount }}</span>
        </div>

      </div>

      <!-- Step 6：確認 -->
      <div v-if="step === 6" class="step-content">
        <div class="step-title">{{ t('confirm') }}</div>
        <div class="confirm-card">
          <div class="confirm-row"><span class="c-label">{{ t('receivingItem') }}</span><span>{{ selectedItemName }} <span class="confirm-id">{{ form.receivingItemId }}</span></span></div>
          <div class="confirm-row"><span class="c-label">{{ t('employee') }}</span><span>{{ selectedEmployeeName }} <span class="confirm-id">{{ form.employeeId }}</span></span></div>
          <div class="confirm-row"><span class="c-label">{{ t('processingType') }}</span><span>{{ selectedProcessingTypeName }} <span class="confirm-id">{{ form.itemId }}</span></span></div>
          <div class="confirm-row" v-if="form.itemId === 'H01'"><span class="c-label">{{ t('farmer') }}</span><span>{{ selectedFarmerName }} <span class="confirm-id">{{ form.farmerId }}</span></span></div>
          <div class="confirm-row"><span class="c-label">{{ t('outputQtyLabel') }}</span><span>{{ form.itemId === 'H01' ? calcOutputQty : form.itemId === 'H02' ? calcH02OutputQty : form.outputQty }}</span></div>
          <div class="confirm-row" v-if="form.itemId === 'H01'"><span class="c-label">{{ t('defectQtyLabel') }}</span><span>{{ calcDefectQty }}</span></div>
          <div class="confirm-row"><span class="c-label">{{ t('wageRateLabel') }}</span><span>{{ form.wageRate }}</span></div>
          <div class="confirm-row accent"><span class="c-label">{{ t('amount') }}</span><span>{{ calcAmount }}</span></div>
        </div>

        <!-- 儲存成功後：繼續新增（同一員工）/ 完成 -->
        <div v-if="savedOrderId" class="continue-box">
          <div class="continue-msg">✅ {{ t('savedSuccess') }}</div>
          <div class="continue-btns">
            <button class="btn-continue" @click="continueAddSameEmployee">+ {{ t('continueAddSameEmployee') }}</button>
            <button class="btn-done" @click="finishAndClose">{{ t('done') }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部按鈕：選取步驟只顯示「上一步」，輸入/確認步驟顯示完整按鈕 -->
    <div class="create-footer" v-if="!dateConfirmed">
      <button class="btn-primary" @click="confirmDate" :disabled="!orderDate">
        {{ t('next') }} →
      </button>
    </div>
    <div class="create-footer" v-else-if="!savedOrderId">
      <!-- 選取步驟（1~4）：只有上一步 -->
      <template v-if="step <= 4">
        <button class="btn-secondary" @click="prevStep" v-if="step > 1">← {{ t('prev') }}</button>
      </template>
      <!-- 輸入/確認步驟（5~6）：上一步 + 下一步/確認 -->
      <template v-if="step >= 5">
        <button class="btn-secondary" @click="prevStep">← {{ t('prev') }}</button>
        <button class="btn-primary" @click="nextStep"
          v-if="step < totalSteps" :disabled="!canProceed">
          {{ t('next') }} →
        </button>
        <button class="btn-primary" @click="submit"
          v-if="step === totalSteps" :disabled="saving || (form.itemId === 'H01' && (calcOutputQty <= 0 || calcDefectQty < 0)) || (form.itemId === 'H02' && calcH02OutputQty <= 0)">
          {{ saving ? t('saving') : t('confirm') }} ✓
        </button>
      </template>
    </div>

    <!-- 當日已有加工單確認 Overlay -->
    <div v-if="confirmExistingOpen" class="overlay">
      <div class="exist-dialog">
        <div class="exist-title">{{ t('orderExistsToday') }}</div>
        <div class="exist-order-id">{{ existingOrderNo }}</div>
        <div class="exist-msg">{{ t('continueAddToExisting') }}</div>
        <div class="exist-btns">
          <button class="exist-btn-cancel" @click="cancelUseExisting">{{ t('cancel') }}</button>
          <button class="exist-btn-ok" @click="confirmUseExisting">✓ {{ t('confirm') }}</button>
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

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../../stores/auth'
import { useToastStore } from '../../../stores/toast'
import { useProcessingStore } from '../../../stores/processing'
import * as api from '../../../api/processing'
import NumericInputModal from '../../../components/common/NumericInputModal.vue'
import DatePicker from '../../../components/common/DatePicker.vue'

const props = defineProps<{ targetOrder?: any }>()
const emit = defineEmits(['close', 'created'])
const { t } = useI18n()
const auth = useAuthStore()
const toast = useToastStore()
const store = useProcessingStore()

const saving = ref(false)
const savedOrderId = ref('')

// 加工日期（僅一般新建模式需要選擇，補登 targetOrder 模式不需要，日期已由補登的加工單決定）
const orderDate = ref(getTodayStr())
const dateConfirmed = ref(!!props.targetOrder)
function confirmDate() {
  if (!orderDate.value) return
  dateConfirmed.value = true
}

// 秤重計算用臨時變數
type ActiveField = 'h01InputWeight' | 'h01InputBaskets' | 'scaleOutput' | 'basketSmall' | 'scaleDefect' | 'basketLarge' | 'h02ScaleOutput' | 'h02BasketSmall' | 'outputQty' | 'wageRate'
const activeField = ref<ActiveField>('h01InputWeight')

// 正中央 Modal 鍵盤狀態
const modalOpen = ref(false)

function openField(name: ActiveField) {
  // 防止之前步驟的搜尋框或原生輸入框殊留焦點（手機鍵盤未關閉），導致 fixed Modal 計算位置時受不正確的可視高度影響而偏上
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  activeField.value = name
  modalOpen.value = true
}

const currentFieldLabel = computed(() => {
  const labels: Record<ActiveField, string> = {
    h01InputWeight: t('scaleWeight'),
    h01InputBaskets: t('largeBasket'),
    scaleOutput: t('scaleWeight'),
    basketSmall: t('smallBasket'),
    scaleDefect: t('scaleWeight'),
    basketLarge: t('largeBasket'),
    h02ScaleOutput: t('scaleWeight'),
    h02BasketSmall: t('smallBasket'),
    outputQty: t('outputQtyLabel'),
    wageRate: t('wageRateLabel'),
  }
  return labels[activeField.value]
})

const currentFieldMode = computed(() => (isIntegerField.value ? 'integer' : 'decimal'))

function onModalConfirm(val: string) {
  setCurrentField(val)
  applyFieldDefaults()
  modalOpen.value = false
}

// H01 臨時輸入值
const h01InputWeight = ref('')   // 取用量秤重量
const h01InputBaskets = ref('')  // 取用量大籃子數（1.1kg）
const scaleOutput = ref('')      // 完成品秤重量
const basketSmall = ref('')      // 小籃子數（2.5kg，整數）
const scaleDefect = ref('')      // 瑕疵品秤重量
const basketLarge = ref('')      // 大籃子數（1.1kg，整數）

// H02 臨時輸入值
const h02ScaleOutput = ref('')   // 完成品秤重量
const h02BasketSmall = ref('')   // 小籃子數（2.5kg，整數）

// H01 計算結果
const calcInputQty = computed(() => {
  const w = parseFloat(h01InputWeight.value) || 0
  const b = parseInt(h01InputBaskets.value) || 0
  return Math.max(0, parseFloat((w - b * 1.1).toFixed(3)))
})
const calcOutputQty = computed(() => {
  const w = parseFloat(scaleOutput.value) || 0
  const b = parseInt(basketSmall.value) || 0
  return Math.max(0, parseFloat((w - b * 2.5).toFixed(3)))
})
const calcDefectQty = computed(() => {
  const w = parseFloat(scaleDefect.value) || 0
  const b = parseInt(basketLarge.value) || 0
  return Math.max(0, parseFloat((w - b * 1.1).toFixed(3)))
})

// H02 計算結果
const calcH02OutputQty = computed(() => {
  const w = parseFloat(h02ScaleOutput.value) || 0
  const b = parseInt(h02BasketSmall.value) || 0
  return Math.max(0, parseFloat((w - b * 2.5).toFixed(3)))
})

// 是否為整數欄位（籃子數）
const isIntegerField = computed(() =>
  activeField.value === 'h01InputBaskets' ||
  activeField.value === 'basketSmall' ||
  activeField.value === 'basketLarge' ||
  activeField.value === 'h02BasketSmall'
)

const currentFieldValue = computed(() => {
  switch (activeField.value) {
    case 'h01InputWeight': return h01InputWeight.value
    case 'h01InputBaskets': return h01InputBaskets.value
    case 'scaleOutput': return scaleOutput.value
    case 'basketSmall': return basketSmall.value
    case 'scaleDefect': return scaleDefect.value
    case 'basketLarge': return basketLarge.value
    case 'h02ScaleOutput': return h02ScaleOutput.value
    case 'h02BasketSmall': return h02BasketSmall.value
    case 'outputQty': return form.outputQty
    default: return form.wageRate
  }
})

function setCurrentField(val: string) {
  switch (activeField.value) {
    case 'h01InputWeight': h01InputWeight.value = val; break
    case 'h01InputBaskets': h01InputBaskets.value = val; break
    case 'scaleOutput': scaleOutput.value = val; break
    case 'basketSmall': basketSmall.value = val; break
    case 'scaleDefect': scaleDefect.value = val; break
    case 'basketLarge': basketLarge.value = val; break
    case 'h02ScaleOutput': h02ScaleOutput.value = val; break
    case 'h02BasketSmall': h02BasketSmall.value = val; break
    case 'outputQty': form.outputQty = val; break
    default: form.wageRate = val
  }
}

// 確認某欄位輸入後，自動帶入相鄰欄位 / 工資率預設值（仍可手動修改）
function applyFieldDefaults() {
  if (activeField.value === 'h01InputWeight' && h01InputBaskets.value === '') h01InputBaskets.value = '1'
  if (activeField.value === 'scaleOutput' && basketSmall.value === '') basketSmall.value = '4'
  if (activeField.value === 'scaleDefect' && basketLarge.value === '') basketLarge.value = '1'
  if (activeField.value === 'h02ScaleOutput' && h02BasketSmall.value === '') h02BasketSmall.value = '4'
  if (activeField.value === 'scaleOutput' && form.wageRate === '') form.wageRate = '9'
  if (activeField.value === 'h02ScaleOutput' && form.wageRate === '') form.wageRate = '2'
  if (activeField.value === 'outputQty' && form.wageRate === '') form.wageRate = '8'
}

const employeeSearch = ref('')
const farmerSearch = ref('')
const showBatchSelect = ref(false)
const availableBatches = ref<any[]>([])
const availableOrders = ref<any[]>([])

const receivingItems = ref<any[]>([])
const employees = ref<any[]>([])
const farmers = ref<any[]>([])
const processingItems = ref<any[]>([])

const form = reactive({
  receivingItemId: '',
  employeeId: '',
  itemId: '',
  farmerId: '',
  batchId: '',
  receivingOrderId: '',
  defectPoolId: '',
  inputQty: '',
  outputQty: '',
  defectQty: '0',
  wasteQty: '0',
  wageRate: '',
})

const step = ref(1)
const totalSteps = 6

const COLORS = ['#e8820c','#2dd4bf','#818cf8','#f472b6','#34d399','#60a5fa']
function avatarColor(id: string) {
  const h = id.split('').reduce((a,c) => a + c.charCodeAt(0), 0)
  return COLORS[h % COLORS.length]
}

function formatDate(d: string) {
  if (!d) return ''
  const s = d.slice(0,10)
  const [y,m,day] = s.split('-')
  return `${parseInt(day)}/${parseInt(m)}/${y.slice(2)}`
}

const filteredEmployees = computed(() =>
  employees.value.filter(e => !e.isDeleted &&
    (e.id.toLowerCase().includes(employeeSearch.value.toLowerCase()) ||
     e.name.toLowerCase().includes(employeeSearch.value.toLowerCase())))
)

const filteredFarmers = computed(() =>
  farmers.value.filter(f => !f.isDeleted &&
    (f.id.toLowerCase().includes(farmerSearch.value.toLowerCase()) ||
     f.name.toLowerCase().includes(farmerSearch.value.toLowerCase())))
)

const selectedItemName = computed(() => receivingItems.value.find(i => i.id === form.receivingItemId)?.name || '')
const selectedEmployeeName = computed(() => employees.value.find(e => e.id === form.employeeId)?.name || '')
const selectedFarmerName = computed(() => farmers.value.find(f => f.id === form.farmerId)?.name || '')
const selectedProcessingTypeName = computed(() => processingItems.value.find(p => p.id === form.itemId)?.name || form.itemId)

const lossValue = computed(() => 0)

const calcAmount = computed(() => {
  let output: number
  if (form.itemId === 'H01') output = calcOutputQty.value
  else if (form.itemId === 'H02') output = calcH02OutputQty.value
  else output = parseFloat(form.outputQty) || 0
  const wage = parseFloat(form.wageRate) || 0
  return Math.floor(output * wage).toLocaleString()
})

const stepLabel = computed(() => {
  const labels: Record<number, string> = {
    1: t('selectReceivingItem'),
    2: t('selectEmployee'),
    3: t('selectProcessingType'),
    4: form.itemId === 'H01' ? t('selectFarmer') : t('selectReceivingOrder'),
    5: t('inputQuantities'),
    6: t('confirm'),
  }
  return labels[step.value] || ''
})

const canProceed = computed(() => {
  if (step.value === 1) return !!form.receivingItemId
  if (step.value === 2) return !!form.employeeId
  if (step.value === 3) return !!form.itemId
  if (step.value === 4) {
    if (form.itemId === 'H01') return !!form.batchId
    return !!form.receivingOrderId
  }
  if (step.value === 5) {
    if (form.itemId === 'H01') return calcOutputQty.value > 0 && parseFloat(form.wageRate) > 0
    if (form.itemId === 'H02') return calcH02OutputQty.value > 0 && parseFloat(form.wageRate) > 0
    return (parseFloat(form.outputQty) > 0) && (parseFloat(form.wageRate) > 0)
  }
  return true
})

// ── 當日已有加工單確認 ──
const confirmExistingOpen = ref(false)
const existingOrderNo = ref('')
const existingOrderId = ref('')

function confirmUseExisting() {
  confirmExistingOpen.value = false
  step.value++
}

function cancelUseExisting() {
  confirmExistingOpen.value = false
  form.receivingItemId = ''
}

async function selectReceivingItem(item: any) {
  form.receivingItemId = item.id
  // 查詢當日是否已有該品項加工單，有則靜默沿用，沒有則待 submit 時 findOrCreate
  const checkDate = orderDate.value
  try {
    const res = await api.getProcessingOrders({ itemId: item.id, date: checkDate })
    const orders = res.data
    if (orders && orders.length > 0) {
      existingOrderId.value = orders[0].id
      existingOrderNo.value = orders[0].orderNo
    } else {
      existingOrderId.value = ''
      existingOrderNo.value = ''
    }
  } catch {
    existingOrderId.value = ''
    existingOrderNo.value = ''
  }
  step.value++
}

function getTodayStr() {
  // 泰國 UTC+7
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000)
  return now.toISOString().slice(0, 10)
}

function selectEmployee(emp: any) {
  form.employeeId = emp.id
  step.value++
}

function selectProcessingType(item: any) {
  form.itemId = item.id
  nextStep()
}

async function selectFarmer(f: any) {
  form.farmerId = f.id
  const res = await api.getAvailableBatches(f.id)
  availableBatches.value = res.data
  if (res.data.length === 1) {
    selectBatch(res.data[0])
  } else {
    showBatchSelect.value = true
  }
}

function selectBatch(batch: any) {
  form.batchId = batch.id
  const total = batch.details?.reduce((s: number, d: any) => s + Number(d.quantity), 0) || 0
  form.inputQty = total.toString()
  showBatchSelect.value = false
  activeField.value = 'h01InputWeight'
  step.value = 5
}

function selectReceivingOrder(order: any) {
  form.receivingOrderId = order.id
  activeField.value = form.itemId === 'H02' ? 'h02ScaleOutput' : 'outputQty'
  nextStep()
}

async function nextStep() {
  if (step.value === 3 && (form.itemId === 'H02' || form.itemId === 'H03')) {
    const res = form.itemId === 'H02'
      ? await api.getAvailableOrdersH02(form.receivingItemId)
      : await api.getAvailableOrdersH03(form.receivingItemId)
    availableOrders.value = res.data
  }
  if (step.value < totalSteps) step.value++
}

function prevStep() {
  if (step.value === 4 && form.itemId === 'H01' && showBatchSelect.value) {
    showBatchSelect.value = false
    return
  }
  // 補登模式：step 2 是第一步，退回時直接關閉
  if (step.value === 2 && props.targetOrder) {
    emit('close')
    return
  }
  if (step.value > 1) step.value--
}

async function submit() {
  if (lossValue.value < 0) return
  saving.value = true
  try {
    // 補登模式：強制鎖定 targetOrder.id，絕不落入 findOrCreateOrder（今日自動尋找/建立）邏輯
    // 一般新增模式（無 targetOrder）：才允許 findOrCreate 今日加工單
    let orderId: string
    if (props.targetOrder) {
      orderId = props.targetOrder.id
      if (!orderId) {
        toast.showToast(t('saveFailed'), 'danger')
        saving.value = false
        return
      }
    } else {
      orderId = existingOrderId.value
      if (!orderId) {
        const order = await store.findOrCreateOrder({
          orderDate: orderDate.value,
          receivingItemId: form.receivingItemId,
          sourceType: 'RECEIVING',
        })
        orderId = order.id
      }
    }

    // 補登舊加工單時，workTime 使用該單的 orderDate（而非今天）
    const workTime = (() => {
      const targetDate = props.targetOrder ? props.targetOrder.orderDate?.slice(0, 10) : orderDate.value
      if (!targetDate || targetDate === getTodayStr()) return undefined
      return targetDate
    })()

    // 依加工類型決定各數值
    let finalOutputQty: number
    let finalDefectQty: number
    let finalInputQty: number
    if (form.itemId === 'H01') {
      finalOutputQty = calcOutputQty.value
      finalDefectQty = calcDefectQty.value
      finalInputQty = calcInputQty.value
    } else if (form.itemId === 'H02') {
      finalOutputQty = calcH02OutputQty.value
      finalDefectQty = 0
      finalInputQty = calcH02OutputQty.value
    } else {
      finalOutputQty = parseFloat(form.outputQty)
      finalDefectQty = 0
      finalInputQty = parseFloat(form.outputQty) || 0
    }

    await api.createProcessingDetail({
      orderId,
      itemId: form.itemId,
      employeeId: form.employeeId,
      batchId: form.batchId || undefined,
      farmerId: form.farmerId || undefined,
      receivingOrderId: form.receivingOrderId || undefined,
      inputQty: finalInputQty,
      outputQty: finalOutputQty,
      defectQty: finalDefectQty,
      wasteQty: 0,
      wageRate: parseFloat(form.wageRate),
      workTime,
    })

    toast.showToast(t('saved'), 'success')
    savedOrderId.value = orderId
  } catch (e: any) {
    toast.showToast(e?.response?.data?.message || e?.message || t('saveFailed'), 'danger')
  } finally {
    saving.value = false
  }
}

// 繼續新增（同一員工）：保留員工 + 進貨品項 + targetOrder，僅重置加工類型相關欄位，回到 Step 3 重新選擇
function continueAddSameEmployee() {
  form.itemId = ''
  form.farmerId = ''
  form.batchId = ''
  form.receivingOrderId = ''
  form.defectPoolId = ''
  form.inputQty = ''
  form.outputQty = ''
  form.defectQty = '0'
  form.wasteQty = '0'
  form.wageRate = ''
  h01InputWeight.value = ''
  h01InputBaskets.value = ''
  scaleOutput.value = ''
  basketSmall.value = ''
  scaleDefect.value = ''
  basketLarge.value = ''
  h02ScaleOutput.value = ''
  h02BasketSmall.value = ''
  showBatchSelect.value = false
  availableBatches.value = []
  availableOrders.value = []
  savedOrderId.value = ''
  step.value = 3
}

function finishAndClose() {
  emit('created', savedOrderId.value)
}

async function loadMasterData() {
  const headers = { Authorization: `Bearer ${auth.token}` }
  const [ri, emp, farm, pi] = await Promise.all([
    fetch('/api/master-data/receiving-items', { headers }).then(r => r.json()),
    fetch('/api/master-data/employees', { headers }).then(r => r.json()),
    fetch('/api/master-data/farmers', { headers }).then(r => r.json()),
    fetch('/api/master-data/processing-items', { headers }).then(r => r.json()),
  ])
  receivingItems.value = ri
  employees.value = emp
  farmers.value = farm
  processingItems.value = pi
}

onMounted(async () => {
  await loadMasterData()
  if (props.targetOrder) {
    form.receivingItemId = props.targetOrder.receivingItemId
    existingOrderId.value = props.targetOrder.id
    existingOrderNo.value = props.targetOrder.orderNo
    step.value = 2
  }
})
</script>

<style scoped>
.create-wrap { display: flex; flex-direction: column; height: 100%; background: var(--color-bg); }

.create-header { display: flex; align-items: center; justify-content: space-between; padding: 6px 14px; border-bottom: 1px solid var(--color-border); background: var(--color-topbar); flex-shrink: 0; }
.back-btn { background: none; border: none; color: var(--color-success); font-size: 16px; cursor: pointer; padding: 2px 6px; }
.close-btn { background: none; border: none; color: var(--color-text-muted); font-size: 14px; cursor: pointer; padding: 2px 6px; }
.header-title { font-size: 12px; font-weight: 700; color: var(--color-text-muted); }

.step-bar { padding: 5px 14px; flex-shrink: 0; border-bottom: 1px solid var(--color-border); }
.step-info { font-size: 11px; color: var(--color-text-muted); margin-bottom: 4px; }
.step-track { height: 3px; background: var(--color-border); border-radius: 2px; overflow: hidden; }
.step-fill { height: 100%; background: var(--color-accent); border-radius: 2px; transition: width 0.3s; }

.create-body { flex: 1; overflow-y: auto; padding: 16px; }
.step-content { display: flex; flex-direction: column; gap: 12px; }
.date-hint { font-size: 13px; color: var(--color-text-muted); text-align: center; }
.step-title { font-size: 13px; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }

.item-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.item-card { background: var(--color-card); border: 2px solid var(--color-border); border-radius: 12px; padding: 12px 8px; display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; transition: all 0.15s; }
.item-card.selected { border-color: var(--color-accent); background: var(--color-card-hover); }
.item-img { width: 48px; height: 48px; border-radius: 8px; background: var(--color-surface); display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; color: var(--color-accent); overflow: hidden; }
.item-img img { width: 100%; height: 100%; object-fit: cover; }
.item-id { font-size: 11px; color: var(--color-text-muted); font-weight: 700; }
.item-name { font-size: 12px; color: var(--color-text); text-align: center; }

.search-box { margin-bottom: 4px; }
.search-input { width: 100%; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; padding: 10px 12px; color: var(--color-text); font-size: 14px; outline: none; box-sizing: border-box; }
.search-input:focus { border-color: var(--color-accent); }

.selector-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.selector-card { background: var(--color-card); border: 2px solid var(--color-border); border-radius: 10px; padding: 14px 8px; display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; transition: all 0.15s; }
.selector-card.selected { border-color: var(--color-accent); background: var(--color-card-hover); }
.selector-img { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; color: #fff; overflow: hidden; background: var(--color-surface); }
.selector-img img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.selector-img span { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
.selector-id { font-size: 10px; color: var(--color-text-muted); font-weight: 700; }
.selector-name { font-size: 12px; color: var(--color-text); font-weight: 600; text-align: center; }

.h-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.h-card { background: var(--color-card); border: 2px solid var(--color-border); border-radius: 14px; padding: 20px 12px; display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; transition: all 0.15s; }
.h-card.selected { border-color: var(--color-accent); background: var(--color-card-hover); }
.h-id { font-size: 22px; font-weight: 700; color: var(--color-accent); }
.h-name { font-size: 13px; color: var(--color-text); text-align: center; }

.batch-list { display: flex; flex-direction: column; gap: 8px; max-height: 320px; overflow-y: auto; }
.batch-card { background: var(--color-card); border: 2px solid var(--color-border); border-radius: 10px; padding: 14px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: all 0.15s; }
.batch-card.selected { border-color: var(--color-accent); background: var(--color-card-hover); }
.batch-img { width: 44px; height: 44px; border-radius: 8px; background: var(--color-surface); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: var(--color-accent); overflow: hidden; flex-shrink: 0; }
.batch-img img { width: 100%; height: 100%; object-fit: cover; }
.batch-info { display: flex; align-items: center; gap: 8px; }
.batch-date { font-size: 16px; font-weight: 700; color: var(--color-text); }
.batch-n { font-size: 14px; color: var(--color-text-muted); }

.confirm-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 0; }
.confirm-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--color-border); font-size: 14px; }
.confirm-row:last-child { border-bottom: none; }
.confirm-row.accent span:last-child { color: var(--color-accent); font-weight: 700; font-size: 16px; }
.confirm-row.danger span:last-child { color: var(--color-danger); }
.c-label { color: var(--color-text-muted); font-size: 12px; font-weight: 600; text-transform: uppercase; }
.confirm-id {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 1px 5px;
  margin-left: 4px;
}

.continue-box { background: rgba(45,212,191,0.08); border: 1px solid rgba(45,212,191,0.3); border-radius: 12px; padding: 16px; margin-top: 14px; }
.continue-msg { font-size: 14px; color: var(--color-success); font-weight: 600; margin-bottom: 12px; }
.continue-btns { display: flex; gap: 10px; }
.btn-continue { flex: 1; background: var(--color-accent); color: #fff; border: none; border-radius: 10px; padding: 13px; font-size: 14px; font-weight: 700; cursor: pointer; }
.btn-done { flex: 1; background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 10px; padding: 13px; font-size: 14px; font-weight: 600; cursor: pointer; }

.create-footer { display: flex; gap: 10px; padding: 14px 16px; border-top: 1px solid var(--color-border); background: var(--color-topbar); flex-shrink: 0; }
.btn-primary { flex: 1; background: var(--color-accent); color: #fff; border: none; border-radius: 10px; padding: 14px; font-size: 15px; font-weight: 700; cursor: pointer; transition: opacity 0.15s; }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-secondary { background: var(--color-surface); color: var(--color-text-muted); border: 1px solid var(--color-border); border-radius: 10px; padding: 14px 20px; font-size: 14px; cursor: pointer; }

/* ── Step 5 卡片（點擊開啟正中央 Modal 鍵盤）── */
.gf-input-tabs { display: flex; gap: 6px; flex-shrink: 0; }
.gf-tab-btn {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 10px 6px; background: var(--color-surface);
  border: 2px solid var(--color-border); border-radius: 9px;
  cursor: pointer; transition: all 0.15s; color: var(--color-text-muted);
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em;
}
.gf-tab-btn:active { border-color: var(--color-accent); background: var(--color-card-hover); }
.gf-tab-value { font-size: 19px; font-weight: 700; color: var(--color-text); }
.gf-amount-preview { text-align: center; font-size: 12px; color: var(--color-text-muted); margin: 4px 0 0; }
.gf-amount-value { font-size: 17px; font-weight: 700; color: var(--color-accent); }
.calc-section { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 9px; padding: 9px 11px; display: flex; flex-direction: column; gap: 6px; }
.calc-section-title { font-size: 11px; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.calc-result { font-size: 13px; color: var(--color-text-muted); text-align: right; padding: 0; }
.calc-pos { color: var(--color-accent); font-weight: 700; font-size: 16px; }
.calc-neg { color: var(--color-danger); font-weight: 700; font-size: 16px; }

/* ── 當日已有加工單確認 Dialog ── */
.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.72); z-index: 400;
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.exist-dialog {
  background: var(--color-card); border-radius: 16px;
  width: 100%; max-width: 360px; padding: 22px 20px;
  display: flex; flex-direction: column; gap: 12px; align-items: center;
  animation: modalIn 0.18s ease-out;
}
@keyframes modalIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
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
