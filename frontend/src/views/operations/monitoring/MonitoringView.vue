<template>
  <div class="mon-view">
    <div class="list-header">
      <span class="list-count">{{ store.orders.length }} {{ t('records') }}</span>
      <div class="header-actions">
        <span class="auto-refresh-hint">🔄 {{ t('autoRefreshing') }}</span>
        <button class="btn-toggle" @click="refresh">↻ {{ t('refreshNow') }}</button>
      </div>
    </div>

    <div v-if="store.loading && store.orders.length === 0" class="loading-state">
      <div class="spinner"></div>
    </div>

    <div v-else-if="store.orders.length === 0" class="empty-state">{{ t('noMonitoringOrders') }}</div>

    <div v-else class="order-grid">
      <div
        v-for="order in store.orders"
        :key="order.orderId"
        class="order-card"
        :class="{ active: selectedId === order.orderId }"
        @click="openDetail(order)"
      >
        <div class="card-top">
          <div class="card-avatar" :style="{ background: avatarColor(order.receivingItem.id) }">
            {{ order.receivingItem.name.slice(0, 2) }}
          </div>
          <div class="card-top-text">
            <div class="card-id accent">{{ order.orderId }}</div>
            <div class="card-date">{{ formatDate(order.orderDate) }} · {{ order.receivingItem.name }}</div>
          </div>
        </div>

        <div class="card-table">
          <div class="ct-cell ct-head">{{ t('totalQty') }}</div>
          <div class="ct-cell ct-head">{{ t('outputQtyLabel') }}</div>
          <div class="ct-cell ct-head">{{ t('defectQtyLabel') }}</div>
          <div class="ct-cell ct-head">{{ t('amount') }}</div>

          <div class="ct-cell ct-row-label">H01</div>
          <div class="ct-cell ct-value">{{ order.h01Stats.outputQty.toFixed(1) }}</div>
          <div class="ct-cell ct-value">{{ order.h01Stats.defectQty.toFixed(1) }}</div>
          <div class="ct-cell ct-value accent">฿{{ order.h01Stats.amount.toLocaleString() }}</div>

          <div class="ct-cell ct-row-label">H02</div>
          <div class="ct-cell ct-value">{{ order.h02Stats.outputQty.toFixed(1) }}</div>
          <div class="ct-cell ct-value ct-dash">—</div>
          <div class="ct-cell ct-value accent">฿{{ order.h02Stats.amount.toLocaleString() }}</div>

          <div class="ct-cell ct-row-label">H03</div>
          <div class="ct-cell ct-value">{{ order.h03Stats.outputQty.toFixed(1) }}</div>
          <div class="ct-cell ct-value ct-dash">—</div>
          <div class="ct-cell ct-value accent">฿{{ order.h03Stats.amount.toLocaleString() }}</div>
        </div>

        <div class="card-badges">
          <span class="badge" :class="order.h02Done ? 'badge-done' : 'badge-pending'">
            {{ t('h02Status') }} {{ order.h02Done ? t('done') : t('pending') }}
          </span>
          <span class="badge" :class="order.h03Done ? 'badge-done' : 'badge-pending'">
            {{ t('h03Status') }} {{ order.h03Done ? t('done') : t('pending') }}
          </span>
        </div>
      </div>
    </div>

    <!-- 明細抽屜 -->
    <div class="drawer-overlay" v-if="drawerOpen" @click.self="closeDrawer">
      <div class="drawer" :class="{ open: drawerOpen }">
        <div v-if="store.currentOrder" class="drawer-content">
          <div class="drawer-header">
            <div>
              <div class="drawer-title accent">{{ store.currentOrder.orderId }}</div>
              <div class="drawer-sub">
                {{ formatDate(store.currentOrder.orderDate) }} · {{ store.currentOrder.receivingItem.name }}
              </div>
            </div>
            <button class="btn-close" @click="closeDrawer">✕</button>
          </div>

          <div class="drawer-body">
            <div
              v-for="batch in store.currentOrder.batches"
              :key="batch.batchId"
              class="batch-card"
            >
              <div class="batch-row-top">
                <span class="batch-farmer">{{ batch.farmer.name }}<span class="batch-farmer-id">{{ batch.farmer.id }}</span></span>
                <button
                  v-if="canEdit"
                  class="batch-status btn-status"
                  :class="batch.processingDone ? 'badge-done' : 'badge-pending'"
                  :disabled="toggling === batch.batchId"
                  @click="toggleH01(batch)"
                >
                  H01 {{ batch.processingDone ? t('done') : t('pending') }}
                </button>
                <span
                  v-else
                  class="batch-status"
                  :class="batch.processingDone ? 'badge-done' : 'badge-pending'"
                >
                  H01 {{ batch.processingDone ? t('done') : t('pending') }}
                </span>
              </div>

              <div class="batch-grid">
                <div class="g-cell g-label">{{ t('inputQty') }}</div>
                <div class="g-cell g-label">{{ t('outputQtyLabel') }}</div>
                <div class="g-cell g-label">{{ t('defectQtyLabel') }}</div>

                <div class="g-cell g-value">{{ batch.inputQty.toFixed(1) }}</div>
                <div class="g-cell g-value">{{ batch.h01Output !== null ? batch.h01Output.toFixed(1) : '—' }}</div>
                <div class="g-cell g-value">{{ batch.h01Defect !== null ? batch.h01Defect.toFixed(1) : '—' }}</div>

                <div class="g-cell g-label">{{ t('loss') }}</div>
                <div class="g-cell g-label">{{ t('lossRate') }}</div>
                <div class="g-cell g-label">{{ t('completionRate') }}</div>

                <div class="g-cell g-value" :class="{ 'loss-warn': (batch.loss ?? 0) < 0 }">
                  {{ batch.loss !== null ? batch.loss.toFixed(1) : '—' }}
                </div>
                <div class="g-cell g-value">{{ batch.lossRate !== null ? batch.lossRate.toFixed(1) + '%' : '—' }}</div>
                <div class="g-cell g-value" :class="completionClass(batch.completionRate)">
                  {{ batch.completionRate !== null ? batch.completionRate.toFixed(1) + '%' : '—' }}
                </div>

                <div class="g-cell g-label">{{ t('amount') }}</div>
                <div class="g-cell g-value g-span2">
                  {{ batch.h01Amount !== null ? `฿${batch.h01Amount.toLocaleString()}` : '—' }}
                </div>
              </div>
            </div>

            <!-- H02 / H03 整單層級加工狀況 -->
            <div class="order-level-section">
              <div class="order-level-card">
                <div class="batch-row-top">
                  <span class="batch-farmer">H02</span>
                  <button
                    v-if="canEdit"
                    class="batch-status btn-status"
                    :class="store.currentOrder.h02Done ? 'badge-done' : 'badge-pending'"
                    :disabled="togglingOrderType === 'H02'"
                    @click="toggleOrderDone('h02Done')"
                  >
                    {{ store.currentOrder.h02Done ? t('done') : t('pending') }}
                  </button>
                  <span
                    v-else
                    class="batch-status"
                    :class="store.currentOrder.h02Done ? 'badge-done' : 'badge-pending'"
                  >
                    {{ store.currentOrder.h02Done ? t('done') : t('pending') }}
                  </span>
                </div>
                <div v-if="store.currentOrder.h02Stats.totalQty > 0" class="order-grid-2col">
                  <div class="g-cell g-label">{{ t('outputQtyLabel') }}總量</div>
                  <div class="g-cell g-label">{{ t('outputQtyLabel') }}</div>

                  <div class="g-cell g-value">{{ store.currentOrder.h02Stats.totalQty.toFixed(1) }}</div>
                  <div class="g-cell g-value">{{ store.currentOrder.h02Stats.outputQty.toFixed(1) }}</div>

                  <div class="g-cell g-label g-span2">{{ t('completionRate') }}</div>
                  <div class="g-cell g-value g-span2" :class="completionClass(store.currentOrder.h02Stats.completionRate)">
                    {{ store.currentOrder.h02Stats.completionRate !== null ? store.currentOrder.h02Stats.completionRate.toFixed(1) + '%' : '—' }}
                  </div>

                  <div class="g-cell g-label g-span2">{{ t('amount') }}</div>
                  <div class="g-cell g-value g-span2">฿{{ store.currentOrder.h02Stats.amount.toLocaleString() }}</div>
                </div>
                <div v-else class="empty-small">{{ t('noDetails') }}</div>
              </div>

              <div class="order-level-card">
                <div class="batch-row-top">
                  <span class="batch-farmer">H03</span>
                  <button
                    v-if="canEdit"
                    class="batch-status btn-status"
                    :class="store.currentOrder.h03Done ? 'badge-done' : 'badge-pending'"
                    :disabled="togglingOrderType === 'H03'"
                    @click="toggleOrderDone('h03Done')"
                  >
                    {{ store.currentOrder.h03Done ? t('done') : t('pending') }}
                  </button>
                  <span
                    v-else
                    class="batch-status"
                    :class="store.currentOrder.h03Done ? 'badge-done' : 'badge-pending'"
                  >
                    {{ store.currentOrder.h03Done ? t('done') : t('pending') }}
                  </span>
                </div>
                <div v-if="store.currentOrder.h03Stats.totalQty > 0" class="order-grid-2col">
                  <div class="g-cell g-label">{{ t('defectQtyLabel') }}總量</div>
                  <div class="g-cell g-label">{{ t('outputQtyLabel') }}</div>

                  <div class="g-cell g-value">{{ store.currentOrder.h03Stats.totalQty.toFixed(1) }}</div>
                  <div class="g-cell g-value">{{ store.currentOrder.h03Stats.outputQty.toFixed(1) }}</div>

                  <div class="g-cell g-label g-span2">{{ t('completionRate') }}</div>
                  <div class="g-cell g-value g-span2" :class="completionClass(store.currentOrder.h03Stats.completionRate)">
                    {{ store.currentOrder.h03Stats.completionRate !== null ? store.currentOrder.h03Stats.completionRate.toFixed(1) + '%' : '—' }}
                  </div>

                  <div class="g-cell g-label g-span2">{{ t('amount') }}</div>
                  <div class="g-cell g-value g-span2">฿{{ store.currentOrder.h03Stats.amount.toLocaleString() }}</div>
                </div>
                <div v-else class="empty-small">{{ t('noDetails') }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMonitoringStore } from '../../../stores/monitoring'
