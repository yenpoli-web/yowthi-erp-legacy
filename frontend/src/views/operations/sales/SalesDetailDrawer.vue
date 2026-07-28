<template>
  <div class="drawer-inner" v-if="order">
    <!-- Header -->
    <div class="drawer-header">
      <div class="header-left">
        <div class="order-id accent">{{ order.id }}</div>
        <div class="order-meta">{{ formatDate(order.orderDate) }} · {{ order.customer?.name }}</div>
      </div>
      <button class="btn-close" @click="$emit('close')">✕</button>
    </div>

    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-label">{{ t('salesDetails') }}</div>
        <div class="stat-value">{{ activeDetails.length }}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">{{ t('totalQtyLabel') }}</div>
        <div class="stat-value">{{ totalQty }}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">{{ t('totalAmount') }}</div>
        <div class="stat-value accent">฿{{ totalAmount.toLocaleString() }}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">{{ t('linkedInventory') }}</div>
        <div class="stat-value">{{ order.inventoryDetails?.length ?? 0 }}</div>
      </div>
    </div>

    <!-- 包裝狀態欄 -->
    <div class="packaging-status-bar" :class="order.packagingDone ? 'done' : 'pending'">
      <div class="ps-left">
        <span class="ps-icon">{{ order.packagingDone ? '✅' : '📦' }}</span>
        <div class="ps-info">
          <div class="ps-label">{{ t('packagingStatus') }}</div>
          <div class="ps-value">{{ order.packagingDone ? t('packagingDoneLabel') : t('packagingPendingLabel') }}</div>
        </div>
      </div>
      <button v-if="canEdit" class="ps-btn" :class="order.packagingDone ? 'undo' : 'mark'" @click="togglePackaging" :disabled="togglingPkg">
        {{ order.packagingDone ? t('packagingMarkUndo') : t('markPackagingDone') }}
      </button>
    </div>

    <!-- 銷售明細 -->
    <div class="section-title">{{ t('salesDetails') }}</div>
    <div v-if="activeDetails.length === 0" class="empty-block">{{ t('noSalesOrders') }}</div>
    <div v-else class="detail-list">
      <div v-for="d in activeDetails" :key="d.id" class="detail-card">
        <div v-if="editingDetailId !== d.id" class="detail-view">
          <div class="detail-top">
            <span class="detail-product">{{ d.product?.name }}</span>
            <span class="detail-amount accent">฿{{ Number(d.amount).toLocaleString() }}</span>
          </div>
          <div class="detail-nums">
            {{ Number(d.weight) }} kg × {{ Number(d.quantity) }} × ฿{{ Number(d.unitPrice) }}
          </div>
          <div class="detail-actions" v-if="canEdit">
            <button class="btn-sm" @click="startEdit(d)">✏️ {{ t('editDetail') }}</button>
            <button class="btn-sm danger" @click="confirmSoftDelete(d.id)">🗑 {{ t('softDelete') }}</button>
            <button class="btn-sm danger" v-if="canAdmin" @click="confirmHardDelete(d.id)">⚠️ {{ t('hardDelete') }}</button>
          </div>
        </div>
        <!-- 編輯模式 -->
        <div v-else class="detail-edit">
          <div class="edit-field">
            <label class="field-label">{{ t('product') }}</label>
            <button class="select-btn-sm" :disabled="editingDetailHasInventoryLinks" @click="showProductModal = true">
              {{ editForm.productName || t('selectProduct') }}
            </button>
          </div>
          <div class="edit-row">
            <div class="edit-field">
              <label class="field-label">{{ t('weight') }}</label>
              <button class="select-btn-sm num" :disabled="editingDetailHasInventoryLinks" @click="openEditKeypad('weight')">{{ editForm.weight }}</button>
            </div>
            <div class="edit-field">
              <label class="field-label">{{ t('salesQty') }}</label>
              <button class="select-btn-sm num" :disabled="editingDetailHasInventoryLinks" @click="openEditKeypad('quantity')">{{ editForm.quantity }}</button>
            </div>
            <div class="edit-field">
              <label class="field-label">{{ t('unitPrice') }}</label>
              <button class="select-btn-sm num" @click="openEditKeypad('unitPrice')">{{ editForm.unitPrice }}</button>
            </div>
          </div>
          <div v-if="editingDetailHasInventoryLinks" class="inventory-edit-guard">
            {{ t('salesInventoryEditGuard') }}
          </div>
          <div class="edit-amount">{{ t('amount') }}：<strong class="accent">฿{{ calcEditAmount().toLocaleString() }}</strong></div>
          <div class="edit-actions">
            <button class="btn-save" @click="saveEdit(d.id)" :disabled="saving">{{ saving ? t('saving') : t('save') }}</button>
            <button class="btn-cancel-edit" @click="editingDetailId = null">{{ t('cancel') }}</button>
          </div>
          <TouchSelectorModal v-if="showProductModal" :title="t('selectProduct')" :items="products"
            :model-value="editForm.productId"
            @select="p => { editForm.productId = p.id; editForm.productName = p.name; showProductModal = false }"
            @close="showProductModal = false" />
          <NumericInputModal v-if="editKeypadField"
            :model-value="String(editForm[editKeypadField as string] ?? '')" mode="decimal"
            :label="editKeypadField === 'weight' ? t('weight') : editKeypadField === 'quantity' ? t('salesQty') : t('unitPrice')"
            @confirm="v => { if (editKeypadField) editForm[editKeypadField] = v; editKeypadField = null }"
            @close="editKeypadField = null" />
        </div>
      </div>
    </div>

    <!-- 新增明細 -->
    <div class="add-inline" v-if="canEdit && !showInlineAdd">
      <button class="btn-add" @click="showInlineAdd = true">+ {{ t('addSalesDetail') }}</button>
    </div>
    <div v-if="showInlineAdd" class="inline-add-form">
      <div class="section-title">{{ t('addSalesDetail') }}</div>
      <div class="edit-field">
        <label class="field-label">{{ t('product') }}</label>
        <button class="select-btn-sm" @click="showInlineProductModal = true">{{ inlineDetail.productName || t('selectProduct') }}</button>
      </div>
      <div class="edit-row">
        <div class="edit-field">
          <label class="field-label">{{ t('weight') }}</label>
          <button class="select-btn-sm num" @click="openInlineKeypad('weight')">{{ inlineDetail.weight || '-' }}</button>
        </div>
        <div class="edit-field">
          <label class="field-label">{{ t('salesQty') }}</label>
          <button class="select-btn-sm num" @click="openInlineKeypad('quantity')">{{ inlineDetail.quantity || '-' }}</button>
        </div>
        <div class="edit-field">
          <label class="field-label">{{ t('unitPrice') }}</label>
          <button class="select-btn-sm num" @click="openInlineKeypad('unitPrice')">{{ inlineDetail.unitPrice || '-' }}</button>
        </div>
      </div>
      <div class="edit-actions">
        <button class="btn-save" @click="submitInlineDetail" :disabled="!canInlineAdd || saving">{{ saving ? t('saving') : t('save') }}</button>
        <button class="btn-cancel-edit" @click="showInlineAdd = false">{{ t('cancel') }}</button>
      </div>
      <TouchSelectorModal v-if="showInlineProductModal" :title="t('selectProduct')" :items="products"
        :model-value="inlineDetail.productId"
        @select="p => { inlineDetail.productId = p.id; inlineDetail.productName = p.name; showInlineProductModal = false }"
        @close="showInlineProductModal = false" />
      <NumericInputModal v-if="inlineKeypadField"
        :model-value="String(inlineDetail[inlineKeypadField as string] ?? '')" mode="decimal"
        :label="inlineKeypadField === 'weight' ? t('weight') : inlineKeypadField === 'quantity' ? t('salesQty') : t('unitPrice')"
        @confirm="v => { if (inlineKeypadField) inlineDetail[inlineKeypadField] = v; inlineKeypadField = null }"
        @close="inlineKeypadField = null" />
    </div>

    <!-- 關聯入庫明細 -->
    <div class="section-title" style="margin-top: 20px;">{{ t('linkedInventory') }}</div>
    <div v-if="!order.inventoryDetails?.length" class="empty-block">{{ t('noLinkedInventory') }}</div>
    <div v-else class="inv-link-list">
      <div v-for="link in order.inventoryDetails" :key="link.id" class="inv-link-card">
        <div class="ilc-left">
          <div class="ilc-avatar">
            <img v-if="link.inventoryDetail?.product?.imageUrl" :src="link.inventoryDetail.product.imageUrl" />
            <span v-else>{{ link.inventoryDetail?.product?.name?.slice(0, 2) }}</span>
          </div>
          <div class="ilc-info">
            <div class="ilc-product accent">{{ link.inventoryDetail?.product?.name }}</div>
            <div class="ilc-order">{{ link.inventoryDetail?.order?.id }}</div>
            <div class="ilc-qty">{{ t('salesQty') }}：<strong class="accent">{{ link.quantity }} {{ t('units') }}</strong></div>
          </div>
        </div>
        <button v-if="canEdit" class="btn-remove-link" @click="confirmRemoveInventoryLink(link.id)">✕</button>
      </div>
    </div>

    <!-- 新增入庫明細關聯 -->
    <div class="add-inline" v-if="canEdit">
      <button class="btn-add" @click="openInventorySelector">+ {{ t('selectInventory') }}</button>
    </div>

    <!-- Footer -->
    <div class="drawer-footer">
      <button v-if="canEdit" class="btn-soft-delete" @click="confirmSoftDeleteOrder">🗑 {{ t('softDelete') }}</button>
      <button v-if="canAdmin" class="btn-hard-delete" @click="confirmHardDeleteOrder">⚠️ {{ t('hardDelete') }}</button>
    </div>
  </div>

  <!-- 入庫明細選擇 Modal -->
  <div v-if="showInventorySelector" class="modal-overlay" @click.self="showInventorySelector = false">
    <div class="modal-box">
      <div class="modal-header">
        <span>{{ t('selectInventory') }}</span>
        <button class="btn-close-modal" @click="showInventorySelector = false">✕</button>
      </div>
      <!-- H02 / H03 篩選 -->
      <div class="filter-row">
        <button class="type-btn" :class="{ active: invFilter === 'EXPORT' }" @click="onInvFilter('EXPORT')">H02 {{ t('exportSales') }}</button>
        <button class="type-btn" :class="{ active: invFilter === 'DOMESTIC' }" @click="onInvFilter('DOMESTIC')">H03 {{ t('domesticSales') }}</button>
      </div>
      <div class="modal-body">
        <div v-if="loadingInv" class="loading-small"><div class="spinner-small"></div></div>
        <div v-else-if="availableInvDetails.length === 0" class="empty-small">{{ t('noInventory') }}</div>
        <div v-for="d in availableInvDetails" :key="d.id" class="inv-select-card"
          :class="{ selected: pendingInvIds.has(d.id) }" @click="togglePendingInv(d.id)">
          <div class="isc-avatar">
            <img v-if="d.productImageUrl" :src="d.productImageUrl" />
            <span v-else>{{ d.productName?.slice(0, 2) }}</span>
          </div>
          <div class="isc-info">
            <div class="isc-product accent">{{ d.productName }}</div>
            <div class="isc-order">{{ d.orderId }}</div>
            <div class="isc-qty">{{ t('availableQty') }}：{{ d.availableQty }} {{ t('units') }}</div>
            <div v-if="d.unitWeight" class="isc-weight">{{ d.unitWeight }} kg/{{ t('units') }}</div>
            <div class="isc-source" :class="d.sourceType === 'contract' ? 'contract' : 'receiving'">
              {{ d.sourceType === 'contract' ? '🔧 ' + t('contractWork') : '📋 ' + t('receivingOrder') }}
            </div>
          </div>
          <div class="isc-check" v-if="pendingInvIds.has(d.id)">✓</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" @click="showInventorySelector = false">{{ t('cancel') }}</button>
        <button class="btn-primary" @click="submitInventoryLink" :disabled="pendingInvIds.size === 0 || saving">
          {{ t('confirm') }} ({{ pendingInvIds.size }})
        </button>
      </div>
    </div>
  </div>

  <ConfirmDialog v-if="confirmDialog.open" :show="confirmDialog.open"
    :title="t('confirmAction')" :message="confirmDialog.message"
    @confirm="confirmDialog.onConfirm" @cancel="confirmDialog.open = false" />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToastStore } from '../../../stores/toast'
