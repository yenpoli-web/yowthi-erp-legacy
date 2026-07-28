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
      <div class="stat-box"><div class="stat-label">{{ t('details') }}</div><div class="stat-value">{{ activeDetails.length }}</div></div>
      <div class="stat-box"><div class="stat-label">{{ t('totalQtyLabel') }}</div><div class="stat-value accent">{{ totalQty }}</div></div>
    </div>

    <!-- 入庫明細 -->
    <div class="section-title">{{ t('invDetails') }}</div>
    <div v-if="activeDetails.length === 0" class="empty-block">{{ t('noDetails') }}</div>
    <div v-else class="detail-list">
      <div v-for="d in activeDetails" :key="d.id" class="detail-card">
        <div class="detail-avatar">
          <img v-if="d.product?.imageUrl" :src="d.product.imageUrl" />
          <span v-else>{{ d.product?.name?.slice(0, 2) }}</span>
        </div>
        <div class="detail-info">
          <div class="detail-product">{{ d.product?.name }}</div>
          <div class="detail-qty">× <span class="accent">{{ d.quantity }}</span></div>
          <div class="detail-price">{{ t('weight') }} {{ Number(d.weight ?? 0).toFixed(1) }}kg &middot; {{ t('unitPrice') }} ฿{{ Number(d.unitPrice ?? 0).toFixed(1) }} &middot; {{ t('amount') }} <span class="accent">฿{{ (d.amount ?? 0).toLocaleString() }}</span></div>
        </div>
        <div class="detail-actions" v-if="canEdit">
          <button class="btn-sm" @click="openEdit(d)">✏️ {{ t('editDetail') }}</button>
          <button class="btn-sm danger" @click="confirmSoftDelete(d.id)">🗑 {{ t('softDelete') }}</button>
          <button class="btn-sm danger" v-if="canAdmin" @click="confirmHardDelete(d.id)">⚠️ {{ t('hardDelete') }}</button>
        </div>
      </div>
    </div>

    <!-- 編輯明細 Modal -->
    <div v-if="editingId !== null" class="inline-add-form" style="margin: 0 12px 12px;">
      <div class="product-label" style="margin-bottom: 8px;">{{ t('editDetail') }}</div>
      <button class="product-select-btn" @click="showEditProductModal = true">
        <span class="product-label">{{ t('product') }}</span>
        <span class="product-value accent">{{ editProductName }}</span>
      </button>
      <button class="qty-select-btn" @click="editQtyModalOpen = true">
        <span class="product-label">{{ t('salesQty') }}</span>
        <span class="product-value accent">{{ editQty }}</span>
      </button>
      <button class="qty-select-btn" @click="openEditWeightModal">
        <span class="product-label">{{ t('weight') }}</span>
        <span class="product-value accent">{{ editWeight || '0' }} kg</span>
      </button>
      <button class="qty-select-btn" @click="editPriceModalOpen = true">
        <span class="product-label">{{ t('unitPrice') }}</span>
        <span class="product-value accent">฿{{ editUnitPrice || '0' }}</span>
      </button>
      <button class="btn-save" @click="submitEdit" :disabled="!canSubmitEdit || saving">
        {{ saving ? t('saving') : '✓ ' + t('save') }}
      </button>
      <button class="btn-cancel-inline" @click="editingId = null">{{ t('cancel') }}</button>
      <TouchSelectorModal v-if="showEditProductModal" :title="t('selectProduct')" :items="products"
        :model-value="editProductId"
        @select="p => { editProductId = p.id; editProductName = p.name; editProductUnitWeight = p.unitWeight ? Number(p.unitWeight) : 0; showEditProductModal = false }"
        @close="showEditProductModal = false" />
      <NumericInputModal :show="editQtyModalOpen" mode="integer" :label="t('salesQty')"
        :model-value="editQty"
        @confirm="v => { editQty = v; editQtyModalOpen = false }"
        @close="editQtyModalOpen = false" />
      <NumericInputModal :show="editWeightModalOpen" mode="decimal" :label="t('weight')"
        :model-value="editWeight"
        @confirm="v => { editWeight = v; editWeightModalOpen = false }"
        @close="editWeightModalOpen = false" />
      <NumericInputModal :show="editPriceModalOpen" mode="decimal" :label="t('unitPrice')"
        :model-value="editUnitPrice"
        @confirm="v => { editUnitPrice = v; editPriceModalOpen = false }"
        @close="editPriceModalOpen = false" />
    </div>

    <div class="add-inline" v-if="canEdit && !showInlineAdd">
      <button class="btn-add" @click="showInlineAdd = true">+ {{ t('addDetail') }}</button>
    </div>
    <div v-if="showInlineAdd" class="inline-add-form">
      <button class="product-select-btn" @click="showProductModal = true">
        <span class="product-label">{{ t('product') }}</span>
        <span class="product-value" :class="{ accent: inlineProductId }">{{ inlineProductName || t('selectProduct') }}</span>
      </button>
      <button class="qty-select-btn" @click="modalOpen = true">
        <span class="product-label">{{ t('salesQty') }}</span>
        <span class="product-value" :class="{ accent: inlineQty }">{{ inlineQty || '0' }}</span>
      </button>
      <button class="qty-select-btn" @click="openInlineWeightModal">
        <span class="product-label">{{ t('weight') }}</span>
        <span class="product-value" :class="{ accent: inlineWeight }">{{ inlineWeight || '0' }} kg</span>
      </button>
      <button class="qty-select-btn" @click="priceModalOpen = true">
        <span class="product-label">{{ t('unitPrice') }}</span>
        <span class="product-value" :class="{ accent: inlineUnitPrice }">฿{{ inlineUnitPrice || '0' }}</span>
      </button>
      <button class="btn-save" @click="submitInline" :disabled="!canInline || saving">
        {{ saving ? t('saving') : '✓ ' + t('save') }}
      </button>
      <button class="btn-cancel-inline" @click="showInlineAdd = false">{{ t('cancel') }}</button>
      <TouchSelectorModal v-if="showProductModal" :title="t('selectProduct')" :items="products"
        :model-value="inlineProductId"
        @select="p => { inlineProductId = p.id; inlineProductName = p.name; inlineProductUnitWeight = p.unitWeight ? Number(p.unitWeight) : 0; if (inlineProductUnitWeight && !inlineWeight) { inlineWeight = inlineProductUnitWeight.toFixed(1) }; showProductModal = false }"
        @close="showProductModal = false" />
      <NumericInputModal :show="modalOpen" mode="integer" :label="t('salesQty')"
        :model-value="inlineQty"
        @confirm="v => { inlineQty = v; if (inlineProductUnitWeight && !inlineWeight) { inlineWeight = inlineProductUnitWeight.toFixed(1) }; modalOpen = false }"
        @close="modalOpen = false" />
      <NumericInputModal :show="inlineWeightModalOpen" mode="decimal" :label="t('weight')"
        :model-value="inlineWeight"
        @confirm="v => { inlineWeight = v; inlineWeightModalOpen = false }"
        @close="inlineWeightModalOpen = false" />
      <NumericInputModal :show="priceModalOpen" mode="decimal" :label="t('unitPrice')"
        :model-value="inlineUnitPrice"
        @confirm="v => { inlineUnitPrice = v; priceModalOpen = false }"
        @close="priceModalOpen = false" />
    </div>

    <!-- 關聯進貨單 -->
    <div class="section-title" style="margin-top:20px">{{ t('linkedBatches') }}</div>
    <div v-if="!order.receivingOrders?.length" class="empty-block">{{ t('noLinkedBatches') }}</div>
    <div v-else class="receiving-list">
      <div v-for="link in order.receivingOrders" :key="link.receivingOrderId" class="receiving-card">
        <div class="rc-left">
          <div class="rc-avatar">
            <img v-if="link.receivingOrder?.receivingItem?.imageUrl" :src="link.receivingOrder.receivingItem.imageUrl" />
            <span v-else>{{ link.receivingOrder?.receivingItem?.name?.slice(0, 2) }}</span>
          </div>
          <div class="rc-info">
            <div class="rc-id accent">{{ link.receivingOrderId }}</div>
            <div class="rc-date">{{ formatDate(link.receivingOrder?.orderDate) }}</div>
            <div class="rc-item">{{ link.receivingOrder?.receivingItem?.name }}</div>
          </div>
        </div>
        <div class="rc-right">
          <span class="sales-done-badge" :class="{ done: link.receivingOrder?.salesDone }">
            {{ link.receivingOrder?.salesDone ? '✓ ' + t('invSalesDone') : t('invSalesPending') }}
          </span>
          <button v-if="canEdit && !link.receivingOrder?.salesDone" class="btn-sales-done" @click="doMarkSalesDone(link.receivingOrderId, true)">{{ t('invMarkSalesDone') }}</button>
          <button v-if="canEdit && link.receivingOrder?.salesDone" class="btn-sales-undo" @click="doMarkSalesDone(link.receivingOrderId, false)">{{ t('invUndoSalesDone') }}</button>
          <button v-if="canEdit" class="btn-remove-link" @click="confirmRemoveLink(link.receivingOrderId)">✕</button>
        </div>
      </div>
    </div>
    <div class="add-inline" v-if="canEdit">
      <button class="btn-add" @click="openOrderSelector">+ {{ t('selectReceivingOrders') }}</button>
    </div>

    <!-- 關聯代工單 -->
    <div class="section-title" style="margin-top:20px">{{ t('linkedContractOrders') }}</div>
    <div v-if="!order.contractOrders?.length" class="empty-block">{{ t('noLinkedContractOrders') }}</div>
    <div v-else class="receiving-list">
      <div v-for="link in order.contractOrders" :key="link.contractOrderId" class="receiving-card">
        <div class="rc-left">
          <div class="rc-avatar contract-avatar">🔧</div>
          <div class="rc-info">
            <div class="rc-id accent">{{ link.contractOrderId }}</div>
            <div class="rc-date">{{ formatDate(link.contractOrder?.orderDate) }}</div>
            <div v-for="d in link.contractOrder?.details" :key="d.id" class="rc-item">
              {{ d.supplier?.name }} × {{ d.product?.name }} × {{ Number(d.quantity) }}件
            </div>
          </div>
        </div>
        <div class="rc-right">
          <span class="sales-done-badge" :class="{ done: link.contractOrder?.salesDone }">
            {{ link.contractOrder?.salesDone ? '✓ ' + t('invSalesDone') : t('invSalesPending') }}
          </span>
          <button v-if="canEdit && !link.contractOrder?.salesDone" class="btn-sales-done" @click="doMarkContractSalesDone(link.contractOrderId, true)">{{ t('invMarkSalesDone') }}</button>
          <button v-if="canEdit && link.contractOrder?.salesDone" class="btn-sales-undo" @click="doMarkContractSalesDone(link.contractOrderId, false)">{{ t('invUndoSalesDone') }}</button>
          <button v-if="canEdit" class="btn-remove-link" @click="confirmRemoveContract(link.contractOrderId)">✕</button>
        </div>
      </div>
    </div>
    <div class="add-inline" v-if="canEdit">
      <button class="btn-add" @click="openContractSelector">+ {{ t('selectContractOrders') }}</button>
    </div>

    <div class="drawer-footer">
      <button v-if="canEdit" class="btn-soft-delete" @click="confirmSoftDeleteOrder">🗑 {{ t('softDelete') }}</button>
      <button v-if="canAdmin" class="btn-hard-delete" @click="confirmHardDeleteOrder">⚠️ {{ t('hardDelete') }}</button>
    </div>
  </div>

  <!-- 選取進貨單 Modal -->
  <div v-if="showOrderSelector" class="modal-overlay" @click.self="showOrderSelector = false">
    <div class="modal-box">
      <div class="modal-header">
        <span>{{ t('selectReceivingOrders') }}</span>
        <button class="btn-close-modal" @click="showOrderSelector = false">✕</button>
      </div>
      <div class="modal-body">
        <div v-if="loadingAvailable" class="loading-small"><div class="spinner-small"></div></div>
        <div v-else-if="availableOrders.length === 0" class="empty-small">{{ t('invNoAvailable') }}</div>
        <div v-else>
          <div v-for="avOrder in availableOrders" :key="avOrder.id"
            class="order-select-card" :class="{ selected: pendingOrderIds.has(avOrder.id) }"
            @click="togglePending(avOrder.id)">
            <div class="osc-left">
              <div class="osc-avatar">
                <img v-if="avOrder.receivingItem?.imageUrl" :src="avOrder.receivingItem.imageUrl" />
                <span v-else>{{ avOrder.receivingItem?.name?.slice(0, 2) }}</span>
              </div>
              <div class="osc-info">
                <div class="osc-id accent">{{ avOrder.id }}</div>
                <div class="osc-date">{{ formatDate(avOrder.orderDate) }}</div>
              </div>
            </div>
            <div class="osc-check" v-if="pendingOrderIds.has(avOrder.id)">✓</div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" @click="showOrderSelector = false">{{ t('cancel') }}</button>
        <button class="btn-primary" @click="submitOrderLink" :disabled="pendingOrderIds.size === 0 || saving">
          {{ t('confirm') }} ({{ pendingOrderIds.size }})
        </button>
      </div>
    </div>
  </div>

  <!-- 選取代工單 Modal -->
  <div v-if="showContractSelector" class="modal-overlay" @click.self="showContractSelector = false">
    <div class="modal-box">
      <div class="modal-header">
        <span>{{ t('selectContractOrders') }}</span>
        <button class="btn-close-modal" @click="showContractSelector = false">✕</button>
      </div>
      <div class="modal-body">
        <div v-if="loadingContracts" class="loading-small"><div class="spinner-small"></div></div>
        <div v-else-if="availableContractOrders.length === 0" class="empty-small">{{ t('noContractOrders') }}</div>
        <div v-else>
          <div v-for="co in availableContractOrders" :key="co.id"
            class="order-select-card" :class="{ selected: pendingContractIds.has(co.id) }"
            @click="togglePendingContract(co.id)">
            <div class="osc-left">
              <div class="osc-avatar contract-avatar">🔧</div>
              <div class="osc-info">
                <div class="osc-id accent">{{ co.id }}</div>
                <div class="osc-date">{{ formatDate(co.orderDate) }}</div>
                <div v-for="d in co.details" :key="d.id" class="osc-item">
                  {{ d.supplier?.name }} × {{ d.product?.name }} × {{ Number(d.quantity) }}件
                </div>
              </div>
            </div>
            <div class="osc-check" v-if="pendingContractIds.has(co.id)">✓</div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" @click="showContractSelector = false">{{ t('cancel') }}</button>
        <button class="btn-primary" @click="submitContractLink" :disabled="pendingContractIds.size === 0 || saving">
          {{ t('confirm') }} ({{ pendingContractIds.size }})
        </button>
      </div>
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
  createInventoryDetail, updateInventoryDetail, softDeleteInventoryDetail, hardDeleteInventoryDetail,
  softDeleteInventoryOrder, hardDeleteInventoryOrder,
  addInventoryReceivingOrders, removeInventoryReceivingOrder,
  addInventoryContractOrders, removeInventoryContractOrder,
  getAvailableReceivingOrders, getAvailableContractOrders,
  markSalesDone, markContractSalesDone,
} from '../../../api/inventory'
import TouchSelectorModal from '../../../components/common/TouchSelectorModal.vue'
import NumericInputModal from '../../../components/common/NumericInputModal.vue'
import ConfirmDialog from '../../../components/common/ConfirmDialog.vue'

