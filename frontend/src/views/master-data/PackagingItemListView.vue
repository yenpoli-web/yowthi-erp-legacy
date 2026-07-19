<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import ConfirmDialog from '../../components/common/ConfirmDialog.vue'
import ImageUpload from '../../components/common/ImageUpload.vue'
import { usePackagingItemsStore } from '../../stores/packaging-items'
import { useAuthStore }           from '../../stores/auth'
import { useToastStore }          from '../../stores/toast'
import type { PackagingItem } from '../../types/master-data'

const { locale } = useI18n()
const isThai = computed(() => locale.value === 'th')
function L(th: string, zh: string) { return isThai.value ? th : zh }

const packagingItemsStore = usePackagingItemsStore()
const authStore           = useAuthStore()
const toastStore          = useToastStore()

const COLORS = ['#e8820c', '#2dd4bf', '#818cf8', '#f472b6', '#34d399', '#60a5fa']
function avatarColor(id: string) {
  const h = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return COLORS[h % COLORS.length]
}
function initials(name: string) { return name.charAt(0).toUpperCase() }
function resolveImageUrl(url: string) {
  return url
}

const showAddForm  = ref(false)
const selectedItem = ref<PackagingItem | null>(null)
const isEditMode   = ref(false)
const saving       = ref(false)

const showDeleteConfirm     = ref(false)
const showHardDeleteConfirm = ref(false)

const addForm = reactive({ id: '', name: '', wageRate: undefined as number | undefined, imageUrl: undefined as string | undefined, applicableTo: 'SALES_ORDER' as 'RECEIVING_ORDER' | 'SALES_ORDER' })

function resetAddForm() { addForm.id = ''; addForm.name = ''; addForm.wageRate = undefined; addForm.imageUrl = undefined; addForm.applicableTo = 'SALES_ORDER' }

function openAddForm() {
  resetAddForm()
  selectedItem.value = null
  showAddForm.value = true
}

function cancelAdd() { showAddForm.value = false }

async function saveAdd() {
  if (!addForm.id.trim() || !addForm.name.trim()) return
  saving.value = true
  try {
    await packagingItemsStore.createPackagingItem({
      id:       addForm.id.trim(),
      name:     addForm.name.trim(),
      wageRate: addForm.wageRate || undefined,
      imageUrl: addForm.imageUrl || undefined,
      applicableTo: addForm.applicableTo,
    })
    showAddForm.value = false
    toastStore.showToast(L('เพิ่มสำเร็จ', '新增成功'), 'success')
  } catch (e: unknown) {
    toastStore.showToast((e as any)?.response?.data?.message ?? L('เพิ่มล้มเหลว', '新增失敗'), 'danger')
  } finally {
    saving.value = false
  }
}

function selectItem(item: PackagingItem) {
  selectedItem.value = item
  isEditMode.value = false
}

function closeDrawer() {
  selectedItem.value = null
  isEditMode.value = false
}

const editForm = reactive({ name: '', wageRate: undefined as number | undefined, imageUrl: undefined as string | undefined, applicableTo: 'SALES_ORDER' as 'RECEIVING_ORDER' | 'SALES_ORDER' })

function startEdit() {
  if (!selectedItem.value) return
  editForm.name     = selectedItem.value.name
  editForm.wageRate = selectedItem.value.wageRate ?? undefined
  editForm.imageUrl = selectedItem.value.imageUrl ?? undefined
  editForm.applicableTo = selectedItem.value.applicableTo ?? 'SALES_ORDER'
  isEditMode.value = true
}

function cancelEdit() { isEditMode.value = false }

async function saveEdit() {
  if (!selectedItem.value || !editForm.name.trim()) return
  saving.value = true
  try {
    const updated = await packagingItemsStore.updatePackagingItem(selectedItem.value.id, {
      name:     editForm.name.trim(),
      wageRate: editForm.wageRate || undefined,
      imageUrl: editForm.imageUrl || undefined,
      applicableTo: editForm.applicableTo,
    })
    selectedItem.value = updated
    isEditMode.value = false
    toastStore.showToast(L('บันทึกสำเร็จ', '儲存成功'), 'success')
  } catch (e: unknown) {
    toastStore.showToast((e as any)?.response?.data?.message ?? L('บันทึกล้มเหลว', '儲存失敗'), 'danger')
  } finally {
    saving.value = false
  }
}

