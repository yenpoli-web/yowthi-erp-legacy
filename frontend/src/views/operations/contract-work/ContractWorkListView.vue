<template>
  <div class="cw-list">
    <ContractWorkCreateForm v-if="createOpen" @close="createOpen = false" @created="onCreated" />

    <template v-else>
      <div class="list-header">
        <span class="list-count">{{ showDeleted ? store.deletedOrders.length : store.orders.length }} {{ t('records') }}</span>
        <div class="header-actions">
          <button class="btn-toggle" :class="{ active: showDeleted }" @click="toggleDeleted">
            🗑 {{ showDeleted ? t('hideDeleted') : t('showDeleted') }}
          </button>
          <button class="btn-primary" @click="createOpen = true" v-if="canEdit && !showDeleted">
            + {{ t('newOrder') }}
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
            <div class="card-stats">
              <span class="stat">
                <span class="stat-label">{{ t('details') }}</span>
                <span class="stat-value">{{ activeCount(order) }}</span>
              </span>
              <span class="stat">
                <span class="stat-label">{{ t('totalAmount') }}</span>
                <span class="stat-value accent">฿{{ calcTotal(order) }}</span>
              </span>
            </div>
            <div class="card-suppliers">
              <span v-for="d in uniqueSuppliers(order)" :key="d" class="sup-chip">{{ d }}</span>
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
              <button class="btn-hard-delete" @click="doHardDelete(order)">⚠️ {{ t('hardDelete') }}</button>
            </div>
          </div>
        </div>
      </template>

      <!-- 抽屜 -->
      <div class="drawer-overlay" v-if="drawerOpen" @click.self="closeDrawer">
        <div class="drawer" :class="{ open: drawerOpen }">
          <ContractWorkDetailDrawer
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
import { useContractWorkStore } from '../../../stores/contractWork'
import { useAuthStore } from '../../../stores/auth'
import { useToastStore } from '../../../stores/toast'
import { hardDeleteContractWorkOrder } from '../../../api/contractWork'
import ContractWorkCreateForm from './ContractWorkCreateForm.vue'
import ContractWorkDetailDrawer from './ContractWorkDetailDrawer.vue'
import ConfirmDialog from '../../../components/common/ConfirmDialog.vue'

const { t } = useI18n()
const store = useContractWorkStore()
const auth = useAuthStore()
const toast = useToastStore()

const createOpen = ref(false)
const drawerOpen = ref(false)
const showDeleted = ref(false)
const selectedId = ref<string | null>(null)
const hardDeleteDialog = ref<{ open: boolean; orderId: string }>({ open: false, orderId: '' })

const canEdit = computed(() => ['ADMIN', 'OFFICE'].includes(auth.user?.role))
const canAdmin = computed(() => auth.user?.role === 'ADMIN')

function formatDate(d: string) {
  if (!d) return ''
  const [y, m, day] = d.slice(0, 10).split('-')
  return `${parseInt(day)}/${parseInt(m)}/${y.slice(2)}`
}
function activeCount(order: any) { return (order.details || []).filter((d: any) => !d.isDeleted).length }
function calcTotal(order: any) {
  return (order.details || []).filter((d: any) => !d.isDeleted)
    .reduce((s: number, d: any) => s + Number(d.amount), 0).toLocaleString()
}
function uniqueSuppliers(order: any) {
  const seen = new Set<string>()
  const result: string[] = []
  for (const d of (order.details || []).filter((d: any) => !d.isDeleted)) {
    const key = d.supplier?.id
    if (key && !seen.has(key)) {
      seen.add(key)
      result.push(`${d.supplier.id} · ${d.supplier.name}`)
    }
  }
  return result
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
  if (orderId) { await store.loadOrder(orderId); drawerOpen.value = true; selectedId.value = orderId }
}
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
    await hardDeleteContractWorkOrder(hardDeleteDialog.value.orderId)
    hardDeleteDialog.value.open = false
    await store.loadDeletedOrders()
    toast.showToast(t('hardDeleted'), 'success')
  } catch (e: any) { toast.showToast(e?.response?.data?.message || t('deleteFailed'), 'error'); hardDeleteDialog.value.open = false }
}

onMounted(() => store.loadOrders())
</script>

<style scoped>
.cw-list { padding: 16px; }
.list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px; }
.list-count { color: var(--color-text-muted); font-size: 13px; }
.header-actions { display: flex; gap: 8px; }
.btn-primary { background: var(--color-accent); color: #fff; border: none; border-radius: 10px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-primary:hover { opacity: 0.88; }
.btn-toggle { background: none; border: 1px solid var(--color-border); border-radius: 8px; padding: 8px 14px; color: var(--color-text-muted); font-size: 13px; cursor: pointer; transition: all 0.15s; }
.btn-toggle.active { border-color: var(--color-danger); color: var(--color-danger); background: rgba(248,113,113,0.08); }
.order-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
.order-card { background: var(--color-card); border: 1px solid var(--color-border); border-radius: 14px; padding: 16px; cursor: pointer; transition: all 0.18s; }
.order-card:hover, .order-card.active { border-color: var(--color-accent); background: var(--color-card-hover); }
.deleted-card { cursor: default; opacity: 0.75; border-style: dashed; }
.card-id { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
.accent { color: var(--color-accent); }
.muted { color: var(--color-text-muted); }
.card-date { font-size: 12px; color: var(--color-text-muted); margin-bottom: 10px; }
.card-stats { display: flex; gap: 0; background: var(--color-surface); border-radius: 8px; border: 1px solid var(--color-border); overflow: hidden; margin-bottom: 10px; }
.stat { display: flex; flex-direction: column; align-items: center; gap: 3px; flex: 1; padding: 8px 4px; border-right: 1px solid var(--color-border); }
.stat:last-child { border-right: none; }
.stat-label { font-size: 10px; color: var(--color-text-muted); text-transform: uppercase; }
.stat-value { font-size: 14px; font-weight: 700; }
.card-suppliers { display: flex; flex-wrap: wrap; gap: 5px; }
.sup-chip { font-size: 11px; padding: 2px 8px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 6px; color: var(--color-text-muted); }
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
