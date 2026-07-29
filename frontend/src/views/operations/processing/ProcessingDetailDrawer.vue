<template>
  <div class="drawer-inner" v-if="order">
    <!-- 固定不捲動區：Header + 狀態 + 新增明細按鈕 -->
    <div class="drawer-sticky-top">
    <!-- Header -->
    <div class="drawer-header">
      <div class="header-info">
        <div class="order-no">{{ order.orderNo }}</div>
        <div class="order-meta-row">
          <div class="order-meta">{{ formatDate(order.orderDate) }} · {{ order.receivingItem?.name }}</div>
          <button v-if="canChangeDate" class="btn-edit-date" @click="openDateEdit">✎ {{ t('changeDate') }}</button>
        </div>
      </div>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>

    <!-- H01/H02/H03 完成狀態（手動切換）-->
    <div class="status-row">
      <div class="status-item">
        <span class="status-label">H01</span>
        <button class="status-toggle"
          :class="getH01StatusLabel() === 'done' ? 'done' : getH01StatusLabel() === 'partial' ? 'partial' : 'pending'"
          disabled>
          {{ getH01StatusLabel() === 'done' ? t('done') : getH01StatusLabel() === 'partial' ? '部分' : getH01StatusLabel() === 'none' ? '-' : t('pending') }}
        </button>
      </div>
      <div class="status-item" v-for="type in ['H02','H03']" :key="type">
        <span class="status-label">{{ type }}</span>
        <button class="status-toggle"
          :class="getTypeStatus(type) ? 'done' : 'pending'"
          disabled>
          {{ getTypeStatus(type) ? t('done') : t('pending') }}
        </button>
      </div>
    </div>

    <!-- 明細區標題 -->
    <div class="section-header">
      <span class="section-title">{{ t('details') }}</span>
      <div class="section-actions">
        <button v-if="canAdmin" class="btn-toggle-deleted"
          :class="{ active: showDeleted }"
          @click="toggleShowDeleted">
          🗑 {{ showDeleted ? t('hideDeletedInDrawer') : t('showDeletedInDrawer') }}
        </button>
        <button v-if="canEdit" class="btn-add" @click="$emit('addDetail', order)">
          + {{ t('addDetail') }}
        </button>
      </div>
    </div>
    </div>
    <!-- 固定區結束，以下為可捲動明細列表 -->

    <div v-if="visibleDetails.length === 0" class="empty-small">{{ t('noDetails') }}</div>

    <!-- 明細卡片 -->
    <div v-for="detail in visibleDetails" :key="detail.id"
      class="detail-card" :class="{ 'detail-deleted': detail.isDeleted }">

      <!-- 明細 Header -->
      <div class="detail-header">
        <span class="type-badge" :class="`badge-${detail.itemId?.toLowerCase()}`">
          {{ detail.itemId }}
        </span>
        <span class="employee-info">
          {{ detail.employee?.name }}
          <span class="employee-id">{{ detail.employeeId }}</span>
        </span>
        <template v-if="detail.itemId === 'H01' && detail.farmer">
          <span class="header-divider">|</span>
          <span class="farmer-inline">
            {{ detail.farmer.name }}
            <span class="farmer-id-tag">{{ detail.farmerId }}</span>
          </span>
        </template>
        <div class="detail-header-actions">
          <span v-if="detail.batch?.orderId || detail.receivingOrderId" class="source-tag">
            {{ formatBatchSource(detail.batch?.orderId || detail.receivingOrderId) }}
          </span>
          <template v-if="detail.isDeleted">
            <span class="badge-deleted">🗑</span>
            <button v-if="canAdmin" class="btn-sm danger"
              @click="confirmHardDeleteDetail(detail.id)">
              ⚠️ {{ t('hardDelete') }}
            </button>
          </template>
          <template v-else-if="canEdit">
            <button class="btn-sm" @click="openEditDetail(detail)">✏️ {{ t('editDetail') }}</button>
            <button class="btn-sm danger" @click="confirmSoftDeleteDetail(detail.id)">🗑 {{ t('softDelete') }}</button>
          </template>
        </div>
      </div>

      <!-- 明細 Stat Grid：完成品 / 不良品（H01）/ 金額 -->
      <div class="detail-stats" :class="{ 'stats-deleted': detail.isDeleted }">
        <div class="detail-stat">
          <span class="stat-label">{{ t('outputQtyLabel') }}</span>
          <span class="stat-value">{{ detail.outputQty }}</span>
        </div>
        <div class="detail-stat" v-if="detail.itemId === 'H01'">
          <span class="stat-label">{{ t('defectQtyLabel') }}</span>
          <span class="stat-value">{{ detail.defectQty }}</span>
        </div>
        <div class="detail-stat">
          <span class="stat-label">{{ t('amount') }}</span>
          <span class="stat-value accent">{{ formatDetailWage(detail) }}</span>
        </div>
      </div>
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

    <!-- 確認 Dialog -->
    <ConfirmDialog
      v-if="confirmDialog.open"
      :show="confirmDialog.open"
      :title="t('confirmAction')"
      :message="confirmDialog.message"
      @confirm="confirmDialog.onConfirm()"
      @cancel="confirmDialog.open = false"
    />

    <!-- 修改日期 overlay（Teleport 至 body，避免受 .drawer 滑動容器 transform 影響导致位置錯位） -->
    <Teleport to="body">
    <div v-if="showDateEdit" class="edit-overlay" @click.self="showDateEdit = false">
      <div class="edit-panel">
        <div class="edit-title">{{ t('changeDate') }}</div>
        <input type="date" v-model="editDateValue" class="date-input" />
        <div class="edit-actions">
          <button class="btn-primary" @click="saveDateEdit" :disabled="dateSaving">{{ t('confirm') }}</button>
          <button class="btn-secondary" @click="showDateEdit = false">{{ t('cancel') }}</button>
        </div>
      </div>
    </div>
    </Teleport>

    <!-- 編輯明細 overlay（同樣 Teleport 至 body） -->
    <Teleport to="body">
    <div v-if="editingDetail" class="edit-overlay">
      <div class="edit-panel">
        <div class="edit-title">{{ t('editDetail') }}</div>
        <div class="edit-field">
          <span class="field-label">{{ t('outputQtyLabel') }}</span>
          <div class="num-input" @click="activeEditField = 'outputQty'">{{ editForm.outputQty || '0' }}</div>
        </div>
        <div class="edit-field" v-if="editingDetail.itemId === 'H01'">
          <span class="field-label">{{ t('defectQtyLabel') }}</span>
          <div class="num-input" @click="activeEditField = 'defectQty'">{{ editForm.defectQty || '0' }}</div>
        </div>
        <div class="edit-field">
          <span class="field-label">{{ t('wageRateLabel') }}</span>
          <div class="num-input" @click="activeEditField = 'wageRate'">{{ editForm.wageRate || '0' }}</div>
        </div>
        <div class="edit-actions">
          <button class="btn-primary" @click="saveEditDetail" :disabled="editSaving">{{ t('confirm') }}</button>
          <button class="btn-secondary" @click="cancelEdit">{{ t('cancel') }}</button>
        </div>
      </div>
      <NumericInputModal :show="activeEditField === 'outputQty'" mode="decimal"
        :label="t('outputQtyLabel')"
        :model-value="editForm.outputQty"
        @confirm="v => { editForm.outputQty = v; activeEditField = '' }"
        @close="activeEditField = ''" />
      <NumericInputModal :show="activeEditField === 'defectQty'" mode="decimal"
        :label="t('defectQtyLabel')"
        :model-value="editForm.defectQty"
        @confirm="v => { editForm.defectQty = v; activeEditField = '' }"
        @close="activeEditField = ''" />
      <NumericInputModal :show="activeEditField === 'wageRate'" mode="decimal"
        :label="t('wageRateLabel')"
        :model-value="editForm.wageRate"
        @confirm="v => { editForm.wageRate = v; activeEditField = '' }"
        @close="activeEditField = ''" />
    </div>
    </Teleport>
  </div>
  <div v-else class="loading-state"><div class="spinner"></div></div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useProcessingStore } from '../../../stores/processing'
