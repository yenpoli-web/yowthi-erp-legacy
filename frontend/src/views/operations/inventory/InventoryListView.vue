<template>
  <div class="inv-list">
    <InventoryCreateForm v-if="createOpen" @close="createOpen = false" @created="onCreated" />

    <template v-else>
      <!-- 庫存統計 -->
      <div class="stock-summary" v-if="store.stockSummary && store.stockSummary.length > 0">
        <div v-for="item in store.stockSummary" :key="item.productId" class="stock-card">
          <div class="stock-avatar">
            <img v-if="item.imageUrl" :src="item.imageUrl" />
            <span v-else>{{ item.productName?.slice(0, 2) }}</span>
          </div>
          <div class="stock-info">
            <div class="stock-name">{{ item.productName }}</div>
            <div class="stock-nums">
              <span class="stock-val">{{ item.produced }}</span>
              <span class="stock-sep">-</span>
              <span class="stock-sold">{{ item.sold }}</span>
              <span class="stock-sep">=</span>
              <span class="stock-remaining accent">{{ item.stock }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="list-header">
        <span class="list-count">{{ showDeleted ? store.deletedOrders.length : showArchive ? archivedOrders.length : mainOrders.length }} {{ t('records') }}</span>
        <div class="header-actions">
          <button class="btn-toggle archive" :class="{ active: showArchive }" @click="toggleArchive">
            ✅ {{ showArchive ? t('hideSalesDoneArchive') : t('showSalesDoneArchive') }} ({{ archivedOrders.length }})
          </button>
          <button class="btn-toggle" :class="{ active: showDeleted }" @click="toggleDeleted">
            🗑 {{ showDeleted ? t('hideDeleted') : t('showDeleted') }}
          </button>
          <button class="btn-primary" @click="createOpen = true" v-if="canEdit && !showDeleted && !showArchive">
            + {{ t('newOrder') }}
          </button>
        </div>
      </div>

      <div v-if="store.loading" class="loading-state"><div class="spinner"></div></div>

      <template v-else-if="!showDeleted && !showArchive">
        <div v-if="mainOrders.length === 0" class="empty-state">{{ t('noOrders') }}</div>
        <div v-else class="order-grid">
          <div v-for="order in mainOrders" :key="order.id"
            class="order-card" :class="{ active: selectedId === order.id }"
            @click="openDetail(order)">
            <div class="card-id accent">{{ order.id }}
              <span v-if="flaggedIds.has(order.id)" class="anomaly-badge" :title="t('anomalyInventoryUnlinked')">⚠️</span>
            </div>
            <div class="card-date">{{ formatDate(order.orderDate) }}</div>
            <div class="card-details">
              <span v-for="d in activeDetails(order)" :key="d.id" class="detail-chip">
                {{ d.product?.name }} × {{ d.quantity }}
              </span>
            </div>
            <div class="card-links">
              <span v-for="link in order.receivingOrders" :key="link.receivingOrderId" class="link-chip">
                {{ link.receivingOrderId }}
              </span>
              <span v-for="link in order.contractOrders" :key="link.contractOrderId" class="link-chip contract-chip">
                🔧 {{ link.contractOrderId }}
              </span>
            </div>
            <!-- 來源標籤 -->
            <div class="source-row">
              <span v-if="order.contractOrders?.length" class="source-badge contract">
                🔧 {{ t('contractWork') }}
              </span>
              <span v-else-if="order.receivingOrders?.length" class="source-badge receiving">
                📋 {{ t('receivingOrder') }}
              </span>
            </div>
          </div>
        </div>
      </template>

      <template v-else-if="showArchive">
        <div v-if="archivedOrders.length === 0" class="empty-state">{{ t('noSalesDoneArchive') }}</div>
        <div v-else class="order-grid">
          <div v-for="order in archivedOrders" :key="order.id"
            class="order-card archived-card" :class="{ active: selectedId === order.id }"
            @click="openDetail(order)">
            <div class="card-id accent">{{ order.id }}</div>
            <div class="card-date">{{ formatDate(order.orderDate) }}</div>
            <div class="card-details">
              <span v-for="d in activeDetails(order)" :key="d.id" class="detail-chip">
                {{ d.product?.name }} × {{ d.quantity }}
              </span>
            </div>
            <div class="sales-done-archive-badge">✅ {{ t('allSalesDone') }}</div>
          </div>
        </div>
      </template>

      <template v-else>
        <div v-if="store.deletedOrders.length === 0" class="empty-state">{{ t('noOrders') }}</div>
        <div v-else class="order-grid">
          <div v-for="order in store.deletedOrders" :key="order.id" class="order-card deleted-card">
            <div class="card-id muted">{{ order.id }}</div>
            <div class="card-date">{{ formatDate(order.orderDate) }}</div>
            <div class="deleted-badge">🗑 {{ t('softDelete') }}</div>
            <div class="card-actions" v-if="canAdmin">
              <button class="btn-hard-delete" @click.stop="doHardDelete(order)">⚠️ {{ t('hardDelete') }}</button>
            </div>
          </div>
        </div>
      </template>

      <!-- 抽屜 -->
      <div class="drawer-overlay" v-if="drawerOpen" @click.self="closeDrawer">
        <div class="drawer" :class="{ open: drawerOpen }">
          <InventoryDetailDrawer
            v-if="store.currentOrder"
            :order="store.currentOrder"
            :can-edit="canEdit"
            :can-admin="canAdmin"
            @close="closeDrawer"
            @refresh="onRefresh"
          />
        </div>
      </div>

      <ConfirmDialog v-if="hardDeleteDialog.open" :show="hardDeleteDialog.open"
        :title="t('confirmAction')" :message="t('confirmHardDelete')"
        @confirm="executeHardDelete" @cancel="hardDeleteDialog.open = false" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useInventoryStore } from '../../../stores/inventory'