const { t } = useI18n()
const toast = useToastStore()
const auth = useAuthStore()
const props = defineProps<{ order: any; canEdit: boolean; canAdmin: boolean }>()
const emit = defineEmits<{ close: []; refresh: [] }>()

const activeDetails = computed(() => (props.order?.details || []).filter((d: any) => !d.isDeleted))
const totalQty = computed(() => activeDetails.value.reduce((s: number, d: any) => s + d.quantity, 0))

function formatDate(d: string) {
  if (!d) return ''
  const [y, m, day] = d.slice(0, 10).split('-')
  return `${parseInt(day)}/${parseInt(m)}/${y.slice(2)}`
}

// 行內新增
const showInlineAdd = ref(false)
const inlineProductId = ref('')
const inlineProductName = ref('')
const inlineProductUnitWeight = ref(0)
const inlineQty = ref('')
const inlineWeight = ref('')
const inlineUnitPrice = ref('')
const showProductModal = ref(false)
const modalOpen = ref(false)
const inlineWeightModalOpen = ref(false)
const priceModalOpen = ref(false)
const saving = ref(false)
const products = ref<any[]>([])
const canInline = computed(() => !!inlineProductId.value && parseInt(inlineQty.value) > 0 && parseFloat(inlineWeight.value) > 0 && parseFloat(inlineUnitPrice.value) > 0)