import { useAuthStore } from '../../../stores/auth'
import { useToastStore } from '../../../stores/toast'
import { useI18n } from 'vue-i18n'
import ConfirmDialog from '../../../components/common/ConfirmDialog.vue'
import NumericInputModal from '../../../components/common/NumericInputModal.vue'
import * as api from '../../../api/processing'

const props = defineProps<{ order: any; canEdit: boolean; canAdmin: boolean }>()
const emit = defineEmits(['close', 'refresh', 'addDetail'])

const { t } = useI18n()
const store = useProcessingStore()
const auth = useAuthStore()
const toast = useToastStore()

const canChangeDate = computed(() => ['ADMIN', 'OFFICE'].includes(auth.user?.role))

const showDeleted = ref(false)
const loading = ref(false)
const editingDetail = ref<any>(null)
const editSaving = ref(false)
const activeEditField = ref('')
const editForm = reactive({ outputQty: '', defectQty: '', wageRate: '' })

const showDateEdit = ref(false)
const editDateValue = ref('')
const dateSaving = ref(false)

function openDateEdit() {
  editDateValue.value = props.order.orderDate?.slice(0, 10) || ''
  showDateEdit.value = true
}

async function saveDateEdit() {
  if (!editDateValue.value) return
  dateSaving.value = true
  try {
    await api.updateProcessingOrderDate(props.order.id, editDateValue.value)
    showDateEdit.value = false
    await store.loadOrder(props.order.id)
    emit('refresh')
    toast.showToast(t('dateSaved'), 'success')
  } catch (e: any) {
    toast.showToast(e?.response?.data?.message || t('saveFailed'), 'error')
  } finally {
    dateSaving.value = false
  }
}