import { useAuthStore } from '../../../stores/auth'
import {
  createSalesDetail, updateSalesDetail, softDeleteSalesDetail, hardDeleteSalesDetail,
  softDeleteSalesOrder, hardDeleteSalesOrder,
  addSalesInventoryDetails, getAvailableInventoryDetails,
  toggleSalesPackagingDone,
} from '../../../api/sales'
import { removeSalesInventoryDetailById } from '../../../api/sales'
import TouchSelectorModal from '../../../components/common/TouchSelectorModal.vue'
import NumericInputModal from '../../../components/common/NumericInputModal.vue'
import ConfirmDialog from '../../../components/common/ConfirmDialog.vue'

const { t } = useI18n()
const toast = useToastStore()
const auth = useAuthStore()

const props = defineProps<{ order: any; canEdit: boolean; canAdmin: boolean }>()
const emit = defineEmits<{ close: []; refresh: [] }>()

const activeDetails = computed(() => (props.order?.details || []).filter((d: any) => !d.isDeleted))
const totalQty = computed(() => activeDetails.value.reduce((s: number, d: any) => s + Number(d.quantity), 0))
const totalAmount = computed(() => activeDetails.value.reduce((s: number, d: any) => s + Number(d.amount), 0))

function formatDate(d: string) {
  if (!d) return ''
  try {
    const s = d.slice(0, 10); const [y, m, day] = s.split('-')
    return `${parseInt(day)}/${parseInt(m)}/${y.slice(2)}`
  } catch { return d }
}

