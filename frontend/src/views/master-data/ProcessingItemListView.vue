<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import ImageUpload from '../../components/common/ImageUpload.vue'
import { useProcessingItemsStore } from '../../stores/processing-items'
import { useAuthStore }            from '../../stores/auth'
import { useToastStore }           from '../../stores/toast'
import type { ProcessingItem } from '../../types/master-data'

const { locale } = useI18n()
const isThai = computed(() => locale.value === 'th')
function L(th: string, zh: string) { return isThai.value ? th : zh }

const processingItemsStore = useProcessingItemsStore()
const authStore            = useAuthStore()
const toastStore           = useToastStore()

const COLORS = ['#e8820c', '#2dd4bf', '#818cf8', '#f472b6', '#34d399', '#60a5fa']
function avatarColor(id: string) {
  const h = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return COLORS[h % COLORS.length]
}
function initials(name: string) { return name.charAt(0).toUpperCase() }
function resolveImageUrl(url: string) {
  return url
}

const selectedItem = ref<ProcessingItem | null>(null)
const isEditMode   = ref(false)
const saving       = ref(false)

function selectItem(item: ProcessingItem) {
  selectedItem.value = item
  isEditMode.value = false
}

function closeDrawer() {
  selectedItem.value = null
  isEditMode.value = false
}

const editForm = reactive({ name: '', imageUrl: undefined as string | undefined })

function startEdit() {
  if (!selectedItem.value) return
  editForm.name     = selectedItem.value.name
  editForm.imageUrl = selectedItem.value.imageUrl ?? undefined
  isEditMode.value  = true
}

function cancelEdit() { isEditMode.value = false }

async function saveEdit() {
  if (!selectedItem.value || !editForm.name.trim()) return
  saving.value = true
  try {
    const updated = await processingItemsStore.updateProcessingItem(selectedItem.value.id, {
      name:     editForm.name.trim(),
      imageUrl: editForm.imageUrl || undefined,
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

onMounted(() => processingItemsStore.fetchProcessingItems())
</script>

<template>
  <div class="processing-item-layout">
      <div class="processing-item-main">
        <div class="list-panel">
          <div class="list-header">
            <span class="list-count">{{ processingItemsStore.processingItems.length }} {{ L('รายการ', '筆') }}</span>
          </div>

          <div v-if="processingItemsStore.loading" class="list-state">
            <i class="pi pi-spin pi-spinner"></i>
          </div>

          <div v-else-if="processingItemsStore.processingItems.length === 0" class="list-state">
            <i class="pi pi-box"></i>
            <p>{{ L('ไม่มีข้อมูล', '尚無資料') }}</p>
          </div>

          <div v-else class="processing-item-grid">
            <button
              v-for="item in processingItemsStore.processingItems"
              :key="item.id"
              class="processing-item-card"
              :class="{ active: selectedItem?.id === item.id }"
              @click="selectItem(item)"
            >
              <span
                class="card-avatar"
                :style="item.imageUrl ? {} : { background: avatarColor(item.id) }"
              >
                <img v-if="item.imageUrl" class="card-avatar--img" :src="resolveImageUrl(item.imageUrl)" :alt="item.name" />
                <template v-else>{{ initials(item.name) }}</template>
              </span>
              <div class="card-body">
                <span class="card-id-badge">{{ item.id }}</span>
                <p class="card-name">{{ item.name }}</p>
              </div>
            </button>
          </div>
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
              <div v-if="authStore.role === 'ADMIN'" class="form-group">
                <label class="form-label">{{ L('รูปภาพ', '圖片') }}</label>
                <ImageUpload v-model="editForm.imageUrl" :disabled="saving" />
              </div>
            </template>
          </div>

          <div class="drawer-footer">
            <template v-if="!isEditMode">
              <button class="btn btn-primary" @click="startEdit">✏️ {{ L('แก้ไข', '編輯') }}</button>
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
</template>

<style scoped>
.processing-item-layout { height: 100%; display: flex; flex-direction: column; overflow: hidden; }
.processing-item-main { flex: 1; display: flex; overflow: hidden; position: relative; }
.list-panel { flex: 1; overflow-y: auto; padding: 12px 16px; min-width: 0; }
.list-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.list-count { font-size: 13px; color: var(--color-text-muted); }
.list-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 0; color: var(--color-text-dim); font-size: 14px; }
.list-state .pi { font-size: 40px; }
.processing-item-grid { display: grid; grid-template-columns: 1fr; gap: 8px; }
@media (min-width: 540px) { .processing-item-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1280px) { .processing-item-grid { grid-template-columns: repeat(3, 1fr); } }
.processing-item-card { display: flex; align-items: flex-start; gap: 12px; padding: 12px; background: var(--color-card); border: 1px solid var(--color-border); border-radius: 10px; color: var(--color-text); text-align: left; width: 100%; transition: background 0.15s, border-color 0.15s; }
.processing-item-card:hover { background: var(--color-card-hover); border-color: var(--color-text-dim); }
.processing-item-card.active { border-color: var(--color-accent); background: var(--color-card-hover); }
.card-avatar { width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; color: #fff; flex-shrink: 0; position: relative; overflow: hidden; }
.card-avatar--img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.card-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.card-id-badge { display: inline-block; background: var(--color-accent); color: #fff; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 4px; align-self: flex-start; }
.card-name { font-size: 15px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
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
.btn { height: 42px; padding: 0 18px; border-radius: 8px; font-size: 14px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; border: none; transition: opacity 0.15s, background 0.15s; white-space: nowrap; }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-primary { background: var(--color-accent); color: #fff; }
.btn-primary:hover:not(:disabled) { background: var(--color-accent-dim); }
.btn-secondary { background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-text-muted); }
.btn-secondary:hover { color: var(--color-text); border-color: var(--color-text-muted); }
</style>
