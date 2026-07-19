<template>
  <div class="drawer-inner" v-if="order">
    <div class="drawer-header">
      <div class="header-left">
        <div class="order-id accent">{{ order.id }}</div>
        <div class="order-meta">{{ formatDate(order.orderDate) }}</div>
      </div>
      <button class="btn-close" @click="$emit('close')">✕</button>
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
              <div class="detail-main">{{ d.supplier?.name }} × {{ d.product?.name }}</div>
              <div class="detail-sub">{{ d.supplier?.id }} · {{ d.product?.id }}</div>
            </div>
            <span class="detail-amount accent">฿{{ Number(d.amount).toLocaleString() }}</span>
          </div>
          <div class="detail-nums">{{ Number(d.quantity) }} × {{ Number(d.weight) }} kg × ฿{{ Number(d.unitPrice) }}</div>
          <div class="detail-notes" v-if="d.notes">{{ d.notes }}</div>
          <div class="detail-actions" v-if="canEdit">
            <button class="btn-sm" @click="startEdit(d)">✏️ {{ t('editDetail') }}</button>
            <button class="btn-sm danger" @click="confirmSoftDelete(d.id)">🗑 {{ t('softDelete') }}</button>
            <button class="btn-sm danger" v-if="canAdmin" @click="confirmHardDelete(d.id)">⚠️ {{ t('hardDelete') }}</button>
          </div>
        </div>

        <div v-else class="detail-edit">
          <div class="edit-field">
            <label class="field-label">{{ t('supplier') }}</label>
            <button class="select-btn-sm" @click="showSupplierModal = true">{{ editForm.supplierName || t('selectSupplier') }}</button>
          </div>
          <div class="edit-field">
            <label class="field-label">{{ t('product') }}</label>
            <button class="select-btn-sm" @click="showProductModal = true">{{ editForm.productName || t('selectProduct') }}</button>
          </div>
          <div class="edit-row">
            <div class="edit-field">
              <label class="field-label">{{ t('weight') }} (kg)</label>
              <button class="select-btn-sm num" @click="editField = 'weight'; showEditKeypad = true">{{ editForm.weight }}</button>
            </div>
            <div class="edit-field">
              <label class="field-label">{{ t('salesQty') }}</label>
              <button class="select-btn-sm num" @click="editField = 'quantity'; showEditKeypad = true">{{ editForm.quantity }}</button>
            </div>
            <div class="edit-field">
              <label class="field-label">{{ t('unitPrice') }}</label>
              <button class="select-btn-sm num" @click="editField = 'unitPrice'; showEditKeypad = true">{{ editForm.unitPrice }}</button>
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

          <TouchSelectorModal v-if="showSupplierModal" :title="t('selectSupplier')" :items="suppliers"
            :model-value="editForm.supplierId"
            @select="s => { editForm.supplierId = s.id; editForm.supplierName = s.name; showSupplierModal = false }"
            @close="showSupplierModal = false" />
          <TouchSelectorModal v-if="showProductModal" :title="t('selectProduct')" :items="products"
            :model-value="editForm.productId"
            @select="p => { editForm.productId = p.id; editForm.productName = p.name; if (p.unitWeight) { editForm.weight = String(p.unitWeight) }; showProductModal = false }"
            @close="showProductModal = false" />

          <!-- 編輯 keypad Modal -->
          <NumericInputModal :show="showEditKeypad" mode="decimal"
            :label="editField === 'weight' ? t('weight') : editField === 'quantity' ? t('salesQty') : t('unitPrice')"
            :model-value="editForm[editField]"
            @confirm="v => { editForm[editField] = v; showEditKeypad = false }"
            @close="showEditKeypad = false" />
        </div>
      </div>
    </div>

    <!-- 新增明細 -->
    <div class="add-inline" v-if="canEdit && !showInlineAdd">
      <button class="btn-add" @click="openInlineAdd">+ {{ t('addDetail') }}</button>
    </div>
    <div v-if="showInlineAdd" class="inline-add-form">
      <div class="section-title">{{ t('addDetail') }}</div>
      <div class="edit-field">
        <label class="field-label">{{ t('supplier') }}</label>
        <button class="select-btn-sm" @click="showInlineSupplierModal = true">{{ inlineForm.supplierName || t('selectSupplier') }}</button>
      </div>
      <div class="edit-field">
        <label class="field-label">{{ t('product') }}</label>
        <button class="select-btn-sm" @click="showInlineProductModal = true">{{ inlineForm.productName || t('selectProduct') }}</button>
      </div>
      <div class="edit-row">
        <div class="edit-field">
          <label class="field-label">{{ t('weight') }} (kg)</label>
          <button class="select-btn-sm num" @click="inlineField = 'weight'; showInlineKeypad = true">{{ inlineForm.weight || '-' }}</button>
        </div>
        <div class="edit-field">
          <label class="field-label">{{ t('salesQty') }}</label>
          <button class="select-btn-sm num" @click="inlineField = 'quantity'; showInlineKeypad = true">{{ inlineForm.quantity || '-' }}</button>
        </div>
        <div class="edit-field">
          <label class="field-label">{{ t('unitPrice') }}</label>
          <button class="select-btn-sm num" @click="inlineField = 'unitPrice'; showInlineKeypad = true">{{ inlineForm.unitPrice || '-' }}</button>
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

      <TouchSelectorModal v-if="showInlineSupplierModal" :title="t('selectSupplier')" :items="suppliers"
        :model-value="inlineForm.supplierId"
        @select="s => { inlineForm.supplierId = s.id; inlineForm.supplierName = s.name; showInlineSupplierModal = false }"
        @close="showInlineSupplierModal = false" />
      <TouchSelectorModal v-if="showInlineProductModal" :title="t('selectProduct')" :items="products"
        :model-value="inlineForm.productId"
        @select="p => { inlineForm.productId = p.id; inlineForm.productName = p.name; if (p.unitWeight) { inlineForm.weight = String(p.unitWeight) }; showInlineProductModal = false }"
        @close="showInlineProductModal = false" />

      <NumericInputModal :show="showInlineKeypad" mode="decimal"
        :label="inlineField === 'weight' ? t('weight') : inlineField === 'quantity' ? t('salesQty') : t('unitPrice')"
        :model-value="inlineForm[inlineField]"
        @confirm="v => { inlineForm[inlineField] = v; showInlineKeypad = false }"
        @close="showInlineKeypad = false" />
    </div>

    <div class="drawer-footer">
      <button v-if="canEdit" class="btn-soft-delete" @click="confirmSoftDeleteOrder">🗑 {{ t('softDelete') }}</button>
      <button v-if="canAdmin" class="btn-hard-delete" @click="confirmHardDeleteOrder">⚠️ {{ t('hardDelete') }}</button>
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
  createContractWorkDetail, updateContractWorkDetail,
  softDeleteContractWorkDetail, hardDeleteContractWorkDetail,
  softDeleteContractWorkOrder, hardDeleteContractWorkOrder,
} from '../../../api/contractWork'
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

