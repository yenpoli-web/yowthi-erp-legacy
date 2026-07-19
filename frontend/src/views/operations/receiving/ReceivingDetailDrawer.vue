<template>
  <div class="drawer-inner" v-if="order">
    <!-- Header -->
    <div class="drawer-header">
      <div class="header-info">
        <div class="order-id">{{ order.id }}</div>
        <div class="order-meta">{{ formatDate(order.orderDate) }} · {{ order.receivingItem?.name }}</div>
      </div>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>

    <!-- 整單加工狀態 -->
    <div class="status-row">
      <div class="status-item">
        <span class="status-label">H02</span>
        <button class="status-toggle" :class="order.h02Done ? 'done' : 'pending'"
          @click="toggleH02" :disabled="!canEdit">
          {{ order.h02Done ? t('done') : t('pending') }}
        </button>
      </div>
      <div class="status-item">
        <span class="status-label">H03</span>
        <button class="status-toggle" :class="order.h03Done ? 'done' : 'pending'"
          @click="toggleH03" :disabled="!canEdit">
          {{ order.h03Done ? t('done') : t('pending') }}
        </button>
      </div>
      <div class="status-item" v-if="canEdit">
        <span class="status-label">H01</span>
        <button class="status-toggle h01-all" @click="markAllH01Done">
          {{ t('allDone') }}
        </button>
      </div>
    </div>

    <!-- 銷售狀態 -->
    <div class="sales-status-row" v-if="canEdit">
      <span class="status-label">{{ t('salesStatus') }}</span>
      <div class="sales-status-btns">
        <button
          v-if="!order.inSales && !order.salesDone"
          class="status-toggle pending"
          disabled>
          {{ t('salesNotStarted') }}
        </button>
        <button
          v-if="!order.salesDone"
          class="status-toggle"
          :class="order.inSales ? 'in-sales' : 'pending'"
          @click="toggleInSales">
          {{ order.inSales ? t('inSales') : t('markInSales') }}
        </button>
        <button
          class="status-toggle"
          :class="order.salesDone ? 'done' : 'pending'"
          @click="toggleSalesDone">
          {{ order.salesDone ? t('salesDone') : t('markSalesDone') }}
        </button>
      </div>
    </div>

    <!-- 批次區標題 -->
    <div class="section-header">
      <span class="section-title">{{ t('batches') }}</span>
      <div class="section-actions">
        <button v-if="canAdmin" class="btn-toggle-deleted"
          :class="{ active: showDeletedItems }"
          @click="toggleShowDeleted">
          🗑 {{ showDeletedItems ? t('hideDeletedInDrawer') : t('showDeletedInDrawer') }}
        </button>
        <button v-if="canEdit" class="btn-add-batch-top" @click="$emit('addDetail', props.order)">
          + {{ t('addDetail') }}
        </button>
      </div>
    </div>

    <div v-if="visibleBatches.length === 0" class="empty-small">{{ t('noBatches') }}</div>

    <div v-for="batch in visibleBatches" :key="batch.id"
      class="batch-card" :class="{ 'batch-deleted': batch.isDeleted }">

      <!-- 批次 Header -->
      <div class="batch-header">
        <div class="batch-info">
          <span class="batch-farmer">{{ batch.farmer?.name }}</span>
          <span class="batch-farmer-id">{{ batch.farmer?.id }}</span>
          <span class="batch-id-text">{{ batch.id }}</span>
        </div>
        <div class="batch-actions">
          <!-- 已刪除批次 -->
          <template v-if="batch.isDeleted">
            <span class="badge badge-deleted">🗑 {{ t('softDelete') }}</span>
            <button v-if="canAdmin" class="btn-sm danger" @click="confirmHardDeleteBatch(batch.id)">
              ⚠️ {{ t('hardDelete') }}
            </button>
          </template>
          <!-- 正常批次 -->
          <template v-else>
            <span class="badge" :class="batch.processingDone ? 'badge-done' : 'badge-pending'">
              H01 {{ batch.processingDone ? '✓' : t('pending') }}
            </span>
            <button v-if="canEdit" class="btn-icon-sm" @click="toggleBatchDone(batch)">⚙</button>
            <button v-if="canEdit" class="btn-sm danger" @click="confirmSoftDeleteBatch(batch.id)">🗑 {{ t('softDelete') }}</button>
          </template>
        </div>
      </div>

      <!-- 明細列表 -->
      <div class="details-table" v-if="visibleDetails(batch).length">
        <div v-for="detail in visibleDetails(batch)" :key="detail.id"
          class="detail-row" :class="{ 'detail-deleted': detail.isDeleted }">
          <div class="detail-stats">
            <div class="detail-stat">
              <span class="stat-label">{{ t('quantity') }}</span>
              <span class="stat-value">{{ detail.quantity }}</span>
            </div>
            <div class="detail-stat">
              <span class="stat-label">{{ t('unitPrice') }}</span>
              <span class="stat-value">{{ detail.unitPrice }}</span>
            </div>
            <div class="detail-stat">
              <span class="stat-label">{{ t('amount') }}</span>
              <span class="stat-value accent">{{ detail.amount }}</span>
            </div>
          </div>
          <div class="detail-actions">
            <template v-if="detail.isDeleted">
              <button v-if="canAdmin" class="btn-sm danger" @click="confirmHardDeleteDetail(detail.id)">
                ⚠️ {{ t('hardDelete') }}
              </button>
            </template>
            <template v-else-if="canEdit && !batch.isDeleted">
              <button class="btn-sm" @click="openEditDetail(detail, batch.id)">✏️ {{ t('editDetail') }}</button>
            </template>
          </div>
        </div>
      </div>
      <div v-else class="empty-small">{{ t('noDetails') }}</div>
    </div>

    <!-- Footer 刪除主單 -->
    <div class="drawer-footer">
      <button v-if="canEdit" class="btn-danger-outline" @click="confirmSoftDeleteOrder">
        🗑 {{ t('softDelete') }}
      </button>
      <button v-if="canAdmin" class="btn-danger-solid" @click="confirmHardDeleteOrderAction">
        ⚠️ {{ t('hardDelete') }}
      </button>
    </div>

    <!-- 編輯明細 mini form -->
    <div v-if="detailForm.open" class="mini-form-overlay" @click.self="detailForm.open = false">
      <div class="mini-form">
        <div class="mini-form-title">{{ t('editDetail') }}</div>
        <div class="mini-field">
          <span class="field-label">{{ t('quantity') }}</span>
          <div class="num-input" @click="activeNumField = 'qty'">{{ detailForm.quantity || '0' }}</div>
        </div>
        <div class="mini-field">
          <span class="field-label">{{ t('unitPrice') }}</span>
          <div class="num-input" @click="activeNumField = 'price'">{{ detailForm.unitPrice || '0' }}</div>
        </div>
        <div v-if="detailForm.quantity && detailForm.unitPrice" class="amount-preview">
          {{ t('amount') }}：{{ Math.floor(parseFloat(detailForm.quantity) * parseFloat(detailForm.unitPrice)) }}
        </div>
        <div class="mini-form-actions">
          <button class="btn-primary" @click="submitDetail">{{ t('confirm') }}</button>
          <button class="btn-secondary" @click="detailForm.open = false">{{ t('cancel') }}</button>
        </div>
      </div>
    </div>

    <NumericInputModal
      :show="activeNumField === 'qty'"
      :model-value="detailForm.quantity"
      mode="decimal"
      :label="t('quantity')"
      @confirm="v => { detailForm.quantity = v; activeNumField = '' }"
      @close="activeNumField = ''"
    />
    <NumericInputModal
      :show="activeNumField === 'price'"
      :model-value="detailForm.unitPrice"
      mode="decimal"
      :label="t('unitPrice')"
      @confirm="v => { detailForm.unitPrice = v; activeNumField = '' }"
      @close="activeNumField = ''"
    />

    <!-- 確認 Dialog -->
    <ConfirmDialog
      v-if="confirmDialog.open"
      :show="confirmDialog.open"
      :title="t('confirmAction')"
      :message="confirmDialog.message"
      @confirm="confirmDialog.onConfirm()"
      @cancel="confirmDialog.open = false"
    />
  </div>
  <div v-else class="loading-state"><div class="spinner"></div></div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useReceivingStore } from '../../../stores/receiving'
