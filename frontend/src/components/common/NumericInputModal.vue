<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string
  mode: 'integer' | 'decimal'
  label?: string
  show?: boolean
}>(), { show: true })

const emit = defineEmits<{
  'update:modelValue': [value: string]
  confirm: [value: string]
  close: []
}>()

const buffer = ref(props.modelValue || '')

watch(() => props.show, (val) => {
  if (val) buffer.value = props.modelValue || ''
})

const displayValue = computed(() => buffer.value || '0')

function press(key: string) {
  const val = buffer.value

  if (key === 'C') { buffer.value = ''; return }
  if (key === '←') { buffer.value = val.slice(0, -1); return }

  if (key === '✓') {
    emit('update:modelValue', buffer.value)
    emit('confirm', buffer.value)
    return
  }

  if (key === '.') {
    if (props.mode === 'integer') return
    if (val.includes('.')) return
    buffer.value = (val || '0') + '.'
    return
  }

  // 開頭防呆：不允許多個前導零
  if (!val.includes('.') && val === '0') { buffer.value = key; return }
  if (val.includes('.') && val.split('.')[1].length >= 1) return

  buffer.value = val + key
}

function onBackdropClick() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="nim-pop">
      <div v-if="show" class="nim-root" @click.self="onBackdropClick">
        <div class="nim-card" @click.stop>
          <!-- Header -->
          <div class="nim-header">
            <span v-if="label" class="nim-label">{{ label }}</span>
            <button class="nim-close" @click="emit('close')">✕</button>
          </div>

          <!-- Display -->
          <div class="nim-display">{{ displayValue }}</div>

          <!-- Grid: 3 columns -->
          <div class="nim-grid">
            <button class="nkey" @click="press('7')">7</button>
            <button class="nkey" @click="press('8')">8</button>
            <button class="nkey" @click="press('9')">9</button>

            <button class="nkey" @click="press('4')">4</button>
            <button class="nkey" @click="press('5')">5</button>
            <button class="nkey" @click="press('6')">6</button>

            <button class="nkey" @click="press('1')">1</button>
            <button class="nkey" @click="press('2')">2</button>
            <button class="nkey" @click="press('3')">3</button>

            <button v-if="mode === 'decimal'" class="nkey nkey-secondary" @click="press('.')">.</button>
            <button v-else class="nkey nkey-secondary" @click="press('C')">C</button>
            <button class="nkey" @click="press('0')">0</button>
            <button class="nkey nkey-secondary" @click="press('←')">←</button>

            <template v-if="mode === 'decimal'">
              <button class="nkey nkey-secondary" @click="press('C')">C</button>
              <button class="nkey nkey-confirm nkey-span2" @click="press('✓')">
                <i class="pi pi-check"></i>
              </button>
            </template>
            <template v-else>
              <button class="nkey nkey-confirm nkey-span3" @click="press('✓')">
                <i class="pi pi-check"></i>
              </button>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.nim-root {
  position: fixed;
  inset: 0;
  z-index: 1500;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.nim-card {
  width: 100%;
  max-width: 340px;
  background: var(--color-drawer);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
}

.nim-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.nim-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.nim-close {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 16px;
  cursor: pointer;
  padding: 2px 6px;
}

.nim-display {
  text-align: right;
  font-size: 36px;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: 1px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 4px;
}

.nim-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.nkey {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  color: var(--color-text);
  font-size: 22px;
  font-weight: 500;
  transition: background 0.1s, transform 0.05s;
  touch-action: manipulation;
  -webkit-user-select: none;
  user-select: none;
}
.nkey:active {
  background: var(--color-surface-hover);
  transform: scale(0.96);
}
.nkey-secondary { color: var(--color-text-muted); font-size: 18px; }
.nkey-confirm {
  background: var(--color-accent);
  border-color: var(--color-accent-dim);
  color: #fff;
  font-size: 20px;
}
.nkey-confirm:active { background: var(--color-accent-dim); }
.nkey-span2 { grid-column: span 2; }
.nkey-span3 { grid-column: span 3; }

/* Card scale-in per UI spec 第十七節 Modal 跳出 */
.nim-pop-enter-active { transition: transform 0.18s ease-out, opacity 0.18s ease-out; }
.nim-pop-leave-active { transition: transform 0.15s ease-in, opacity 0.15s ease-in; }
.nim-pop-enter-from, .nim-pop-leave-to { transform: scale(0.95); opacity: 0; }
</style>