function openInlineWeightModal() {
  if (!inlineWeight.value && inlineProductUnitWeight.value) {
    inlineWeight.value = inlineProductUnitWeight.value.toFixed(1)
  }
  inlineWeightModalOpen.value = true
}

function pressInlineKey(k: string) {
  if (k === 'C') { inlineQty.value = ''; return }
  if (k === '←') { inlineQty.value = inlineQty.value.slice(0, -1); return }
  if (inlineQty.value === '0') { inlineQty.value = k; return }
  inlineQty.value += k
}
async function submitInline() {
  saving.value = true
  try {
    await createInventoryDetail({ orderId: props.order.id, productId: inlineProductId.value, quantity: parseInt(inlineQty.value), weight: parseFloat(inlineWeight.value), unitPrice: parseFloat(inlineUnitPrice.value) })
    toast.showToast(t('detailAdded'), 'success')
    inlineProductId.value = ''; inlineProductName.value = ''; inlineProductUnitWeight.value = 0; inlineQty.value = ''; inlineWeight.value = ''; inlineUnitPrice.value = ''
    showInlineAdd.value = false; emit('refresh')
  } catch (e: any) { toast.showToast(e?.response?.data?.message || t('saveFailed'), 'error') }
  finally { saving.value = false }
}

// 編輯現有明細
const editingId = ref<number | null>(null)
const editProductId = ref('')
const editProductName = ref('')
const editProductUnitWeight = ref(0)
const editQty = ref('')
const editWeight = ref('')
const editUnitPrice = ref('')
const showEditProductModal = ref(false)
const editQtyModalOpen = ref(false)
const editWeightModalOpen = ref(false)
const editPriceModalOpen = ref(false)
const canSubmitEdit = computed(() => !!editProductId.value && parseInt(editQty.value) > 0 && parseFloat(editWeight.value) > 0 && parseFloat(editUnitPrice.value) > 0)