import { useToastStore } from '../../../stores/toast'
import { useI18n } from 'vue-i18n'
import ConfirmDialog from '../../../components/common/ConfirmDialog.vue'
import NumericInputModal from '../../../components/common/NumericInputModal.vue'
import * as api from '../../../api/receiving'
import { markSalesDone, markInSales } from '../../../api/receiving'

const props = defineProps<{ order: any; canEdit: boolean; canAdmin: boolean }>()
const emit = defineEmits(['close', 'refresh', 'addDetail'])

const { t } = useI18n()
const store = useReceivingStore()
const toast = useToastStore()

const activeNumField = ref('')
const showDeletedItems = ref(false)

const detailForm = reactive({
  open: false,
  batchId: '',
  detailId: 0,
  quantity: '',
  unitPrice: '',
})

const confirmDialog = reactive({
  open: false,
  message: '',
  onConfirm: () => {},
})

// ── 計算：顯示哪些批次 ──
const visibleBatches = computed(() => {
  if (!props.order?.batches) return []
  if (showDeletedItems.value) return props.order.batches
  return props.order.batches.filter((b: any) => !b.isDeleted)
})

// ── 計算：某批次顯示哪些明細 ──
function visibleDetails(batch: any) {
  if (!batch.details) return []
  if (showDeletedItems.value) return batch.details
  return batch.details.filter((d: any) => !d.isDeleted)
}