async function doSoftDelete() {
  if (!selectedItem.value) return
  try {
    await packagingItemsStore.softDeletePackagingItem(selectedItem.value.id)
    showDeleteConfirm.value = false
    closeDrawer()
    toastStore.showToast(L('ลบแล้ว', '已刪除'), 'success')
  } catch (e: any) {
    toastStore.showToast((e as any)?.response?.data?.message || L('ลบล้มเหลว', '刪除失敗'), 'danger')
  }
}

async function doHardDelete() {
  if (!selectedItem.value) return
  try {
    await packagingItemsStore.hardDeletePackagingItem(selectedItem.value.id)
    showHardDeleteConfirm.value = false
    closeDrawer()
    toastStore.showToast(L('ลบถาวรแล้ว', '已永久刪除'), 'success')
  } catch (e: any) {
    toastStore.showToast((e as any)?.response?.data?.message || L('ลบล้มเหลว', '刪除失敗'), 'danger')
  }
}

const showDeleted = ref(false)

async function toggleShowDeleted() {
  showDeleted.value = !showDeleted.value
  if (showDeleted.value) {
    await packagingItemsStore.fetchDeletedPackagingItems()
  }
}

async function doHardDeleteFromList(id: string) {
  try {
    await packagingItemsStore.hardDeletePackagingItem(id)
    await packagingItemsStore.fetchDeletedPackagingItems()
    toastStore.showToast(L('ลบถาวรแล้ว', '已永久刪除'), 'success')
  } catch (e: any) {
    toastStore.showToast((e as any)?.response?.data?.message || L('ลบล้มเหลว', '刪除失敗'), 'danger')
  }
}

onMounted(() => packagingItemsStore.fetchPackagingItems())
</script>

