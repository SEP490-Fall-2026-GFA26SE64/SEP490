import type { Borders, DataValidation, Fill, Font, Workbook } from 'exceljs'

/** Shared look of downloadable import templates; the palette mirrors shared/styles/tokens.css (Excel needs ARGB). */
export const EXCEL_COLOR = { primary: 'FFEA580C', primaryDark: 'FFC2410C', tint: 'FFFFF5EB', canvas: 'FFF8FAFC', muted: 'FFF1F5F9',
  border: 'FFE2E8F0', text: 'FF0F172A', textMuted: 'FF64748B', slate: 'FF334155', white: 'FFFFFFFF' }
const FONT = 'Calibri'

export const solid = (argb: string): Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })
export const thin = (argb: string): Partial<Borders> => ({ top: { style: 'thin', color: { argb } }, bottom: { style: 'thin', color: { argb } },
  left: { style: 'thin', color: { argb } }, right: { style: 'thin', color: { argb } } })
export const excelFont = (extra: Partial<Font> = {}): Partial<Font> => ({ name: FONT, size: 11, color: { argb: EXCEL_COLOR.text }, ...extra })
export const columnLetter = (index: number) => String.fromCharCode(65 + index)
/** exceljs 4.4 supports range validations at runtime but omits `dataValidations` from its typings. */
export type RangeValidations = { dataValidations: { add(address: string, validation: DataValidation): void; model: Record<string, DataValidation> } }

export type ExcelModule = typeof import('exceljs')

export async function loadExcel(): Promise<ExcelModule> {
  const mod = await import('exceljs')
  return ((mod as unknown as { default?: ExcelModule }).default ?? mod) as ExcelModule
}

export async function downloadWorkbook(workbook: Workbook, fileName: string): Promise<void> {
  const blob = new Blob([await workbook.xlsx.writeBuffer()],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