function openEditWeightModal() {
  if (!editWeight.value && editProductUnitWeight.value) {
    editWeight.value = editProductUnitWeight.value.toFixed(1)
  }
  editWeightModalOpen.value = true
}

function openEdit(d: any) {
  editingId.value = d.id
  editProductId.value = d.productId
  editProductName.value = d.product?.name || ''
  editProductUnitWeight.value = d.product?.unitWeight ? Number(d.product.unitWeight) : 0
  editQty.value = String(d.quantity)
  editWeight.value = String(Number(d.weight ?? 0))
  editUnitPrice.value = String(Number(d.unitPrice ?? 0))
  showInlineAdd.value = false
}

async function submitEdit() {
  if (editingId.value === null) return
  saving.value = true
  try {
    await updateInventoryDetail(editingId.value, {
      productId: editProductId.value,
      quantity: parseInt(editQty.value),
      weight: parseFloat(editWeight.value),
      unitPrice: parseFloat(editUnitPrice.value),
    })
    toast.showToast(t('saved'), 'success')
    editingId.value = null
    emit('refresh')
  } catch (e: any) { toast.showToast(e?.response?.data?.message || t('saveFailed'), 'error') }
  finally { saving.value = false }
}

// 確認對話框
const confirmDialog = ref<{ open: boolean; message: string; onConfirm: () => void }>({ open: false, message: '', onConfirm: () => {} })
function confirmSoftDelete(id: number) {
  confirmDialog.value = { open: true, message: t('confirmDeleteDetail'), onConfirm: async () => { confirmDialog.value.open = false; try { await softDeleteInventoryDetail(id); toast.showToast(t('deleted'), 'success'); emit('refresh') } catch (e: any) { toast.showToast(e?.response?.data?.message || t('deleteFailed'), 'error') } } }
}
function confirmHardDelete(id: number) {
  confirmDialog.value = { open: true, message: t('confirmHardDelete'), onConfirm: async () => { confirmDialog.value.open = false; try { await hardDeleteInventoryDetail(id); toast.showToast(t('hardDeleted'), 'success'); emit('refresh') } catch (e: any) { toast.showToast(e?.response?.data?.message || t('deleteFailed'), 'error') } } }
}
function confirmSoftDeleteOrder() {
  confirmDialog.value = { open: true, message: t('confirmDeleteOrder'), onConfirm: async () => { confirmDialog.value.open = false; try { await softDeleteInventoryOrder(props.order.id); toast.showToast(t('deleted'), 'success'); emit('refresh'); emit('close') } catch (e: any) { toast.showToast(e?.response?.data?.message || t('deleteFailed'), 'error') } } }
}
function confirmHardDeleteOrder() {
  confirmDialog.value = { open: true, message: t('confirmHardDelete'), onConfirm: async () => { confirmDialog.value.open = false; try { await hardDeleteInventoryOrder(props.order.id); toast.showToast(t('hardDeleted'), 'success'); emit('refresh'); emit('close') } catch (e: any) { toast.showToast(e?.response?.data?.message || t('deleteFailed'), 'error') } } }
}

