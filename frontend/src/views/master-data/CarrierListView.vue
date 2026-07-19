<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import ConfirmDialog from '../../components/common/ConfirmDialog.vue'
import ImageUpload from '../../components/common/ImageUpload.vue'
import { useCarriersStore } from '../../stores/carriers'
import { useAuthStore }     from '../../stores/auth'
import { useToastStore }    from '../../stores/toast'
import type { Carrier } from '../../types/master-data'

const { locale } = useI18n()
const isThai = computed(() => locale.value === 'th')
function L(th: string, zh: string) { return isThai.value ? th : zh }

const carriersStore = useCarriersStore()
const authStore     = useAuthStore()
const toastStore    = useToastStore()

const COLORS = ['#e8820c', '#2dd4bf', '#818cf8', '#f472b6', '#34d399', '#60a5fa']
function avatarColor(id: string) {
  const h = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return COLORS[h % COLORS.length]
}
function initials(name: string) { return name.charAt(0).toUpperCase() }
function resolveImageUrl(url: string) {
  return url
}

const showAddForm      = ref(false)
const selectedCarrier  = ref<Carrier | null>(null)
const isEditMode       = ref(false)
const saving           = ref(false)

const showDeleteConfirm     = ref(false)
const showHardDeleteConfirm = ref(false)

const addForm = reactive({
  id: '', name: '', phone: '', address: '', bankName: '', bankAccount: '', imageUrl: undefined as string | undefined,
})

function resetAddForm() {
  addForm.id = ''; addForm.name = ''; addForm.phone = ''
  addForm.address = ''; addForm.bankName = ''; addForm.bankAccount = ''; addForm.imageUrl = undefined
}

function openAddForm() {
  resetAddForm()
  selectedCarrier.value = null
  showAddForm.value = true
}

function cancelAdd() { showAddForm.value = false }

async function saveAdd() {
  if (!addForm.id.trim() || !addForm.name.trim()) return
  saving.value = true
  try {
    await carriersStore.createCarrier({
      id:          addForm.id.trim(),
      name:        addForm.name.trim(),
      phone:       addForm.phone.trim()       || undefined,
      address:     addForm.address.trim()     || undefined,
      bankName:    addForm.bankName.trim()    || undefined,
      bankAccount: addForm.bankAccount.trim() || undefined,
      imageUrl:    addForm.imageUrl           || undefined,
    })
    showAddForm.value = false
    toastStore.showToast(L('เพิ่มสำเร็จ', '新增成功'), 'success')
  } catch (e: unknown) {
    toastStore.showToast((e as any)?.response?.data?.message ?? L('เพิ่มล้มเหลว', '新增失敗'), 'danger')
  } finally {
    saving.value = false
  }
}

function selectCarrier(carrier: Carrier) {
  selectedCarrier.value = carrier
  isEditMode.value = false
}

function closeDrawer() {
  selectedCarrier.value = null
  isEditMode.value = false
}

const editForm = reactive({
  name: '', phone: '', address: '', bankName: '', bankAccount: '', imageUrl: undefined as string | undefined,
})

function startEdit() {
  if (!selectedCarrier.value) return
  const c = selectedCarrier.value
  editForm.name        = c.name
  editForm.phone       = c.phone       ?? ''
  editForm.address     = c.address     ?? ''
  editForm.bankName    = c.bankName    ?? ''
  editForm.bankAccount = c.bankAccount ?? ''
  editForm.imageUrl    = c.imageUrl    ?? undefined
  isEditMode.value = true
}

function cancelEdit() { isEditMode.value = false }

async function saveEdit() {
  if (!selectedCarrier.value || !editForm.name.trim()) return
  saving.value = true
  try {
    const updated = await carriersStore.updateCarrier(selectedCarrier.value.id, {
      name:        editForm.name.trim(),
      phone:       editForm.phone.trim()       || undefined,
      address:     editForm.address.trim()     || undefined,
      bankName:    editForm.bankName.trim()    || undefined,
      bankAccount: editForm.bankAccount.trim() || undefined,
      imageUrl:    editForm.imageUrl           || undefined,
    })
    selectedCarrier.value = updated
    isEditMode.value = false
    toastStore.showToast(L('บันทึกสำเร็จ', '儲存成功'), 'success')
  } catch (e: unknown) {
    toastStore.showToast((e as any)?.response?.data?.message ?? L('บันทึกล้มเหลว', '儲存失敗'), 'danger')
  } finally {
    saving.value = false
  }
}