// 明細編輯
const editingDetailId = ref<number | null>(null)
const editForm = ref<Record<string, string>>({})
const editKeypadField = ref<string | null>(null)
const showProductModal = ref(false)
const saving = ref(false)
const products = ref<any[]>([])

function hasLinkedInventory(d: any) {
  return (props.order?.inventoryDetails || []).some(
    (link: any) => link.inventoryDetail?.productId === d.productId,
  )
}

const editingDetailHasInventoryLinks = computed(() => {
  const detail = activeDetails.value.find((d: any) => d.id === editingDetailId.value)
  return detail ? hasLinkedInventory(detail) : false
})

function startEdit(d: any) {
  editingDetailId.value = d.id
  editForm.value = { productId: d.productId, productName: d.product?.name || '', weight: String(Number(d.weight)), quantity: String(Number(d.quantity)), unitPrice: String(Number(d.unitPrice)) }
}
function calcEditAmount() {
  return Math.floor(Number(editForm.value.weight) * Number(editForm.value.quantity) * Number(editForm.value.unitPrice))
}
function openEditKeypad(field: string) { editKeypadField.value = field }
async function saveEdit(id: number) {
  saving.value = true
  try {
    await updateSalesDetail(id, { productId: editForm.value.productId, weight: Number(editForm.value.weight), quantity: Number(editForm.value.quantity), unitPrice: Number(editForm.value.unitPrice) })
    toast.showToast(t('salesDetailUpdated'), 'success'); editingDetailId.value = null; emit('refresh')
  } catch (e: any) { toast.showToast(e?.response?.data?.message || t('saveFailed'), 'error') }
  finally { saving.value = false }
}