import { useAuthStore } from '../../../stores/auth'
import { useToastStore } from '../../../stores/toast'
import { hardDeleteInventoryOrder } from '../../../api/inventory'
import { getAnomaliesSummary } from '../../../api/anomalies'
import InventoryCreateForm from './InventoryCreateForm.vue'
import InventoryDetailDrawer from './InventoryDetailDrawer.vue'
import ConfirmDialog from '../../../components/common/ConfirmDialog.vue'

const { t } = useI18n()
const store = useInventoryStore()
const auth = useAuthStore()
const toast = useToastStore()

const createOpen = ref(false)
const drawerOpen = ref(false)
const showDeleted = ref(false)
const showArchive = ref(false)
const selectedId = ref<string | null>(null)
const hardDeleteDialog = ref<{ open: boolean; orderId: string }>({ open: false, orderId: '' })
const flaggedIds = ref<Set<string>>(new Set())

function isFullySalesDone(order: any) {
  const rLinks = order.receivingOrders || []
  const cLinks = order.contractOrders || []
  if (rLinks.length + cLinks.length === 0) return false
  const rDone = rLinks.every((l: any) => l.receivingOrder?.salesDone)
  const cDone = cLinks.every((l: any) => l.contractOrder?.salesDone)
  return rDone && cDone
}
const mainOrders = computed(() => store.orders.filter((o: any) => !isFullySalesDone(o)))
const archivedOrders = computed(() => store.orders.filter((o: any) => isFullySalesDone(o)))

async function loadAnomalies() {
  try {
    const res = await getAnomaliesSummary()
    flaggedIds.value = new Set(res.data.unlinkedInventory.map((r) => r.id))
  } catch {}
}

const canEdit = computed(() => ['ADMIN', 'OFFICE'].includes(auth.user?.role))
const canAdmin = computed(() => auth.user?.role === 'ADMIN')

function formatDate(d: string) {
  if (!d) return ''
  const [y, m, day] = d.slice(0, 10).split('-')
  return `${parseInt(day)}/${parseInt(m)}/${y.slice(2)}`
}

function activeDetails(order: any) {
  return (order.details || []).filter((d: any) => !d.isDeleted)
}

async function openDetail(order: any) {
  selectedId.value = order.id
  await store.loadOrder(order.id)
  drawerOpen.value = true
}
function closeDrawer() { drawerOpen.value = false; selectedId.value = null }

async function onCreated(orderId: string) {
  createOpen.value = false
  await store.loadOrders()
  await store.loadStockSummary()
  if (orderId) { await store.loadOrder(orderId); drawerOpen.value = true; selectedId.value = orderId }
}
async function onRefresh() {
  await store.loadOrders()
  await store.loadStockSummary()
  if (selectedId.value) await store.loadOrder(selectedId.value)
}
async function toggleDeleted() {
  showDeleted.value = !showDeleted.value
  if (showDeleted.value) { showArchive.value = false; await store.loadDeletedOrders() }
}
function toggleArchive() {
  showArchive.value = !showArchive.value
  if (showArchive.value) showDeleted.value = false
}
function doHardDelete(order: any) { hardDeleteDialog.value = { open: true, orderId: order.id } }
async function executeHardDelete() {
  try {
    await hardDeleteInventoryOrder(hardDeleteDialog.value.orderId)
    hardDeleteDialog.value.open = false
    await store.loadDeletedOrders()
    toast.showToast(t('hardDeleted'), 'success')
  } catch (e: any) { toast.showToast(e?.response?.data?.message || t('deleteFailed'), 'error'); hardDeleteDialog.value.open = false }
}

