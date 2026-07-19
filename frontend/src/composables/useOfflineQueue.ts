import { ref, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import {
  addPendingRequest,
  getAllPendingRequests,
  removePendingRequest,
  countPendingRequests,
} from '../utils/offlineDb'
import type { PendingRequest } from '../utils/offlineDb'

// 全系統共用單一狀態（GUIDED 頁面掛載時啟用）
const isOffline = ref(!navigator.onLine)
const pendingCount = ref(0)
const syncing = ref(false)
let onSyncedCallback: (() => void) | null = null

function getAuthHeaders() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function refreshPendingCount() {
  pendingCount.value = await countPendingRequests()
}

async function flushQueue() {
  if (syncing.value) return
  syncing.value = true
  try {
    let queue = await getAllPendingRequests()
    let successCount = 0
    for (const req of queue) {
      try {
        await axios.request({
          method: req.method,
          url: req.url,
          data: req.body,
          headers: getAuthHeaders(),
        })
        await removePendingRequest(req.localId!)
        successCount++
      } catch (e) {
        // 仍然失敗（可能網路其實還沒真正恢復），停止本輪，留在佔列等下次再試
        break
      }
    }
    await refreshPendingCount()
    if (successCount > 0 && onSyncedCallback) onSyncedCallback()
  } finally {
    syncing.value = false
  }
}

function handleOnline() {
  isOffline.value = false
  flushQueue()
}

function handleOffline() {
  isOffline.value = true
}

export function useOfflineQueue(onSynced?: () => void) {
  if (onSynced) onSyncedCallback = onSynced

  onMounted(() => {
    refreshPendingCount()
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    if (navigator.onLine) flushQueue() // 進頁面時若有殘留佔列，順手補送一次
  })

  onUnmounted(() => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  })

  // 供呼叫端使用：嘗試直接呼叫 API；若離線（或請求失敗判定為網路問題）則改存佔列
  async function callOrQueue(
    kind: PendingRequest['kind'],
    method: PendingRequest['method'],
    url: string,
    body: any,
  ): Promise<{ queued: boolean; data?: any }> {
    if (!navigator.onLine) {
      await addPendingRequest({ method, url, body, timestamp: Date.now(), kind })
      await refreshPendingCount()
      return { queued: true }
    }
    try {
      const res = await axios.request({ method, url, data: body, headers: getAuthHeaders() })
      return { queued: false, data: res.data }
    } catch (e: any) {
      // 沒有收到伺服器回應（網路層失敗），視為離線，改存佔列
      if (!e.response) {
        await addPendingRequest({ method, url, body, timestamp: Date.now(), kind })
        await refreshPendingCount()
        return { queued: true }
      }
      throw e
    }
  }

  return { isOffline, pendingCount, syncing, callOrQueue, flushQueue }
}
