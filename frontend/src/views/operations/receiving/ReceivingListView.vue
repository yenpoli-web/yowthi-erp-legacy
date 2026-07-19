<template>
  <div class="receiving-list">

    <!-- ══ 新增進貨單畫面（取代整個 content area） ══ -->
    <ReceivingCreateForm
      v-if="createOpen"
      :initial-order-id="editOrderId"
      :initial-item-id="editOrderItemId"
      :initial-date="editOrderDate"
      @close="createOpen = false; editOrderId = ''"
      @created="onCreated"
    />

    <!-- ══ 正常列表畫面 ══ -->
    <template v-else>

    <!-- 篩選列 -->
    <div class="filter-bar">
      <div class="filter-group">
        <label class="field-label">{{ t('receivingItem') }}</label>
        <button class="filter-btn" @click="showItemModal = true">
          {{ filterItemName || t('all') }}
        </button>
      </div>
      <div class="filter-group">
        <label class="field-label">{{ t('date') }}</label>
        <button class="filter-btn" @click="showDatePicker = true">
          {{ filterDate ? formatDate(filterDate) : t('all') }}
        </button>
      </div>

      <!-- 已刪除切換開關 -->
      <div class="filter-group filter-group-right">
        <label class="field-label">　</label>
        <button
          class="filter-btn toggle-deleted-btn"
          :class="{ active: showDeleted }"
          @click="toggleShowDeleted"
        >
          🗑 {{ showDeleted ? t('hideDeleted') : t('showDeleted') }}
        </button>
      </div>
    </div>

    <!-- 列表標題 -->
    <div class="list-header">
      <span class="list-count">
        <template v-if="showDeleted">
          {{ store.deletedOrders.length }} {{ t('records') }} · {{ t('deletedOrders') }}
        </template>
        <template v-else>
          {{ store.orders.length }} {{ t('records') }}
        </template>
      </span>
      <button class="btn-primary" @click="openCreate" v-if="canEdit && !showDeleted">
        + {{ t('newOrder') }}
      </button>
    </div>

    <!-- 載入中 -->
    <div v-if="store.loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <!-- ── 正常列表 ── -->
    <template v-else-if="!showDeleted">
      <div v-if="store.orders.length === 0" class="empty-state">
        <p>{{ t('noOrders') }}</p>
      </div>
      <div v-else class="order-grid">
        <div
          v-for="order in store.orders"
          :key="order.id"
          class="order-card"
          :class="{ active: selectedOrderId === order.id }"
          @click="openDetail(order)"
        >
          <div class="card-top">
            <div class="item-avatar">
              <img v-if="order.receivingItem?.imageUrl" :src="order.receivingItem.imageUrl" />
              <span v-else>{{ order.receivingItem?.name?.slice(0, 2) }}</span>
            </div>
            <div class="card-info">
              <div class="order-id">{{ order.id }}
                <span v-if="staleMap.has(order.id)" class="anomaly-badge" :title="t('anomalyDaysSince', { days: staleMap.get(order.id) })">⚠️</span>
              </div>
              <div class="order-date">{{ formatDate(order.orderDate) }}</div>
              <div class="item-name">{{ order.receivingItem?.name }}</div>
            </div>
          </div>
          <div class="card-stats">
            <span class="stat">
              <span class="stat-label">{{ t('batches') }}</span>
              <span class="stat-value">{{ order.batches?.length ?? 0 }}</span>
            </span>
            <span class="stat">
              <span class="stat-label">{{ t('totalQty') }}</span>
              <span class="stat-value">{{ calcTotalQty(order) }}</span>
            </span>
            <span class="stat">
              <span class="stat-label">{{ t('totalAmount') }}</span>
              <span class="stat-value accent">{{ calcTotalAmount(order) }}</span>
            </span>
            <span class="stat">
              <span class="stat-label">{{ t('avgPrice') }}</span>
              <span class="stat-value">{{ calcAvgPrice(order) }}</span>
            </span>
          </div>
          <div class="card-badges">
            <span class="badge" :class="calcH01Status(order) === 'all' ? 'badge-done' : calcH01Status(order) === 'partial' ? 'badge-partial' : 'badge-pending'">
              H01 {{ calcH01Status(order) === 'all' ? '✓' : calcH01Status(order) === 'partial' ? t('partial') : t('pending') }}
            </span>
            <span class="badge" :class="order.h02Done ? 'badge-done' : 'badge-pending'">
              H02 {{ order.h02Done ? '✓' : t('pending') }}
            </span>
            <span class="badge" :class="order.h03Done ? 'badge-done' : 'badge-pending'">
              H03 {{ order.h03Done ? '✓' : t('pending') }}
            </span>
            <span class="badge" :class="order.salesDone ? 'badge-sales-done' : 'badge-pending'" v-if="order.h02Done">
              {{ order.salesDone ? '📦 ' + t('invSalesDone') : '📦 ' + t('invSalesPending') }}
            </span>
          </div>
        </div>
      </div>
    </template>

    <!-- ── 已刪除列表 ── -->
    <template v-else>
      <div v-if="store.deletedOrders.length === 0" class="empty-state">
        <p>{{ t('noOrders') }}</p>
      </div>
      <div v-else class="order-grid">
        <div
          v-for="order in store.deletedOrders"
          :key="order.id"
          class="order-card deleted-card"
        >
          <div class="card-top">
            <div class="item-avatar deleted-avatar">
              <img v-if="order.receivingItem?.imageUrl" :src="order.receivingItem.imageUrl" />
              <span v-else>{{ order.receivingItem?.name?.slice(0, 2) }}</span>
            </div>
            <div class="card-info">
              <div class="order-id deleted-id">{{ order.id }}</div>
              <div class="order-date">{{ formatDate(order.orderDate) }}</div>
              <div class="item-name">{{ order.receivingItem?.name }}</div>
            </div>
            <span class="deleted-badge">🗑 {{ t('softDelete') }}</span>
          </div>

          <div class="deleted-meta" v-if="order.deletedAt">
            {{ t('deletedAt') }}：{{ formatDate(order.deletedAt) }}
          </div>

          <div class="card-stats">
            <span class="stat">
              <span class="stat-label">{{ t('batches') }}</span>
              <span class="stat-value">{{ order.batches?.length ?? 0 }}</span>
            </span>
            <span class="stat">
              <span class="stat-label">{{ t('totalQty') }}</span>
              <span class="stat-value">{{ calcTotalQty(order) }}</span>
            </span>
            <span class="stat">
              <span class="stat-label">{{ t('totalAmount') }}</span>
              <span class="stat-value">{{ calcTotalAmount(order) }}</span>
            </span>
          </div>

          <!-- 硬刪按鈕（ADMIN only） -->
          <div class="card-actions" v-if="canAdmin">
            <button class="btn-hard-delete" @click="confirmHardDelete(order)">
              🗑 {{ t('hardDelete') }}
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- TouchSelectorModal：進貨品項篩選 -->
    <TouchSelectorModal
      v-if="showItemModal"
      :title="t('receivingItem')"
      :items="receivingItems"
      :model-value="filterItemId"
      @select="onSelectFilterItem"
      @close="showItemModal = false"
    />

    <!-- DatePicker：日期篩選 -->
    <DatePicker
      v-if="showDatePicker"
      :model-value="filterDate"
      @update:model-value="v => { filterDate = v; showDatePicker = false; loadData() }"
      @close="showDatePicker = false"
    />

    <!-- 明細抽屜 -->
    <div class="drawer-overlay" v-if="drawerOpen" @click.self="closeDrawer">
      <div class="drawer" :class="{ open: drawerOpen }">
        <ReceivingDetailDrawer
          :order="store.currentOrder"
          :can-edit="canEdit"
          :can-admin="canAdmin"
          @close="closeDrawer"
          @refresh="loadData"
          @addDetail="openAddDetailForOrder"
        />
      </div>
    </div>

    <!-- 硬刪確認 Dialog -->
    <ConfirmDialog
      v-if="hardDeleteDialog.open"
      :show="hardDeleteDialog.open"
      :title="t('confirmAction')"
      :message="t('confirmHardDelete')"
      @confirm="executeHardDelete"
      @cancel="hardDeleteDialog.open = false"
    />

    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useReceivingStore } from '../../../stores/receiving'