async function doSoftDelete() {
  if (!selectedCarrier.value) return
  try {
    await carriersStore.softDeleteCarrier(selectedCarrier.value.id)
    showDeleteConfirm.value = false
    closeDrawer()
    toastStore.showToast(L('ลบแล้ว', '已刪除'), 'success')
  } catch (e: any) {
    toastStore.showToast((e as any)?.response?.data?.message || L('ลบล้มเหลว', '刪除失敗'), 'danger')
  }
}

async function doHardDelete() {
  if (!selectedCarrier.value) return
  try {
    await carriersStore.hardDeleteCarrier(selectedCarrier.value.id)
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
    await carriersStore.fetchDeletedCarriers()
  }
}

async function doHardDeleteFromList(id: string) {
  try {
    await carriersStore.hardDeleteCarrier(id)
    await carriersStore.fetchDeletedCarriers()
    toastStore.showToast(L('ลบถาวรแล้ว', '已永久刪除'), 'success')
  } catch (e: any) {
    toastStore.showToast((e as any)?.response?.data?.message || L('ลบล้มเหลว', '刪除失敗'), 'danger')
  }
}

onMounted(() => carriersStore.fetchCarriers())
</script>

<template>
  <div class="carrier-layout">

      <div v-if="showAddForm" class="add-wrap">
        <form class="add-form" @submit.prevent="saveAdd">
          <h2 class="form-title">{{ L('เพิ่มขนส่ง', '新增貨運') }}</h2>

          <div class="form-group">
            <label class="form-label">{{ L('รหัสขนส่ง', '貨運ID') }} <span class="required">*</span></label>
            <input v-model="addForm.id" class="form-input" :placeholder="L('ใส่รหัสขนส่ง', '輸入貨運ID')" required />
          </div>
          <div class="form-group">
            <label class="form-label">{{ L('ชื่อ', '姓名') }} <span class="required">*</span></label>
            <input v-model="addForm.name" class="form-input" :placeholder="L('ใส่ชื่อ', '輸入姓名')" required />
          </div>
          <div class="form-group">
            <label class="form-label">{{ L('โทรศัพท์', '電話') }}</label>
            <input v-model="addForm.phone" class="form-input" :placeholder="L('เบอร์โทรศัพท์', '電話號碼')" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ L('ที่อยู่', '住址') }}</label>
            <input v-model="addForm.address" class="form-input" :placeholder="L('ที่อยู่', '住址')" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ L('ชื่อธนาคาร', '銀行名稱') }}</label>
            <input v-model="addForm.bankName" class="form-input" :placeholder="L('ชื่อธนาคาร', '銀行名稱')" />
          </div>
          <div class="form-group">
            <label class="form-label">{{ L('เลขบัญชี', '銀行帳號') }}</label>
            <input v-model="addForm.bankAccount" class="form-input" :placeholder="L('เลขบัญชี', '銀行帳號')" />
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

      <div v-else class="carrier-main">
        <div class="list-panel">
          <div class="list-header">
            <span class="list-count">
              {{ showDeleted ? carriersStore.deletedCarriers.length : carriersStore.carriers.length }} {{ L('รายการ', '筆') }}
            </span>
            <div class="header-actions">
              <button class="btn-toggle-deleted" :class="{ active: showDeleted }" @click="toggleShowDeleted">
                🗑 {{ showDeleted ? L('ซ่อนที่ลบแล้ว', '隱藏已刪除') : L('แสดงที่ลบแล้ว', '顯示已刪除') }}
              </button>
              <button class="btn-add" @click="openAddForm">
                <i class="pi pi-plus"></i>
                <span class="btn-add-text">{{ L('เพิ่มขนส่ง', '新增貨運') }}</span>
              </button>
            </div>
          </div>

          <template v-if="!showDeleted">
            <div v-if="carriersStore.loading" class="list-state">
              <i class="pi pi-spin pi-spinner"></i>
            </div>
            <div v-else-if="carriersStore.carriers.length === 0" class="list-state">
              <i class="pi pi-users"></i>
              <p>{{ L('ไม่มีข้อมูลขนส่ง', '尚無貨運資料') }}</p>
            </div>
            <div v-else class="carrier-grid">
              <button
                v-for="carrier in carriersStore.carriers"
                :key="carrier.id"
                class="carrier-card"
                :class="{ active: selectedCarrier?.id === carrier.id }"
                @click="selectCarrier(carrier)"
              >
                <span class="card-avatar" :style="carrier.imageUrl ? {} : { background: avatarColor(carrier.id) }">
                  <img v-if="carrier.imageUrl" class="card-avatar--img" :src="resolveImageUrl(carrier.imageUrl)" :alt="carrier.name" />
                  <template v-else>{{ initials(carrier.name) }}</template>
                </span>
                <div class="card-body">
                  <span class="card-id-badge">{{ carrier.id }}</span>
                  <p class="card-name">{{ carrier.name }}</p>
                  <p v-if="carrier.phone" class="card-phone">{{ carrier.phone }}</p>
                </div>
              </button>
            </div>
          </template>

          <template v-else>
            <div v-if="carriersStore.loading" class="list-state">
              <i class="pi pi-spin pi-spinner"></i>
            </div>
            <div v-else-if="carriersStore.deletedCarriers.length === 0" class="list-state">
              <i class="pi pi-trash"></i>
              <p>{{ L('ไม่มีรายการที่ลบแล้ว', '沒有已刪除的記錄') }}</p>
            </div>
            <div v-else class="carrier-grid">
              <div
                v-for="carrier in carriersStore.deletedCarriers"
                :key="carrier.id"
                class="carrier-card deleted"
              >
                <span class="card-avatar" :style="carrier.imageUrl ? { filter: 'grayscale(1)' } : { background: avatarColor(carrier.id), filter: 'grayscale(1)' }">
                  <img v-if="carrier.imageUrl" class="card-avatar--img" :src="resolveImageUrl(carrier.imageUrl)" :alt="carrier.name" />
                  <template v-else>{{ initials(carrier.name) }}</template>
                </span>
                <div class="card-body">
                  <span class="card-id-badge">{{ carrier.id }}</span>
                  <p class="card-name">{{ carrier.name }}</p>
                  <p v-if="carrier.phone" class="card-phone">{{ carrier.phone }}</p>
                  <p class="deleted-meta">🗑 {{ (carrier as any).deletedAt ? new Date((carrier as any).deletedAt).toLocaleDateString() : '' }}</p>
                  <button
                    v-if="authStore.role === 'ADMIN'"
                    class="btn btn-danger-solid btn-sm"
                    @click="doHardDeleteFromList(carrier.id)"
                  >{{ L('ลบถาวร', '永久刪除') }}</button>
                </div>
              </div>
            </div>
          </template>
        </div>

        <div v-if="selectedCarrier" class="detail-drawer" :class="{ open: !!selectedCarrier }">
          <div class="drawer-header">
            <span
              class="drawer-avatar"
              :style="selectedCarrier.imageUrl ? {} : { background: avatarColor(selectedCarrier.id) }"
            >
              <img v-if="selectedCarrier.imageUrl" class="drawer-avatar--img" :src="resolveImageUrl(selectedCarrier.imageUrl)" :alt="selectedCarrier.name" />
              <template v-else>{{ initials(selectedCarrier.name) }}</template>
            </span>
            <div class="drawer-title-area">
              <span class="drawer-name">{{ selectedCarrier.name }}</span>
              <span class="drawer-id-badge">{{ selectedCarrier.id }}</span>
            </div>
            <button class="icon-btn" @click="closeDrawer"><i class="pi pi-times"></i></button>
          </div>

          <div class="drawer-body">
            <template v-if="!isEditMode">
              <div class="field-row">
                <span class="field-label">{{ L('โทรศัพท์', '電話') }}</span>
                <span class="field-value">{{ selectedCarrier.phone || '—' }}</span>
              </div>
              <div class="field-row">
                <span class="field-label">{{ L('ที่อยู่', '住址') }}</span>
                <span class="field-value">{{ selectedCarrier.address || '—' }}</span>
              </div>
              <div class="field-row">
                <span class="field-label">{{ L('ชื่อธนาคาร', '銀行名稱') }}</span>
                <span class="field-value">{{ selectedCarrier.bankName || '—' }}</span>
              </div>
              <div class="field-row">
                <span class="field-label">{{ L('เลขบัญชี', '銀行帳號') }}</span>
                <span class="field-value">{{ selectedCarrier.bankAccount || '—' }}</span>
              </div>
            </template>
            <template v-else>
              <div class="form-group">
                <label class="form-label">{{ L('รหัสขนส่ง', '貨運ID') }}</label>
                <input :value="selectedCarrier.id" class="form-input" disabled />
              </div>
              <div class="form-group">
                <label class="form-label">{{ L('ชื่อ', '姓名') }} <span class="required">*</span></label>
                <input v-model="editForm.name" class="form-input" :placeholder="L('ชื่อ', '姓名')" />
              </div>
              <div class="form-group">
                <label class="form-label">{{ L('โทรศัพท์', '電話') }}</label>
                <input v-model="editForm.phone" class="form-input" :placeholder="L('โทรศัพท์', '電話')" />
              </div>
              <div class="form-group">
                <label class="form-label">{{ L('ที่อยู่', '住址') }}</label>
                <input v-model="editForm.address" class="form-input" :placeholder="L('ที่อยู่', '住址')" />
              </div>
              <div class="form-group">
                <label class="form-label">{{ L('ชื่อธนาคาร', '銀行名稱') }}</label>
                <input v-model="editForm.bankName" class="form-input" :placeholder="L('ชื่อธนาคาร', '銀行名稱')" />
              </div>
              <div class="form-group">
                <label class="form-label">{{ L('เลขบัญชี', '銀行帳號') }}</label>
                <input v-model="editForm.bankAccount" class="form-input" :placeholder="L('เลขบัญชี', '銀行帳號')" />
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
      :message="L(`ต้องการลบขนส่ง「${selectedCarrier?.name}」ใช่ไหม?`, `確定要刪除貨運「${selectedCarrier?.name}」嗎？`)"
      @confirm="doSoftDelete"
      @cancel="showDeleteConfirm = false"
    />
    <ConfirmDialog
      :show="showHardDeleteConfirm"
      :title="L('ลบถาวร', '永久刪除')"
      :message="L(`การดำเนินการนี้จะลบขนส่ง「${selectedCarrier?.name}」อย่างถาวรและไม่สามารถกู้คืนได้`, `此操作將永久刪除貨運「${selectedCarrier?.name}」，且無法復原。確定繼續嗎？`)"
      @confirm="doHardDelete"
      @cancel="showHardDeleteConfirm = false"
    />