// 行內新增
const showInlineAdd = ref(false)
const showInlineProductModal = ref(false)
const inlineKeypadField = ref<string | null>(null)
const inlineDetail = ref<Record<string, string>>({ productId: '', productName: '', weight: '', quantity: '', unitPrice: '' })
const canInlineAdd = computed(() => !!inlineDetail.value.productId && Number(inlineDetail.value.weight) > 0 && Number(inlineDetail.value.quantity) > 0 && Number(inlineDetail.value.unitPrice) > 0)
function openInlineKeypad(field: string) { inlineKeypadField.value = field }
async function submitInlineDetail() {
  saving.value = true
  try {
    await createSalesDetail({ orderId: props.order.id, productId: inlineDetail.value.productId, weight: Number(inlineDetail.value.weight), quantity: Number(inlineDetail.value.quantity), unitPrice: Number(inlineDetail.value.unitPrice) })
    toast.showToast(t('salesDetailAdded'), 'success'); inlineDetail.value = { productId: '', productName: '', weight: '', quantity: '', unitPrice: '' }; showInlineAdd.value = false; emit('refresh')
  } catch (e: any) { toast.showToast(e?.response?.data?.message || t('saveFailed'), 'error') }
  finally { saving.value = false }
}

// 確認對話框
const confirmDialog = ref<{ open: boolean; message: string; onConfirm: () => void }>({ open: false, message: '', onConfirm: () => {} })
function confirmSoftDelete(id: number) {
  const detail = activeDetails.value.find((d: any) => d.id === id)
  if (detail && hasLinkedInventory(detail)) {
    toast.showToast(t('salesInventoryEditGuard'), 'error')
    return
  }
  confirmDialog.value = { open: true, message: t('confirmDeleteDetail'), onConfirm: async () => { confirmDialog.value.open = false; try { await softDeleteSalesDetail(id); toast.showToast(t('deleted'), 'success'); emit('refresh') } catch (e: any) { toast.showToast(e?.response?.data?.message || t('deleteFailed'), 'error') } } }
}
function confirmHardDelete(id: number) {
  const detail = activeDetails.value.find((d: any) => d.id === id)
  if (detail && hasLinkedInventory(detail)) {
    toast.showToast(t('salesInventoryEditGuard'), 'error')
    return
  }
  confirmDialog.value = { open: true, message: t('confirmHardDelete'), onConfirm: async () => { confirmDialog.value.open = false; try { await hardDeleteSalesDetail(id); toast.showToast(t('hardDeleted'), 'success'); emit('refresh') } catch (e: any) { toast.showToast(e?.response?.data?.message || t('deleteFailed'), 'error') } } }
}
function confirmSoftDeleteOrder() {
  confirmDialog.value = { open: true, message: t('confirmDeleteSalesOrder'), onConfirm: async () => { confirmDialog.value.open = false; try { await softDeleteSalesOrder(props.order.id); toast.showToast(t('deleted'), 'success'); emit('refresh'); emit('close') } catch (e: any) { toast.showToast(e?.response?.data?.message || t('deleteFailed'), 'error') } } }
}
function confirmHardDeleteOrder() {
  confirmDialog.value = { open: true, message: t('confirmHardDelete'), onConfirm: async () => { confirmDialog.value.open = false; try { await hardDeleteSalesOrder(props.order.id); toast.showToast(t('hardDeleted'), 'success'); emit('refresh'); emit('close') } catch (e: any) { toast.showToast(e?.response?.data?.message || t('deleteFailed'), 'error') } } }
}

