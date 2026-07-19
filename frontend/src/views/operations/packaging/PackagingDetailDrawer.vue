<template>
  <div class="drawer-inner" v-if="order">
    <div class="drawer-header">
      <div class="header-left">
        <div class="order-id accent">{{ order.id }}</div>
        <div class="order-meta">{{ formatDate(order.orderDate) }}</div>
        <div class="sales-link" v-if="isReceivingType && order.receivingOrder">
          📦 <span class="sales-link-id">{{ order.receivingOrder.id }}</span>
          <span class="sales-link-name">{{ order.receivingOrder.receivingItem?.name }}</span>
        </div>
        <div class="sales-link-empty" v-else-if="isReceivingType">
          📦 <span class="muted-text">{{ t('noLinkedReceivingOrder') }}</span>
        </div>
        <div class="sales-link" v-else-if="order.salesOrder">
          📋 <span class="sales-link-id">{{ order.salesOrder.id }}</span>
          <span class="sales-link-name">{{ order.salesOrder.customer?.name }}</span>
        </div>
        <div class="sales-link-empty" v-else>
          📋 <span class="muted-text">{{ t('noSalesLink') }}</span>
        </div>
      </div>
      <div class="header-right">
        <button v-if="canEdit && !order.salesDone" class="btn-mark-sales-done" @click="doMarkPackagingSalesDone(true)">✅ {{ t('pkgMarkDone') }}</button>
        <button v-if="canEdit && order.salesDone" class="btn-undo-sales-done" @click="doMarkPackagingSalesDone(false)">{{ t('pkgUndoMarkDone') }}</button>
        <template v-if="!isReceivingType">
          <button class="btn-link-sales" @click="showSalesModal = true" v-if="canEdit">
            {{ order.salesOrder ? t('changeSalesOrder') : t('linkSalesOrder') }}
          </button>
        </template>
        <template v-else>
          <button class="btn-link-sales" @click="showReceivingModal = true" v-if="canEdit">
            {{ order.receivingOrder ? t('changeReceivingOrder') : t('linkReceivingOrder') }}
          </button>
        </template>
        <button class="btn-close" @click="$emit('close')">✕</button>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-label">{{ t('details') }}</div>
        <div class="stat-value">{{ activeDetails.length }}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">{{ t('totalAmount') }}</div>
        <div class="stat-value accent">฿{{ totalAmount.toLocaleString() }}</div>
      </div>
    </div>

    <div class="section-title">{{ t('details') }}</div>
    <div v-if="activeDetails.length === 0" class="empty-block">{{ t('noDetails') }}</div>
    <div v-else class="detail-list">
      <div v-for="d in activeDetails" :key="d.id" class="detail-card">
        <div v-if="editingId !== d.id" class="detail-view">
          <div class="detail-top">
            <div>
              <div class="detail-main">{{ d.employee?.name }}</div>
              <div class="detail-sub">{{ d.employee?.id }} · {{ d.item?.name }}</div>
            </div>
            <span class="detail-amount accent">฿{{ Number(d.amount).toLocaleString() }}</span>
          </div>
          <div class="detail-nums">{{ t('packagingQty') }}: {{ Number(d.quantity) }} × ฿{{ Number(d.wageRate) }}</div>
          <div class="detail-meta">{{ formatDateTime(d.workTime) }}</div>
          <div class="detail-notes" v-if="d.notes">{{ d.notes }}</div>
          <div class="detail-actions" v-if="canEdit">
            <button class="btn-sm" @click="startEdit(d)">✏️ {{ t('editDetail') }}</button>
            <button class="btn-sm danger" @click="confirmSoftDeleteDetail(d.id)">🗑 {{ t('softDelete') }}</button>
            <button class="btn-sm danger" v-if="canAdmin" @click="confirmHardDeleteDetail(d.id)">⚠️ {{ t('hardDelete') }}</button>
          </div>
        </div>

        <div v-else class="detail-edit">
          <div class="edit-field">
            <label class="field-label">{{ t('packagingItem') }}</label>
            <button class="select-btn-sm" @click="showEditItemModal = true">{{ editForm.itemName || t('selectPackagingItem') }}</button>
          </div>
          <div class="edit-row">
            <div class="edit-field">
              <label class="field-label">{{ t('packagingQty') }}</label>
              <button class="select-btn-sm num" @click="editField = 'quantity'; showEditKeypad = true">{{ editForm.quantity }}</button>
            </div>
            <div class="edit-field">
              <label class="field-label">{{ t('wageRate') }}</label>
              <button class="select-btn-sm num" @click="editField = 'wageRate'; showEditKeypad = true">{{ editForm.wageRate }}</button>
            </div>
          </div>
          <div class="edit-field">
            <label class="field-label">{{ t('notes') }}</label>
            <input class="notes-input" v-model="editForm.notes" :placeholder="t('notes')" />
          </div>
          <div class="edit-amount">{{ t('amount') }}：<strong class="accent">฿{{ calcEditAmount().toLocaleString() }}</strong></div>
          <div class="edit-actions">
            <button class="btn-save" @click="saveEdit(d.id)" :disabled="saving">{{ saving ? t('saving') : t('save') }}</button>
            <button class="btn-cancel-edit" @click="editingId = null">{{ t('cancel') }}</button>
          </div>
          <TouchSelectorModal v-if="showEditItemModal" :title="t('selectPackagingItem')" :items="packagingItems"
            :model-value="editForm.itemId"
            @select="p => { editForm.itemId = p.id; editForm.itemName = p.name; if (!editForm.wageRate || editForm.wageRate === '0') { editForm.wageRate = p.wageRate ? String(p.wageRate) : '' }; showEditItemModal = false }"
            @close="showEditItemModal = false" />
          <NumericInputModal :show="showEditKeypad" mode="decimal"
            :label="editField === 'quantity' ? t('packagingQty') : t('wageRate')"
            :model-value="editForm[editField]"
            @confirm="v => { editForm[editField] = v; showEditKeypad = false }"
            @close="showEditKeypad = false" />
        </div>
      </div>
    </div>

    <div class="add-inline" v-if="canEdit && !showInlineAdd">
      <button class="btn-add" @click="openInlineAdd">+ {{ t('addDetail') }}</button>
    </div>
    <div v-if="showInlineAdd" class="inline-add-form">
      <div class="section-title">{{ t('addDetail') }}</div>
      <div class="edit-field">
        <label class="field-label">{{ t('employee') }}</label>
        <button class="select-btn-sm" @click="showInlineEmpModal = true">{{ inlineForm.employeeName || t('selectEmployee') }}</button>
      </div>
      <div class="edit-field">
        <label class="field-label">{{ t('packagingItem') }}</label>
        <button class="select-btn-sm" @click="showInlineItemModal = true">{{ inlineForm.itemName || t('selectPackagingItem') }}</button>
      </div>
      <div class="edit-row">
        <div class="edit-field">
          <label class="field-label">{{ t('packagingQty') }}</label>
          <button class="select-btn-sm num" @click="inlineField = 'quantity'; showInlineKeypad = true">{{ inlineForm.quantity || '-' }}</button>
        </div>
        <div class="edit-field">
          <label class="field-label">{{ t('wageRate') }}</label>
          <button class="select-btn-sm num" @click="inlineField = 'wageRate'; showInlineKeypad = true">{{ inlineForm.wageRate || '-' }}</button>
        </div>
      </div>
      <div class="edit-field">
        <label class="field-label">{{ t('notes') }}</label>
        <input class="notes-input" v-model="inlineForm.notes" :placeholder="t('notes')" />
      </div>
      <div class="edit-actions">
        <button class="btn-save" @click="submitInline" :disabled="!canInline || saving">{{ saving ? t('saving') : t('save') }}</button>
        <button class="btn-cancel-edit" @click="showInlineAdd = false">{{ t('cancel') }}</button>
      </div>
      <TouchSelectorModal v-if="showInlineEmpModal" :title="t('selectEmployee')" :items="employees"
        :model-value="inlineForm.employeeId"
        @select="e => { inlineForm.employeeId = e.id; inlineForm.employeeName = e.name; showInlineEmpModal = false }"
        @close="showInlineEmpModal = false" />
      <TouchSelectorModal v-if="showInlineItemModal" :title="t('selectPackagingItem')" :items="packagingItems"
        :model-value="inlineForm.itemId"
        @select="p => { inlineForm.itemId = p.id; inlineForm.itemName = p.name; inlineForm.wageRate = p.wageRate ? String(p.wageRate) : ''; showInlineItemModal = false }"
        @close="showInlineItemModal = false" />
      <NumericInputModal :show="showInlineKeypad" mode="decimal"
        :label="inlineField === 'quantity' ? t('packagingQty') : t('wageRate')"
        :model-value="inlineForm[inlineField]"
        @confirm="v => { inlineForm[inlineField] = v; showInlineKeypad = false }"
        @close="showInlineKeypad = false" />
    </div>

    <div class="drawer-footer">
      <button v-if="canEdit" class="btn-soft-delete" @click="confirmSoftDeleteOrder">🗑 {{ t('softDelete') }}</button>
      <button v-if="canAdmin" class="btn-hard-delete" @click="confirmHardDeleteOrder">⚠️ {{ t('hardDelete') }}</button>
    </div>

    <!-- 銷售單關聯 Modal -->
    <div v-if="showSalesModal" class="sales-modal-overlay" @click.self="showSalesModal = false">
      <div class="sales-modal">
        <div class="sales-modal-header">
          <span>{{ t('linkSalesOrder') }}</span>
          <button @click="showSalesModal = false">✕</button>
        </div>
        <div class="sales-modal-search">
          <input v-model="salesSearch" class="search-input" :placeholder="t('searchIdOrName')" />
        </div>
        <div class="sales-modal-list">
          <!-- 取消關聯 -->
          <div v-if="order.salesOrderId" class="sales-modal-item unlink" @click="unlinkSalesOrder">
            <div class="smi-id danger">✕ {{ t('removeSalesLink') }}</div>
          </div>
          <div v-if="filteredSalesOrders.length === 0" class="empty-modal">{{ t('noOrders') }}</div>
          <div v-for="s in filteredSalesOrders" :key="s.id"
            class="sales-modal-item" :class="{ active: order.salesOrderId === s.id }"
            @click="linkSalesOrder(s)">
            <div class="smi-top">
              <div>
                <div class="smi-id accent">{{ s.id }}</div>
                <div class="smi-info">{{ formatDate(s.orderDate) }} · {{ s.customer?.name }}</div>
              </div>
              <!-- 只有尚未關聯這張包裝單時，才顯示標記完成按鈕 -->
              <button v-if="order.salesOrderId !== s.id" class="btn-mark-done" @click.stop="markPackagingDone(s.id, true)">
                ✓ {{ t('markPackagingDone') }}
              </button>
              <span v-else class="badge-linked">✔ {{ t('linked') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 進貨單關聯 Modal -->
    <div v-if="showReceivingModal" class="sales-modal-overlay" @click.self="showReceivingModal = false">
      <div class="sales-modal">
        <div class="sales-modal-header">
          <span>{{ t('linkReceivingOrder') }}</span>
          <button @click="showReceivingModal = false">✕</button>
        </div>
        <div class="sales-modal-search">
          <input v-model="receivingSearch" class="search-input" :placeholder="t('searchIdOrName')" />
        </div>
        <div class="sales-modal-list">
          <div v-if="filteredReceivingOrders.length === 0" class="empty-modal">{{ t('noOrders') }}</div>
          <div v-for="r in filteredReceivingOrders" :key="r.id"
            class="sales-modal-item" :class="{ active: order.receivingOrderId === r.id }"
            @click="linkReceivingOrder(r)">
            <div class="smi-top">
              <div>
                <div class="smi-id accent">{{ r.id }}</div>
                <div class="smi-info">{{ formatDate(r.orderDate) }} · {{ r.receivingItem?.name }}</div>
              </div>
              <span v-if="order.receivingOrderId === r.id" class="badge-linked">✔ {{ t('linked') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <ConfirmDialog v-if="confirmDialog.open" :show="confirmDialog.open"
    :title="t('confirmAction')" :message="confirmDialog.message"
    @confirm="confirmDialog.onConfirm" @cancel="confirmDialog.open = false" />
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToastStore } from '../../../stores/toast'
import { useAuthStore } from '../../../stores/auth'
import {
  createPackagingDetail, updatePackagingDetail,
  softDeletePackagingDetail, hardDeletePackagingDetail,
  softDeletePackagingOrder, hardDeletePackagingOrder,
  updatePackagingOrder, markPackagingSalesDone,
} from '../../../api/packaging'
import { toggleSalesPackagingDone } from '../../../api/sales'
import TouchSelectorModal from '../../../components/common/TouchSelectorModal.vue'
import NumericInputModal from '../../../components/common/NumericInputModal.vue'
import ConfirmDialog from '../../../components/common/ConfirmDialog.vue'

const { t } = useI18n()
const toast = useToastStore()
const auth = useAuthStore()
const props = defineProps<{ order: any; canEdit: boolean; canAdmin: boolean }>()
const emit = defineEmits<{ close: []; refresh: [] }>()

const activeDetails = computed(() => (props.order?.details || []).filter((d: any) => !d.isDeleted))
const totalAmount = computed(() => activeDetails.value.reduce((s: number, d: any) => s + Number(d.amount), 0))

// 依目前主單的 receivingOrderId（已關聯）或第一筆明細的包裝項目 applicableTo（尚未關聯時）判斷這張單屬於哪種類型
const isReceivingType = computed(() => {
  if (props.order?.receivingOrderId) return true
  if (props.order?.salesOrderId) return false
  return activeDetails.value[0]?.item?.applicableTo === 'RECEIVING_ORDER'
})

function formatDate(d: string) {
  if (!d) return ''
  const [y, m, day] = d.slice(0, 10).split('-')
  return `${parseInt(day)}/${parseInt(m)}/${y.slice(2)}`
}
function formatDateTime(dt: string) {
  if (!dt) return ''
  const d = new Date(dt)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

// 編輯
const editingId = ref<number | null>(null)
const editForm = ref<Record<string, string>>({})
const editField = ref('quantity')
const showEditKeypad = ref(false)
const showEditItemModal = ref(false)
const saving = ref(false)
const employees = ref<any[]>([])
const packagingItems = ref<any[]>([])

function startEdit(d: any) {
  editingId.value = d.id
  editForm.value = { itemId: d.itemId, itemName: d.item?.name || '', quantity: String(Number(d.quantity)), wageRate: String(Number(d.wageRate)), notes: d.notes || '' }
}
function calcEditAmount() { return Math.floor(Number(editForm.value.quantity) * Number(editForm.value.wageRate)) }
async function saveEdit(id: number) {
  saving.value = true
  try {
    await updatePackagingDetail(id, { itemId: editForm.value.itemId, quantity: Number(editForm.value.quantity), wageRate: Number(editForm.value.wageRate), notes: editForm.value.notes })
    toast.showToast(t('saved'), 'success'); editingId.value = null; emit('refresh')
  } catch (e: any) { toast.showToast(e?.response?.data?.message || t('saveFailed'), 'error') }
  finally { saving.value = false }
}

// 新增明細 inline
const showInlineAdd = ref(false)
const showInlineEmpModal = ref(false)
const showInlineItemModal = ref(false)
const inlineForm = ref<Record<string, string>>({ employeeId: '', employeeName: '', itemId: '', itemName: '', quantity: '', wageRate: '', notes: '' })
const inlineField = ref('quantity')
const showInlineKeypad = ref(false)
const canInline = computed(() => !!inlineForm.value.employeeId && !!inlineForm.value.itemId && Number(inlineForm.value.quantity) > 0 && Number(inlineForm.value.wageRate) > 0)

function openInlineAdd() { inlineForm.value = { employeeId: '', employeeName: '', itemId: '', itemName: '', quantity: '', wageRate: '', notes: '' }; showInlineAdd.value = true }
async function submitInline() {
  saving.value = true
  try {
    await createPackagingDetail({ orderId: props.order.id, employeeId: inlineForm.value.employeeId, itemId: inlineForm.value.itemId, quantity: Number(inlineForm.value.quantity), wageRate: Number(inlineForm.value.wageRate), notes: inlineForm.value.notes || undefined })
    toast.showToast(t('detailAdded'), 'success'); showInlineAdd.value = false; emit('refresh')
  } catch (e: any) { toast.showToast(e?.response?.data?.message || t('saveFailed'), 'error') }
  finally { saving.value = false }
}

// 刪除
const confirmDialog = ref<{ open: boolean; message: string; onConfirm: () => void }>({ open: false, message: '', onConfirm: () => {} })
function confirmSoftDeleteDetail(id: number) { confirmDialog.value = { open: true, message: t('confirmDeleteDetail'), onConfirm: async () => { confirmDialog.value.open = false; try { await softDeletePackagingDetail(id); toast.showToast(t('deleted'), 'success'); emit('refresh') } catch (e: any) { toast.showToast(e?.response?.data?.message || t('deleteFailed'), 'error') } } } }
function confirmHardDeleteDetail(id: number) { confirmDialog.value = { open: true, message: t('confirmHardDelete'), onConfirm: async () => { confirmDialog.value.open = false; try { await hardDeletePackagingDetail(id); toast.showToast(t('hardDeleted'), 'success'); emit('refresh') } catch (e: any) { toast.showToast(e?.response?.data?.message || t('deleteFailed'), 'error') } } } }
function confirmSoftDeleteOrder() { confirmDialog.value = { open: true, message: t('confirmDeleteOrder'), onConfirm: async () => { confirmDialog.value.open = false; try { await softDeletePackagingOrder(props.order.id); toast.showToast(t('deleted'), 'success'); emit('refresh'); emit('close') } catch (e: any) { toast.showToast(e?.response?.data?.message || t('deleteFailed'), 'error') } } } }
function confirmHardDeleteOrder() { confirmDialog.value = { open: true, message: t('confirmHardDelete'), onConfirm: async () => { confirmDialog.value.open = false; try { await hardDeletePackagingOrder(props.order.id); toast.showToast(t('hardDeleted'), 'success'); emit('refresh'); emit('close') } catch (e: any) { toast.showToast(e?.response?.data?.message || t('deleteFailed'), 'error') } } } }

async function loadMasterData() {
  try {
    const headers = { Authorization: `Bearer ${auth.token}` }
    const [eRes, iRes] = await Promise.all([fetch('/api/master-data/employees', { headers }), fetch('/api/master-data/packaging-items', { headers })])
    if (eRes.ok) employees.value = (await eRes.json()).filter((e: any) => !e.isDeleted)
    if (iRes.ok) packagingItems.value = (await iRes.json()).filter((i: any) => !i.isDeleted)
  } catch {}
}
onMounted(loadMasterData)

// 銷售單關聯
const showSalesModal = ref(false)
const salesSearch = ref('')
const salesOrders = ref<any[]>([])
const filteredSalesOrders = computed(() => {
  const q = salesSearch.value.toLowerCase()
  if (!q) return salesOrders.value
  return salesOrders.value.filter(s => s.id.toLowerCase().includes(q) || s.customer?.name?.toLowerCase().includes(q))
})
async function loadSalesOrders() {
  try {
    const headers = { Authorization: `Bearer ${auth.token}` }
    const res = await fetch('/api/sales/orders', { headers })
    // 只顯示 packagingDone = false 的销售單
    if (res.ok) salesOrders.value = (await res.json()).filter((s: any) => !s.isDeleted && !s.packagingDone)
  } catch {}
}
watch(showSalesModal, (v) => { if (v && salesOrders.value.length === 0) loadSalesOrders(); if (v) salesSearch.value = '' })
async function linkSalesOrder(s: any) {
  try { await updatePackagingOrder(props.order.id, { salesOrderId: s.id }); toast.showToast(t('savedSuccess'), 'success'); showSalesModal.value = false; emit('refresh') }
  catch (e: any) { toast.showToast(e?.response?.data?.message || t('saveFailed'), 'error') }
}
async function unlinkSalesOrder() {
  try { await updatePackagingOrder(props.order.id, { salesOrderId: null }); toast.showToast(t('deleted'), 'success'); showSalesModal.value = false; emit('refresh') }
  catch (e: any) { toast.showToast(e?.response?.data?.message || t('saveFailed'), 'error') }
}

async function doMarkPackagingSalesDone(done: boolean) {
  try { await markPackagingSalesDone(props.order.id, done); toast.showToast(done ? t('pkgMarkDone') : t('pkgUndoMarkDone'), 'success'); emit('refresh') }
  catch (e: any) { toast.showToast(e?.response?.data?.message || t('saveFailed'), 'error') }
}

async function markPackagingDone(salesOrderId: string, done: boolean) {
  try {
    await toggleSalesPackagingDone(salesOrderId, done)
    toast.showToast(done ? t('packagingMarkedDone') : t('packagingMarkedUndone'), 'success')
    // 重載選單（標記完成後該項消失）
    salesOrders.value = []
    await loadSalesOrders()
    // 若目前關聯的销售單被標記完成，提示使用者
    if (done && props.order.salesOrderId === salesOrderId) {
      toast.showToast(t('currentSalesMarkedDone'), 'warning')
    }
  } catch (e: any) { toast.showToast(e?.response?.data?.message || t('saveFailed'), 'error') }
}

// 進貨單關聯
const showReceivingModal = ref(false)
const receivingSearch = ref('')
const receivingOrders = ref<any[]>([])
const filteredReceivingOrders = computed(() => {
  const q = receivingSearch.value.toLowerCase()
  if (!q) return receivingOrders.value
  return receivingOrders.value.filter(r => r.id.toLowerCase().includes(q) || r.receivingItem?.name?.toLowerCase().includes(q))
})
async function loadReceivingOrders() {
  try {
    const headers = { Authorization: `Bearer ${auth.token}` }
    const res = await fetch('/api/packaging/orders/available-receiving-orders', { headers })
    if (res.ok) receivingOrders.value = await res.json()
  } catch {}
}
watch(showReceivingModal, (v) => { if (v && receivingOrders.value.length === 0) loadReceivingOrders(); if (v) receivingSearch.value = '' })
async function linkReceivingOrder(r: any) {
  try { await updatePackagingOrder(props.order.id, { receivingOrderId: r.id }); toast.showToast(t('savedSuccess'), 'success'); showReceivingModal.value = false; emit('refresh') }
  catch (e: any) { toast.showToast(e?.response?.data?.message || t('saveFailed'), 'error') }
}
</script>

<style scoped>
.drawer-inner { padding: 0 0 100px; }
.drawer-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 18px 18px 14px; border-bottom: 1px solid var(--color-border); position: sticky; top: 0; background: var(--color-drawer); z-index: 10; }
.header-left { flex: 1; min-width: 0; }
.header-right { display: flex; align-items: flex-start; gap: 8px; flex-shrink: 0; }
.order-id { font-size: 15px; font-weight: 700; }
.order-meta { font-size: 12px; color: var(--color-text-muted); margin-top: 3px; }
.sales-link { display: flex; align-items: center; gap: 6px; margin-top: 6px; font-size: 12px; }
.sales-link-id { font-weight: 700; color: var(--color-accent); }
.sales-link-name { color: var(--color-text-muted); }
.sales-link-empty { margin-top: 6px; font-size: 12px; }
.muted-text { color: var(--color-text-dim); }
.btn-link-sales { background: rgba(232,130,12,0.1); border: 1px solid rgba(232,130,12,0.3); color: var(--color-accent); border-radius: 6px; padding: 5px 10px; font-size: 11px; font-weight: 600; cursor: pointer; white-space: nowrap; }
.btn-link-sales:hover { background: rgba(232,130,12,0.2); }
.btn-mark-sales-done { background: rgba(45,212,191,0.1); border: 1px solid rgba(45,212,191,0.3); color: var(--color-success); border-radius: 6px; padding: 5px 10px; font-size: 11px; font-weight: 700; cursor: pointer; white-space: nowrap; }
.btn-mark-sales-done:hover { background: rgba(45,212,191,0.2); }
.btn-undo-sales-done { background: none; border: 1px solid var(--color-text-muted); color: var(--color-text-muted); border-radius: 6px; padding: 5px 10px; font-size: 11px; cursor: pointer; white-space: nowrap; }
.accent { color: var(--color-accent); }
.danger { color: var(--color-danger); }
.btn-close { background: none; border: none; color: var(--color-text-muted); font-size: 18px; cursor: pointer; padding: 4px 8px; }
.stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px; background: var(--color-border); border-bottom: 1px solid var(--color-border); }
.stat-box { display: flex; flex-direction: column; align-items: center; padding: 12px 8px; background: var(--color-surface); }
.stat-label { font-size: 10px; color: var(--color-text-muted); text-transform: uppercase; }
.stat-value { font-size: 16px; font-weight: 700; margin-top: 4px; }
.section-title { font-size: 11px; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em; padding: 14px 18px 8px; }
.empty-block { text-align: center; padding: 20px; color: var(--color-text-muted); font-size: 14px; }
.detail-list { padding: 0 12px; display: flex; flex-direction: column; gap: 8px; }
.detail-card { background: var(--color-card); border: 1px solid var(--color-border); border-radius: 12px; padding: 14px; }
.detail-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
.detail-main { font-size: 14px; font-weight: 700; }
.detail-sub { font-size: 11px; color: var(--color-text-muted); margin-top: 2px; }
.detail-amount { font-size: 15px; font-weight: 700; flex-shrink: 0; }
.detail-nums { font-size: 12px; color: var(--color-text-muted); margin-bottom: 4px; }
.detail-meta { font-size: 11px; color: var(--color-text-dim); margin-bottom: 6px; }
.detail-notes { font-size: 12px; color: var(--color-text-muted); font-style: italic; margin-bottom: 6px; }
.detail-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.btn-sm { background: none; border: 1px solid var(--color-border); border-radius: 7px; padding: 5px 10px; font-size: 12px; color: var(--color-text-muted); cursor: pointer; transition: all 0.15s; }
.btn-sm:hover { border-color: var(--color-accent); color: var(--color-text); }
.btn-sm.danger:hover { border-color: var(--color-danger); color: var(--color-danger); }
.detail-edit { display: flex; flex-direction: column; gap: 10px; }
.edit-field { display: flex; flex-direction: column; gap: 4px; }
.field-label { font-size: 10px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.edit-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.select-btn-sm { width: 100%; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; padding: 10px 12px; font-size: 14px; color: var(--color-text); text-align: left; cursor: pointer; transition: border-color 0.15s; }
.select-btn-sm:hover { border-color: var(--color-accent); }
.select-btn-sm.num { font-weight: 700; color: var(--color-accent); text-align: center; }
.notes-input { width: 100%; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; padding: 10px 12px; font-size: 14px; color: var(--color-text); font-family: inherit; }
.notes-input:focus { outline: none; border-color: var(--color-accent); }
.edit-amount { font-size: 13px; color: var(--color-text-muted); }
.edit-actions { display: flex; gap: 8px; }
.btn-save { flex: 1; background: var(--color-accent); color: #fff; border: none; border-radius: 8px; padding: 10px; font-size: 14px; font-weight: 700; cursor: pointer; }
.btn-save:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-cancel-edit { flex: 1; background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 8px; padding: 10px; font-size: 14px; cursor: pointer; }
.add-inline { padding: 10px 12px; }
.btn-add { width: 100%; background: none; border: 1px dashed var(--color-border); border-radius: 10px; padding: 12px; font-size: 14px; font-weight: 600; color: var(--color-text-muted); cursor: pointer; transition: all 0.15s; }
.btn-add:hover { border-color: var(--color-accent); color: var(--color-accent); }
.inline-add-form { margin: 0 12px 12px; background: var(--color-surface); border: 1px solid var(--color-accent); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.drawer-footer { position: sticky; bottom: 0; display: flex; gap: 10px; padding: 14px 16px; background: var(--color-drawer); border-top: 1px solid var(--color-border); }
.btn-soft-delete, .btn-hard-delete { flex: 1; background: none; border-radius: 8px; padding: 10px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s; border: 1px solid var(--color-danger); color: var(--color-danger); }
.btn-soft-delete:hover { background: rgba(248,113,113,0.1); }
.btn-hard-delete:hover { background: var(--color-danger-bg); color: #fff; border-color: var(--color-danger-bg); }
/* 銷售單 / 進貨單 Modal */
.sales-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 400; display: flex; align-items: flex-end; }
.sales-modal { width: 100%; max-height: 70vh; background: var(--color-drawer); border-radius: 16px 16px 0 0; display: flex; flex-direction: column; }
.sales-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px; border-bottom: 1px solid var(--color-border); font-size: 15px; font-weight: 700; }
.sales-modal-header button { background: none; border: none; color: var(--color-text-muted); font-size: 18px; cursor: pointer; }
.sales-modal-search { padding: 10px 16px; border-bottom: 1px solid var(--color-border); }
.search-input { width: 100%; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; padding: 10px 14px; font-size: 14px; color: var(--color-text); font-family: inherit; }
.search-input:focus { outline: none; border-color: var(--color-accent); }
.sales-modal-list { flex: 1; overflow-y: auto; padding: 8px 12px; display: flex; flex-direction: column; gap: 6px; }
.sales-modal-item { background: var(--color-card); border: 1px solid var(--color-border); border-radius: 10px; padding: 12px 14px; cursor: pointer; transition: all 0.15s; }
.sales-modal-item:hover, .sales-modal-item.active { border-color: var(--color-accent); background: var(--color-card-hover); }
.sales-modal-item.unlink { border-color: rgba(248,113,113,0.3); }
.sales-modal-item.unlink:hover { border-color: var(--color-danger); background: rgba(248,113,113,0.08); }
.smi-id { font-size: 14px; font-weight: 700; margin-bottom: 3px; }
.smi-info { font-size: 12px; color: var(--color-text-muted); }
.smi-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.btn-mark-done { background: rgba(45,212,191,0.1); border: 1px solid rgba(45,212,191,0.3); color: var(--color-success); border-radius: 6px; padding: 5px 10px; font-size: 11px; font-weight: 700; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
.btn-mark-done:hover { background: rgba(45,212,191,0.2); }
.badge-linked { background: rgba(232,130,12,0.15); border: 1px solid rgba(232,130,12,0.3); color: var(--color-accent); border-radius: 6px; padding: 5px 10px; font-size: 11px; font-weight: 700; white-space: nowrap; flex-shrink: 0; }
.empty-modal { text-align: center; padding: 30px; color: var(--color-text-muted); font-size: 14px; }
</style>
