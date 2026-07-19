<script setup lang="ts">
import { ref, computed } from 'vue'

interface Item {
  id: string
  name: string
  imageUrl?: string
}

const props = defineProps<{
  items: Item[]
  modelValue: string | null
  placeholder: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const isOpen = ref(false)
const search = ref('')

const AVATAR_COLORS = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#7c3aed', '#be185d']

function avatarColor(id: string): string {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function initials(name: string): string {
  return name.charAt(0).toUpperCase()
}

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return props.items
  return props.items.filter(
    (i) => i.name.toLowerCase().includes(q) || i.id.toLowerCase().includes(q),
  )
})

const selectedItem = computed(() => props.items.find((i) => i.id === props.modelValue) ?? null)

function open() {
  if (props.disabled) return
  search.value = ''
  isOpen.value = true
}

function select(id: string) {
  emit('update:modelValue', id)
  isOpen.value = false
}

function close() {
  isOpen.value = false
}
</script>

<template>
  <!-- Trigger button -->
  <button
    class="selector-trigger"
    :class="{ disabled }"
    :disabled="disabled"
    @click="open"
  >
    <template v-if="selectedItem">
      <span class="avatar-sm" :style="{ background: avatarColor(selectedItem.id) }">
        {{ initials(selectedItem.name) }}
      </span>
      <span class="trigger-text">{{ selectedItem.name }}</span>
      <span class="id-badge">{{ selectedItem.id }}</span>
    </template>
    <template v-else>
      <span class="trigger-placeholder">{{ placeholder }}</span>
    </template>
    <i class="pi pi-chevron-down trigger-chevron"></i>
  </button>

  <!-- Full-screen overlay -->
  <Teleport to="body">
    <div v-if="isOpen" class="overlay-backdrop" @click.self="close">
      <div class="overlay-panel">
        <!-- Search bar -->
        <div class="search-wrap">
          <i class="pi pi-search search-icon"></i>
          <input
            v-model="search"
            class="search-input"
            placeholder="搜尋 ID 或名稱…"
            autofocus
          />
          <button class="close-btn" @click="close">
            <i class="pi pi-times"></i>
          </button>
        </div>

        <!-- Scrollable list -->
        <div class="item-list">
          <button
            v-for="item in filtered"
            :key="item.id"
            class="list-item"
            :class="{ selected: item.id === modelValue }"
            @click="select(item.id)"
          >
            <span class="avatar" :style="{ background: avatarColor(item.id) }">
              {{ initials(item.name) }}
            </span>
            <div class="item-info">
              <span class="item-name">{{ item.name }}</span>
              <span class="item-id">{{ item.id }}</span>
            </div>
            <i v-if="item.id === modelValue" class="pi pi-check selected-check"></i>
          </button>

          <div v-if="filtered.length === 0" class="empty">
            <i class="pi pi-inbox"></i>
            <span>無結果</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ── Trigger ── */
.selector-trigger {
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  text-align: left;
  transition: border-color 0.15s;
}

.selector-trigger:hover:not(.disabled) {
  border-color: var(--color-accent);
}

.selector-trigger.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.trigger-text {
  flex: 1;
  font-size: 14px;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trigger-placeholder {
  flex: 1;
  font-size: 14px;
  color: var(--color-text-dim);
}

.trigger-chevron {
  color: var(--color-text-dim);
  font-size: 12px;
  flex-shrink: 0;
}

.avatar-sm {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.id-badge {
  font-size: 11px;
  color: var(--color-text-muted);
  background: var(--color-card);
  border-radius: 4px;
  padding: 2px 6px;
  flex-shrink: 0;
}

/* ── Overlay ── */
.overlay-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.overlay-panel {
  width: 100%;
  max-height: 80vh;
  background: var(--color-drawer);
  border-radius: 16px 16px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px 12px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.search-icon {
  color: var(--color-text-dim);
  font-size: 14px;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--color-text);
  font-size: 15px;
}

.search-input::placeholder {
  color: var(--color-text-dim);
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface);
  border: none;
  border-radius: 8px;
  color: var(--color-text-muted);
  flex-shrink: 0;
  transition: color 0.15s;
}

.close-btn:hover {
  color: var(--color-text);
}

.item-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 0 12px;
}

.list-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: transparent;
  border: none;
  color: var(--color-text);
  text-align: left;
  transition: background 0.1s;
}

.list-item:hover {
  background: var(--color-surface-hover);
}

.list-item.selected {
  background: var(--color-accent-glow);
}

.avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
}

.item-name {
  font-size: 15px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-id {
  font-size: 12px;
  color: var(--color-text-muted);
  background: var(--color-card);
  border-radius: 4px;
  padding: 2px 6px;
  display: inline-block;
  align-self: flex-start;
}

.selected-check {
  color: var(--color-accent);
  font-size: 16px;
  flex-shrink: 0;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 48px 16px;
  color: var(--color-text-dim);
  font-size: 14px;
}

.empty .pi {
  font-size: 36px;
}
</style>