import { useAuthStore } from '../../../stores/auth'
import { useToastStore } from '../../../stores/toast'
import { useI18n } from 'vue-i18n'
import ReceivingDetailDrawer from './ReceivingDetailDrawer.vue'
import ReceivingCreateForm from './ReceivingCreateForm.vue'
import TouchSelectorModal from '../../../components/common/TouchSelectorModal.vue'
import DatePicker from '../../../components/common/DatePicker.vue'
import ConfirmDialog from '../../../components/common/ConfirmDialog.vue'
import { hardDeleteOrder } from '../../../api/receiving'
import { getAnomaliesSummary } from '../../../api/anomalies'

const { t } = useI18n()
const store = useReceivingStore()
const auth = useAuthStore()
const toast = useToastStore()

const filterItemId = ref('')
const filterDate = ref('')
const drawerOpen = ref(false)
const createOpen = ref(false)
const showDeleted = ref(false)
const selectedOrderId = ref<string | null>(null)
const editOrderId = ref('')
const editOrderItemId = ref('')
const editOrderDate = ref('')
const receivingItems = ref<any[]>([])
const showItemModal = ref(false)
const showDatePicker = ref(false)

const hardDeleteDialog = ref<{ open: boolean; orderId: string }>({ open: false, orderId: '' })
const staleMap = ref<Map<string, number>>(new Map())

