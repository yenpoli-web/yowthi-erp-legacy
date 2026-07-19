/**
 * 共用 PDF 匯出工具
 * 內嵌 Sarabun 泰文字型（支援泰文 + 拉丁文 + ฿ 符號）
 * 用法：generatePdf({ title, columns, rows, summary, fileName })
 */
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

let cachedFontBase64: { regular: string; bold: string } | null = null

async function loadFonts(doc: jsPDF) {
  if (!cachedFontBase64) {
    const [regularBuf, boldBuf] = await Promise.all([
      fetch('/fonts/Sarabun-Regular.ttf').then((r) => r.arrayBuffer()),
      fetch('/fonts/Sarabun-Bold.ttf').then((r) => r.arrayBuffer()),
    ])
    const toBase64 = (buf: ArrayBuffer) => {
      let binary = ''
      const bytes = new Uint8Array(buf)
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
      return btoa(binary)
    }
    cachedFontBase64 = { regular: toBase64(regularBuf), bold: toBase64(boldBuf) }
  }
  // 注意：VFS / addFont 是綁在每个 jsPDF doc 實例上，每次新建 doc 都必須重新註冊，不能只註冊一次
  doc.addFileToVFS('Sarabun-Regular.ttf', cachedFontBase64.regular)
  doc.addFileToVFS('Sarabun-Bold.ttf', cachedFontBase64.bold)
  doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal')
  doc.addFont('Sarabun-Bold.ttf', 'Sarabun', 'bold')
}

export interface PdfColumn {
  header: string
  key: string
  align?: 'left' | 'center' | 'right'
}

export interface PdfSummaryItem {
  label: string
  value: string
}

export interface GeneratePdfOptions {
  title: string
  subtitle?: string
  columns: PdfColumn[]
  rows: Record<string, string | number>[]
  summary?: PdfSummaryItem[]
  fileName: string
  /**
   * 頁面方向，預設永遠為直式（依領域要求不設例外），
   * 僅供後端特殊需求時明確指定 'landscape' 才会覆蓋
   */
  orientation?: 'portrait' | 'landscape'
}

/**
 * 建立 jsPDF doc 物件（共用核心邏輯，不含輸出方式）
 * generatePdf（下載）與 generatePdfBlob（分享用）皆基於此函式
 */
async function buildPdfDoc(opts: GeneratePdfOptions): Promise<jsPDF> {
  // 全部強制直式，不再依欄位數自動改橫式（依領域要求無例外）
  const orientation: 'portrait' | 'landscape' = opts.orientation ?? 'portrait'
  const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' })
  await loadFonts(doc)
  doc.setFont('Sarabun', 'bold')
  doc.setFontSize(18)
  doc.text(opts.title, 40, 42)

  if (opts.subtitle) {
    doc.setFont('Sarabun', 'normal')
    doc.setFontSize(12)
    doc.text(opts.subtitle, 40, 62)
  }

  autoTable(doc, {
    startY: opts.subtitle ? 78 : 60,
    margin: { left: 40, right: 40 },
    head: [opts.columns.map((c) => c.header)],
    body: opts.rows.map((row) => opts.columns.map((c) => String(row[c.key] ?? ''))),
    styles: { font: 'Sarabun', fontSize: 8.5, cellPadding: 4 },
    headStyles: { font: 'Sarabun', fontStyle: 'bold', fontSize: 7.5, fillColor: [232, 130, 12], textColor: 255 },
    didParseCell: (data) => {
      const col = opts.columns[data.column.index]
      if (col?.align) data.cell.styles.halign = col.align
    },
  })

  if (opts.summary?.length) {
    const finalY = (doc as any).lastAutoTable.finalY + 22
    autoTable(doc, {
      startY: finalY,
      margin: { left: 40 },
      tableWidth: 'wrap',
      theme: 'plain',
      body: opts.summary.map((item) => [item.label, item.value]),
      styles: { font: 'Sarabun', fontSize: 13, cellPadding: { top: 4, bottom: 4, left: 0, right: 14 } },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'left' },
        1: { halign: 'left' },
      },
    })
  }

  return doc
}

export async function generatePdf(opts: GeneratePdfOptions) {
  const doc = await buildPdfDoc(opts)
  doc.save(opts.fileName)
}

/**
 * 產生 PDF 並回傳 Blob（不下載），供「分享至雲端硬碟」等分享功能使用
 */
export async function generatePdfBlob(opts: GeneratePdfOptions): Promise<Blob> {
  const doc = await buildPdfDoc(opts)
  return doc.output('blob')
}