// 進貨單關聯
const showOrderSelector = ref(false)
const availableOrders = ref<any[]>([])
const pendingOrderIds = ref(new Set<string>())
const loadingAvailable = ref(false)

async function openOrderSelector() {
  pendingOrderIds.value = new Set(); showOrderSelector.value = true; loadingAvailable.value = true
  try { availableOrders.value = (await getAvailableReceivingOrders()).data }
  catch {} finally { loadingAvailable.value = false }
}
function togglePending(id: string) {
  const s = new Set(pendingOrderIds.value); if (s.has(id)) s.delete(id); else s.add(id); pendingOrderIds.value = s
}
async function submitOrderLink() {
  saving.value = true
  try {
    await addInventoryReceivingOrders(props.order.id, Array.from(pendingOrderIds.value))
    toast.showToast(t('batchLinked'), 'success'); showOrderSelector.value = false; emit('refresh')
  } catch (e: any) { toast.showToast(e?.response?.data?.message || t('saveFailed'), 'error') }
  finally { saving.value = false }
}
function confirmRemoveLink(receivingOrderId: string) {
  confirmDialog.value = { open: true, message: t('confirmRemoveBatch'), onConfirm: async () => { confirmDialog.value.open = false; try { await removeInventoryReceivingOrder(props.order.id, receivingOrderId); toast.showToast(t('batchRemoved'), 'success'); emit('refresh') } catch (e: any) { toast.showToast(e?.response?.data?.message || t('deleteFailed'), 'error') } } }
}
async function doMarkSalesDone(receivingOrderId: string, done: boolean) {
  try { await markSalesDone(receivingOrderId, done); toast.showToast(done ? t('invSalesDone') : t('invUndoSalesDone'), 'success'); emit('refresh') }
  catch (e: any) { toast.showToast(e?.response?.data?.message || t('saveFailed'), 'error') }
}
async function doMarkContractSalesDone(contractOrderId: string, done: boolean) {
  try { await markContractSalesDone(contractOrderId, done); toast.showToast(done ? t('invSalesDone') : t('invUndoSalesDone'), 'success'); emit('refresh') }
  catch (e: any) { toast.showToast(e?.response?.data?.message || t('saveFailed'), 'error') }
}
// 代工單關聯
const showContractSelector = ref(false)
const availableContractOrders = ref<any[]>([])
const pendingContractIds = ref(new Set<string>())
const loadingContracts = ref(false)

