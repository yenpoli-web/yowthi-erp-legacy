<template>
  <div class="pur-list">
    <div class="list-header">
      <span class="list-count">{{ showDeleted ? store.deletedOrders.length : store.orders.length }} {{ t('records') }}</span>
      <div class="header-actions">
        <button class="btn-toggle" :class="{ active: showDeleted }" @click="toggleDeleted">
          🗑 {{ showDeleted ? t('hideDeleted') : t('showDeleted') }}
        </button>
        <button class="btn-primary" @click="createOpen = !createOpen" v-if="canEdit && !showDeleted">
          {{ createOpen ? '✕' : `+ ${t('newOrder')}` }}
        </button>
      </div>
    </div>

    <!-- 快速建立 -->
    <div v-if="createOpen && !showDeleted" class="create-inline">
      <div class="create-label">{{ t('selectDate') }}</div>
      <div class="date-selects">
        <select v-model="newDay" class="date-sel">
          <option v-for="d in 31" :key="d" :value="d">{{ d }}</option>
        </select>
        <span class="date-sep">/</span>
        <select v-model="newMonth" class="date-sel">
          <option v-for="m in 12" :key="m" :value="m">{{ m }}</option>
        </select>
        <span class="date-sep">/</span>
        <select v-model="newYear" class="date-sel date-sel-year">
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
        <button class="btn-create-order" @click="doCreate" :disabled="creating">
          {{ creating ? t('saving') : t('create') }}
        </button>
      </div>
    </div>

    <div v-if="store.loading" class="loading-state"><div class="spinner"></div></div>

    <template v-else-if="!showDeleted">
      <div v-if="store.orders.length === 0" class="empty-state">{{ t('noOrders') }}</div>
      <div v-else class="order-grid">
        <div v-for="order in store.orders" :key="order.id"
          class="order-card" :class="{ active: selectedId === order.id }"
          @click="openDetail(order)">
          <div class="card-id accent">{{ order.id }}</div>
          <div class="card-date">{{ formatDate(order.orderDate) }}</div>
          <div class="card-chips">
            <span v-for="d in activeDetails(order)" :key="d.id" class="detail-chip">
              {{ d.item?.name }}
            </span>
          </div>
          <div class="card-footer">
            <span class="card-count">{{ activeDetails(order).length }} {{ t('items') }}</span>
            <span class="card-amount accent">฿{{ totalAmount(order).toLocaleString() }}</span>
          </div>
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

    <div class="drawer-overlay" v-if="drawerOpen" @click.self="closeDrawer">
      <div class="drawer" :class="{ open: drawerOpen }">
        <PurchaseDetailDrawer
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePurchaseStore } from '../../../stores/purchase'
import { useAuthStore } from '../../../stores/auth'
import { useToastStore } from '../../../stores/toast'
import { createPurchaseOrder, hardDeletePurchaseOrder } from '../../../api/purchase'
import PurchaseDetailDrawer from './PurchaseDetailDrawer.vue'
import ConfirmDialog from '../../../components/common/ConfirmDialog.vue'

const { t } = useI18n()
const store = usePurchaseStore()
const auth = useAuthStore()
const toast = useToastStore()

const createOpen = ref(false)
const creating = ref(false)
const drawerOpen = ref(false)
const showDeleted = ref(false)
const selectedId = ref<string | null>(null)
const hardDeleteDialog = ref<{ open: boolean; orderId: string }>({ open: false, orderId: '' })

const canEdit = computed(() => ['ADMIN', 'OFFICE'].includes(auth.user?.role))
const canAdmin = computed(() => auth.user?.role === 'ADMIN')

const now = new Date()
const newDay = ref(now.getDate())
const newMonth = ref(now.getMonth() + 1)
const newYear = ref(now.getFullYear())
const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)

function formatDate(d: string) {
  if (!d) return ''
  const [y, m, day] = d.slice(0, 10).split('-')
  return `${parseInt(day)}/${parseInt(m)}/${y.slice(2)}`
}
function activeDetails(order: any) { return (order.details || []).filter((d: any) => !d.isDeleted) }
function totalAmount(order: any) { return activeDetails(order).reduce((s: number, d: any) => s + Number(d.amount), 0) }