async function toggleShowDeleted() {
  showDeletedItems.value = !showDeletedItems.value
  if (showDeletedItems.value) {
    // 重新載入含已刪除資料的完整進貨單
    try {
      const full = await api.fetchOrderWithDeleted(props.order.id)
      store.currentOrder = full
    } catch (e: any) {
      toast.showToast(e?.message || t('saveFailed'), 'error')
    }
  } else {
    await store.loadOrder(props.order.id)
  }
}

function formatDate(d: string) {
  try {
    const s = d.slice(0, 10)
    const [y, m, day] = s.split('-')
    return `${parseInt(day)}/${parseInt(m)}/${y.slice(2)}`
  } catch { return d }
}

// ── H01/H02/H03 狀態切換 ──
async function toggleH02() {
  if (!props.canEdit) return
  await store.patchOrder(props.order.id, { h02Done: !props.order.h02Done })
  emit('refresh')
  toast.showToast(t('saved'), 'success')
}
async function toggleH03() {
  if (!props.canEdit) return
  await store.patchOrder(props.order.id, { h03Done: !props.order.h03Done })
  emit('refresh')
  toast.showToast(t('saved'), 'success')
}
async function toggleInSales() {
  if (!props.canEdit) return
  await markInSales(props.order.id, !props.order.inSales)
  emit('refresh')
  toast.showToast(t('saved'), 'success')
}
async function toggleSalesDone() {
  if (!props.canEdit) return
  await markSalesDone(props.order.id, !props.order.salesDone)
  emit('refresh')
  toast.showToast(t('saved'), 'success')
}
async function toggleBatchDone(batch: any) {
  await store.patchBatch(batch.id, { processingDone: !batch.processingDone })
  emit('refresh')
  toast.showToast(t('saved'), 'success')
}
async function markAllH01Done() {
  const pending = props.order.batches?.filter((b: any) => !b.processingDone && !b.isDeleted) || []
  if (pending.length === 0) { toast.showToast(t('allAlreadyDone'), 'success'); return }
  await Promise.all(pending.map((b: any) => store.patchBatch(b.id, { processingDone: true })))
  emit('refresh')
  toast.showToast(t('allH01Done'), 'success')
}

// ── 明細編輯 ──
function openEditDetail(detail: any, batchId: string) {
  detailForm.open = true
  detailForm.batchId = batchId
  detailForm.detailId = detail.id
  detailForm.quantity = String(detail.quantity)
  detailForm.unitPrice = String(detail.unitPrice)
}
async function submitDetail() {
  await store.patchDetail(detailForm.detailId, {
    quantity: parseFloat(detailForm.quantity),
    unitPrice: parseFloat(detailForm.unitPrice),
  })
  toast.showToast(t('saved'), 'success')
  detailForm.open = false
  emit('refresh')
}

// ── 軟刪 ──
function confirmSoftDeleteBatch(id: string) {
  confirmDialog.message = t('confirmDeleteBatch')
  confirmDialog.onConfirm = async () => {
    try {
      await store.removeBatch(id)
      confirmDialog.open = false
      emit('refresh')
      toast.showToast(t('deleted'), 'success')
    } catch (e: any) {
      toast.showToast(e?.message || t('deleteFailed'), 'error')
      confirmDialog.open = false
    }
  }
  confirmDialog.open = true
}

function confirmSoftDeleteDetail(id: number) {
  confirmDialog.message = t('confirmDeleteDetail')
  confirmDialog.onConfirm = async () => {
    try {
      await store.removeDetail(id)
      confirmDialog.open = false
      emit('refresh')
      toast.showToast(t('deleted'), 'success')
    } catch (e: any) {
      toast.showToast(e?.message || t('deleteFailed'), 'error')
      confirmDialog.open = false
    }
  }
  confirmDialog.open = true
}