import { useAuthStore } from '../../../stores/auth'
import { useToastStore } from '../../../stores/toast'
import { updateBatch, updateOrder } from '../../../api/receiving'
import type { MonitoringOrder, MonitoringBatch } from '../../../api/monitoring'

const { t } = useI18n()
const store = useMonitoringStore()
const auth = useAuthStore()
const toast = useToastStore()

const canEdit = computed(() => ['ADMIN', 'OFFICE'].includes(auth.user?.role))

const drawerOpen = ref(false)
const selectedId = ref<string | null>(null)
const toggling = ref<string | null>(null)
const togglingOrderType = ref<'H02' | 'H03' | null>(null)
let pollTimer: ReturnType<typeof setInterval> | null = null

const AVATAR_COLORS = ['#e8820c', '#2dd4bf', '#818cf8', '#f472b6', '#34d399', '#60a5fa']

function avatarColor(id: string) {
  const sum = id.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

function formatDate(d: string) {
  if (!d) return ''
  const [y, m, day] = d.slice(0, 10).split('-')
  return `${parseInt(day)}/${parseInt(m)}/${y.slice(2)}`
}

function completionClass(rate: number | null) {
  if (rate === null) return ''
  if (rate < 85) return 'rate-danger'
  if (rate < 95) return 'rate-warn'
  return 'rate-good'
}

async function openDetail(order: MonitoringOrder) {
  selectedId.value = order.orderId
  await store.loadOrder(order.orderId)
  drawerOpen.value = true
}
function closeDrawer() {
  drawerOpen.value = false
  selectedId.value = null
}
async function refresh() {
  await store.loadOrders()
  if (selectedId.value) await store.loadOrder(selectedId.value)
}

async function toggleH01(batch: MonitoringBatch) {
  if (toggling.value) return
  toggling.value = batch.batchId
  try {
    await updateBatch(batch.batchId, { processingDone: !batch.processingDone })
    if (selectedId.value) await store.loadOrder(selectedId.value)
    await store.loadOrders()
    toast.showToast(t('savedSuccess'), 'success')
  } catch (e: any) {
    toast.showToast(e?.message || e?.response?.data?.message || t('saveFailed'), 'danger')
  } finally {
    toggling.value = null
  }
}

async function toggleOrderDone(field: 'h02Done' | 'h03Done') {
  if (togglingOrderType.value || !store.currentOrder) return
  const orderId = store.currentOrder.orderId
  const typeLabel = field === 'h02Done' ? 'H02' : 'H03'
  togglingOrderType.value = typeLabel
  try {
    const current = field === 'h02Done' ? store.currentOrder.h02Done : store.currentOrder.h03Done
    await updateOrder(orderId, { [field]: !current })
    await store.loadOrder(orderId)
    await store.loadOrders()
    toast.showToast(t('savedSuccess'), 'success')
  } catch (e: any) {
    toast.showToast(e?.message || e?.response?.data?.message || t('saveFailed'), 'danger')
  } finally {
    togglingOrderType.value = null
  }
}

onMounted(() => {
  store.loadOrders()
  pollTimer = setInterval(() => {
    store.loadOrders()
    if (selectedId.value) store.loadOrder(selectedId.value)
  }, 30000)
})
onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<style scoped>
.mon-view { padding: 16px; }
.list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px; }
.list-count { color: var(--color-text-muted); font-size: 13px; }
.header-actions { display: flex; align-items: center; gap: 10px; }
.auto-refresh-hint { font-size: 12px; color: var(--color-text-muted); }
.btn-toggle { background: none; border: 1px solid var(--color-border); border-radius: 8px; padding: 8px 14px; color: var(--color-text-muted); font-size: 13px; cursor: pointer; }
.btn-toggle:hover { border-color: var(--color-accent); color: var(--color-accent); }