async function openContractSelector() {
  pendingContractIds.value = new Set(); showContractSelector.value = true; loadingContracts.value = true
  try { availableContractOrders.value = (await getAvailableContractOrders()).data }
  catch {} finally { loadingContracts.value = false }
}
function togglePendingContract(id: string) {
  const s = new Set(pendingContractIds.value); if (s.has(id)) s.delete(id); else s.add(id); pendingContractIds.value = s
}
async function submitContractLink() {
  saving.value = true
  try {
    await addInventoryContractOrders(props.order.id, Array.from(pendingContractIds.value))
    toast.showToast(t('batchLinked'), 'success'); showContractSelector.value = false; emit('refresh')
  } catch (e: any) { toast.showToast(e?.response?.data?.message || t('saveFailed'), 'error') }
  finally { saving.value = false }
}
function confirmRemoveContract(contractOrderId: string) {
  confirmDialog.value = { open: true, message: t('confirmRemoveBatch'), onConfirm: async () => { confirmDialog.value.open = false; try { await removeInventoryContractOrder(props.order.id, contractOrderId); toast.showToast(t('batchRemoved'), 'success'); emit('refresh') } catch (e: any) { toast.showToast(e?.response?.data?.message || t('deleteFailed'), 'error') } } }
}

async function loadProducts() {
  try {
    const headers = { Authorization: `Bearer ${auth.token}` }
    const res = await fetch('/api/master-data/products', { headers })
    if (res.ok) products.value = (await res.json()).filter((p: any) => !p.isDeleted)
  } catch {}
}
onMounted(loadProducts)
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
.detail-card { display: flex; align-items: center; gap: 12px; background: var(--color-card); border: 1px solid var(--color-border); border-radius: 12px; padding: 14px; }
.detail-avatar { width: 44px; height: 44px; border-radius: 8px; background: var(--color-surface); overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; }
.detail-avatar img { width: 100%; height: 100%; object-fit: cover; }
.detail-info { flex: 1; }
.detail-product { font-size: 14px; font-weight: 700; }
.detail-qty { font-size: 13px; color: var(--color-text-muted); margin-top: 2px; }
.detail-price { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }
.detail-actions { display: flex; gap: 6px; }
.btn-sm { background: none; border: 1px solid var(--color-border); border-radius: 7px; padding: 5px 10px; font-size: 12px; color: var(--color-text-muted); cursor: pointer; transition: all 0.15s; }
.btn-sm:hover { border-color: var(--color-accent); color: var(--color-text); }
.btn-sm.danger:hover { border-color: var(--color-danger); color: var(--color-danger); }
.add-inline { padding: 10px 12px; }
.btn-add { width: 100%; background: none; border: 1px dashed var(--color-border); border-radius: 10px; padding: 12px; font-size: 14px; font-weight: 600; color: var(--color-text-muted); cursor: pointer; }
.btn-add:hover { border-color: var(--color-accent); color: var(--color-accent); }
.inline-add-form { margin: 0 12px 12px; background: var(--color-surface); border: 1px solid var(--color-accent); border-radius: 12px; padding: 14px; }
.product-select-btn { width: 100%; display: flex; justify-content: space-between; align-items: center; background: var(--color-card); border: 1px solid var(--color-border); border-radius: 10px; padding: 12px 14px; cursor: pointer; margin-bottom: 12px; }
.qty-select-btn { width: 100%; display: flex; justify-content: space-between; align-items: center; background: var(--color-card); border: 1px solid var(--color-border); border-radius: 10px; padding: 12px 14px; cursor: pointer; margin-bottom: 12px; }
.btn-save { width: 100%; background: var(--color-accent); color: #fff; border: none; border-radius: 8px; padding: 10px; font-size: 14px; font-weight: 700; cursor: pointer; margin-bottom: 8px; }
.btn-save:disabled { opacity: 0.4; cursor: not-allowed; }
.product-label { font-size: 10px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; }
.product-value { font-size: 14px; font-weight: 700; color: var(--color-text-muted); }
.product-value.accent { color: var(--color-text); }
.inline-keypad { margin-top: 8px; }
.inline-keypad-display { font-size: 28px; font-weight: 700; text-align: right; padding: 6px 12px; border-bottom: 1px solid var(--color-border); margin-bottom: 8px; }
.inline-keypad-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; }
.ik-btn { height: 48px; display: flex; align-items: center; justify-content: center; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; color: var(--color-text); font-size: 18px; cursor: pointer; }
.ik-secondary { color: var(--color-text-muted); font-size: 14px; }
.ik-confirm { background: var(--color-accent); border-color: var(--color-accent); color: #fff; font-size: 14px; font-weight: 700; }
.ik-confirm:disabled { opacity: 0.35; cursor: not-allowed; }
.ik-span3 { grid-column: span 3; }
.btn-cancel-inline { width: 100%; margin-top: 8px; background: none; border: 1px solid var(--color-border); border-radius: 8px; padding: 8px; color: var(--color-text-muted); cursor: pointer; font-size: 13px; }
.receiving-list { padding: 0 12px; display: flex; flex-direction: column; gap: 8px; }
.receiving-card { background: var(--color-card); border: 1px solid var(--color-border); border-radius: 12px; padding: 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.rc-left { display: flex; align-items: center; gap: 10px; flex: 1; }
.rc-avatar { width: 40px; height: 40px; border-radius: 8px; background: var(--color-surface); overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
.rc-avatar img { width: 100%; height: 100%; object-fit: cover; }
.rc-info { flex: 1; }
.rc-id { font-size: 12px; font-weight: 700; }
.rc-date { font-size: 11px; color: var(--color-text-muted); }
.rc-item { font-size: 12px; }
.rc-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
.sales-done-badge { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; background: rgba(125,125,125,0.15); color: var(--color-text-muted); }
.sales-done-badge.done { background: rgba(45,212,191,0.15); color: var(--color-success); }
.btn-sales-done { background: var(--color-accent); color: #fff; border: none; border-radius: 6px; padding: 5px 10px; font-size: 11px; font-weight: 700; cursor: pointer; }
.btn-sales-undo { background: none; border: 1px solid var(--color-text-muted); color: var(--color-text-muted); border-radius: 6px; padding: 5px 10px; font-size: 11px; cursor: pointer; }
.btn-remove-link { background: none; border: none; color: var(--color-danger); font-size: 16px; cursor: pointer; }
.contract-detail-chip { display: block; font-size: 11px; color: var(--color-text-muted); margin-top: 2px; }
.drawer-footer { position: sticky; bottom: 0; display: flex; gap: 10px; padding: 14px 16px; background: var(--color-drawer); border-top: 1px solid var(--color-border); }
.btn-soft-delete, .btn-hard-delete { flex: 1; background: none; border-radius: 8px; padding: 10px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid var(--color-danger); color: var(--color-danger); }
.btn-soft-delete:hover { background: rgba(248,113,113,0.1); }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 300; display: flex; align-items: flex-end; }
.modal-box { width: 100%; max-height: 80vh; background: var(--color-drawer); border-radius: 16px 16px 0 0; display: flex; flex-direction: column; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px; border-bottom: 1px solid var(--color-border); font-size: 15px; font-weight: 700; }
.btn-close-modal { background: none; border: none; font-size: 18px; color: var(--color-text-muted); cursor: pointer; }
.modal-body { flex: 1; overflow-y: auto; padding: 12px 16px; }
.modal-footer { display: flex; gap: 10px; padding: 12px 16px; border-top: 1px solid var(--color-border); }
.btn-primary { flex: 1; background: var(--color-accent); color: #fff; border: none; border-radius: 10px; padding: 12px; font-size: 14px; font-weight: 700; cursor: pointer; }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-secondary { flex: 1; background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 10px; padding: 12px; font-size: 14px; cursor: pointer; }
.order-select-card { display: flex; align-items: center; justify-content: space-between; background: var(--color-card); border: 2px solid var(--color-border); border-radius: 12px; padding: 12px; cursor: pointer; transition: all 0.18s; margin-bottom: 8px; }
.order-select-card.selected { border-color: var(--color-accent); background: var(--color-card-hover); }
.osc-left { display: flex; align-items: center; gap: 10px; flex: 1; }
.osc-avatar { width: 38px; height: 38px; border-radius: 8px; background: var(--color-surface); overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
.osc-avatar img { width: 100%; height: 100%; object-fit: cover; }
.osc-info { flex: 1; }
.osc-id { font-size: 12px; font-weight: 700; }
.osc-date { font-size: 11px; color: var(--color-text-muted); }
.osc-check { color: var(--color-accent); font-size: 18px; font-weight: 700; }
.loading-small { display: flex; justify-content: center; padding: 30px; }
.spinner-small { width: 24px; height: 24px; border: 2px solid var(--color-border); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-small { text-align: center; padding: 24px; color: var(--color-text-muted); font-size: 14px; }
</style>
