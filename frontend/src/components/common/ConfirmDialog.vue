<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
defineProps<{
  show: boolean
  title: string
  message: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="show" class="dialog-backdrop" @click.self="emit('cancel')">
        <div class="dialog-card">
          <h2 class="dialog-title">{{ title }}</h2>
          <p class="dialog-message">{{ message }}</p>
          <div class="dialog-actions">
            <button class="btn-confirm" @click="emit('confirm')">{{ t('confirmDelete') }}</button>
            <button class="btn-cancel" @click="emit('cancel')">{{ t('cancel') }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.dialog-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 24px;
  width: 100%;
  max-width: 360px;
}

.dialog-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 10px;
}

.dialog-message {
  font-size: 14px;
  color: var(--color-text-muted);
  line-height: 1.6;
  margin-bottom: 24px;
}

.dialog-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn-confirm {
  width: 100%;
  height: 46px;
  background: var(--color-danger-bg);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  transition: opacity 0.15s;
}

.btn-confirm:hover {
  opacity: 0.88;
}

.btn-cancel {
  width: 100%;
  height: 46px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  color: var(--color-text-muted);
  font-size: 14px;
  font-weight: 500;
  transition: color 0.15s, border-color 0.15s;
}

.btn-cancel:hover {
  color: var(--color-text);
  border-color: var(--color-text-muted);
}

/* Transition */
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.2s;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}
</style>