function formatDate(d: string) {
  if (!d) return ''
  const [y, m, day] = d.slice(0, 10).split('-')
  return `${parseInt(day)}/${parseInt(m)}/${y.slice(2)}`
}

// 編輯
const editingId = ref<number | null>(null)
const editForm = ref<Record<string, string>>({})
const editField = ref('quantity')
const showEditKeypad = ref(false)
const showSupplierModal = ref(false)
const showProductModal = ref(false)
const saving = ref(false)
const suppliers = ref<any[]>([])
const products = ref<any[]>([])

function startEdit(d: any) {
  editingId.value = d.id
  editForm.value = {
    supplierId: d.supplierId, supplierName: d.supplier?.name || '',
    productId: d.productId, productName: d.product?.name || '',
    quantity: String(Number(d.quantity)), weight: String(Number(d.weight)),
    unitPrice: String(Number(d.unitPrice)), notes: d.notes || '',
  }
}
function calcEditAmount() {
  return Math.floor(Number(editForm.value.quantity) * Number(editForm.value.weight) * Number(editForm.value.unitPrice))
}
function pressEditKey(k: string) {
  const f = editField.value; const cur = editForm.value[f] || ''
  if (k === 'C') { editForm.value[f] = ''; return }
  if (k === '←') { editForm.value[f] = cur.slice(0, -1); return }
  if (k === '.') { if (cur.includes('.')) return; editForm.value[f] = (cur || '0') + '.'; return }
  if (!cur.includes('.') && cur === '0') { editForm.value[f] = k; return }
  if (cur.includes('.') && cur.split('.')[1].length >= 1) return
  editForm.value[f] = cur + k
}
async function saveEdit(id: number) {
  saving.value = true
  try {
    await updateContractWorkDetail(id, {
      supplierId: editForm.value.supplierId, productId: editForm.value.productId,
      quantity: Number(editForm.value.quantity), weight: Number(editForm.value.weight),
      unitPrice: Number(editForm.value.unitPrice), notes: editForm.value.notes,
    })
    toast.showToast(t('saved'), 'success'); editingId.value = null; emit('refresh')
  } catch (e: any) { toast.showToast(e?.response?.data?.message || t('saveFailed'), 'error') }
  finally { saving.value = false }
}

