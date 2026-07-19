<template>
  <div class="sales-list">

    <!-- 新增表單 -->
    <SalesCreateForm
      v-if="createOpen"
      @close="createOpen = false"
      @created="onCreated"
    />

    <template v-else>

    <!-- 篩選列 -->
    <div class="filter-bar">
      <div class="filter-group">
        <label class="field-label">{{ t('customer') }}</label>
        <button class="filter-btn" @click="showCustomerModal = true">
          {{ filterCustomerName || t('all') }}
        </button>
      </div>
      <div class="filter-group">
        <label class="field-label">{{ t('date') }}</label>
        <button class="filter-btn" @click="showDatePicker = true">
          {{ filterDate ? formatDate(filterDate) : t('all') }}
        </button>
      </div>
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

    <!-- 標題列 -->
    <div class="list-header">
      <span class="list-count">
        <template v-if="showDeleted">
          {{ store.deletedOrders.length }} {{ t('records') }} · {{ t('deletedSalesOrders') }}
        </template>
        <template v-else>
          {{ store.orders.length }} {{ t('records') }}
        </template>
      </span>
      <button class="btn-primary" @click="openCreate" v-if="canEdit && !showDeleted">
        + {{ t('newSalesOrder') }}
      </button>
    </div>

    <!-- 載入中 -->
    <div v-if="store.loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <!-- 正常列表 -->
    <template v-else-if="!showDeleted">
      <div v-if="store.orders.length === 0" class="empty-state">
        <p>{{ t('noSalesOrders') }}</p>
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
            <div class="customer-avatar" :style="{ background: getAvatarColor(order.customerId) }">
              {{ order.customerId?.slice(0, 2) }}
            </div>
            <div class="card-info">
              <div class="order-id accent">{{ order.id }}
                <span v-if="flaggedIds.has(order.id)" class="anomaly-badge" :title="t('anomalySalesUnlinked')">⚠️</span>
              </div>
              <div class="order-date">{{ formatDate(order.orderDate) }}</div>
              <div class="customer-name">{{ order.customer?.name }}</div>
            </div>
          </div>
          <div class="card-stats">
            <span class="stat">
              <span class="stat-label">{{ t('salesDetails') }}</span>
              <span class="stat-value">{{ activeDetails(order) }}</span>
            </span>
            <span class="stat">
              <span class="stat-label">{{ t('totalQtyLabel') }}</span>
              <span class="stat-value">{{ calcTotalQty(order) }}</span>
            </span>
            <span class="stat">
              <span class="stat-label">{{ t('totalAmount') }}</span>
              <span class="stat-value accent">{{ calcTotalAmount(order) }}</span>
            </span>
            <span class="stat">
              <span class="stat-label">{{ t('linkedBatches') }}</span>
              <span class="stat-value">{{ order.receivingBatches?.length ?? 0 }}</span>
            </span>
          </div>
        </div>
      </div>
    </template>

    <!-- 已刪除列表 -->
    <template v-else>
      <div v-if="store.deletedOrders.length === 0" class="empty-state">
        <p>{{ t('noSalesOrders') }}</p>
      </div>
      <div v-else class="order-grid">
        <div
          v-for="order in store.deletedOrders"
          :key="order.id"
          class="order-card deleted-card"
        >
          <div class="card-top">
            <div class="customer-avatar deleted-avatar" :style="{ background: getAvatarColor(order.customerId) }">
              {{ order.customerId?.slice(0, 2) }}
            </div>
            <div class="card-info">
              <div class="order-id muted">{{ order.id }}</div>
              <div class="order-date">{{ formatDate(order.orderDate) }}</div>
              <div class="customer-name">{{ order.customer?.name }}</div>
            </div>
            <span class="deleted-badge">🗑 {{ t('softDelete') }}</span>
          </div>
          <div class="deleted-meta" v-if="order.deletedAt">
            {{ t('deletedAt') }}：{{ formatDate(order.deletedAt) }}
          </div>
          <div class="card-stats">
            <span class="stat">
              <span class="stat-label">{{ t('salesDetails') }}</span>
              <span class="stat-value">{{ (order.details || []).length }}</span>
            </span>
            <span class="stat">
              <span class="stat-label">{{ t('totalAmount') }}</span>
              <span class="stat-value">{{ calcTotalAmount(order) }}</span>
            </span>
          </div>
          <div class="card-actions" v-if="canAdmin">
            <button class="btn-hard-delete" @click="confirmHardDelete(order)">
              ⚠️ {{ t('hardDelete') }}
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- Modals -->
    <TouchSelectorModal
      v-if="showCustomerModal"
      :title="t('customer')"
      :items="customers"
      :model-value="filterCustomerId"
      @select="onSelectCustomer"
      @close="showCustomerModal = false"
    />
    <DatePicker
      v-if="showDatePicker"
      :model-value="filterDate"
      @update:model-value="v => { filterDate = v; showDatePicker = false; loadData() }"
      @close="showDatePicker = false"
    />

    <!-- 明細抽屜 -->
    <div class="drawer-overlay" v-if="drawerOpen" @click.self="closeDrawer">
      <div class="drawer" :class="{ open: drawerOpen }">
        <SalesDetailDrawer
          v-if="store.currentOrder"
          :order="store.currentOrder"
          :can-edit="canEdit"
          :can-admin="canAdmin"
          @close="closeDrawer"
          @refresh="onRefresh"
        />
      </div>
    </div>

    <!-- Hard Delete 確認 -->
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
import { useI18n } from 'vue-i18n'
import { useSalesStore } from '../../../stores/sales'
import { useAuthStore } from '../../../stores/auth'
import { useToastStore } from '../../../stores/toast'
import { hardDeleteSalesOrder } from '../../../api/sales'
import { getAnomaliesSummary } from '../../../api/anomalies'
import SalesCreateForm from './SalesCreateForm.vue'
import SalesDetailDrawer from './SalesDetailDrawer.vue'
import TouchSelectorModal from '../../../components/common/TouchSelectorModal.vue'
import DatePicker from '../../../components/common/DatePicker.vue'
import ConfirmDialog from '../../../components/common/ConfirmDialog.vue'

