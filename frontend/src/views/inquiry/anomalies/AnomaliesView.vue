<template>
  <div class="anomalies-view">
    <div class="header-row">
      <button class="btn-primary" :disabled="loading" @click="load">
        <i class="pi pi-refresh"></i> {{ t('anomaliesRefresh') }}
      </button>
    </div>

    <div v-if="loading" class="loading-state"><div class="spinner"></div></div>

    <template v-else-if="result">
      <!-- 銷售未關聯入庫 -->
      <div class="group-section">
        <div class="group-title">
          {{ t('anomalySalesUnlinked') }}
          <span class="count-badge">{{ result.unlinkedSales.length }}</span>
        </div>
        <div v-if="result.unlinkedSales.length === 0" class="empty-row">{{ t('anomaliesNone') }}</div>
        <div v-else class="anomaly-list">
          <router-link v-for="r in result.unlinkedSales" :key="r.id" to="/sales" class="anomaly-card">
            <span class="ac-id">{{ r.id }}</span>
            <span class="ac-date">{{ formatDate(r.orderDate) }}</span>
            <span class="ac-extra">{{ r.customerName }}</span>
            <span class="ac-amount">฿{{ r.totalAmount.toLocaleString() }}</span>
          </router-link>
        </div>
      </div>

      <!-- 包裝未關聯銷售單 -->
      <div class="group-section">
        <div class="group-title">
          {{ t('anomalyPackagingUnlinked') }}
          <span class="count-badge">{{ result.unlinkedPackaging.length }}</span>
        </div>
        <div v-if="result.unlinkedPackaging.length === 0" class="empty-row">{{ t('anomaliesNone') }}</div>
        <div v-else class="anomaly-list">
          <router-link v-for="r in result.unlinkedPackaging" :key="r.id" to="/packaging" class="anomaly-card">
            <span class="ac-id">{{ r.id }}</span>
            <span class="ac-date">{{ formatDate(r.orderDate) }}</span>
            <span class="ac-amount">฿{{ r.totalAmount.toLocaleString() }}</span>
          </router-link>
        </div>
      </div>

      <!-- 入庫未關聯來源 -->
      <div class="group-section">
        <div class="group-title">
          {{ t('anomalyInventoryUnlinked') }}
          <span class="count-badge">{{ result.unlinkedInventory.length }}</span>
        </div>
        <div v-if="result.unlinkedInventory.length === 0" class="empty-row">{{ t('anomaliesNone') }}</div>
        <div v-else class="anomaly-list">
          <router-link v-for="r in result.unlinkedInventory" :key="r.id" to="/inventory" class="anomaly-card">
            <span class="ac-id">{{ r.id }}</span>
            <span class="ac-date">{{ formatDate(r.orderDate) }}</span>
            <span class="ac-extra">{{ t('totalQty') }}: {{ r.totalQty }}</span>
          </router-link>
        </div>
      </div>

      <!-- 進貨長期未完成加工 -->
      <div class="group-section">
        <div class="group-title">
          {{ t('anomalyStaleProcessing') }}
          <span class="count-badge">{{ result.staleProcessing.length }}</span>
        </div>
        <div v-if="result.staleProcessing.length === 0" class="empty-row">{{ t('anomaliesNone') }}</div>
        <div v-else class="anomaly-list">
          <router-link v-for="r in result.staleProcessing" :key="r.id" to="/receiving" class="anomaly-card">
            <span class="ac-id">{{ r.id }}</span>
            <span class="ac-date">{{ formatDate(r.orderDate) }}</span>
            <span class="ac-extra">{{ r.receivingItemName }} · {{ t('anomalyDaysSince', { days: r.daysSince }) }}</span>
            <span class="ac-tags">
              <span v-if="!r.h02Done" class="tag tag-danger">H02</span>
              <span v-if="!r.h03Done" class="tag tag-danger">H03</span>
            </span>
          </router-link>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAnomaliesSummary } from '../../../api/anomalies'
import type { AnomaliesSummaryResult } from '../../../api/anomalies'

const { t } = useI18n()
const loading = ref(false)
const result = ref<AnomaliesSummaryResult | null>(null)

function formatDate(d: string) {
  if (!d) return ''
  const [y, m, day] = d.slice(0, 10).split('-')
  return `${parseInt(day)}/${parseInt(m)}/${y.slice(2)}`
}

async function load() {
  loading.value = true
  try {
    result.value = (await getAnomaliesSummary()).data
  } catch {}
  finally { loading.value = false }
}

onMounted(load)
</script>

<style scoped>
.anomalies-view { padding: 16px; display: flex; flex-direction: column; gap: 16px; }

.header-row { display: flex; justify-content: flex-end; }
.btn-primary { background: var(--color-accent); color: #fff; border: none; border-radius: 10px; padding: 11px 22px; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-primary:disabled { opacity: 0.6; }

.group-section { display: flex; flex-direction: column; gap: 10px; padding: 14px; border: 1px solid var(--color-border); border-radius: 16px; background: var(--color-surface); }
.group-title { font-size: 14px; font-weight: 700; color: var(--color-text); border-left: 3px solid var(--color-warning-bg); padding-left: 8px; display: flex; align-items: center; gap: 8px; }
.count-badge { background: var(--color-warning-bg); color: #1a1200; font-size: 12px; font-weight: 700; border-radius: 999px; padding: 1px 9px; }

.empty-row { font-size: 13px; color: var(--color-text-muted); padding: 8px 4px; }

.anomaly-list { display: flex; flex-direction: column; gap: 8px; max-height: 360px; overflow-y: auto; }
.anomaly-card { display: grid; grid-template-columns: auto auto 1fr auto; align-items: center; gap: 10px; background: var(--color-card); border: 1px solid var(--color-border); border-radius: 10px; padding: 10px 12px; text-decoration: none; }
.anomaly-card:hover { border-color: var(--color-accent); }
.ac-id { font-size: 12px; font-weight: 700; color: var(--color-accent); }
.ac-date { font-size: 12px; color: var(--color-text-muted); }
.ac-extra { font-size: 12px; color: var(--color-text); }
.ac-amount { font-size: 12px; font-weight: 600; color: var(--color-text); }
.ac-tags { display: flex; gap: 4px; }
.tag { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
.tag-danger { background: rgba(248,113,113,0.15); color: var(--color-danger); }

.loading-state { display: flex; justify-content: center; padding: 40px; }
.spinner { width: 28px; height: 28px; border: 3px solid var(--color-border); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