const confirmDialog = reactive({
  open: false,
  message: '',
  onConfirm: () => {},
})

function formatDate(d: string) {
  try {
    const s = d.slice(0, 10)
    const [y, m, day] = s.split('-')
    return `${parseInt(day)}/${parseInt(m)}/${y.slice(2)}`
  } catch { return d }
}

function formatDetailWage(detail: any) {
  const amount = Number(detail.exactWageAmount ?? detail.amount)
  return amount.toLocaleString(undefined, {
    maximumFractionDigits: detail.wageCalculationVersion === 2 ? 5 : 0,
  })
}

function formatBatchSource(orderId: string) {
  // orderId 格式：S-YYYYMMDD-N，轉為 D/M/YY (N)
  try {
    const parts = orderId.split('-')
    const dateStr = parts[1] // YYYYMMDD
    const n = parts[2]       // N
    const y = dateStr.slice(2, 4)
    const m = parseInt(dateStr.slice(4, 6))
    const d = parseInt(dateStr.slice(6, 8))
    return `${d}/${m}/${y} (${n})`
  } catch { return orderId }
}

// ── 可見明細 ──
const visibleDetails = computed(() => {
  if (!props.order?.details) return []
  const list = showDeleted.value
    ? props.order.details
    : props.order.details.filter((d: any) => !d.isDeleted)
  // 新明細在上：依 id 由大到小排序（新建立的 id 較大）
  return [...list].sort((a: any, b: any) => b.id - a.id)
})

function getTypeStatus(type: string) {
  if (!props.order?.details) return false
  const details = props.order.details.filter((d: any) => d.itemId === type && !d.isDeleted)
  if (details.length === 0) return false
  if (type === 'H01') {
    return details.every((d: any) => d.batch?.processingDone === true)
  }
  if (type === 'H02') {
    return details.some((d: any) => d.receivingOrder?.h02Done === true)
  }
  if (type === 'H03') {
    return details.some((d: any) => d.receivingOrder?.h03Done === true)
  }
  return false
}

function getH01StatusLabel(): string {
  if (!props.order?.details) return 'none'
  const details = props.order.details.filter((d: any) => d.itemId === 'H01' && !d.isDeleted)
  if (details.length === 0) return 'none'
  const allDone = details.every((d: any) => d.batch?.processingDone === true)
  const anyDone = details.some((d: any) => d.batch?.processingDone === true)
  if (allDone) return 'done'
  if (anyDone) return 'partial'
  return 'pending'
}