onMounted(async () => {
  await store.loadOrders()
  await store.loadStockSummary()
  loadAnomalies()
})
</script>

<style scoped>
.inv-list { padding: 16px; }

.stock-summary { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
.stock-card { display: flex; align-items: center; gap: 10px; background: var(--color-card); border: 1px solid var(--color-border); border-radius: 10px; padding: 12px 14px; min-width: 160px; }
.stock-avatar { width: 36px; height: 36px; border-radius: 8px; background: var(--color-surface); overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
.stock-avatar img { width: 100%; height: 100%; object-fit: cover; }
.stock-info { flex: 1; }
.stock-name { font-size: 12px; color: var(--color-text-muted); font-weight: 600; margin-bottom: 4px; }
.stock-nums { display: flex; align-items: center; gap: 5px; font-size: 13px; }
.stock-val { color: var(--color-text); font-weight: 600; }
.stock-sep { color: var(--color-text-muted); }
.stock-sold { color: var(--color-danger); font-weight: 600; }
.stock-remaining { font-size: 16px; font-weight: 700; }

.list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px; }
.list-count { color: var(--color-text-muted); font-size: 13px; }
.header-actions { display: flex; gap: 8px; }
.btn-primary { background: var(--color-accent); color: #fff; border: none; border-radius: 10px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-primary:hover { opacity: 0.88; }
.btn-toggle { background: none; border: 1px solid var(--color-border); border-radius: 8px; padding: 8px 14px; color: var(--color-text-muted); font-size: 13px; cursor: pointer; }
.btn-toggle.active { border-color: var(--color-danger); color: var(--color-danger); background: rgba(248,113,113,0.08); }
.btn-toggle.archive.active { border-color: var(--color-success); color: var(--color-success); background: rgba(45,212,191,0.08); }
.archived-card { opacity: 0.85; }
.sales-done-archive-badge { margin-top: 8px; display: inline-block; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; background: rgba(45,212,191,0.12); color: var(--color-success); }

.order-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.order-card { background: var(--color-card); border: 1px solid var(--color-border); border-radius: 14px; padding: 16px; cursor: pointer; transition: all 0.18s; }
.order-card:hover, .order-card.active { border-color: var(--color-accent); background: var(--color-card-hover); }
.deleted-card { cursor: default; opacity: 0.75; border-style: dashed; }
.card-id { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
.accent { color: var(--color-accent); }
.muted { color: var(--color-text-muted); }
.card-date { font-size: 12px; color: var(--color-text-muted); margin-bottom: 10px; }
.anomaly-badge { font-size: 12px; margin-left: 4px; }
.card-details { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.detail-chip { font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 6px; background: rgba(232,130,12,0.1); color: var(--color-accent); }
.card-links { display: flex; flex-wrap: wrap; gap: 5px; }
.link-chip { font-size: 10px; padding: 2px 7px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 5px; color: var(--color-text-muted); }
.contract-chip { border-color: rgba(129,140,248,0.3); color: #818cf8; }
.source-row { margin-top: 8px; }
.source-badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 5px; }
.source-badge.contract { background: rgba(129,140,248,0.12); color: #818cf8; }
.source-badge.receiving { background: rgba(45,212,191,0.1); color: var(--color-success); }
.deleted-badge { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; background: rgba(248,113,113,0.12); color: var(--color-danger); display: inline-block; margin-bottom: 8px; }
.card-actions { display: flex; justify-content: flex-end; }
.btn-hard-delete { background: none; border: 1px solid var(--color-danger); color: var(--color-danger); border-radius: 8px; padding: 6px 12px; font-size: 12px; font-weight: 700; cursor: pointer; }
.btn-hard-delete:hover { background: var(--color-danger-bg); color: #fff; }

.loading-state { display: flex; justify-content: center; padding: 60px; }
.spinner { width: 32px; height: 32px; border: 3px solid var(--color-border); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-state { text-align: center; padding: 60px; color: var(--color-text-muted); font-size: 15px; }

.drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 200; display: flex; justify-content: flex-end; }
.drawer { width: 100%; max-width: 560px; background: var(--color-drawer); height: 100%; overflow-y: auto; transform: translateX(100%); transition: transform 0.25s cubic-bezier(0.32,0.72,0,1); }
.drawer.open { transform: translateX(0); }
@media (min-width: 1024px) { .drawer { width: 42%; max-width: none; } }
</style>
