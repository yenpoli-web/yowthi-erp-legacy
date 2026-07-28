/**
 * 共用 Excel 匯出工具
 * 用法：generateExcel({ columns, rows, fileName, sumKeys? })
 *
 * - rows 使用「原始數值」（非 PDF 那種已 toFixed 的字串），確保總計加總正確
 * - sumKeys：需要加總的欄位 key，會出現在最下方「總計」列；其餘欄位總計列留空
 * - 不分組、不產生小計列，只有整份資料最下方一列總計
 */
import * as XLSX from 'xlsx'

export interface ExcelColumn {
  header: string
  key: string
}

export interface GenerateExcelOptions {
  columns: ExcelColumn[]
  rows: Record<string, string | number>[]
  fileName: string
  sheetName?: string
  /** @deprecated 不再產生分組小計，此參數會被忽略 */
  groupKey?: (row: Record<string, string | number>) => string
  /** 需要加總的欄位 key（僅用於最下方「總計」列），不提供則不產生總計列 */
  sumKeys?: string[]
  /** 總計列的標籤要放在哪一欄，預設放第一欄 */
  labelKey?: string
}

export function generateExcel(opts: GenerateExcelOptions) {
  const { columns, rows, sumKeys = [] } = opts
  const labelKey = opts.labelKey ?? columns[0]?.key
  const aoa: (string | number)[][] = [columns.map((c) => c.header)]

  for (const row of rows) aoa.push(columns.map((c) => row[c.key] ?? ''))

  if (sumKeys.length) {
    const totalRow = columns.map((c) => {
      if (c.key === labelKey) return '總計'
      if (sumKeys.includes(c.key)) {
        return rows.reduce((acc, r) => acc + (Number(r[c.key]) || 0), 0)
      }
      return ''
    })
    aoa.push(totalRow)
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa)
  // 欄寬依標題文字長度自動估算，避免全部擠在一起
  ws['!cols'] = columns.map((c) => ({ wch: Math.max(10, c.header.length * 1.8) }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, opts.sheetName ?? 'Sheet1')
  XLSX.writeFile(wb, opts.fileName)
}