// 入庫明細關聯
const showInventorySelector = ref(false)
const invFilter = ref<'EXPORT' | 'DOMESTIC'>('EXPORT')
const availableInvDetails = ref<any[]>([])
const pendingInvIds = ref(new Set<number>())
const loadingInv = ref(false)

async function openInventorySelector() {
  pendingInvIds.value = new Set()
  showInventorySelector.value = true
  await loadInvDetails()
}
async function loadInvDetails() {
  loadingInv.value = true
  try { availableInvDetails.value = (await getAvailableInventoryDetails(invFilter.value)).data }
  catch {} finally { loadingInv.value = false }
}
async function onInvFilter(type: 'EXPORT' | 'DOMESTIC') {
  invFilter.value = type; pendingInvIds.value = new Set(); await loadInvDetails()
}
function togglePendingInv(id: number) {
  const s = new Set(pendingInvIds.value); if (s.has(id)) s.delete(id); else s.add(id); pendingInvIds.value = s
}
async function submitInventoryLink() {
  saving.value = true
  try {
    const items = Array.from(pendingInvIds.value).map(id => ({ inventoryDetailId: id }))
    await addSalesInventoryDetails(props.order.id, items)
    toast.showToast(t('batchLinked'), 'success'); showInventorySelector.value = false; emit('refresh')
  } catch (e: any) { toast.showToast(e?.response?.data?.message || t('saveFailed'), 'error') }
  finally { saving.value = false }
}
function confirmRemoveInventoryLink(id: number) {
  confirmDialog.value = { open: true, message: t('confirmRemoveBatch'), onConfirm: async () => { confirmDialog.value.open = false; try { await removeSalesInventoryDetailById(id); toast.showToast(t('batchRemoved'), 'success'); emit('refresh') } catch (e: any) { toast.showToast(e?.response?.data?.message || t('deleteFailed'), 'error') } } }
}

