<template>
  <div class="ic-view">
    <div class="tab-row">
      <button class="tab-btn" :class="{ active: activeTab === 'receiving' }" @click="activeTab = 'receiving'">{{ t('receivingOrder') }}</button>
      <button class="tab-btn" :class="{ active: activeTab === 'contract' }" @click="activeTab = 'contract'">{{ t('contractWork') }}</button>
    </div>

    <template v-if="activeTab === 'receiving'">
      <div class="list-header">
        <span class="list-count">{{ store.orders.length }} {{ t('records') }}</span>
        <div class="header-actions">
          <button
            class="btn-toggle"
            :class="{ active: statusFilter === 'UNLOCKED' }"
            @click="setFilter('UNLOCKED')"
          >{{ t('icUnlocked') }}</button>
          <button
            class="btn-toggle"
            :class="{ active: statusFilter === 'LOCKED' }"
            @click="setFilter('LOCKED')"
          >{{ t('icLocked') }}</button>
          <button
            class="btn-toggle"
            :class="{ active: statusFilter === 'ALL' }"
            @click="setFilter('ALL')"
          >{{ t('all') }}</button>
        </div>
      </div>

      <div v-if="store.loading && store.orders.length === 0" class="loading-state">
        <div class="spinner"></div>
      </div>

      <div v-else-if="store.orders.length === 0" class="empty-state">{{ t('icNoOrders') }}</div>

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
            <span class="badge" :class="order.costLocked ? 'badge-done' : 'badge-pending'">
              {{ order.costLocked ? t('icLocked') : t('icUnlocked') }}
            </span>
          </div>

          <div class="card-stats">
            <div class="stat-item">
              <span class="stat-label">{{ t('icBaseUnitPrice') }}</span>
              <span class="stat-value">{{ order.costUnitPrice !== null ? `฿${order.costUnitPrice.toFixed(2)}` : '—' }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">{{ t('icEstUnitPrice') }}</span>
              <span class="stat-value">{{ order.costUnitPriceEst !== null ? `฿${order.costUnitPriceEst.toFixed(2)}` : '—' }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">{{ t('icRealUnitPrice') }}</span>
              <span class="stat-value accent">{{ order.realUnitPrice !== null ? `฿${order.realUnitPrice.toFixed(2)}` : '—' }}</span>
            </div>
          </div>

          <div class="card-footer-row">
            <span>{{ t('icH02Weight') }}: {{ order.totalH02OutputWeight.toFixed(1) }}kg</span>
            <span>{{ t('amount') }}: ฿{{ order.totalH01H02Amount.toLocaleString() }}</span>
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
              <!-- 三欄位卡片 -->
              <div class="cost-fields-card">
                <div class="cf-row">
                  <span class="cf-label">{{ t('icBaseUnitPrice') }}</span>
                  <span class="cf-value">{{ store.currentOrder.costUnitPrice !== null ? `฿${store.currentOrder.costUnitPrice.toFixed(2)}/kg` : '—' }}</span>
                </div>
                <div class="cf-row">
                  <span class="cf-label">{{ t('icEstUnitPrice') }}</span>
                  <span class="cf-value">{{ store.currentOrder.costUnitPriceEst !== null ? `฿${store.currentOrder.costUnitPriceEst.toFixed(2)}/kg` : '—' }}</span>
                </div>
                <div class="cf-row">
                  <span class="cf-label">{{ t('icRealUnitPrice') }}</span>
                  <span class="cf-value accent">{{ store.currentOrder.realUnitPrice !== null ? `฿${store.currentOrder.realUnitPrice.toFixed(2)}/kg` : '—' }}</span>
                </div>
                <div class="cf-hint">{{ t('icRealUnitPriceHint') }}</div>
              </div>

              <!-- 鎖定操作 -->
              <div v-if="!store.currentOrder.costLocked" class="lock-form">
                <div class="lock-form-title">{{ t('icLockTitle') }}</div>
                <div class="lock-inputs">
                  <div class="field">
                    <label class="field-label">{{ t('icEstBasketQty') }}</label>
                    <input v-model.number="estBasketQty" type="number" min="0" class="num-input" />
                  </div>
                  <div class="field">
                    <label class="field-label">{{ t('icEstBoxQty') }}</label>
                    <input v-model.number="estBoxQty" type="number" min="0" class="num-input" />
                  </div>
                </div>
                <button class="btn-primary" :disabled="locking" @click="doLock">
                  {{ t('icLockButton') }}
                </button>
              </div>
              <div v-else class="locked-info">
                <div>{{ t('icLockedBy') }}: {{ store.currentOrder.costLockedByUsername }}</div>
                <div>{{ t('icLockedAt') }}: {{ formatDateTime(store.currentOrder.costLockedAt) }}</div>
                <button v-if="canUnlock" class="btn-secondary" :disabled="locking" @click="doUnlock">
                  {{ t('icUnlockButton') }}
                </button>
              </div>

              <!-- H01+H02 加工明細 -->
              <div class="section-title">{{ t('icProcessingDetails') }}</div>
              <div v-if="store.currentOrder.processingDetails.length === 0" class="empty-small">{{ t('noDetails') }}</div>
              <div v-else class="detail-table">
                <div class="dt-row dt-head">
                  <span>{{ t('processingType') }}</span><span>{{ t('employee') }}</span><span>{{ t('outputQtyLabel') }}</span><span>{{ t('amount') }}</span>
                </div>
                <div v-for="p in store.currentOrder.processingDetails" :key="p.id" class="dt-row">
                  <span>{{ p.itemType }}</span><span>{{ p.employeeName }}</span><span>{{ p.outputQty.toFixed(1) }}</span><span>฿{{ p.amount.toLocaleString() }}</span>
                </div>
              </div>

              <!-- K01/K02/K04 包裝明細 -->
              <div class="section-title">{{ t('icPackagingDetails') }}</div>
              <div v-if="store.currentOrder.packagingDetails.length === 0" class="empty-small">{{ t('noDetails') }}</div>
              <div v-else class="detail-table">
                <div class="dt-row dt-head">
                  <span>{{ t('colPackagingItem') }}</span><span>{{ t('employee') }}</span><span>{{ t('quantity') }}</span><span>{{ t('amount') }}</span>
                </div>
                <div v-for="p in store.currentOrder.packagingDetails" :key="p.id" class="dt-row">
                  <span>{{ p.itemName }}</span><span>{{ p.employeeName }}</span><span>{{ p.quantity.toFixed(0) }}</span><span>฿{{ p.amount.toLocaleString() }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 代工成本鎖定分頁 -->
    <template v-else>
      <div class="list-header">
        <span class="list-count">{{ contractList.length }} {{ t('records') }}</span>
        <div class="header-actions">
          <button class="btn-toggle" :class="{ active: contractFilter === 'UNLOCKED' }" @click="setContractFilter('UNLOCKED')">{{ t('icUnlocked') }}</button>
          <button class="btn-toggle" :class="{ active: contractFilter === 'LOCKED' }" @click="setContractFilter('LOCKED')">{{ t('icLocked') }}</button>
          <button class="btn-toggle" :class="{ active: contractFilter === 'ALL' }" @click="setContractFilter('ALL')">{{ t('all') }}</button>
        </div>
      </div>

      <div v-if="loadingContracts" class="loading-state"><div class="spinner"></div></div>
      <div v-else-if="contractList.length === 0" class="empty-state">{{ t('icNoOrders') }}</div>
      <div v-else class="order-grid">
        <div v-for="d in contractList" :key="d.id" class="order-card" style="cursor: default">
          <div class="card-top">
            <div class="card-avatar" :style="{ background: avatarColor(d.orderId) }">{{ d.productName.slice(0, 2) }}</div>
            <div class="card-top-text">
              <div class="card-id accent">{{ d.orderId }}</div>
              <div class="card-date">{{ formatDate(d.orderDate) }} · {{ d.supplierName }} · {{ d.productName }}</div>
            </div>
            <span class="badge" :class="d.costLocked ? 'badge-done' : 'badge-pending'">{{ d.costLocked ? t('icLocked') : t('icUnlocked') }}</span>
          </div>
          <div class="card-stats" style="grid-template-columns: repeat(2, 1fr);">
            <div class="stat-item">
              <span class="stat-label">{{ d.quantity }} × {{ d.weight.toFixed(1) }}kg × ฿{{ d.unitPrice.toFixed(1) }}</span>
              <span class="stat-value">฿{{ d.amount.toLocaleString() }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">{{ t('icBaseUnitPrice') }}</span>
              <span class="stat-value accent">{{ d.costUnitPrice !== null ? `฿${d.costUnitPrice.toFixed(2)}` : '—' }}</span>
            </div>
          </div>
          <div class="card-footer-row" v-if="d.costLocked">
            <span>{{ t('icLockedBy') }}: {{ d.costLockedByUsername }}</span>
            <button v-if="canUnlock" class="btn-secondary" style="padding: 4px 10px; font-size: 11px; margin-top: 0;" @click="doUnlockContract(d.id)">{{ t('icUnlockButton') }}</button>
          </div>
          <button v-else class="btn-primary" style="padding: 7px 14px; font-size: 12px;" @click="doLockContract(d.id)">{{ t('icLockButton') }}</button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useInventoryCostStore } from '../../../stores/inventoryCost'
import { useAuthStore } from '../../../stores/auth'
import { useToastStore } from '../../../stores/toast'
import type { InventoryCostOrder } from '../../../api/inventoryCost'
import { getContractCostDetails, lockContractCost, unlockContractCost } from '../../../api/inventoryCost'
import type { ContractCostDetail } from '../../../api/inventoryCost'

const { t } = useI18n()
const store = useInventoryCostStore()
const auth = useAuthStore()
const toast = useToastStore()

const canUnlock = computed(() => auth.user?.role === 'ADMIN')

const activeTab = ref<'receiving' | 'contract'>('receiving')

const drawerOpen = ref(false)
const selectedId = ref<string | null>(null)
const statusFilter = ref<'ALL' | 'LOCKED' | 'UNLOCKED'>('UNLOCKED')
const estBasketQty = ref(0)
const estBoxQty = ref(0)
const locking = ref(false)

// 代工成本鎖定
const contractList = ref<ContractCostDetail[]>([])
const contractFilter = ref<'ALL' | 'LOCKED' | 'UNLOCKED'>('UNLOCKED')
const loadingContracts = ref(false)

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
function formatDateTime(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('zh-TW')
}

function setFilter(f: 'ALL' | 'LOCKED' | 'UNLOCKED') {
  statusFilter.value = f
  store.loadOrders({ status: f })
}

async function openDetail(order: InventoryCostOrder) {
  selectedId.value = order.orderId
  await store.loadOrder(order.orderId)
  estBasketQty.value = 0
  estBoxQty.value = 0
  drawerOpen.value = true
}
function closeDrawer() {
  drawerOpen.value = false
  selectedId.value = null
}

async function doLock() {
  if (!store.currentOrder || locking.value) return
  locking.value = true
  try {
    await store.lock(store.currentOrder.orderId, estBasketQty.value, estBoxQty.value)
    await store.loadOrders({ status: statusFilter.value })
    toast.showToast(t('icLockSuccess'), 'success')
  } catch (e: any) {
    toast.showToast(e?.response?.data?.message || t('saveFailed'), 'danger')
  } finally {
    locking.value = false
  }
}

async function doUnlock() {
  if (!store.currentOrder || locking.value) return
  locking.value = true
  try {
    await store.unlock(store.currentOrder.orderId)
    await store.loadOrders({ status: statusFilter.value })
    toast.showToast(t('icUnlockSuccess'), 'success')
  } catch (e: any) {
    toast.showToast(e?.response?.data?.message || t('saveFailed'), 'danger')
  } finally {
    locking.value = false
  }
}

// ── 代工成本鎖定 ──

async function loadContracts() {
  loadingContracts.value = true
  try {
    contractList.value = (await getContractCostDetails(contractFilter.value)).data
  } catch {} finally {
    loadingContracts.value = false
  }
}

function setContractFilter(f: 'ALL' | 'LOCKED' | 'UNLOCKED') {
  contractFilter.value = f
  loadContracts()
}

async function doLockContract(detailId: number) {
  try {
    await lockContractCost(detailId)
    await loadContracts()
    toast.showToast(t('icLockSuccess'), 'success')
  } catch (e: any) {
    toast.showToast(e?.response?.data?.message || t('saveFailed'), 'danger')
  }
}

async function doUnlockContract(detailId: number) {
  try {
    await unlockContractCost(detailId)
    await loadContracts()
    toast.showToast(t('icUnlockSuccess'), 'success')
  } catch (e: any) {
    toast.showToast(e?.response?.data?.message || t('saveFailed'), 'danger')
  }
}

onMounted(() => {
  store.loadOrders({ status: statusFilter.value })
  loadContracts()
})
</script>

<style scoped>
.ic-view { padding: 16px; }
.tab-row { display: flex; gap: 8px; margin-bottom: 16px; }
.tab-btn { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 10px; padding: 10px 18px; color: var(--color-text-muted); font-size: 14px; font-weight: 600; cursor: pointer; }
.tab-btn.active { border-color: var(--color-accent); color: var(--color-accent); background: rgba(232,130,12,0.08); }
.list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px; }
.list-count { color: var(--color-text-muted); font-size: 13px; }
.header-actions { display: flex; align-items: center; gap: 8px; }
.btn-toggle { background: none; border: 1px solid var(--color-border); border-radius: 8px; padding: 8px 14px; color: var(--color-text-muted); font-size: 13px; cursor: pointer; }
.btn-toggle.active { border-color: var(--color-accent); color: var(--color-accent); background: var(--color-accent-glow); }

.order-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
.order-card { background: var(--color-card); border: 1px solid var(--color-border); border-radius: 14px; padding: 16px; cursor: pointer; transition: all 0.18s; }
.order-card:hover, .order-card.active { border-color: var(--color-accent); background: var(--color-card-hover); }

.card-top { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.card-avatar { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 13px; font-weight: 700; flex-shrink: 0; }
.card-top-text { min-width: 0; flex: 1; }
.card-id { font-size: 14px; font-weight: 700; }
.accent { color: var(--color-accent); }
.card-date { font-size: 12px; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.badge { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; flex-shrink: 0; }
.badge-done { background: rgba(45,212,191,0.12); color: var(--color-success); }
.badge-pending { background: rgba(248,113,113,0.12); color: var(--color-danger); }

.card-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden; margin-bottom: 10px; }
.stat-item { display: flex; flex-direction: column; gap: 2px; padding: 8px 6px; text-align: center; border-right: 1px solid var(--color-border); }
.stat-item:last-child { border-right: none; }
.stat-label { font-size: 10px; color: var(--color-text-muted); }
.stat-value { font-size: 13px; font-weight: 700; color: var(--color-text); }
.stat-value.accent { color: var(--color-accent); }

.card-footer-row { display: flex; justify-content: space-between; font-size: 12px; color: var(--color-text-muted); align-items: center; }

.loading-state { display: flex; justify-content: center; padding: 60px; }
.spinner { width: 32px; height: 32px; border: 3px solid var(--color-border); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-state { text-align: center; padding: 60px; color: var(--color-text-muted); font-size: 15px; }
.empty-small { font-size: 12px; color: var(--color-text-muted); padding: 4px 0; }

.drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 200; display: flex; justify-content: flex-end; }
.drawer { width: 100%; max-width: 560px; background: var(--color-drawer); height: 100%; overflow-y: auto; transform: translateX(100%); transition: transform 0.25s cubic-bezier(0.32,0.72,0,1); }
.drawer.open { transform: translateX(0); }
@media (min-width: 1024px) { .drawer { width: 42%; max-width: none; } }

.drawer-content { display: flex; flex-direction: column; height: 100%; }
.drawer-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 18px 20px; border-bottom: 1px solid var(--color-border); flex-shrink: 0; }
.drawer-title { font-size: 17px; font-weight: 700; }
.drawer-sub { font-size: 12px; color: var(--color-text-muted); margin-top: 4px; }
.btn-close { background: none; border: none; color: var(--color-text-muted); font-size: 18px; cursor: pointer; }
.drawer-body { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 16px; }

.cost-fields-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
.cf-row { display: flex; justify-content: space-between; align-items: center; }
.cf-label { font-size: 13px; color: var(--color-text-muted); }
.cf-value { font-size: 15px; font-weight: 700; color: var(--color-text); }
.cf-hint { font-size: 11px; color: var(--color-text-dim); margin-top: 4px; }

.lock-form { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 12px; }
.lock-form-title { font-size: 13px; font-weight: 700; color: var(--color-text); }
.lock-inputs { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 11px; color: var(--color-text-muted); }
.num-input { background: var(--color-card); border: 1px solid var(--color-border); border-radius: 8px; padding: 10px; color: var(--color-text); font-size: 14px; }
.btn-primary { background: var(--color-accent); color: #fff; border: none; border-radius: 10px; padding: 11px 22px; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-primary:disabled { opacity: 0.6; }
.btn-secondary { background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 10px; padding: 9px 18px; font-size: 13px; cursor: pointer; margin-top: 8px; }

.locked-info { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; padding: 14px; font-size: 13px; color: var(--color-text-muted); display: flex; flex-direction: column; gap: 6px; }

.section-title { font-size: 13px; font-weight: 700; color: var(--color-text); margin-top: 4px; }
.detail-table { border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden; }
.dt-row { display: grid; grid-template-columns: 1fr 1fr 0.8fr 0.8fr; gap: 6px; padding: 8px 10px; font-size: 12px; border-bottom: 1px solid var(--color-border); }
.dt-row:last-child { border-bottom: none; }
.dt-head { background: var(--color-surface); font-weight: 700; color: var(--color-text-muted); }
</style>
