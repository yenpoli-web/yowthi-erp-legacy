<script setup lang="ts">
import { useToastStore } from '../../stores/toast'

const toast = useToastStore()
</script>

<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="toast.visible" class="toast" :class="`toast-${toast.type}`">
        <i
          class="pi"
          :class="toast.type === 'success' ? 'pi-check-circle' : 'pi-exclamation-circle'"
        ></i>
        <span>{{ toast.message }}</span>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.toast {
  position: fixed;
  /* 手機：bottom-nav 64px + 8px gap */
  bottom: 72px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  z-index: 3000;
  white-space: nowrap;
  max-width: calc(100vw - 32px);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.45);
  pointer-events: none;
}

.toast-success {
  background: #1a4a2a;
  border: 1px solid rgba(45, 212, 191, 0.25);
}

.toast-danger {
  background: var(--color-danger-bg);
  border: 1px solid rgba(248, 113, 113, 0.3);
}

.toast .pi {
  font-size: 16px;
  flex-shrink: 0;
}

/* 平板：bottom-nav 58px + 8px gap */
@media (min-width: 768px) {
  .toast {
    bottom: 66px;
  }
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}
</style>
