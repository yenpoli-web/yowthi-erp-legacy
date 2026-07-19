<template>
  <div class="create-wrap">
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

    <!-- Step 1：貨運商 -->
    <div v-else-if="currentStep === 1" class="step-content">
      <div class="step-title">{{ t('selectCarrier') }}</div>
      <button class="select-btn big" @click="showCarrierModal = true">
        <div v-if="selectedCarrier" class="selected-item">
          <div class="sel-avatar" :style="{ background: getColor(selectedCarrier.id) }">
            <img v-if="selectedCarrier.imageUrl" :src="selectedCarrier.imageUrl" class="sel-img" />
            <span v-else>{{ selectedCarrier.id.slice(0, 2) }}</span>
          </div>
          <div class="sel-info">
            <div class="sel-id">{{ selectedCarrier.id }}</div>
            <div class="sel-name">{{ selectedCarrier.name }}</div>
          </div>
        </div>
        <span v-else class="placeholder-text">{{ t('tapToSelect') }}</span>
      </button>
      <TouchSelectorModal v-if="showCarrierModal" :title="t('selectCarrier')" :items="carriers"
        :model-value="form.carrierId"
        @select="c => { selectedCarrier = c; form.carrierId = c.id; showCarrierModal = false }"
        @close="showCarrierModal = false" />
    </div>

    <!-- Step 2：車數 + 單價 -->
    <div v-else-if="currentStep === 2" class="step-content">
      <div class="step-title">{{ t('inputQuantities') }}</div>
      <div class="input-tabs">
        <button class="input-tab" :class="{ active: activeField === 'quantity' }" @click="openModal('quantity')">
          <span class="tab-label">{{ t('truckCount') }}</span>
          <span class="tab-value" :class="{ accent: form.quantity }">{{ form.quantity || '0' }}</span>
        </button>
        <button class="input-tab" :class="{ active: activeField === 'unitPrice' }" @click="openModal('unitPrice')">
          <span class="tab-label">{{ t('unitPrice') }}</span>
          <span class="tab-value" :class="{ accent: form.unitPrice }">{{ form.unitPrice || '0' }}</span>
        </button>
      </div>
      <div class="amount-preview" v-if="calcAmount() > 0">
        {{ t('amount') }}：<strong class="accent">฿{{ calcAmount().toLocaleString() }}</strong>
      </div>
      <div class="notes-section">
        <label class="field-label">{{ t('notes') }}</label>
        <input class="notes-input" v-model="form.notes" placeholder="選填" />
      </div>
    </div>

    <!-- Step 3：確認 -->
    <div v-else-if="currentStep === 3" class="step-content">
      <div class="step-title">{{ t('stepConfirm') }}</div>
      <div class="summary-card">
        <div class="summary-row">
          <span class="summary-label">{{ t('date') }}</span>
          <span class="summary-value accent">{{ formatDate(orderDate) }}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">{{ t('carrier') }}</span>
          <span class="summary-value">{{ selectedCarrier?.name }}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">{{ t('truckCount') }}</span>
          <span class="summary-value">{{ form.quantity }}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">{{ t('unitPrice') }}</span>
          <span class="summary-value">฿{{ Number(form.unitPrice).toLocaleString() }}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">{{ t('amount') }}</span>
          <span class="summary-value accent">฿{{ calcAmount().toLocaleString() }}</span>
        </div>
        <div class="summary-row" v-if="form.notes">
          <span class="summary-label">{{ t('notes') }}</span>
          <span class="summary-value muted">{{ form.notes }}</span>
        </div>
      </div>
      <div v-if="savedOrderId" class="continue-box">
        <div class="continue-msg">✅ {{ t('savedSuccess') }}</div>
        <button class="btn-done" @click="$emit('created', savedOrderId)">{{ t('done') }}</button>
      </div>
    </div>

    <div class="step-actions" v-if="!savedOrderId">
      <button class="btn-secondary" @click="onPrev" :disabled="currentStep === 0">← {{ t('prev') }}</button>
      <button v-if="currentStep < steps.length - 1"
        class="btn-primary" @click="onNext" :disabled="!canNext">{{ t('next') }} →</button>
      <button v-else-if="currentStep === steps.length - 1"
        class="btn-primary" @click="onSubmit" :disabled="submitting">
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
import { createTransportOrder } from '../../../api/transport'
import TouchSelectorModal from '../../../components/common/TouchSelectorModal.vue'
import NumericInputModal from '../../../components/common/NumericInputModal.vue'

const { t } = useI18n()
const toast = useToastStore()
const auth = useAuthStore()
const emit = defineEmits<{ close: []; created: [orderId: string] }>()

const steps = computed(() => [t('selectDate'), t('selectCarrier'), t('inputQuantities'), t('stepConfirm')])
const currentStep = ref(0)
const submitting = ref(false)
const savedOrderId = ref('')

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