const { t } = useI18n()
const store = useSalesStore()
const auth = useAuthStore()
const toast = useToastStore()

const createOpen = ref(false)
const drawerOpen = ref(false)
const showDeleted = ref(false)
const selectedOrderId = ref<string | null>(null)
const filterCustomerId = ref('')
const filterDate = ref('')
const showCustomerModal = ref(false)
const showDatePicker = ref(false)
const customers = ref<any[]>([])
const hardDeleteDialog = ref<{ open: boolean; orderId: string }>({ open: false, orderId: '' })
const flaggedIds = ref<Set<string>>(new Set())

async function loadAnomalies() {
  try {
    const res = await getAnomaliesSummary()
    flaggedIds.value = new Set(res.data.unlinkedSales.map((r) => r.id))
  } catch {}
}

const canEdit = computed(() => ['ADMIN', 'OFFICE'].includes(auth.user?.role))
const canAdmin = computed(() => auth.user?.role === 'ADMIN')
const filterCustomerName = computed(() => customers.value.find(c => c.id === filterCustomerId.value)?.name || '')

const COLORS = ['#e8820c', '#2dd4bf', '#818cf8', '#f472b6', '#34d399', '#60a5fa']
function getAvatarColor(id: string) {
  if (!id) return COLORS[0]
  const sum = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return COLORS[sum % 6]
}

function formatDate(d: string) {
  if (!d) return ''
  try {
    const s = d.slice(0, 10)
    const [y, m, day] = s.split('-')
    return `${parseInt(day)}/${parseInt(m)}/${y.slice(2)}`
  } catch { return d }
}

function activeDetails(order: any) {
  return (order.details || []).filter((d: any) => !d.isDeleted).length
}

function calcTotalQty(order: any) {
  return (order.details || [])
    .filter((d: any) => !d.isDeleted)
    .reduce((s: number, d: any) => s + Number(d.quantity), 0)
}

function calcTotalAmount(order: any) {
  const total = (order.details || [])
    .filter((d: any) => !d.isDeleted)
    .reduce((s: number, d: any) => s + Number(d.amount), 0)
  return total.toLocaleString()
}

async function loadData() {
  await store.loadOrders({
    customerId: filterCustomerId.value || undefined,
    date: filterDate.value || undefined,
  })
}

async function loadCustomers() {
  try {
    const headers = { Authorization: `Bearer ${auth.token}` }
    const res = await fetch('/api/master-data/customers', { headers })
    if (res.ok) customers.value = (await res.json()).filter((c: any) => !c.isDeleted)
  } catch {}
}

function onSelectCustomer(c: any) {
  filterCustomerId.value = c.id
  showCustomerModal.value = false
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
  createOpen.value = true
}

async function onCreated(orderId: string) {
  createOpen.value = false
  await loadData()
  if (orderId) {
    await store.loadOrder(orderId)
    drawerOpen.value = true
    selectedOrderId.value = orderId
  }
}