</template>

<style scoped>
.carrier-layout { height: 100%; display: flex; flex-direction: column; overflow: hidden; }
.add-wrap { flex: 1; overflow-y: auto; display: flex; justify-content: center; padding: 20px 16px; }
.add-form { width: 100%; max-width: 520px; }
.form-title { font-size: 18px; font-weight: 700; color: var(--color-text); margin-bottom: 20px; }
.carrier-main { flex: 1; display: flex; overflow: hidden; position: relative; }
.list-panel { flex: 1; overflow-y: auto; padding: 12px 16px; min-width: 0; }
.list-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.list-count { font-size: 13px; color: var(--color-text-muted); }
.btn-add { display: flex; align-items: center; gap: 6px; padding: 8px 12px; background: var(--color-accent); border: none; border-radius: 8px; color: #fff; font-size: 13px; font-weight: 600; transition: background 0.15s; }
.btn-add:hover { background: var(--color-accent-dim); }
.btn-add-text { display: none; }
@media (min-width: 540px) { .btn-add-text { display: inline; } }
.list-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 0; color: var(--color-text-dim); font-size: 14px; }
.list-state .pi { font-size: 40px; }
.carrier-grid { display: grid; grid-template-columns: 1fr; gap: 8px; }
@media (min-width: 540px) { .carrier-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1280px) { .carrier-grid { grid-template-columns: repeat(3, 1fr); } }
.carrier-card { display: flex; align-items: flex-start; gap: 12px; padding: 12px; background: var(--color-card); border: 1px solid var(--color-border); border-radius: 10px; color: var(--color-text); text-align: left; width: 100%; transition: background 0.15s, border-color 0.15s; }
.carrier-card:hover { background: var(--color-card-hover); border-color: var(--color-text-dim); }
.carrier-card.active { border-color: var(--color-accent); background: var(--color-card-hover); }
.card-avatar { width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; color: #fff; flex-shrink: 0; position: relative; overflow: hidden; }
.card-avatar--img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.card-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.card-id-badge { display: inline-block; background: var(--color-accent); color: #fff; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 4px; align-self: flex-start; }
.card-name { font-size: 15px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-phone { font-size: 12px; color: var(--color-text-muted); }
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
.field-row { display: flex; align-items: baseline; gap: 8px; padding: 12px 0; border-bottom: 1px solid var(--color-border); }
.field-row:last-child { border-bottom: none; }
.field-label { min-width: 72px; font-size: 12px; color: var(--color-text-muted); flex-shrink: 0; }
.field-value { font-size: 14px; color: var(--color-text); word-break: break-all; }
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
.carrier-card.deleted { opacity: 0.65; border-style: dashed; border-color: var(--color-danger); cursor: default; }
.deleted-meta { font-size: 11px; color: var(--color-danger); margin-top: 4px; }
.btn-sm { height: 32px; padding: 0 10px; font-size: 12px; margin-top: 6px; }
</style>