async function doCreate() {
  creating.value = true
  try {
    const dateStr = `${newYear.value}-${String(newMonth.value).padStart(2, '0')}-${String(newDay.value).padStart(2, '0')}`
    const res = await createPurchaseOrder({ orderDate: dateStr })
    const orderId = res.data.id
    createOpen.value = false
    await store.loadOrders()
    await store.loadOrder(orderId)
    selectedId.value = orderId
    drawerOpen.value = true
    toast.showToast(t('savedSuccess'), 'success')
  } catch (e: any) {
    toast.showToast(e?.response?.data?.message || t('saveFailed'), 'error')
  } finally { creating.value = false }
}

async function openDetail(order: any) {
  selectedId.value = order.id
  await store.loadOrder(order.id)
  drawerOpen.value = true
}
function closeDrawer() { drawerOpen.value = false; selectedId.value = null }

async function onRefresh() {
  await store.loadOrders()
  if (selectedId.value) await store.loadOrder(selectedId.value)
}
async function toggleDeleted() {
  showDeleted.value = !showDeleted.value
  if (showDeleted.value) await store.loadDeletedOrders()
}
function doHardDelete(order: any) { hardDeleteDialog.value = { open: true, orderId: order.id } }
async function executeHardDelete() {
  try {
    await hardDeletePurchaseOrder(hardDeleteDialog.value.orderId)
    hardDeleteDialog.value.open = false
    await store.loadDeletedOrders()
    toast.showToast(t('hardDeleted'), 'success')
  } catch (e: any) { toast.showToast(e?.response?.data?.message || t('deleteFailed'), 'error'); hardDeleteDialog.value.open = false }
}

onMounted(() => store.loadOrders())
</script>

<style scoped>
.pur-list { padding: 16px; }
.list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px; }
.list-count { color: var(--color-text-muted); font-size: 13px; }
.header-actions { display: flex; gap: 8px; }
.btn-primary { background: var(--color-accent); color: #fff; border: none; border-radius: 10px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-primary:hover { opacity: 0.88; }
.btn-toggle { background: none; border: 1px solid var(--color-border); border-radius: 8px; padding: 8px 14px; color: var(--color-text-muted); font-size: 13px; cursor: pointer; }
.btn-toggle.active { border-color: var(--color-danger); color: var(--color-danger); background: rgba(248,113,113,0.08); }
.create-inline { background: var(--color-surface); border: 1px solid var(--color-accent); border-radius: 12px; padding: 14px 16px; margin-bottom: 16px; }
.create-label { font-size: 11px; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px; }
.date-selects { display: flex; align-items: center; gap: 8px; }
.date-sel { flex: 1; background: var(--color-card); border: 1px solid var(--color-border); border-radius: 8px; padding: 10px 6px; color: var(--color-text); font-size: 15px; appearance: none; text-align: center; cursor: pointer; }
.date-sel:focus { outline: none; border-color: var(--color-accent); }
.date-sel-year { flex: 1.8; }
.date-sep { font-size: 18px; font-weight: 700; color: var(--color-text-muted); }
.btn-create-order { flex-shrink: 0; background: var(--color-accent); color: #fff; border: none; border-radius: 8px; padding: 10px 16px; font-size: 14px; font-weight: 700; cursor: pointer; }
.btn-create-order:disabled { opacity: 0.4; cursor: not-allowed; }
.order-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
.order-card { background: var(--color-card); border: 1px solid var(--color-border); border-radius: 14px; padding: 16px; cursor: pointer; transition: all 0.18s; }
.order-card:hover, .order-card.active { border-color: var(--color-accent); background: var(--color-card-hover); }
.deleted-card { cursor: default; opacity: 0.75; border-style: dashed; }
.card-id { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
.accent { color: var(--color-accent); }
.muted { color: var(--color-text-muted); }
.card-date { font-size: 12px; color: var(--color-text-muted); margin-bottom: 10px; }
.card-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; min-height: 24px; }
.detail-chip { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 6px; background: rgba(232,130,12,0.1); color: var(--color-accent); }
.card-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--color-border); padding-top: 10px; }
.card-count { font-size: 12px; color: var(--color-text-muted); }
.card-amount { font-size: 15px; font-weight: 700; }
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
