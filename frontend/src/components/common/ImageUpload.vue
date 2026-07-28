<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { uploadImage } from '../../api/masterData'

const props = defineProps<{
  modelValue?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
}>()

const { locale } = useI18n()
const isThai = computed(() => locale.value === 'th')
function L(th: string, zh: string) { return isThai.value ? th : zh }

const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const error     = ref('')

function triggerInput() {
  if (props.disabled || uploading.value) return
  fileInput.value?.click()
}

async function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!fileInput.value) return
  fileInput.value.value = ''
  if (!file) return

  if (file.size > 10 * 1024 * 1024) {
    error.value = L('ไฟล์ต้องไม่เกิน 10MB', '檔案不可超過 10MB')
    return
  }

  error.value = ''
  uploading.value = true
  try {
    const res = await uploadImage(file)
    emit('update:modelValue', res.data.url)
  } catch {
    error.value = L('อัพโหลดล้มเหลว', '上傳失敗')
  } finally {
    uploading.value = false
  }
}

function clear() {
  emit('update:modelValue', undefined)
  error.value = ''
}
</script>

<template>
  <div class="image-upload">
    <!-- Has image: preview + actions -->
    <div v-if="modelValue" class="preview-wrap">
      <img class="preview-img" :src="modelValue" alt="preview" />
      <div class="preview-actions">
        <button
          type="button"
          class="action-btn action-btn--change"
          :disabled="disabled || uploading"
          @click="triggerInput"
        >
          <i class="pi" :class="uploading ? 'pi-spin pi-spinner' : 'pi-upload'"></i>
          {{ uploading ? L('กำลังอัพโหลด...', '上傳中...') : L('เปลี่ยนรูป', '更換圖片') }}
        </button>
        <button
          type="button"
          class="action-btn action-btn--remove"
          :disabled="disabled || uploading"
          @click="clear"
        >
          <i class="pi pi-times"></i>
        </button>
      </div>
    </div>

    <!-- No image: drop zone -->
    <button
      v-else
      type="button"
      class="upload-zone"
      :class="{ 'upload-zone--loading': uploading }"
      :disabled="disabled || uploading"
      @click="triggerInput"
    >
      <i class="pi" :class="uploading ? 'pi-spin pi-spinner' : 'pi-image'"></i>
      <span>{{ uploading ? L('กำลังอัพโหลด...', '上傳中...') : L('คลิกเพื่ออัพโหลดรูปภาพ', '點擊上傳圖片') }}</span>
    </button>

    <p v-if="error" class="upload-error">{{ error }}</p>

    <input
      ref="fileInput"
      type="file"
      accept="image/png,image/jpeg,image/webp"
      class="sr-only"
      @change="onFileChange"
    />
  </div>
</template>

<style scoped>
.image-upload { display: flex; flex-direction: column; gap: 6px; }

.preview-wrap { display: flex; flex-direction: column; gap: 8px; }

.preview-img {
  width: 100%;
  max-height: 180px;
  object-fit: contain;
  border-radius: 8px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
}

.preview-actions { display: flex; gap: 6px; }

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  transition: opacity 0.15s, background 0.15s;
}

.action-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.action-btn--change {
  flex: 1;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
}
.action-btn--change:hover:not(:disabled) { color: var(--color-text); border-color: var(--color-text-muted); }

.action-btn--remove {
  background: transparent;
  border: 1px solid var(--color-danger);
  color: var(--color-danger);
  padding: 7px 10px;
}
.action-btn--remove:hover:not(:disabled) { background: rgba(248, 113, 113, 0.1); }

.upload-zone {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px 16px;
  background: var(--color-card);
  border: 1.5px dashed var(--color-border);
  border-radius: 8px;
  color: var(--color-text-dim);
  font-size: 13px;
  transition: border-color 0.15s, color 0.15s;
}

.upload-zone .pi { font-size: 26px; }
.upload-zone:hover:not(:disabled) { border-color: var(--color-accent); color: var(--color-text-muted); }
.upload-zone--loading { opacity: 0.65; cursor: not-allowed; }

.upload-error {
  font-size: 12px;
  color: var(--color-danger);
  margin: 0;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
</style>