.order-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 12px; }
.order-card { background: var(--color-card); border: 1px solid var(--color-border); border-radius: 14px; padding: 16px; cursor: pointer; transition: all 0.18s; }
.order-card:hover, .order-card.active { border-color: var(--color-accent); background: var(--color-card-hover); }

.card-top { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.card-avatar { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 13px; font-weight: 700; flex-shrink: 0; }
.card-top-text { min-width: 0; }
.card-id { font-size: 14px; font-weight: 700; }
.accent { color: var(--color-accent); }
.card-date { font-size: 12px; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.card-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--color-border); padding-top: 10px; margin-bottom: 10px; flex-wrap: wrap; gap: 6px; }
.card-count { font-size: 12px; color: var(--color-text-muted); }
.card-amount { font-size: 15px; font-weight: 700; }

.card-table { display: grid; grid-template-columns: 50px repeat(3, 1fr); border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden; }
.ct-cell { padding: 6px 4px; text-align: center; border-bottom: 1px solid var(--color-border); border-right: 1px solid var(--color-border); font-size: 12px; }
.ct-cell:nth-child(4n) { border-right: none; }
.card-table .ct-cell:nth-last-child(-n+4) { border-bottom: none; }
.ct-head { color: var(--color-text-muted); background: var(--color-card); font-size: 10px; }
.ct-row-label { font-weight: 700; color: var(--color-text); background: var(--color-card); }
.ct-value { font-weight: 600; color: var(--color-text); }
.ct-value.accent { color: var(--color-accent); font-weight: 700; }
.ct-dash { color: var(--color-text-dim); }

