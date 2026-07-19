// IndexedDB 封裝層（GUIDED 離線暫存專用）
// DB: yowthi-offline / store: pendingRequests

const DB_NAME = 'yowthi-offline'
const DB_VERSION = 3
const STORE_NAME = 'pendingRequests'
const CACHE_STORE_NAME = 'todayCache'
const QUERY_CACHE_STORE_NAME = 'queryCache'

export interface PendingRequest {
  localId?: number
  method: 'POST' | 'PATCH' | 'DELETE'
  url: string
  body: any
  timestamp: number
  kind: 'create' | 'softDelete' | 'offset'
  tempId?: string // 用於樂觀更新時對應本地暫存的明細
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'localId', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
        db.createObjectStore(CACHE_STORE_NAME, { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains(QUERY_CACHE_STORE_NAME)) {
        db.createObjectStore(QUERY_CACHE_STORE_NAME, { keyPath: 'key' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function addPendingRequest(req: Omit<PendingRequest, 'localId'>): Promise<number> {
  const db = await openDb()
  const safeReq = JSON.parse(JSON.stringify(req)) // 剖除 Vue 響應式 Proxy
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const addReq = store.add(safeReq)
    addReq.onsuccess = () => resolve(addReq.result as number)
    addReq.onerror = () => reject(addReq.error)
  })
}

export async function getAllPendingRequests(): Promise<PendingRequest[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const getReq = store.getAll()
    getReq.onsuccess = () => resolve((getReq.result as PendingRequest[]).sort((a, b) => a.timestamp - b.timestamp))
    getReq.onerror = () => reject(getReq.error)
  })
}

export async function removePendingRequest(localId: number): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const delReq = store.delete(localId)
    delReq.onsuccess = () => resolve()
    delReq.onerror = () => reject(delReq.error)
  })
}

export async function countPendingRequests(): Promise<number> {
  const all = await getAllPendingRequests()
  return all.length
}

// ── 當日明細快取（僅保存「今天」資料，日期不合即視為失效）──
function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function setTodayDetailsCache(details: any[]): Promise<void> {
  const db = await openDb()
  const safeDetails = JSON.parse(JSON.stringify(details)) // 剖除 Vue 響應式 Proxy，確保可被 IndexedDB 儲存
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CACHE_STORE_NAME, 'readwrite')
    const store = tx.objectStore(CACHE_STORE_NAME)
    const putReq = store.put({ key: 'today', date: todayKey(), details: safeDetails })
    putReq.onsuccess = () => resolve()
    putReq.onerror = () => reject(putReq.error)
  })
}

export async function getTodayDetailsCache(): Promise<any[] | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CACHE_STORE_NAME, 'readonly')
    const store = tx.objectStore(CACHE_STORE_NAME)
    const getReq = store.get('today')
    getReq.onsuccess = () => {
      const row = getReq.result
      if (!row || row.date !== todayKey()) {
        resolve(null) // 不是今天的資料，不提供（規格：離線不可查看其他日期歷審）
      } else {
        resolve(row.details)
      }
    }
    getReq.onerror = () => reject(getReq.error)
  })
}

// ── 通用查詢快取（今日加工單序號、可用批次/進貨單清單等）──
// 同樣以「今天」為有效期限，跨日即視為失效
export async function setQueryCache(key: string, value: any): Promise<void> {
  const db = await openDb()
  const safeValue = JSON.parse(JSON.stringify(value)) // 剖除 Vue 響應式 Proxy
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUERY_CACHE_STORE_NAME, 'readwrite')
    const store = tx.objectStore(QUERY_CACHE_STORE_NAME)
    const putReq = store.put({ key, date: todayKey(), value: safeValue })
    putReq.onsuccess = () => resolve()
    putReq.onerror = () => reject(putReq.error)
  })
}

export async function getQueryCache<T = any>(key: string): Promise<T | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUERY_CACHE_STORE_NAME, 'readonly')
    const store = tx.objectStore(QUERY_CACHE_STORE_NAME)
    const getReq = store.get(key)
    getReq.onsuccess = () => {
      const row = getReq.result
      if (!row || row.date !== todayKey()) resolve(null)
      else resolve(row.value)
    }
    getReq.onerror = () => reject(getReq.error)
  })
}