async function onRefresh() {
  await loadData()
  if (selectedOrderId.value) {
    await store.loadOrder(selectedOrderId.value)
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
    await hardDeleteSalesOrder(hardDeleteDialog.value.orderId)
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
  loadCustomers()
  loadAnomalies()
})
</script>

<style scoped>
.sales-list { padding: 16px; }

.filter-bar {
  display: flex; gap: 12px; margin-bottom: 16px;
  flex-wrap: wrap; align-items: flex-end;
}
.filter-group { display: flex; flex-direction: column; gap: 4px; }
.filter-group-right { margin-left: auto; }
.filter-btn {
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: 8px; padding: 8px 12px; color: var(--color-text);
  font-size: 14px; min-width: 140px; cursor: pointer; text-align: left;
  transition: border-color 0.15s;
}
.filter-btn:hover { border-color: var(--color-accent); }
.toggle-deleted-btn.active {
  border-color: var(--color-danger); color: var(--color-danger);
  background: rgba(248,113,113,0.08);
}

.list-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 14px;
}
.list-count { color: var(--color-text-muted); font-size: 13px; }
.btn-primary {
  background: var(--color-accent); color: #fff; border: none;
  border-radius: 10px; padding: 10px 20px; font-size: 14px; font-weight: 600;
  cursor: pointer; transition: opacity 0.15s;
}
.btn-primary:hover { opacity: 0.88; }

.order-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.order-card {
  background: var(--color-card); border: 1px solid var(--color-border);
  border-radius: 14px; padding: 16px; cursor: pointer; transition: all 0.18s;
}
.order-card:hover, .order-card.active {
  border-color: var(--color-accent); background: var(--color-card-hover);
}
.deleted-card { cursor: default; opacity: 0.75; border-style: dashed; }
.deleted-card:hover { border-color: var(--color-danger); background: var(--color-card); opacity: 0.9; }

.card-top { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 12px; }
.customer-avatar {
  width: 48px; height: 48px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 700; color: #fff; flex-shrink: 0;
}
.deleted-avatar { filter: grayscale(0.6); }
.card-info { flex: 1; }
.order-id { font-size: 13px; font-weight: 700; }
.accent { color: var(--color-accent); }
.muted { color: var(--color-text-muted); }
.order-date { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }
.anomaly-badge { font-size: 12px; margin-left: 4px; }
.customer-name { font-size: 14px; color: var(--color-text); margin-top: 2px; }

.deleted-badge {
  font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px;
  background: rgba(248,113,113,0.12); color: var(--color-danger);
  white-space: nowrap; flex-shrink: 0;
}
.deleted-meta {
  font-size: 11px; color: var(--color-danger); margin-bottom: 8px;
  padding: 4px 8px; background: rgba(248,113,113,0.08); border-radius: 6px;
}

.card-stats {
  display: flex; gap: 0; background: var(--color-surface);
  border-radius: 8px; border: 1px solid var(--color-border); overflow: hidden;
}
.stat {
  display: flex; flex-direction: column; align-items: center;
  gap: 4px; flex: 1; padding: 8px 4px;
  border-right: 1px solid var(--color-border);
}
.stat:last-child { border-right: none; }
.stat-label { font-size: 10px; color: var(--color-text-muted); text-transform: uppercase; text-align: center; }
.stat-value { font-size: 14px; font-weight: 700; text-align: center; }

.card-actions { margin-top: 10px; display: flex; justify-content: flex-end; }
.btn-hard-delete {
  background: none; border: 1px solid var(--color-danger);
  color: var(--color-danger); border-radius: 8px; padding: 7px 14px;
  font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.15s;
}
.btn-hard-delete:hover { background: var(--color-danger-bg); color: #fff; border-color: var(--color-danger-bg); }

.loading-state { display: flex; justify-content: center; padding: 60px; }
.spinner {
  width: 32px; height: 32px; border: 3px solid var(--color-border);
  border-top-color: var(--color-accent); border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.empty-state {
  text-align: center; padding: 60px; color: var(--color-text-muted); font-size: 15px;
}

.drawer-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.65);
  z-index: 200; display: flex; justify-content: flex-end;
}
.drawer {
  width: 100%; max-width: 560px; background: var(--color-drawer);
  height: 100%; overflow-y: auto;
  transform: translateX(100%);
  transition: transform 0.25s cubic-bezier(0.32,0.72,0,1);
}
.drawer.open { transform: translateX(0); }
@media (min-width: 1024px) {
  .drawer { width: 42%; max-width: none; }
}

.field-label {
  font-size: 12px; font-weight: 600; color: var(--color-text-muted);
  text-transform: uppercase; letter-spacing: 0.05em;
}
</style>