<template>
  <div class="packaging-item-layout">

      <div v-if="showAddForm" class="add-wrap">
        <form class="add-form" @submit.prevent="saveAdd">
          <h2 class="form-title">{{ L('เพิ่มรายการ', '新增項目') }}</h2>

          <div class="form-group">
            <label class="form-label">{{ L('รหัส', '項目ID') }} <span class="required">*</span></label>
            <input v-model="addForm.id" class="form-input" :placeholder="L('ใส่รหัส', '輸入項目ID')" required />
          </div>
          <div class="form-group">
            <label class="form-label">{{ L('ชื่อ', '名稱') }} <span class="required">*</span></label>
            <input v-model="addForm.name" class="form-input" :placeholder="L('ใส่ชื่อ', '輸入名稱')" required />
          </div>
          <div class="form-group">
            <label class="form-label">{{ L('อัตราค่าจ้าง (ไม่บังคับ)', '工資率（選填）') }}</label>
            <input v-model.number="addForm.wageRate" type="number" step="0.1" min="0" class="form-input" :placeholder="L('ไม่กรอก = ต้องกรอกเองก่อน', '不填則需手動輸入')" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ L('ประเภทที่ใช้งาน', '適用對象') }} <span class="required">*</span></label>
            <div class="radio-group">
              <label class="radio-option">
                <input type="radio" v-model="addForm.applicableTo" value="SALES_ORDER" />
                {{ L('ใบสั่งขาย', '銷售單') }}
              </label>
              <label class="radio-option">
                <input type="radio" v-model="addForm.applicableTo" value="RECEIVING_ORDER" />
                {{ L('ใบรับสินค้า', '進貨單') }}
              </label>
            </div>
            <p class="field-hint">{{ L('หลังสร้างแล้วไม่แน่นำให้เปลิ่ยนจะกระทบการเชื่อมต่อของใบบรรจุภัณฑ์', '建立後不建議輕易改動，會影響包裝明細的關聯流程') }}</p>
          </div>
          <div class="form-group">
            <label class="form-label">{{ L('รูปภาพ', '圖片') }}</label>
            <ImageUpload v-model="addForm.imageUrl" :disabled="saving" />
          </div>

          <div class="form-footer">
            <button type="submit" class="btn btn-primary" :disabled="!addForm.id.trim() || !addForm.name.trim() || saving">
              <i class="pi pi-check"></i> {{ L('บันทึก', '儲存') }}
            </button>
            <button type="button" class="btn btn-secondary" @click="cancelAdd">{{ L('ยกเลิก', '取消') }}</button>
          </div>
        </form>
      </div>

      <div v-else class="packaging-item-main">
        <div class="list-panel">
          <div class="list-header">
            <span class="list-count">
              {{ showDeleted ? packagingItemsStore.deletedPackagingItems.length : packagingItemsStore.packagingItems.length }} {{ L('รายการ', '筆') }}
            </span>
            <div class="header-actions">
              <button class="btn-toggle-deleted" :class="{ active: showDeleted }" @click="toggleShowDeleted">
                🗑 {{ showDeleted ? L('ซ่อนที่ลบแล้ว', '隱藏已刪除') : L('แสดงที่ลบแล้ว', '顯示已刪除') }}
              </button>
              <button class="btn-add" @click="openAddForm">
                <i class="pi pi-plus"></i>
                <span class="btn-add-text">{{ L('เพิ่มรายการ', '新增項目') }}</span>
              </button>
            </div>
          </div>

          <template v-if="!showDeleted">
            <div v-if="packagingItemsStore.loading" class="list-state">
              <i class="pi pi-spin pi-spinner"></i>
            </div>
            <div v-else-if="packagingItemsStore.packagingItems.length === 0" class="list-state">
              <i class="pi pi-box"></i>
              <p>{{ L('ไม่มีข้อมูล', '尚無資料') }}</p>
            </div>
            <div v-else class="packaging-item-grid">
              <button
                v-for="item in packagingItemsStore.packagingItems"
                :key="item.id"
                class="packaging-item-card"
                :class="{ active: selectedItem?.id === item.id }"
                @click="selectItem(item)"
              >
                <span class="card-avatar" :style="item.imageUrl ? {} : { background: avatarColor(item.id) }">
                  <img v-if="item.imageUrl" class="card-avatar--img" :src="resolveImageUrl(item.imageUrl)" :alt="item.name" />
                  <template v-else>{{ initials(item.name) }}</template>
                </span>
                <div class="card-body">
                  <span class="card-id-badge">{{ item.id }}</span>
                  <p class="card-name">{{ item.name }}</p>
                  <p v-if="item.wageRate" class="card-wage">{{ L('ค่าจ้าง', '工資') }} {{ item.wageRate }}</p>
                </div>
              </button>
            </div>
          </template>

          <template v-else>
            <div v-if="packagingItemsStore.loading" class="list-state">
              <i class="pi pi-spin pi-spinner"></i>
            </div>
            <div v-else-if="packagingItemsStore.deletedPackagingItems.length === 0" class="list-state">
              <i class="pi pi-trash"></i>
              <p>{{ L('ไม่มีรายการที่ลบแล้ว', '沒有已刪除的記錄') }}</p>
            </div>
            <div v-else class="packaging-item-grid">
              <div
                v-for="item in packagingItemsStore.deletedPackagingItems"
                :key="item.id"
                class="packaging-item-card deleted"
              >
                <span class="card-avatar" :style="item.imageUrl ? { filter: 'grayscale(1)' } : { background: avatarColor(item.id), filter: 'grayscale(1)' }">
                  <img v-if="item.imageUrl" class="card-avatar--img" :src="resolveImageUrl(item.imageUrl)" :alt="item.name" />
                  <template v-else>{{ initials(item.name) }}</template>
                </span>
                <div class="card-body">
                  <span class="card-id-badge">{{ item.id }}</span>
                  <p class="card-name">{{ item.name }}</p>
                  <p class="deleted-meta">🗑 {{ (item as any).deletedAt ? new Date((item as any).deletedAt).toLocaleDateString() : '' }}</p>
                  <button
                    v-if="authStore.role === 'ADMIN'"
                    class="btn btn-danger-solid btn-sm"
                    @click="doHardDeleteFromList(item.id)"
                  >{{ L('ลบถาวร', '永久刪除') }}</button>
                </div>
              </div>
            </div>
          </template>
        </div>

        <div v-if="selectedItem" class="detail-drawer" :class="{ open: !!selectedItem }">
          <div class="drawer-header">
            <span
              class="drawer-avatar"
              :style="selectedItem.imageUrl ? {} : { background: avatarColor(selectedItem.id) }"
            >
              <img v-if="selectedItem.imageUrl" class="drawer-avatar--img" :src="resolveImageUrl(selectedItem.imageUrl)" :alt="selectedItem.name" />
              <template v-else>{{ initials(selectedItem.name) }}</template>
            </span>
            <div class="drawer-title-area">
              <span class="drawer-name">{{ selectedItem.name }}</span>
              <span class="drawer-id-badge">{{ selectedItem.id }}</span>
            </div>
            <button class="icon-btn" @click="closeDrawer"><i class="pi pi-times"></i></button>
          </div>

          <div class="drawer-body">
            <template v-if="isEditMode">
              <div class="form-group">
                <label class="form-label">{{ L('รหัส', '項目ID') }}</label>
                <input :value="selectedItem.id" class="form-input" disabled />
              </div>
              <div class="form-group">
                <label class="form-label">{{ L('ชื่อ', '名稱') }} <span class="required">*</span></label>
                <input v-model="editForm.name" class="form-input" :placeholder="L('ชื่อ', '名稱')" />
              </div>
              <div class="form-group">
                <label class="form-label">{{ L('อัตราค่าจ้าง (ไม่บังคับ)', '工資率（選填）') }}</label>
                <input v-model.number="editForm.wageRate" type="number" step="0.1" min="0" class="form-input" :placeholder="L('ไม่กรอก = ต้องกรอกเองก่อน', '不填則需手動輸入')" />
              </div>
              <div class="form-group">
                <label class="form-label">{{ L('ประเภทที่ใช้งาน', '適用對象') }}</label>
                <div class="radio-group">
                  <label class="radio-option">
                    <input type="radio" v-model="editForm.applicableTo" value="SALES_ORDER" />
                    {{ L('ใบสั่งขาย', '銷售單') }}
                  </label>
                  <label class="radio-option">
                    <input type="radio" v-model="editForm.applicableTo" value="RECEIVING_ORDER" />
                    {{ L('ใบรับสินค้า', '進貨單') }}
                  </label>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">{{ L('รูปภาพ', '圖片') }}</label>
                <ImageUpload v-model="editForm.imageUrl" :disabled="saving" />
              </div>
            </template>
          </div>

          <div class="drawer-footer">
            <template v-if="!isEditMode">
              <button class="btn btn-primary" @click="startEdit">✏️ {{ L('แก้ไข', '編輯') }}</button>
              <button class="btn btn-danger-outline" @click="showDeleteConfirm = true">🗑 {{ L('ลบ', '刪除') }}</button>
              <button
                v-if="authStore.role === 'ADMIN'"
                class="btn btn-danger-solid"
                @click="showHardDeleteConfirm = true"
              >⚠️ {{ L('ลบถาวร', '永久刪除') }}</button>
            </template>
            <template v-else>
              <button class="btn btn-primary" :disabled="!editForm.name.trim() || saving" @click="saveEdit">
                💾 {{ L('บันทึก', '儲存') }}
              </button>
              <button class="btn btn-secondary" @click="cancelEdit">{{ L('ยกเลิก', '取消') }}</button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <ConfirmDialog
      :show="showDeleteConfirm"
      :title="L('ยืนยันการลบ', '確認刪除')"
      :message="L(`ต้องการลบรายการ「${selectedItem?.name}」ใช่ไหม?`, `確定要刪除項目「${selectedItem?.name}」嗎？`)"
      @confirm="doSoftDelete"
      @cancel="showDeleteConfirm = false"
    />
    <ConfirmDialog
      :show="showHardDeleteConfirm"
      :title="L('ลบถาวร', '永久刪除')"
      :message="L(`การดำเนินการนี้จะลบรายการ「${selectedItem?.name}」อย่างถาวรและไม่สามารถกู้คืนได้`, `此操作將永久刪除項目「${selectedItem?.name}」，且無法復原。確定繼續嗎？`)"
      @confirm="doHardDelete"
      @cancel="showHardDeleteConfirm = false"
    />