const form = ref<Record<string, string>>({ carrierId: '', quantity: '', unitPrice: '', notes: '' })
const selectedCarrier = ref<any>(null)
const showCarrierModal = ref(false)
const activeField = ref<'quantity' | 'unitPrice'>('quantity')
const carriers = ref<any[]>([])
const modalOpen = ref(false)
const modalField = ref<'quantity' | 'unitPrice'>('quantity')
function openModal(f: 'quantity' | 'unitPrice') { activeField.value = f; modalField.value = f; modalOpen.value = true }
const modalLabel = computed(() => modalField.value === 'quantity' ? t('truckCount') : t('unitPrice'))
function onModalConfirm(val: string) { form.value[modalField.value] = val; modalOpen.value = false }

const COLORS = ['#e8820c', '#2dd4bf', '#818cf8', '#f472b6', '#34d399', '#60a5fa']
function getColor(id: string) { return COLORS[id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 6] }
function formatDate(d: string) {
  if (!d) return ''
  const [y, m, day] = d.slice(0, 10).split('-')
  return `${parseInt(day)}/${parseInt(m)}/${y.slice(2)}`
}
function calcAmount() { return Math.floor(Number(form.value.quantity) * Number(form.value.unitPrice)) }

function pressKey(k: string) {
  const f = activeField.value
  const cur = form.value[f] || ''
  const maxDec = f === 'unitPrice' ? 2 : 1
  if (k === 'C') { form.value[f] = ''; return }
  if (k === '←') { form.value[f] = cur.slice(0, -1); return }
  if (k === '.') { if (cur.includes('.')) return; form.value[f] = (cur || '0') + '.'; return }
  if (!cur.includes('.') && cur === '0') { form.value[f] = k; return }
  if (cur.includes('.') && cur.split('.')[1].length >= maxDec) return
  form.value[f] = cur + k
}

const canNext = computed(() => {
  if (currentStep.value === 0) return !!orderDate.value
  if (currentStep.value === 1) return !!form.value.carrierId
  if (currentStep.value === 2) return Number(form.value.quantity) > 0 && Number(form.value.unitPrice) > 0
  return true
})
function onNext() { if (canNext.value) currentStep.value++ }
function onPrev() { if (currentStep.value > 0) currentStep.value-- }

async function onSubmit() {
  submitting.value = true
  try {
    const res = await createTransportOrder({
      orderDate: orderDate.value,
      carrierId: form.value.carrierId,
      quantity: Number(form.value.quantity),
      unitPrice: Number(form.value.unitPrice),
      notes: form.value.notes || undefined,
    })
    savedOrderId.value = res.data.id
    toast.showToast(t('savedSuccess'), 'success')
  } catch (e: any) {
    toast.showToast(e?.response?.data?.message || t('saveFailed'), 'error')
  } finally { submitting.value = false }
}

async function loadMasterData() {
  try {
    const headers = { Authorization: `Bearer ${auth.token}` }
    const res = await fetch('/api/master-data/carriers', { headers })
    if (res.ok) carriers.value = (await res.json()).filter((c: any) => !c.isDeleted)
  } catch {}
}
onMounted(loadMasterData)
</script>

<style scoped>
.create-wrap { padding: 16px; padding-bottom: 120px; }
.btn-close { position: fixed; top: 62px; right: 16px; z-index: 20; background: none; border: 1px solid var(--color-border); border-radius: 8px; padding: 7px 12px; color: var(--color-text-muted); font-size: 13px; cursor: pointer; }
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
.date-selects { display: flex; align-items: center; gap: 8px; }
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
.notes-section { margin-bottom: 14px; }
.field-label { font-size: 10px; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em; display: block; margin-bottom: 6px; }
.notes-input { width: 100%; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 10px; padding: 12px 14px; font-size: 15px; color: var(--color-text); font-family: inherit; }
.notes-input:focus { outline: none; border-color: var(--color-accent); }
.continue-box { background: rgba(45,212,191,0.08); border: 1px solid rgba(45,212,191,0.3); border-radius: 12px; padding: 16px; margin-top: 14px; text-align: center; }
.continue-msg { font-size: 14px; color: var(--color-success); font-weight: 600; margin-bottom: 12px; }
.btn-done { background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 10px; padding: 12px 24px; font-size: 14px; font-weight: 600; cursor: pointer; }
.step-actions { position: fixed; bottom: 64px; left: 0; right: 0; display: flex; gap: 12px; padding: 12px 16px; background: var(--color-bg); border-top: 1px solid var(--color-border); z-index: 10; }
.btn-primary { flex: 1; background: var(--color-accent); color: #fff; border: none; border-radius: 10px; padding: 13px; font-size: 15px; font-weight: 700; cursor: pointer; transition: opacity 0.15s; }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-secondary { flex: 1; background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 10px; padding: 13px; font-size: 15px; font-weight: 600; cursor: pointer; }
.btn-secondary:disabled { opacity: 0.3; cursor: not-allowed; }
</style>