async function toggleTypeStatus(type: string) {
  toast.showToast(`請至進貨系統手動切換 ${type} 完成狀態`, 'success')
}

async function toggleShowDeleted() {
  showDeleted.value = !showDeleted.value
  if (showDeleted.value) {
    loading.value = true
    try {
      // 需要後端支援 includeDeleted 參數
      const res = await api.getProcessingOrder(props.order.id, true)
      store.currentOrder = res.data
    } catch {}
    loading.value = false
  } else {
    await store.loadOrder(props.order.id)
  }
}

// ── 編輯明細 ──
function openEditDetail(detail: any) {
  editingDetail.value = detail
  editForm.outputQty = String(detail.outputQty)
  editForm.defectQty = String(detail.defectQty || 0)
  editForm.wageRate = String(detail.wageRate)
  activeEditField.value = ''
}

function cancelEdit() {
  editingDetail.value = null
}

async function saveEditDetail() {
  if (!editingDetail.value) return
  editSaving.value = true
  try {
    await api.updateProcessingDetail(editingDetail.value.id, {
      outputQty: parseFloat(editForm.outputQty) || 0,
      defectQty: editingDetail.value.itemId === 'H01' ? (parseFloat(editForm.defectQty) || 0) : 0,
      wageRate: parseFloat(editForm.wageRate) || 0,
    })
    editingDetail.value = null
    await store.loadOrder(props.order.id)
    emit('refresh')
    toast.showToast(t('saved'), 'success')
  } catch (e: any) {
    toast.showToast(e?.response?.data?.message || t('saveFailed'), 'error')
  } finally {
    editSaving.value = false
  }
}

// ── 軟刪明細 ──
function confirmSoftDeleteDetail(id: number) {
  confirmDialog.message = t('confirmDeleteDetail')
  confirmDialog.onConfirm = async () => {
    try {
      await api.softDeleteProcessingDetail(id)
      confirmDialog.open = false
      await store.loadOrder(props.order.id)
      emit('refresh')
      toast.showToast(t('deleted'), 'success')
    } catch (e: any) {
      toast.showToast(e?.response?.data?.message || t('deleteFailed'), 'error')
      confirmDialog.open = false
    }
  }
  confirmDialog.open = true
}

// ── 硬刪明細 ──
function confirmHardDeleteDetail(id: number) {
  confirmDialog.message = t('confirmHardDeleteDetail')
  confirmDialog.onConfirm = async () => {
    try {
      await api.hardDeleteProcessingDetail(id)
      confirmDialog.open = false
      // 硬刪後若目前是「顯示已刪除」模式，保持該模式重新載入
      if (showDeleted.value) {
        const res = await api.getProcessingOrder(props.order.id, true)
        store.currentOrder = res.data
      } else {
        await store.loadOrder(props.order.id)
      }
      emit('refresh')
      toast.showToast(t('hardDeleted'), 'success')
    } catch (e: any) {
      toast.showToast(e?.response?.data?.message || t('deleteFailed'), 'error')
      confirmDialog.open = false
    }
  }
  confirmDialog.open = true
}

// ── 軟刪主單 ──
function confirmSoftDeleteOrder() {
  confirmDialog.message = t('confirmDeleteOrder')
  confirmDialog.onConfirm = async () => {
    try {
      await api.softDeleteProcessingOrder(props.order.id)
      await store.loadOrders()
      confirmDialog.open = false
      emit('close')
      toast.showToast(t('deleted'), 'success')
    } catch (e: any) {
      toast.showToast(e?.response?.data?.message || t('deleteFailed'), 'error')
      confirmDialog.open = false
    }
  }
  confirmDialog.open = true
}

// ── 硬刪主單 ──
function confirmHardDeleteOrderAction() {
  confirmDialog.message = t('confirmHardDelete')
  confirmDialog.onConfirm = async () => {
    try {
      await api.hardDeleteProcessingOrder(props.order.id)
      await store.loadOrders()
      confirmDialog.open = false
      emit('close')
      toast.showToast(t('hardDeleted'), 'success')
    } catch (e: any) {
      toast.showToast(e?.response?.data?.message || t('deleteFailed'), 'error')
      confirmDialog.open = false
    }
  }
  confirmDialog.open = true
}
</script>