async function loadProducts() {
  try {
    const headers = { Authorization: `Bearer ${auth.token}` }
    const res = await fetch('/api/master-data/products', { headers })
    if (res.ok) products.value = (await res.json()).filter((p: any) => !p.isDeleted)
  } catch {}
}
onMounted(loadProducts)

// 包裝狀態切換
const togglingPkg = ref(false)
async function togglePackaging() {
  togglingPkg.value = true
  try {
    const newVal = !props.order.packagingDone
    await toggleSalesPackagingDone(props.order.id, newVal)
    toast.showToast(newVal ? t('packagingMarkedDone') : t('packagingMarkedUndone'), 'success')
    emit('refresh')
  } catch (e: any) { toast.showToast(e?.response?.data?.message || t('saveFailed'), 'error') }
  finally { togglingPkg.value = false }
}
</script>

<style scoped>
.drawer-inner { padding: 0 0 100px; }
.drawer-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 18px 18px 14px; border-bottom: 1px solid var(--color-border); position: sticky; top: 0; background: var(--color-drawer); z-index: 10; }
.order-id { font-size: 15px; font-weight: 700; }
.order-meta { font-size: 12px; color: var(--color-text-muted); margin-top: 3px; }
.accent { color: var(--color-accent); }
.btn-close { background: none; border: none; color: var(--color-text-muted); font-size: 18px; cursor: pointer; padding: 4px 8px; }
/* 包裝狀態欄 */
.packaging-status-bar { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--color-border); gap: 10px; }
.packaging-status-bar.done { background: rgba(45,212,191,0.06); }
.packaging-status-bar.pending { background: rgba(232,130,12,0.04); }
.ps-left { display: flex; align-items: center; gap: 10px; }
.ps-icon { font-size: 18px; }
.ps-label { font-size: 10px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.ps-value { font-size: 13px; font-weight: 700; margin-top: 2px; }
.packaging-status-bar.done .ps-value { color: var(--color-success); }
.packaging-status-bar.pending .ps-value { color: var(--color-accent); }
.ps-btn { border-radius: 7px; padding: 7px 12px; font-size: 12px; font-weight: 700; cursor: pointer; border: 1px solid; white-space: nowrap; flex-shrink: 0; transition: all 0.15s; }
.ps-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.ps-btn.mark { background: rgba(45,212,191,0.1); border-color: rgba(45,212,191,0.3); color: var(--color-success); }
.ps-btn.mark:hover { background: rgba(45,212,191,0.2); }
.ps-btn.undo { background: rgba(248,113,113,0.08); border-color: rgba(248,113,113,0.3); color: var(--color-danger); }
.ps-btn.undo:hover { background: rgba(248,113,113,0.15); }
.stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px; background: var(--color-border); border-bottom: 1px solid var(--color-border); }
.stat-box { display: flex; flex-direction: column; align-items: center; padding: 12px 8px; background: var(--color-surface); }
.stat-label { font-size: 10px; color: var(--color-text-muted); text-transform: uppercase; }
.stat-value { font-size: 16px; font-weight: 700; margin-top: 4px; }
.section-title { font-size: 11px; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em; padding: 14px 18px 8px; }
.empty-block { text-align: center; padding: 20px; color: var(--color-text-muted); font-size: 14px; }
.detail-list { padding: 0 12px; display: flex; flex-direction: column; gap: 8px; }
.detail-card { background: var(--color-card); border: 1px solid var(--color-border); border-radius: 12px; padding: 14px; }
.detail-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.detail-product { font-size: 15px; font-weight: 700; }
.detail-amount { font-size: 15px; font-weight: 700; }
.detail-nums { font-size: 12px; color: var(--color-text-muted); margin-bottom: 10px; }
.detail-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.btn-sm { background: none; border: 1px solid var(--color-border); border-radius: 7px; padding: 5px 10px; font-size: 12px; color: var(--color-text-muted); cursor: pointer; }
.btn-sm:hover { border-color: var(--color-accent); color: var(--color-text); }
.btn-sm.danger:hover { border-color: var(--color-danger); color: var(--color-danger); }
.detail-edit { display: flex; flex-direction: column; gap: 10px; }
.edit-field { display: flex; flex-direction: column; gap: 4px; }
.field-label { font-size: 10px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; }
.edit-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.select-btn-sm { width: 100%; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; padding: 10px 12px; font-size: 14px; color: var(--color-text); text-align: left; cursor: pointer; }
.select-btn-sm.num { font-weight: 700; color: var(--color-accent); text-align: center; }
.select-btn-sm:disabled { opacity: 0.55; cursor: not-allowed; color: var(--color-text-muted); }
.inventory-edit-guard { padding: 10px 12px; border: 1px solid rgba(232,130,12,0.45); border-radius: 8px; background: rgba(232,130,12,0.08); color: var(--color-accent); font-size: 12px; line-height: 1.55; }
.edit-amount { font-size: 13px; color: var(--color-text-muted); }
.edit-actions { display: flex; gap: 8px; }
.btn-save { flex: 1; background: var(--color-accent); color: #fff; border: none; border-radius: 8px; padding: 10px; font-size: 14px; font-weight: 700; cursor: pointer; }
.btn-save:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-cancel-edit { flex: 1; background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 8px; padding: 10px; font-size: 14px; cursor: pointer; }
.add-inline { padding: 10px 12px; }
.btn-add { width: 100%; background: none; border: 1px dashed var(--color-border); border-radius: 10px; padding: 12px; font-size: 14px; font-weight: 600; color: var(--color-text-muted); cursor: pointer; }
.btn-add:hover { border-color: var(--color-accent); color: var(--color-accent); }
.inline-add-form { margin: 0 12px 12px; background: var(--color-surface); border: 1px solid var(--color-accent); border-radius: 12px; padding: 14px; }

/* 入庫明細關聯 */
.inv-link-list { padding: 0 12px; display: flex; flex-direction: column; gap: 8px; }
.inv-link-card { display: flex; align-items: center; justify-content: space-between; background: var(--color-card); border: 1px solid var(--color-border); border-radius: 10px; padding: 12px; }
.ilc-left { display: flex; align-items: center; gap: 10px; flex: 1; }
.ilc-avatar { width: 40px; height: 40px; border-radius: 8px; background: var(--color-surface); overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
.ilc-avatar img { width: 100%; height: 100%; object-fit: cover; }
.ilc-info { flex: 1; }
.ilc-product { font-size: 13px; font-weight: 700; }
.ilc-order { font-size: 11px; color: var(--color-text-muted); }
.ilc-qty { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }
.btn-remove-link { background: none; border: none; color: var(--color-danger); font-size: 16px; cursor: pointer; padding: 4px 8px; }

/* 入庫選擇 Modal */
.inv-select-card { display: flex; align-items: center; gap: 10px; background: var(--color-card); border: 2px solid var(--color-border); border-radius: 12px; padding: 12px; cursor: pointer; margin-bottom: 8px; transition: all 0.18s; }
.inv-select-card.selected { border-color: var(--color-accent); background: var(--color-card-hover); }
.isc-avatar { width: 40px; height: 40px; border-radius: 8px; overflow: hidden; background: var(--color-surface); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
.isc-avatar img { width: 100%; height: 100%; object-fit: cover; }
.isc-info { flex: 1; }
.isc-product { font-size: 14px; font-weight: 700; margin-bottom: 2px; }
.isc-order { font-size: 11px; color: var(--color-text-muted); }
.isc-qty { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }
.isc-weight { font-size: 11px; color: var(--color-accent); font-weight: 600; }
.isc-source { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 3px; }
.isc-source.contract { background: rgba(129,140,248,0.15); color: #818cf8; }
.isc-source.receiving { background: rgba(45,212,191,0.1); color: var(--color-success); }
.isc-check { color: var(--color-accent); font-size: 20px; font-weight: 700; }
.filter-row { display: flex; gap: 8px; padding: 10px 16px 8px; }
.type-btn { flex: 1; padding: 9px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; color: var(--color-text-muted); font-size: 13px; font-weight: 700; cursor: pointer; }
.type-btn.active { border-color: var(--color-accent); color: var(--color-accent); background: rgba(232,130,12,0.1); }

.drawer-footer { position: sticky; bottom: 0; display: flex; gap: 10px; padding: 14px 16px; background: var(--color-drawer); border-top: 1px solid var(--color-border); }
.btn-soft-delete, .btn-hard-delete { flex: 1; background: none; border-radius: 8px; padding: 10px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid var(--color-danger); color: var(--color-danger); }
.btn-soft-delete:hover { background: rgba(248,113,113,0.1); }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 300; display: flex; align-items: flex-end; }
.modal-box { width: 100%; max-height: 80vh; background: var(--color-drawer); border-radius: 16px 16px 0 0; display: flex; flex-direction: column; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px; border-bottom: 1px solid var(--color-border); font-size: 15px; font-weight: 700; }
.btn-close-modal { background: none; border: none; font-size: 18px; color: var(--color-text-muted); cursor: pointer; }
.modal-body { flex: 1; overflow-y: auto; padding: 12px 16px; }
.modal-footer { display: flex; gap: 10px; padding: 12px 16px; border-top: 1px solid var(--color-border); }
.btn-primary { flex: 1; background: var(--color-accent); color: #fff; border: none; border-radius: 10px; padding: 12px; font-size: 14px; font-weight: 700; cursor: pointer; }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-secondary { flex: 1; background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 10px; padding: 12px; font-size: 14px; cursor: pointer; }
.loading-small { display: flex; justify-content: center; padding: 30px; }
.spinner-small { width: 24px; height: 24px; border: 2px solid var(--color-border); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-small { text-align: center; padding: 24px; color: var(--color-text-muted); font-size: 14px; }
</style>