function confirmSoftDeleteOrder() {
  confirmDialog.message = t('confirmDeleteOrder')
  confirmDialog.onConfirm = async () => {
    try {
      await store.removeOrder(props.order.id)
      confirmDialog.open = false
      emit('close')
      emit('refresh')
      toast.showToast(t('deleted'), 'success')
    } catch (e: any) {
      toast.showToast(e?.message || t('deleteFailed'), 'error')
      confirmDialog.open = false
    }
  }
  confirmDialog.open = true
}

// ── 硬刪 ──
function confirmHardDeleteBatch(id: string) {
  confirmDialog.message = t('confirmHardDeleteBatch')
  confirmDialog.onConfirm = async () => {
    try {
      await api.hardDeleteBatch(id)
      confirmDialog.open = false
      // 重新載入含已刪除資料（維持顯示模式）
      const full = await api.fetchOrderWithDeleted(props.order.id)
      store.currentOrder = full
      toast.showToast(t('hardDeleted'), 'success')
    } catch (e: any) {
      toast.showToast(e?.message || t('deleteFailed'), 'error')
      confirmDialog.open = false
    }
  }
  confirmDialog.open = true
}

function confirmHardDeleteDetail(id: number) {
  confirmDialog.message = t('confirmHardDeleteDetail')
  confirmDialog.onConfirm = async () => {
    try {
      await api.hardDeleteDetail(id)
      confirmDialog.open = false
      const full = await api.fetchOrderWithDeleted(props.order.id)
      store.currentOrder = full
      toast.showToast(t('hardDeleted'), 'success')
    } catch (e: any) {
      toast.showToast(e?.message || t('deleteFailed'), 'error')
      confirmDialog.open = false
    }
  }
  confirmDialog.open = true
}

function confirmHardDeleteOrderAction() {
  confirmDialog.message = t('confirmHardDelete')
  confirmDialog.onConfirm = async () => {
    try {
      await api.hardDeleteOrder(props.order.id)
      await store.loadOrders()
      confirmDialog.open = false
      emit('close')
      toast.showToast(t('hardDeleted'), 'success')
    } catch (e: any) {
      toast.showToast(e?.message || t('deleteFailed'), 'error')
      confirmDialog.open = false
    }
  }
  confirmDialog.open = true
}
</script>

<style scoped>
.drawer-inner { display: flex; flex-direction: column; min-height: 100%; position: relative; }

.drawer-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 20px 20px 12px; border-bottom: 1px solid var(--color-border);
  position: sticky; top: 0; background: var(--color-drawer); z-index: 10;
}
.order-id { font-size: 15px; font-weight: 700; color: var(--color-accent); }
.order-meta { font-size: 13px; color: var(--color-text-muted); margin-top: 2px; }
.close-btn { background: none; border: none; color: var(--color-text-muted); font-size: 18px; cursor: pointer; padding: 4px 8px; }

.status-row {
  display: flex; gap: 10px; padding: 12px 20px; flex-wrap: wrap;
  border-bottom: 1px solid var(--color-border);
}
.status-item { display: flex; flex-direction: column; gap: 4px; }
.status-label { font-size: 11px; color: var(--color-text-muted); text-transform: uppercase; font-weight: 600; }
.status-toggle {
  padding: 5px 12px; border-radius: 6px; border: none;
  font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap;
}
.status-toggle.done { background: rgba(45,212,191,0.2); color: var(--color-success); }
.status-toggle.pending { background: var(--color-surface); color: var(--color-text-muted); }
.status-toggle.h01-all { background: rgba(232,130,12,0.15); color: var(--color-accent); }
.status-toggle.in-sales { background: rgba(99,179,237,0.2); color: #63b3ed; }
.status-toggle:disabled { opacity: 0.5; cursor: default; }

.sales-status-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 20px; border-bottom: 1px solid var(--color-border); flex-wrap: wrap;
}
.sales-status-btns { display: flex; gap: 8px; flex-wrap: wrap; }

.section-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 20px 8px;
}
.section-title { font-size: 12px; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.section-actions { display: flex; gap: 8px; align-items: center; }

.btn-toggle-deleted {
  background: none; border: 1px solid var(--color-border);
  color: var(--color-text-muted); border-radius: 8px;
  padding: 4px 10px; font-size: 11px; font-weight: 600; cursor: pointer;
  transition: all 0.15s;
}
.btn-toggle-deleted.active {
  border-color: var(--color-danger);
  color: var(--color-danger);
  background: rgba(248,113,113,0.08);
}
.btn-add-batch-top {
  background: none; border: 1px solid var(--color-accent);
  color: var(--color-accent); border-radius: 8px;
  padding: 5px 12px; font-size: 12px; font-weight: 600; cursor: pointer;
}

.batch-card {
  margin: 0 12px 10px;
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: 10px; padding: 12px; transition: all 0.15s;
}
.batch-deleted {
  opacity: 0.6; border-style: dashed;
  border-color: var(--color-danger);
}

.batch-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.batch-farmer { font-size: 14px; font-weight: 700; color: var(--color-text); }
.batch-farmer-id {
  font-size: 10px; font-weight: 700; color: var(--color-text-muted);
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: 4px; padding: 1px 6px; margin-left: 6px;
}
.batch-id-text { font-size: 11px; color: var(--color-text-muted); display: block; }
.batch-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }

.details-table { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }

.detail-row {
  display: flex; justify-content: space-between; align-items: center;
  background: var(--color-card); border: 1px solid var(--color-border);
  border-radius: 8px; padding: 8px 10px;
  transition: all 0.15s;
}
.detail-deleted {
  opacity: 0.5;
}
.detail-deleted .detail-stats {
  text-decoration: line-through;
}

.detail-stats {
  display: flex; gap: 0; flex: 1;
  background: var(--color-surface); border-radius: 6px;
  border: 1px solid var(--color-border); overflow: hidden;
}
.detail-stat {
  display: flex; flex-direction: column; align-items: center;
  gap: 3px; flex: 1; padding: 6px 4px;
  border-right: 1px solid var(--color-border);
}
.detail-stat:last-child { border-right: none; }
.stat-label { font-size: 10px; color: var(--color-text-muted); text-transform: uppercase; text-align: center; }
.stat-value { font-size: 14px; font-weight: 700; color: var(--color-text); }
.stat-value.accent { color: var(--color-accent); }

.detail-actions { display: flex; gap: 4px; margin-left: 8px; flex-shrink: 0; }

.badge { font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 5px; }
.badge-done { background: rgba(45,212,191,0.15); color: var(--color-success); }
.badge-pending { background: rgba(121,134,168,0.15); color: var(--color-text-muted); }
.badge-deleted { background: rgba(248,113,113,0.12); color: var(--color-danger); }

.btn-icon-sm {
  background: none; border: 1px solid var(--color-border);
  border-radius: 6px; padding: 3px 7px; font-size: 12px; cursor: pointer; color: var(--color-text-muted);
}

.btn-sm {
  background: none; border: 1px solid var(--color-border);
  border-radius: 7px; padding: 5px 10px; font-size: 12px; cursor: pointer; color: var(--color-text-muted);
  transition: all 0.15s; white-space: nowrap;
}
.btn-sm:hover { border-color: var(--color-accent); color: var(--color-text); }
.btn-sm.danger { color: var(--color-danger); border-color: var(--color-danger); }
.btn-sm.danger:hover { background: var(--color-danger-bg); color: #fff; border-color: var(--color-danger-bg); }

.drawer-footer { display: flex; gap: 10px; padding: 16px 20px; border-top: 1px solid var(--color-border); margin-top: auto; }
.btn-danger-outline { background: none; border: 1px solid var(--color-danger); color: var(--color-danger); border-radius: 10px; padding: 10px 20px; font-size: 14px; cursor: pointer; }
.btn-danger-solid { background: var(--color-danger-bg); border: none; color: #fff; border-radius: 10px; padding: 10px 20px; font-size: 14px; cursor: pointer; }

.mini-form-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 300; display: flex; align-items: flex-end; justify-content: center; }
.mini-form { background: var(--color-card); border-radius: 16px 16px 0 0; width: 100%; max-width: 480px; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
.mini-form-title { font-size: 15px; font-weight: 700; color: var(--color-text); }
.mini-field { display: flex; flex-direction: column; gap: 6px; }
.num-input { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; padding: 12px 14px; font-size: 20px; font-weight: 700; color: var(--color-accent); cursor: pointer; text-align: center; min-height: 52px; }
.num-input:hover { border-color: var(--color-accent); }
.amount-preview { text-align: center; font-size: 14px; color: var(--color-text-muted); }
.mini-form-actions { display: flex; gap: 8px; margin-top: 4px; }

.field-label { font-size: 12px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.btn-primary { background: var(--color-accent); color: #fff; border: none; border-radius: 8px; padding: 11px 22px; font-size: 14px; font-weight: 600; cursor: pointer; flex: 1; }
.btn-secondary { background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 8px; padding: 11px 22px; font-size: 14px; cursor: pointer; }

.empty-small { font-size: 13px; color: var(--color-text-muted); padding: 8px 20px; }
.loading-state { display: flex; justify-content: center; padding: 60px; }
.spinner { width: 32px; height: 32px; border: 3px solid var(--color-border); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
