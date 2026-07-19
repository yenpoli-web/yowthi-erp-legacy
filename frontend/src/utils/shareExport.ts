/**
 * 共用「原生分享選單」工具（方案 A）
 * - shareImageOfElement：將指定 DOM 元素截圖轉 PNG，呼叫 navigator.share 分享圖片（給 LINE 等用）
 * - sharePdfBlob：將 PDF Blob 包成檔案，呼叫 navigator.share 分享（給 pCloud 等雲端硬碟 App 用）
 *
 * 注意：
 * - navigator.share 支援檔案分享（Web Share API Level 2）需要 HTTPS + 瀏覽器支援
 *   （Android Chrome、iOS Safari 15+ 可用；桌面 Chrome/Edge 多數不支援檔案分享）
 * - 不支援時 fallback 為直接下載檔案，並提示使用者改用下載
 * - shareImageOfElement 利用 html2canvas 的 windowWidth 選項，讓畫面以較寬的虛擬視窗寬度計算版面
 *   （而不是直接修改實際 DOM 樣式），避免手機窄螢幕橫向滑動表格被截斷，
 *   同時避免直接改 DOM 樣式在某些手機瀏覽器（如三星 Internet/Chrome）截圖時版面跑掉變黑屏的問題
 */
import html2canvas from 'html2canvas'

function canShareFiles(files: File[]): boolean {
  return typeof navigator !== 'undefined' && 'share' in navigator && 'canShare' in navigator && navigator.canShare({ files })
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export interface ShareResult {
  shared: boolean // true = 已呼叫原生分享選單；false = 不支援，已改為下載
}

/**
 * 找出元素本身與所有子元素中，最大的內容寬度（scrollWidth）
 * 用於判斷需要多寬的虛擬視窗才能讓內部橫向滑動表格完整展開
 */
function findMaxScrollWidth(el: HTMLElement): number {
  let max = el.scrollWidth
  const all = el.querySelectorAll<HTMLElement>('*')
  for (const node of all) {
    if (node.scrollWidth > max) max = node.scrollWidth
  }
  return max
}

/**
 * 將指定 DOM 元素轉成 PNG 圖片並分享
 */
export async function shareImageOfElement(
  el: HTMLElement,
  fileName: string,
  _unusedTitle?: string,
): Promise<ShareResult> {
  let canvas: HTMLCanvasElement
  try {
    const fullWidth = findMaxScrollWidth(el) + 40
    canvas = await html2canvas(el, {
      backgroundColor: '#0f0f1a',
      scale: 2,
      windowWidth: fullWidth,
    })
  } catch (e: any) {
    throw new Error(`html2canvas失敗: ${e?.message || e}`)
  }

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas toBlob failed'))), 'image/png'),
  )
  const file = new File([blob], fileName, { type: 'image/png' })

  if (!canShareFiles([file])) {
    downloadBlob(blob, fileName)
    return { shared: false }
  }
  try {
    await navigator.share({ files: [file] })
    return { shared: true }
  } catch (e: any) {
    throw new Error(`navigator.share失敗: ${e?.name || ''} ${e?.message || e}`)
  }
}

/**
 * 分享 PDF Blob（呼叫端先用 generatePdfBlob 產生）
 */
export async function sharePdfBlob(blob: Blob, fileName: string, _unusedTitle?: string): Promise<ShareResult> {
  const file = new File([blob], fileName, { type: 'application/pdf' })

  if (canShareFiles([file])) {
    await navigator.share({ files: [file] })
    return { shared: true }
  }
  downloadBlob(blob, fileName)
  return { shared: false }
}