<style scoped>
.drawer-inner { display: flex; flex-direction: column; min-height: 100%; position: relative; }

.edit-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.7);
  display: flex; align-items: flex-end; justify-content: flex-end;
  z-index: 500;
}
.edit-panel {
  background: var(--color-card); border-radius: 16px 16px 0 0;
  width: 100%; max-width: 560px; padding: 20px;
  display: flex; flex-direction: column; gap: 14px;
  max-height: 80vh; overflow-y: auto;
}

@media (min-width: 1024px) {
  .edit-panel { width: 42%; }
}
.edit-title { font-size: 15px; font-weight: 700; color: var(--color-text); }
.edit-field { display: flex; flex-direction: column; gap: 6px; }
.num-input {
  background: var(--color-surface); border: 2px solid var(--color-border);
  border-radius: 10px; padding: 14px; font-size: 24px; font-weight: 700;
  color: var(--color-accent); text-align: center; cursor: pointer; min-height: 56px;
}
.num-input:hover { border-color: var(--color-accent); }
.edit-actions { display: flex; gap: 10px; }
.btn-primary { flex: 1; background: var(--color-accent); color: #fff; border: none; border-radius: 10px; padding: 12px; font-size: 15px; font-weight: 700; cursor: pointer; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary { background: var(--color-surface); color: var(--color-text-muted); border: 1px solid var(--color-border); border-radius: 10px; padding: 12px 20px; font-size: 14px; cursor: pointer; }

.drawer-sticky-top {
  position: sticky; top: 0; z-index: 10; background: var(--color-drawer);
}
.drawer-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 20px 20px 12px; border-bottom: 1px solid var(--color-border);
  background: var(--color-drawer);
}
.order-no { font-size: 15px; font-weight: 700; color: var(--color-accent); }
.order-meta-row { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
.order-meta { font-size: 13px; color: var(--color-text-muted); }
.btn-edit-date { background: none; border: 1px solid var(--color-border); color: var(--color-text-muted); border-radius: 6px; padding: 2px 8px; font-size: 11px; font-weight: 600; cursor: pointer; flex-shrink: 0; }
.btn-edit-date:hover { border-color: var(--color-accent); color: var(--color-accent); }
.date-input { background: var(--color-surface); border: 2px solid var(--color-border); border-radius: 10px; padding: 12px 14px; font-size: 16px; color: var(--color-text); width: 100%; box-sizing: border-box; }
.date-input:focus { outline: none; border-color: var(--color-accent); }
.close-btn { background: none; border: none; color: var(--color-text-muted); font-size: 18px; cursor: pointer; padding: 4px 8px; }

.status-row { display: flex; gap: 12px; padding: 12px 20px; border-bottom: 1px solid var(--color-border); }
.status-item { display: flex; flex-direction: column; gap: 4px; }
.status-label { font-size: 11px; color: var(--color-text-muted); text-transform: uppercase; font-weight: 600; }
.status-toggle { padding: 5px 14px; border-radius: 6px; border: none; font-size: 12px; font-weight: 700; cursor: pointer; }
.status-toggle.done { background: rgba(45,212,191,0.2); color: var(--color-success); }
.status-toggle.partial { background: rgba(232,130,12,0.2); color: var(--color-accent); }
.status-toggle.pending { background: var(--color-surface); color: var(--color-text-muted); }
.status-toggle:disabled { opacity: 0.5; cursor: default; }

.section-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px 8px; }
.section-title { font-size: 12px; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.section-actions { display: flex; gap: 8px; align-items: center; }
.btn-toggle-deleted { background: none; border: 1px solid var(--color-border); color: var(--color-text-muted); border-radius: 8px; padding: 4px 10px; font-size: 11px; font-weight: 600; cursor: pointer; }
.btn-toggle-deleted.active { border-color: var(--color-danger); color: var(--color-danger); background: rgba(248,113,113,0.08); }
.btn-add { background: none; border: 1px solid var(--color-accent); color: var(--color-accent); border-radius: 8px; padding: 5px 12px; font-size: 12px; font-weight: 600; cursor: pointer; }

.detail-card { margin: 0 12px 10px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 10px; padding: 12px; overflow: hidden; }
.detail-deleted { opacity: 0.6; border-style: dashed; border-color: var(--color-danger); }

/* 修正：原本 flex-wrap: nowrap 在手機窄螢幕上（員工/農民姓名+標籤+按鈕塞不下）
   會把整個畫面往右撐開、無法固定，改為允許換行，擠不下時按鈕自動掉到下一行 */
.detail-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
.detail-header-actions { margin-left: auto; display: flex; gap: 6px; align-items: center; flex-shrink: 0; flex-wrap: wrap; }
.type-badge { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; }
.badge-h01 { background: rgba(232,130,12,0.15); color: var(--color-accent); }
.badge-h02 { background: rgba(45,212,191,0.15); color: var(--color-success); }
.badge-h03 { background: rgba(129,140,248,0.15); color: #818cf8; }
.employee-info { font-size: 14px; font-weight: 700; color: var(--color-text); display: flex; align-items: center; gap: 6px; }
.header-divider { color: var(--color-border); font-size: 14px; flex-shrink: 0; }
.source-tag {
  font-size: 11px; font-weight: 700;
  color: var(--color-text-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 1px 6px;
  flex-shrink: 0;
}
.farmer-inline { flex: 1; font-size: 13px; color: var(--color-text-muted); display: flex; align-items: center; gap: 5px; min-width: 0; }
.employee-id { font-size: 10px; font-weight: 700; color: var(--color-text-muted); background: var(--color-card); border: 1px solid var(--color-border); border-radius: 4px; padding: 1px 5px; }.badge-deleted { font-size: 13px; }

.detail-stats { display: flex; background: var(--color-card); border-radius: 6px; border: 1px solid var(--color-border); overflow: hidden; }
.stats-deleted { text-decoration: line-through; opacity: 0.6; }
.detail-stat { display: flex; flex-direction: column; align-items: center; gap: 3px; flex: 1; padding: 8px 4px; border-right: 1px solid var(--color-border); }
.detail-stat:last-child { border-right: none; }
.stat-label { font-size: 10px; color: var(--color-text-muted); text-transform: uppercase; text-align: center; }
.stat-value { font-size: 15px; font-weight: 700; color: var(--color-text); }
.stat-value.accent { color: var(--color-accent); }

.farmer-row { display: flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 12px; }
.farmer-label { color: var(--color-text-muted); }
.farmer-name { color: var(--color-text); font-weight: 600; }
.farmer-id-tag { font-size: 10px; font-weight: 700; color: var(--color-text-muted); background: var(--color-card); border: 1px solid var(--color-border); border-radius: 4px; padding: 1px 5px; }
.header-divider { color: var(--color-border); font-size: 13px; margin: 0 2px; }

.btn-sm { background: none; border: 1px solid var(--color-border); border-radius: 6px; padding: 5px 10px; font-size: 12px; cursor: pointer; color: var(--color-text-muted); transition: all 0.15s; }
.btn-sm:hover { border-color: var(--color-accent); color: var(--color-text); }
.btn-sm.danger { color: var(--color-danger); border-color: var(--color-danger); }
.btn-sm.danger:hover { background: var(--color-danger-bg); color: #fff; }

.drawer-footer { display: flex; gap: 10px; padding: 16px 20px; border-top: 1px solid var(--color-border); margin-top: auto; }
.btn-danger-outline { background: none; border: 1px solid var(--color-danger); color: var(--color-danger); border-radius: 10px; padding: 10px 20px; font-size: 14px; cursor: pointer; }
.btn-danger-solid { background: var(--color-danger-bg); border: none; color: #fff; border-radius: 10px; padding: 10px 20px; font-size: 14px; cursor: pointer; }

.empty-small { font-size: 13px; color: var(--color-text-muted); padding: 8px 20px; }
.loading-state { display: flex; justify-content: center; padding: 60px; }
.spinner { width: 32px; height: 32px; border: 3px solid var(--color-border); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