// 新增
const showInlineAdd = ref(false)
const showInlineSupplierModal = ref(false)
const showInlineProductModal = ref(false)
const inlineForm = ref<Record<string, string>>({ supplierId: '', supplierName: '', productId: '', productName: '', quantity: '', weight: '', unitPrice: '', notes: '' })
const inlineField = ref('quantity')
const showInlineKeypad = ref(false)
const canInline = computed(() => !!inlineForm.value.supplierId && !!inlineForm.value.productId && Number(inlineForm.value.quantity) > 0 && Number(inlineForm.value.weight) > 0 && Number(inlineForm.value.unitPrice) > 0)
function openInlineAdd() { inlineForm.value = { supplierId: '', supplierName: '', productId: '', productName: '', quantity: '', weight: '', unitPrice: '', notes: '' }; showInlineAdd.value = true }
function pressInlineKey(k: string) {
  const f = inlineField.value; const cur = inlineForm.value[f] || ''
  if (k === 'C') { inlineForm.value[f] = ''; return }
  if (k === '←') { inlineForm.value[f] = cur.slice(0, -1); return }
  if (k === '.') { if (cur.includes('.')) return; inlineForm.value[f] = (cur || '0') + '.'; return }
  if (!cur.includes('.') && cur === '0') { inlineForm.value[f] = k; return }
  if (cur.includes('.') && cur.split('.')[1].length >= 1) return
  inlineForm.value[f] = cur + k
}
async function submitInline() {
  saving.value = true
  try {
    await createContractWorkDetail({
      orderId: props.order.id,
      supplierId: inlineForm.value.supplierId, productId: inlineForm.value.productId,
      quantity: Number(inlineForm.value.quantity), weight: Number(inlineForm.value.weight),
      unitPrice: Number(inlineForm.value.unitPrice), notes: inlineForm.value.notes || undefined,
    })
    toast.showToast(t('detailAdded'), 'success'); showInlineAdd.value = false; emit('refresh')
  } catch (e: any) { toast.showToast(e?.response?.data?.message || t('saveFailed'), 'error') }
  finally { saving.value = false }
}

// 刪除
const confirmDialog = ref<{ open: boolean; message: string; onConfirm: () => void }>({ open: false, message: '', onConfirm: () => {} })
function confirmSoftDelete(id: number) {
  confirmDialog.value = { open: true, message: t('confirmDeleteDetail'), onConfirm: async () => { confirmDialog.value.open = false; try { await softDeleteContractWorkDetail(id); toast.showToast(t('deleted'), 'success'); emit('refresh') } catch (e: any) { toast.showToast(e?.response?.data?.message || t('deleteFailed'), 'error') } } }
}
function confirmHardDelete(id: number) {
  confirmDialog.value = { open: true, message: t('confirmHardDelete'), onConfirm: async () => { confirmDialog.value.open = false; try { await hardDeleteContractWorkDetail(id); toast.showToast(t('hardDeleted'), 'success'); emit('refresh') } catch (e: any) { toast.showToast(e?.response?.data?.message || t('deleteFailed'), 'error') } } }
}
function confirmSoftDeleteOrder() {
  confirmDialog.value = { open: true, message: t('confirmDeleteOrder'), onConfirm: async () => { confirmDialog.value.open = false; try { await softDeleteContractWorkOrder(props.order.id); toast.showToast(t('deleted'), 'success'); emit('refresh'); emit('close') } catch (e: any) { toast.showToast(e?.response?.data?.message || t('deleteFailed'), 'error') } } }
}
function confirmHardDeleteOrder() {
  confirmDialog.value = { open: true, message: t('confirmHardDelete'), onConfirm: async () => { confirmDialog.value.open = false; try { await hardDeleteContractWorkOrder(props.order.id); toast.showToast(t('hardDeleted'), 'success'); emit('refresh'); emit('close') } catch (e: any) { toast.showToast(e?.response?.data?.message || t('deleteFailed'), 'error') } } }
}

async function loadMasterData() {
  try {
    const headers = { Authorization: `Bearer ${auth.token}` }
    const [sRes, pRes] = await Promise.all([fetch('/api/master-data/suppliers', { headers }), fetch('/api/master-data/products', { headers })])
    if (sRes.ok) suppliers.value = (await sRes.json()).filter((s: any) => !s.isDeleted)
    if (pRes.ok) products.value = (await pRes.json()).filter((p: any) => !p.isDeleted && p.productType === 'EXPORT')
  } catch {}
}
onMounted(loadMasterData)
</script>

<style scoped>
.drawer-inner { padding: 0 0 100px; }
.drawer-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 18px 18px 14px; border-bottom: 1px solid var(--color-border); position: sticky; top: 0; background: var(--color-drawer); z-index: 10; }
.order-id { font-size: 15px; font-weight: 700; }
.order-meta { font-size: 12px; color: var(--color-text-muted); margin-top: 3px; }
.accent { color: var(--color-accent); }
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
.detail-nums { font-size: 12px; color: var(--color-text-muted); margin-bottom: 6px; }
.detail-notes { font-size: 12px; color: var(--color-text-muted); font-style: italic; margin-bottom: 6px; }
.detail-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.btn-sm { background: none; border: 1px solid var(--color-border); border-radius: 7px; padding: 5px 10px; font-size: 12px; color: var(--color-text-muted); cursor: pointer; transition: all 0.15s; }
.btn-sm:hover { border-color: var(--color-accent); color: var(--color-text); }
.btn-sm.danger:hover { border-color: var(--color-danger); color: var(--color-danger); }
.detail-edit { display: flex; flex-direction: column; gap: 10px; }
.edit-field { display: flex; flex-direction: column; gap: 4px; }
.field-label { font-size: 10px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.edit-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
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
