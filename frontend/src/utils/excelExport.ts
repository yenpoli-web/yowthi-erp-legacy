/**
 * 共用 Excel 匯出工具
 * 用法：generateExcel({ columns, rows, fileName, groupKey?, sumKeys? })
 *
 * - rows 使用「原始數值」（非 PDF 那種已 toFixed 的字串），確保小計/總計加總正確
 * - groupKey：提供時依回傳字串分組，每組結束插入「XXX 小計」列；不提供則不分組
 * - sumKeys：需要加總的欄位 key，會出現在小計列與最下方「總計」列；其餘欄位小計列留空
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
  /** 分組依據，回傳分組顯示名稱（例如農民姓名）；不提供則不分組小計 */
  groupKey?: (row: Record<string, string | number>) => string
  /** 需要加總的欄位 key（小計列 + 總計列），不提供則不產生小計/總計列 */
  sumKeys?: string[]
  /** 小計/總計列的標籤要放在哪一欄，預設放第一欄 */
  labelKey?: string
}

function buildAggregateRow(
  columns: ExcelColumn[],
  labelKey: string,
  sumKeys: string[],
  label: string,
  data: Record<string, string | number>[],
): (string | number)[] {
  return columns.map((c) => {
    if (c.key === labelKey) return label
    if (sumKeys.includes(c.key)) {
      return data.reduce((acc, r) => acc + (Number(r[c.key]) || 0), 0)
    }
    return ''
  })
}

export function generateExcel(opts: GenerateExcelOptions) {
  const { columns, rows, sumKeys = [], groupKey } = opts
  const labelKey = opts.labelKey ?? columns[0]?.key
  const aoa: (string | number)[][] = [columns.map((c) => c.header)]

  if (groupKey && rows.length) {
    let currentGroup: string | null = null
    let bucket: Record<string, string | number>[] = []
    const flushGroup = () => {
      if (!bucket.length) return
      aoa.push(buildAggregateRow(columns, labelKey, sumKeys, `${currentGroup} 小計`, bucket))
      bucket = []
    }
    for (const row of rows) {
      const g = groupKey(row)
      if (currentGroup !== null && g !== currentGroup) flushGroup()
      currentGroup = g
      bucket.push(row)
      aoa.push(columns.map((c) => row[c.key] ?? ''))
    }
    flushGroup()
    if (sumKeys.length) aoa.push(buildAggregateRow(columns, labelKey, sumKeys, '總計', rows))
  } else {
    for (const row of rows) aoa.push(columns.map((c) => row[c.key] ?? ''))
    if (sumKeys.length) aoa.push(buildAggregateRow(columns, labelKey, sumKeys, '總計', rows))
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa)
  // 欄寬依標題文字長度自動估算，避免全部擠在一起
  ws['!cols'] = columns.map((c) => ({ wch: Math.max(10, c.header.length * 1.8) }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, opts.sheetName ?? 'Sheet1')
  XLSX.writeFile(wb, opts.fileName)
}