</template>

<style scoped>
.packaging-item-layout { height: 100%; display: flex; flex-direction: column; overflow: hidden; }
.add-wrap { flex: 1; overflow-y: auto; display: flex; justify-content: center; padding: 20px 16px; }
.add-form { width: 100%; max-width: 520px; }
.form-title { font-size: 18px; font-weight: 700; color: var(--color-text); margin-bottom: 20px; }
.packaging-item-main { flex: 1; display: flex; overflow: hidden; position: relative; }
.list-panel { flex: 1; overflow-y: auto; padding: 12px 16px; min-width: 0; }
.list-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.list-count { font-size: 13px; color: var(--color-text-muted); }
.btn-add { display: flex; align-items: center; gap: 6px; padding: 8px 12px; background: var(--color-accent); border: none; border-radius: 8px; color: #fff; font-size: 13px; font-weight: 600; transition: background 0.15s; }
.btn-add:hover { background: var(--color-accent-dim); }
.btn-add-text { display: none; }
@media (min-width: 540px) { .btn-add-text { display: inline; } }
.list-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 0; color: var(--color-text-dim); font-size: 14px; }
.list-state .pi { font-size: 40px; }
.packaging-item-grid { display: grid; grid-template-columns: 1fr; gap: 8px; }
@media (min-width: 540px) { .packaging-item-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1280px) { .packaging-item-grid { grid-template-columns: repeat(3, 1fr); } }
.packaging-item-card { display: flex; align-items: flex-start; gap: 12px; padding: 12px; background: var(--color-card); border: 1px solid var(--color-border); border-radius: 10px; color: var(--color-text); text-align: left; width: 100%; transition: background 0.15s, border-color 0.15s; }
.packaging-item-card:hover { background: var(--color-card-hover); border-color: var(--color-text-dim); }
.packaging-item-card.active { border-color: var(--color-accent); background: var(--color-card-hover); }
.card-avatar { width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; color: #fff; flex-shrink: 0; position: relative; overflow: hidden; }
.card-avatar--img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.card-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.card-id-badge { display: inline-block; background: var(--color-accent); color: #fff; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 4px; align-self: flex-start; }
.card-name { font-size: 15px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-wage { font-size: 11px; color: var(--color-text-muted); }
.radio-group { display: flex; gap: 16px; margin-top: 4px; }
.radio-option { display: flex; align-items: center; gap: 6px; font-size: 14px; color: var(--color-text); cursor: pointer; }
.field-hint { font-size: 11px; color: var(--color-text-dim); margin-top: 6px; }
.detail-drawer { position: absolute; inset: 0; z-index: 50; background: var(--color-bg); border-left: 1px solid var(--color-border); display: flex; flex-direction: column; overflow: hidden; transform: translateX(100%); transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1); }
.detail-drawer.open { transform: translateX(0); }
@media (min-width: 1024px) { .detail-drawer { position: static; width: 42%; flex-shrink: 0; transform: none !important; background: var(--color-surface); } }
.drawer-header { flex-shrink: 0; display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--color-border); background: var(--color-surface); }
.drawer-avatar { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; color: #fff; flex-shrink: 0; position: relative; overflow: hidden; }
.drawer-avatar--img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.drawer-title-area { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.drawer-name { font-size: 16px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.drawer-id-badge { display: inline-block; background: var(--color-accent); color: #fff; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 4px; align-self: flex-start; }
.icon-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: transparent; border: none; border-radius: 8px; color: var(--color-text-muted); font-size: 14px; flex-shrink: 0; transition: color 0.15s, background 0.15s; }
.icon-btn:hover { color: var(--color-text); background: var(--color-surface-hover); }
.drawer-body { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 0; }
.drawer-footer { flex-shrink: 0; padding: 12px 16px; border-top: 1px solid var(--color-border); background: var(--color-surface); display: flex; gap: 8px; flex-wrap: wrap; }
.form-group { margin-bottom: 14px; }
.form-label { display: block; font-size: 12px; color: var(--color-text-muted); margin-bottom: 6px; }
.required { color: var(--color-danger); }
.form-input { width: 100%; padding: 10px 12px; background: var(--color-card); border: 1px solid var(--color-border); border-radius: 8px; color: var(--color-text); font-size: 14px; outline: none; transition: border-color 0.15s; }
.form-input:focus { border-color: var(--color-accent); }
.form-input::placeholder { color: var(--color-text-dim); }
.form-input:disabled { opacity: 0.55; cursor: not-allowed; }
.form-footer { display: flex; gap: 8px; margin-top: 24px; }
.btn { height: 42px; padding: 0 18px; border-radius: 8px; font-size: 14px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; border: none; transition: opacity 0.15s, background 0.15s; white-space: nowrap; }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-primary { background: var(--color-accent); color: #fff; }
.btn-primary:hover:not(:disabled) { background: var(--color-accent-dim); }
.btn-secondary { background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-text-muted); }
.btn-secondary:hover { color: var(--color-text); border-color: var(--color-text-muted); }
.btn-danger-outline { background: transparent; border: 1px solid var(--color-danger); color: var(--color-danger); }
.btn-danger-outline:hover { background: rgba(248, 113, 113, 0.1); }
.btn-danger-solid { background: var(--color-danger-bg); color: #fff; }
.btn-danger-solid:hover { opacity: 0.88; }
.header-actions { display: flex; align-items: center; gap: 8px; }
.btn-toggle-deleted { background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-text-muted); border-radius: 8px; padding: 8px 12px; font-size: 13px; cursor: pointer; }
.btn-toggle-deleted.active { border-color: var(--color-danger); color: var(--color-danger); background: rgba(248,113,113,0.08); }
.packaging-item-card.deleted { opacity: 0.65; border-style: dashed; border-color: var(--color-danger); cursor: default; }
.deleted-meta { font-size: 11px; color: var(--color-danger); margin-top: 4px; }
.btn-sm { height: 32px; padding: 0 10px; font-size: 12px; margin-top: 6px; }
</style>
