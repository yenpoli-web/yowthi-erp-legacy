<script setup lang="ts">
import { ref, computed } from 'vue'

interface Item {
  id: string
  name: string
  imageUrl?: string | null
}

const props = defineProps<{
  title: string
  items: Item[]
  modelValue: string
}>()

const emit = defineEmits<{
  select: [item: Item]
  close: []
}>()

const search = ref('')

const COLORS = ['#e8820c', '#2dd4bf', '#818cf8', '#f472b6', '#34d399', '#60a5fa']
function avatarColor(id: string) {
  const h = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return COLORS[h % COLORS.length]
}

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return props.items
  return props.items.filter(i => i.name.toLowerCase().includes(q) || i.id.toLowerCase().includes(q))
})
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="emit('close')">
      <div class="modal-panel">
        <div class="modal-header">
          <span class="modal-title">{{ title }}</span>
          <button class="close-btn" @click="emit('close')">✕</button>
        </div>
        <div class="search-wrap">
          <i class="pi pi-search search-icon"></i>
          <input v-model="search" class="search-input" placeholder="搜尋 ID 或名稱…" autofocus />
        </div>
        <div class="item-grid">
          <button
            v-for="item in filtered"
            :key="item.id"
            class="item-card"
            :class="{ selected: item.id === modelValue }"
            @click="emit('select', item); emit('close')"
          >
            <i v-if="item.id === modelValue" class="pi pi-check check-icon"></i>
            <span class="avatar" :style="{ background: avatarColor(item.id) }">
              <img v-if="item.imageUrl" :src="item.imageUrl" class="avatar-img" />
              <template v-else>{{ item.name.charAt(0).toUpperCase() }}</template>
            </span>
            <span class="item-name">{{ item.name }}</span>
            <span class="item-id">{{ item.id }}</span>
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
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.72); z-index: 1000;
  display: flex; align-items: flex-end; justify-content: center;
}
.modal-panel {
  width: 100%; max-width: 640px; max-height: 78vh; background: var(--color-drawer);
  border-radius: 16px 16px 0 0; display: flex; flex-direction: column; overflow: hidden;
}
@media (min-width: 1024px) {
  .modal-backdrop { align-items: center; }
  .modal-panel { border-radius: 16px; max-height: 72vh; }
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 16px 12px; border-bottom: 1px solid var(--color-border); flex-shrink: 0;
}
.modal-title { font-size: 15px; font-weight: 700; color: var(--color-text); }
.close-btn {
  background: none; border: none; color: var(--color-text-muted);
  font-size: 18px; cursor: pointer; padding: 4px 8px;
}
.search-wrap {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; border-bottom: 1px solid var(--color-border); flex-shrink: 0;
}
.search-icon { color: var(--color-text-dim); font-size: 14px; flex-shrink: 0; }
.search-input {
  flex: 1; background: transparent; border: none; outline: none;
  color: var(--color-text); font-size: 15px;
}
.search-input::placeholder { color: var(--color-text-dim); }

.item-grid {
  flex: 1; overflow-y: auto; padding: 14px;
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;
  align-content: start;
}
@media (min-width: 768px) {
  .item-grid { grid-template-columns: repeat(3, 1fr); }
}

.item-card {
  position: relative;
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 14px 8px;
  background: var(--color-card); border: 2px solid var(--color-border);
  border-radius: 12px; cursor: pointer; transition: all 0.15s;
}
.item-card:hover { border-color: var(--color-accent); }
.item-card.selected { border-color: var(--color-accent); background: var(--color-card-hover); }
.check-icon {
  position: absolute; top: 8px; right: 8px;
  color: var(--color-accent); font-size: 14px;
}
.avatar {
  width: 52px; height: 52px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; font-weight: 700; color: #fff;
  flex-shrink: 0; position: relative; overflow: hidden;
}
.avatar-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.item-name {
  font-size: 13px; font-weight: 600; color: var(--color-text);
  text-align: center; overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap; max-width: 100%;
}
.item-id {
  font-size: 10px; font-weight: 700; color: var(--color-text-muted);
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: 4px; padding: 1px 6px;
}
.empty {
  grid-column: 1 / -1;
  display: flex; flex-direction: column; align-items: center;
  gap: 10px; padding: 48px 16px; color: var(--color-text-dim); font-size: 14px;
}
.empty .pi { font-size: 36px; }
</style>