.card-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
.badge { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; }
.badge-done { background: rgba(45,212,191,0.12); color: var(--color-success); }
.badge-pending { background: rgba(248,113,113,0.12); color: var(--color-danger); }

.loading-state { display: flex; justify-content: center; padding: 60px; }
.spinner { width: 32px; height: 32px; border: 3px solid var(--color-border); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-state { text-align: center; padding: 60px; color: var(--color-text-muted); font-size: 15px; }

.drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 200; display: flex; justify-content: flex-end; }
.drawer { width: 100%; max-width: 560px; background: var(--color-drawer); height: 100%; overflow-y: auto; transform: translateX(100%); transition: transform 0.25s cubic-bezier(0.32,0.72,0,1); }
.drawer.open { transform: translateX(0); }
@media (min-width: 1024px) { .drawer { width: 42%; max-width: none; } }

.drawer-content { display: flex; flex-direction: column; height: 100%; }
.drawer-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 18px 20px; border-bottom: 1px solid var(--color-border); flex-shrink: 0; }
.drawer-title { font-size: 17px; font-weight: 700; }
.drawer-sub { font-size: 12px; color: var(--color-text-muted); margin-top: 4px; }
.btn-close { background: none; border: none; color: var(--color-text-muted); font-size: 18px; cursor: pointer; }
.drawer-body { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }

.batch-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; padding: 14px; }
.batch-row-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; gap: 8px; }
.batch-farmer { font-size: 14px; font-weight: 700; color: var(--color-text); }
.batch-farmer-id {
  font-size: 10px; font-weight: 700; color: var(--color-text-muted);
  background: var(--color-card); border: 1px solid var(--color-border);
  border-radius: 4px; padding: 1px 6px; margin-left: 6px;
}
.batch-status { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; flex-shrink: 0; }
.btn-status { border: none; cursor: pointer; transition: opacity 0.15s; }
.btn-status:hover { opacity: 0.8; }
.btn-status:disabled { opacity: 0.5; cursor: default; }

.batch-grid { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden; }
.g-cell { padding: 8px 6px; text-align: center; border-bottom: 1px solid var(--color-border); border-right: 1px solid var(--color-border); }
.g-cell:nth-child(3n) { border-right: none; }
.g-label { font-size: 11px; color: var(--color-text-muted); background: var(--color-card); }
.g-value { font-size: 14px; font-weight: 700; color: var(--color-text); }
.g-span2 { grid-column: span 2; }
.order-grid-2col { display: grid; grid-template-columns: repeat(2, 1fr); border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden; }
.order-grid-2col .g-cell { border-right: 1px solid var(--color-border); }
.order-grid-2col .g-cell:nth-child(2n) { border-right: none; }
.loss-warn { color: var(--color-danger); }
.rate-good { color: var(--color-success); }
.rate-warn { color: var(--color-warning-bg); }
.rate-danger { color: var(--color-danger); }

.order-level-section { display: flex; flex-direction: column; gap: 12px; margin-top: 8px; padding-top: 12px; border-top: 1px dashed var(--color-border); }
.order-level-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; padding: 14px; }
.empty-small { font-size: 12px; color: var(--color-text-muted); padding: 4px 0; }
</style>