async function loadAnomalies() {
  try {
    const res = await getAnomaliesSummary()
    staleMap.value = new Map(res.data.staleProcessing.map((r) => [r.id, r.daysSince]))
  } catch {}
}

const canEdit = computed(() => ['ADMIN', 'OFFICE'].includes(auth.user?.role))
const canAdmin = computed(() => auth.user?.role === 'ADMIN')
const filterItemName = computed(() => receivingItems.value.find(i => i.id === filterItemId.value)?.name || '')

function formatDate(d: string) {
  try {
    const s = d.slice(0, 10)
    const [y, m, day] = s.split('-')
    return `${parseInt(day)}/${parseInt(m)}/${y.slice(2)}`
  } catch { return d }
}

function calcTotalQty(order: any) {
  let total = 0
  for (const batch of order.batches || []) {
    for (const detail of batch.details || []) {
      total += Number(detail.quantity)
    }
  }
  return total % 1 === 0 ? total : total.toFixed(1)
}

function calcTotalAmount(order: any) {
  let total = 0
  for (const batch of order.batches || []) {
    for (const detail of batch.details || []) {
      total += Number(detail.amount)
    }
  }
  return total.toLocaleString()
}

function calcH01Status(order: any): 'all' | 'partial' | 'none' {
  const batches = order.batches || []
  if (batches.length === 0) return 'none'
  const done = batches.filter((b: any) => b.processingDone).length
  if (done === 0) return 'none'
  if (done === batches.length) return 'all'
  return 'partial'
}

function calcAvgPrice(order: any) {
  let totalAmt = 0
  let totalQty = 0
  for (const batch of order.batches || []) {
    for (const detail of batch.details || []) {
      totalAmt += Number(detail.amount)
      totalQty += Number(detail.quantity)
    }
  }
  if (totalQty === 0) return '—'
  return (totalAmt / totalQty).toFixed(1)
}

async function loadData() {
  await store.loadOrders({
    itemId: filterItemId.value || undefined,
    date: filterDate.value || undefined,
  })
}

