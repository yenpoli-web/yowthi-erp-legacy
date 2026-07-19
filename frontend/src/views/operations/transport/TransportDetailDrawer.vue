<template>
  <div class="drawer-inner" v-if="order">
    <div class="drawer-header">
      <div class="header-left">
        <div class="order-id accent">{{ order.id }}</div>
        <div class="order-meta">{{ formatDate(order.orderDate) }}</div>
      </div>
      <div class="header-right">
        <button class="btn-edit" v-if="canEdit && !editing" @click="startEdit">✏️ {{ t('edit') }}</button>
        <button class="btn-close" @click="$emit('close')">✕</button>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-label">{{ t('truckCount') }}</div>
        <div class="stat-value">{{ Number(order.quantity) }}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">{{ t('amount') }}</div>
        <div class="stat-value accent">฿{{ Number(order.amount).toLocaleString() }}</div>
      </div>
    </div>

    <!-- View mode -->
    <div v-if="!editing" class="detail-section">
      <div class="info-list">
        <div class="info-row">
          <span class="info-label">{{ t('carrier') }}</span>
          <span class="info-value">{{ order.carrier?.name }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">{{ t('truckCount') }}</span>
          <span class="info-value">{{ Number(order.quantity) }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">{{ t('unitPrice') }}</span>
          <span class="info-value">฿{{ Number(order.unitPrice).toLocaleString() }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">{{ t('amount') }}</span>
          <span class="info-value accent">฿{{ Number(order.amount).toLocaleString() }}</span>
        </div>
        <div class="info-row" v-if="order.notes">
          <span class="info-label">{{ t('notes') }}</span>
          <span class="info-value muted">{{ order.notes }}</span>
        </div>
      </div>
    </div>

    <!-- Edit mode -->
    <div v-else class="edit-section">
      <div class="section-title">{{ t('edit') }}</div>
      <div class="edit-field">
        <label class="field-label">{{ t('carrier') }}</label>
        <button class="select-btn-sm" @click="showCarrierModal = true">
          {{ editForm.carrierName || t('selectCarrier') }}
        </button>
      </div>
      <div class="edit-row">
        <div class="edit-field">
          <label class="field-label">{{ t('truckCount') }}</label>
          <button class="select-btn-sm num" @click="editField = 'quantity'; showKeypad = true">{{ editForm.quantity }}</button>
        </div>
        <div class="edit-field">
          <label class="field-label">{{ t('unitPrice') }}</label>
          <button class="select-btn-sm num" @click="editField = 'unitPrice'; showKeypad = true">{{ editForm.unitPrice }}</button>
        </div>
      </div>
      <div class="edit-amount">{{ t('amount') }}：<strong class="accent">฿{{ calcEditAmount().toLocaleString() }}</strong></div>
      <div class="edit-field">
        <label class="field-label">{{ t('notes') }}</label>
        <input class="notes-input" v-model="editForm.notes" placeholder="選填" />
      </div>
      <div class="edit-actions">
        <button class="btn-save" @click="saveEdit" :disabled="saving">{{ saving ? t('saving') : t('save') }}</button>
        <button class="btn-cancel-edit" @click="editing = false">{{ t('cancel') }}</button>
      </div>

      <TouchSelectorModal v-if="showCarrierModal" :title="t('selectCarrier')" :items="carriers"
        :model-value="editForm.carrierId"
        @select="c => { editForm.carrierId = c.id; editForm.carrierName = c.name; showCarrierModal = false }"
        @close="showCarrierModal = false" />

      <NumericInputModal :show="showKeypad" mode="decimal"
        :label="editField === 'quantity' ? t('truckCount') : t('unitPrice')"
        :model-value="editForm[editField]"
        @confirm="v => { editForm[editField] = v; showKeypad = false }"
        @close="showKeypad = false" />
    </div>

    <div class="drawer-footer">
      <button v-if="canEdit" class="btn-soft-delete" @click="confirmSoftDelete">🗑 {{ t('softDelete') }}</button>
      <button v-if="canAdmin" class="btn-hard-delete" @click="confirmHardDelete">⚠️ {{ t('hardDelete') }}</button>
    </div>
  </div>

  <ConfirmDialog v-if="confirmDialog.open" :show="confirmDialog.open"
    :title="t('confirmAction')" :message="confirmDialog.message"
    @confirm="confirmDialog.onConfirm" @cancel="confirmDialog.open = false" />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToastStore } from '../../../stores/toast'
import { useAuthStore } from '../../../stores/auth'
import { updateTransportOrder, softDeleteTransportOrder, hardDeleteTransportOrder } from '../../../api/transport'
import TouchSelectorModal from '../../../components/common/TouchSelectorModal.vue'
import NumericInputModal from '../../../components/common/NumericInputModal.vue'
import ConfirmDialog from '../../../components/common/ConfirmDialog.vue'

const { t } = useI18n()
const toast = useToastStore()
const auth = useAuthStore()
const props = defineProps<{ order: any; canEdit: boolean; canAdmin: boolean }>()
const emit = defineEmits<{ close: []; refresh: [] }>()

function formatDate(d: string) {
  if (!d) return ''
  const [y, m, day] = d.slice(0, 10).split('-')
  return `${parseInt(day)}/${parseInt(m)}/${y.slice(2)}`
}

const editing = ref(false)
const saving = ref(false)
const editForm = ref<Record<string, string>>({})
const editField = ref('quantity')
const showKeypad = ref(false)
const showCarrierModal = ref(false)
const carriers = ref<any[]>([])

function startEdit() {
  editForm.value = {
    carrierId: props.order.carrierId,
    carrierName: props.order.carrier?.name || '',
    quantity: String(Number(props.order.quantity)),
    unitPrice: String(Number(props.order.unitPrice)),
    notes: props.order.notes || '',
  }
  editing.value = true
}

function calcEditAmount() { return Math.floor(Number(editForm.value.quantity) * Number(editForm.value.unitPrice)) }

function pressKey(k: string) {
  const f = editField.value
  const cur = editForm.value[f] || ''
  const maxDec = f === 'unitPrice' ? 2 : 1
  if (k === 'C') { editForm.value[f] = ''; return }
  if (k === '←') { editForm.value[f] = cur.slice(0, -1); return }
  if (k === '.') { if (cur.includes('.')) return; editForm.value[f] = (cur || '0') + '.'; return }
  if (!cur.includes('.') && cur === '0') { editForm.value[f] = k; return }
  if (cur.includes('.') && cur.split('.')[1].length >= maxDec) return
  editForm.value[f] = cur + k
}

async function saveEdit() {
  saving.value = true
  try {
    await updateTransportOrder(props.order.id, {
      carrierId: editForm.value.carrierId,
      quantity: Number(editForm.value.quantity),
      unitPrice: Number(editForm.value.unitPrice),
      notes: editForm.value.notes || undefined,
    })
    toast.showToast(t('saved'), 'success')
    editing.value = false
    emit('refresh')
  } catch (e: any) { toast.showToast(e?.response?.data?.message || t('saveFailed'), 'error') }
  finally { saving.value = false }
}

const confirmDialog = ref<{ open: boolean; message: string; onConfirm: () => void }>({ open: false, message: '', onConfirm: () => {} })

function confirmSoftDelete() {
  confirmDialog.value = { open: true, message: t('confirmDeleteOrder'), onConfirm: async () => {
    confirmDialog.value.open = false
    try { await softDeleteTransportOrder(props.order.id); toast.showToast(t('deleted'), 'success'); emit('refresh'); emit('close') }
    catch (e: any) { toast.showToast(e?.response?.data?.message || t('deleteFailed'), 'error') }
  }}
}
function confirmHardDelete() {
  confirmDialog.value = { open: true, message: t('confirmHardDelete'), onConfirm: async () => {
    confirmDialog.value.open = false
    try { await hardDeleteTransportOrder(props.order.id); toast.showToast(t('hardDeleted'), 'success'); emit('refresh'); emit('close') }
    catch (e: any) { toast.showToast(e?.response?.data?.message || t('deleteFailed'), 'error') }
  }}
}

async function loadCarriers() {
  try {
    const headers = { Authorization: `Bearer ${auth.token}` }
    const res = await fetch('/api/master-data/carriers', { headers })
    if (res.ok) carriers.value = (await res.json()).filter((c: any) => !c.isDeleted)
  } catch {}
}
onMounted(loadCarriers)
</script>

<style scoped>
.drawer-inner { padding: 0 0 100px; }
.drawer-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 18px 18px 14px; border-bottom: 1px solid var(--color-border); position: sticky; top: 0; background: var(--color-drawer); z-index: 10; }
.header-left { flex: 1; }
.header-right { display: flex; gap: 8px; align-items: flex-start; flex-shrink: 0; }
.order-id { font-size: 15px; font-weight: 700; }
.order-meta { font-size: 12px; color: var(--color-text-muted); margin-top: 3px; }
.btn-edit { background: rgba(232,130,12,0.1); border: 1px solid rgba(232,130,12,0.3); color: var(--color-accent); border-radius: 6px; padding: 5px 10px; font-size: 11px; font-weight: 600; cursor: pointer; white-space: nowrap; }
.btn-edit:hover { background: rgba(232,130,12,0.2); }
.btn-close { background: none; border: none; color: var(--color-text-muted); font-size: 18px; cursor: pointer; padding: 4px 8px; }
.accent { color: var(--color-accent); }
.muted { color: var(--color-text-muted); }
.stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px; background: var(--color-border); border-bottom: 1px solid var(--color-border); }
.stat-box { display: flex; flex-direction: column; align-items: center; padding: 12px 8px; background: var(--color-surface); }
.stat-label { font-size: 10px; color: var(--color-text-muted); text-transform: uppercase; }
.stat-value { font-size: 16px; font-weight: 700; margin-top: 4px; }
.detail-section, .edit-section { padding: 16px 18px; }
.info-list { display: flex; flex-direction: column; gap: 0; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; overflow: hidden; }
.info-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--color-border); }
.info-row:last-child { border-bottom: none; }
.info-label { font-size: 13px; color: var(--color-text-muted); }
.info-value { font-size: 15px; font-weight: 700; }
.section-title { font-size: 11px; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 14px; }
.edit-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
.field-label { font-size: 10px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.edit-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.select-btn-sm { width: 100%; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; padding: 10px 12px; font-size: 14px; color: var(--color-text); text-align: left; cursor: pointer; transition: border-color 0.15s; }
.select-btn-sm:hover { border-color: var(--color-accent); }
.select-btn-sm.num { font-weight: 700; color: var(--color-accent); text-align: center; }
.edit-amount { font-size: 13px; color: var(--color-text-muted); margin-bottom: 12px; }
.notes-input { width: 100%; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; padding: 10px 12px; font-size: 14px; color: var(--color-text); font-family: inherit; }
.notes-input:focus { outline: none; border-color: var(--color-accent); }
.edit-actions { display: flex; gap: 8px; margin-top: 4px; }
.btn-save { flex: 1; background: var(--color-accent); color: #fff; border: none; border-radius: 8px; padding: 10px; font-size: 14px; font-weight: 700; cursor: pointer; }
.btn-save:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-cancel-edit { flex: 1; background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 8px; padding: 10px; font-size: 14px; cursor: pointer; }
.drawer-footer { position: sticky; bottom: 0; display: flex; gap: 10px; padding: 14px 16px; background: var(--color-drawer); border-top: 1px solid var(--color-border); }
.btn-soft-delete, .btn-hard-delete { flex: 1; background: none; border-radius: 8px; padding: 10px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid var(--color-danger); color: var(--color-danger); }
.btn-soft-delete:hover { background: rgba(248,113,113,0.1); }
.btn-hard-delete:hover { background: var(--color-danger-bg); color: #fff; border-color: var(--color-danger-bg); }
.keypad-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 300; display: flex; align-items: flex-end; }
.keypad-popup { width: 100%; background: var(--color-drawer); border-radius: 16px 16px 0 0; padding: 16px; }
.keypad-display { font-size: 32px; font-weight: 700; text-align: right; padding: 8px 12px; border-bottom: 1px solid var(--color-border); margin-bottom: 8px; }
.keypad-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.kk { height: 52px; display: flex; align-items: center; justify-content: center; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 10px; color: var(--color-text); font-size: 20px; font-weight: 500; cursor: pointer; }
.kk:active { background: var(--color-surface-hover); }
.kk-sec { color: var(--color-text-muted); font-size: 16px; }
.kk-ok { background: var(--color-accent); border-color: var(--color-accent-dim); color: #fff; font-size: 18px; font-weight: 700; }
.kk-span2 { grid-column: span 2; }
</style>
