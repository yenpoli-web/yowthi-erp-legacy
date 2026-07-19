<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  modelValue: string
  label?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const isOpen = ref(false)

const today = new Date()
today.setHours(0, 0, 0, 0)

const viewYear = ref(today.getFullYear())
const viewMonth = ref(today.getMonth())

const MONTH_NAMES = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
const WEEK_DAYS   = ['日','一','二','三','四','五','六']

function formatDisplay(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return `${d.getDate()}/${d.getMonth() + 1}/${String(d.getFullYear()).slice(-2)}`
}

const calendarDays = computed<(number | null)[]>(() => {
  const firstDow = new Date(viewYear.value, viewMonth.value, 1).getDay()
  const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
  const days: (number | null)[] = []
  for (let i = 0; i < firstDow; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(d)
  return days
})

function isToday(day: number | null): boolean {
  if (!day) return false
  const d = new Date(viewYear.value, viewMonth.value, day)
  return d.getTime() === today.getTime()
}

function isSelected(day: number | null): boolean {
  if (!day || !props.modelValue) return false
  const sel = new Date(props.modelValue + 'T00:00:00')
  const d   = new Date(viewYear.value, viewMonth.value, day)
  return d.toDateString() === sel.toDateString()
}

function prevMonth() {
  if (viewMonth.value === 0) { viewYear.value--; viewMonth.value = 11 }
  else viewMonth.value--
}

function nextMonth() {
  if (viewMonth.value === 11) { viewYear.value++; viewMonth.value = 0 }
  else viewMonth.value++
}

function selectDay(day: number | null) {
  if (!day) return
  const d = new Date(viewYear.value, viewMonth.value, day)
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  emit('update:modelValue', iso)
  isOpen.value = false
}

function open() {
  if (props.modelValue) {
    const d = new Date(props.modelValue + 'T00:00:00')
    viewYear.value  = d.getFullYear()
    viewMonth.value = d.getMonth()
  } else {
    viewYear.value  = today.getFullYear()
    viewMonth.value = today.getMonth()
  }
  isOpen.value = true
}
</script>

<template>
  <div class="date-picker">
    <span v-if="label" class="dp-label">{{ label }}</span>
    <button class="dp-trigger" @click="open">
      <i class="pi pi-calendar"></i>
      <span v-if="modelValue" class="dp-value">{{ formatDisplay(modelValue) }}</span>
      <span v-else class="dp-placeholder">選擇日期</span>
    </button>

    <Teleport to="body">
      <div v-if="isOpen" class="dp-backdrop" @click.self="isOpen = false">
        <div class="dp-panel">
          <!-- Month navigation -->
          <div class="dp-nav">
            <button class="dp-nav-btn" @click="prevMonth">
              <i class="pi pi-chevron-left"></i>
            </button>
            <span class="dp-month">{{ viewYear }} {{ MONTH_NAMES[viewMonth] }}</span>
            <button class="dp-nav-btn" @click="nextMonth">
              <i class="pi pi-chevron-right"></i>
            </button>
          </div>

          <!-- Week day headers -->
          <div class="dp-weekdays">
            <span v-for="wd in WEEK_DAYS" :key="wd">{{ wd }}</span>
          </div>

          <!-- Day grid -->
          <div class="dp-days">
            <button
              v-for="(day, idx) in calendarDays"
              :key="idx"
              class="dp-day"
              :class="{
                'dp-empty':    !day,
                'dp-today':    isToday(day),
                'dp-selected': isSelected(day),
              }"
              :disabled="!day"
              @click="selectDay(day)"
            >
              {{ day ?? '' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.date-picker {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dp-label {
  font-size: 12px;
  color: var(--color-text-muted);
}

.dp-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  font-size: 14px;
  transition: border-color 0.15s;
  width: 100%;
  text-align: left;
}

.dp-trigger:hover {
  border-color: var(--color-accent);
}

.dp-trigger .pi {
  color: var(--color-text-muted);
  font-size: 15px;
  flex-shrink: 0;
}

.dp-value {
  font-weight: 500;
}

.dp-placeholder {
  color: var(--color-text-dim);
}

/* ── Calendar panel ── */
.dp-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.dp-panel {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 16px;
  width: 100%;
  max-width: 320px;
}

.dp-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.dp-month {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}

.dp-nav-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text-muted);
  font-size: 12px;
  transition: color 0.15s, border-color 0.15s;
}

.dp-nav-btn:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.dp-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 8px;
}

.dp-weekdays span {
  text-align: center;
  font-size: 11px;
  color: var(--color-text-dim);
  padding: 4px 0;
}

.dp-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.dp-day {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  background: transparent;
  border: none;
  border-radius: 50%;
  color: var(--color-text);
  transition: background 0.1s, color 0.1s;
}

.dp-day:not(.dp-empty):hover {
  background: var(--color-surface-hover);
}

.dp-empty {
  cursor: default;
}

.dp-today {
  color: var(--color-accent);
  font-weight: 700;
}

.dp-selected {
  background: var(--color-accent) !important;
  color: #fff !important;
  font-weight: 700;
}
</style>