async function loadReceivingItems() {
  try {
    const res = await fetch('/api/master-data/receiving-items', {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    if (res.ok) receivingItems.value = await res.json()
  } catch {}
}

function onSelectFilterItem(item: any) {
  filterItemId.value = item.id
  showItemModal.value = false
  loadData()
}

async function openDetail(order: any) {
  selectedOrderId.value = order.id
  await store.loadOrder(order.id)
  drawerOpen.value = true
}

function closeDrawer() {
  drawerOpen.value = false
  selectedOrderId.value = null
}

function openCreate() {
  editOrderId.value = ''
  editOrderItemId.value = ''
  editOrderDate.value = ''
  createOpen.value = true
}

function openAddDetailForOrder(order: any) {
  editOrderId.value = order.id
  editOrderItemId.value = order.receivingItemId
  editOrderDate.value = order.orderDate.slice(0, 10)
  createOpen.value = true
  drawerOpen.value = false
}

async function onCreated(orderId?: string) {
  createOpen.value = false
  await loadData()
  if (orderId) {
    await store.loadOrder(orderId)
    drawerOpen.value = true
    selectedOrderId.value = orderId
  }
}

async function toggleShowDeleted() {
  showDeleted.value = !showDeleted.value
  if (showDeleted.value) {
    await store.loadDeletedOrders()
  }
}

function confirmHardDelete(order: any) {
  hardDeleteDialog.value = { open: true, orderId: order.id }
}

async function executeHardDelete() {
  try {
    await hardDeleteOrder(hardDeleteDialog.value.orderId)
    hardDeleteDialog.value.open = false
    await store.loadDeletedOrders()
    toast.showToast(t('hardDeleted'), 'success')
  } catch (e: any) {
    toast.showToast(e?.message || t('deleteFailed'), 'error')
    hardDeleteDialog.value.open = false
  }
}

onMounted(() => {
  loadData()
  loadReceivingItems()
  loadAnomalies()
})
</script>

<style scoped>
.receiving-list { padding: 16px; }

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: flex-end;
}
.filter-group { display: flex; flex-direction: column; gap: 4px; }
.filter-group-right { margin-left: auto; }
.filter-btn {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 8px 12px;
  color: var(--color-text);
  font-size: 14px;
  min-width: 140px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s;
}
.filter-btn:hover { border-color: var(--color-accent); }
.toggle-deleted-btn { min-width: 140px; }
.toggle-deleted-btn.active {
  border-color: var(--color-danger);
  color: var(--color-danger);
  background: rgba(248,113,113,0.08);
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.list-count { color: var(--color-text-muted); font-size: 13px; }

.order-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.order-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.18s;
}
.order-card:hover, .order-card.active {
  border-color: var(--color-accent);
  background: var(--color-card-hover);
}
.deleted-card {
  cursor: default;
  opacity: 0.75;
  border-style: dashed;
}
.deleted-card:hover {
  border-color: var(--color-danger);
  background: var(--color-card);
  opacity: 0.9;
}

.card-top { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 12px; }
.item-avatar {
  width: 48px; height: 48px; border-radius: 10px;
  background: var(--color-surface);
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 700; color: var(--color-accent);
  flex-shrink: 0; overflow: hidden;
}
.item-avatar img { width: 100%; height: 100%; object-fit: cover; }
.deleted-avatar { filter: grayscale(0.6); }

.card-info { flex: 1; }
.order-id { font-size: 13px; font-weight: 700; color: var(--color-accent); }
.deleted-id { color: var(--color-text-muted); }
.order-date { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }
.anomaly-badge { font-size: 12px; margin-left: 4px; }
.item-name { font-size: 14px; color: var(--color-text); margin-top: 2px; }

.deleted-badge {
  font-size: 11px; font-weight: 700;
  padding: 3px 8px; border-radius: 6px;
  background: rgba(248,113,113,0.12);
  color: var(--color-danger);
  white-space: nowrap; flex-shrink: 0;
}

.deleted-meta {
  font-size: 11px; color: var(--color-danger);
  margin-bottom: 8px; padding: 4px 8px;
  background: rgba(248,113,113,0.08);
  border-radius: 6px;
}

.card-stats {
  display: flex; gap: 0; margin-bottom: 10px;
  background: var(--color-surface); border-radius: 8px;
  border: 1px solid var(--color-border);
  overflow: hidden;
}
.stat {
  display: flex; flex-direction: column; align-items: center;
  gap: 4px; flex: 1;
  padding: 8px 4px;
  border-right: 1px solid var(--color-border);
}
.stat:last-child { border-right: none; }
.stat-label { font-size: 10px; color: var(--color-text-muted); text-transform: uppercase; text-align: center; }
.stat-value { font-size: 15px; font-weight: 700; color: var(--color-text); text-align: center; }
.stat-value.accent { color: var(--color-accent); }

.card-badges { display: flex; gap: 6px; }
.badge {
  font-size: 11px; font-weight: 700; padding: 3px 8px;
  border-radius: 6px; letter-spacing: 0.03em;
}
.badge-done { background: rgba(45,212,191,0.15); color: var(--color-success); }
.badge-pending { background: rgba(121,134,168,0.15); color: var(--color-text-muted); }
.badge-partial { background: rgba(232,130,12,0.15); color: var(--color-accent); }
.badge-sales-done { background: rgba(129,140,248,0.15); color: #818cf8; }

.card-actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}
.btn-hard-delete {
  background: none;
  border: 1px solid var(--color-danger);
  color: var(--color-danger);
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-hard-delete:hover {
  background: var(--color-danger-bg);
  color: #fff;
  border-color: var(--color-danger-bg);
}

.loading-state { display: flex; justify-content: center; padding: 60px; }
.spinner {
  width: 32px; height: 32px; border: 3px solid var(--color-border);
  border-top-color: var(--color-accent); border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.empty-state {
  text-align: center; padding: 60px;
  color: var(--color-text-muted); font-size: 15px;
}

.drawer-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.65);
  z-index: 200; display: flex; justify-content: flex-end;
}
.drawer {
  width: 100%; max-width: 560px;
  background: var(--color-drawer);
  height: 100%; overflow-y: auto;
  transform: translateX(100%);
  transition: transform 0.25s cubic-bezier(0.32,0.72,0,1);
}
.drawer.open { transform: translateX(0); }


@media (min-width: 1024px) {
  .drawer { width: 42%; max-width: none; }
}

.field-label {
  font-size: 12px; font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase; letter-spacing: 0.05em;
}
.btn-primary {
  background: var(--color-accent); color: #fff;
  border: none; border-radius: 10px;
  padding: 10px 20px; font-size: 14px; font-weight: 600;
  cursor: pointer; transition: opacity 0.15s;
}
.btn-primary:hover { opacity: 0.88; }
</style>
