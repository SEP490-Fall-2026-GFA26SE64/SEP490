import type { CellValue, Worksheet } from 'exceljs'
import { loadExcel } from './userImportTemplate'
import {
  IMPORT_COLUMNS,
  MAX_IMPORT_ROWS,
  SHEET_NAMES,
  headerField,
  normalizeKey,
  type ImportField,
  type RawImportRow,
} from './userImportShared'

export type ParseError =
  | { code: 'invalidFile' }
  | { code: 'missingSheet' }
  | { code: 'missingHeaders'; missing: ImportField[] }
  | { code: 'empty' }
  | { code: 'tooManyRows'; count: number }

export type ParseResult = { ok: true; rows: RawImportRow[] } | { ok: false; error: ParseError }

const REQUIRED_FIELDS = IMPORT_COLUMNS.filter(column => column.required).map(column => column.field)
const HEADER_SCAN_ROWS = 10

export function cellText(value: CellValue): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'object') {
    if ('richText' in value && Array.isArray(value.richText)) return value.richText.map(part => part.text).join('').trim()
    if ('text' in value) return cellText(value.text as CellValue)
    if ('result' in value) return cellText((value.result ?? null) as CellValue)
    if ('error' in value) return ''
    return ''
  }
  return String(value).trim()
}

function findHeader(sheet: Worksheet): { row: number; columns: Map<ImportField, number> } | null {
  let best: { row: number; columns: Map<ImportField, number> } | null = null
  const limit = Math.min(sheet.rowCount, HEADER_SCAN_ROWS)
  for (let rowNumber = 1; rowNumber <= limit; rowNumber++) {
    const columns = new Map<ImportField, number>()
    sheet.getRow(rowNumber).eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const field = headerField(cellText(cell.value))
      if (field && !columns.has(field)) columns.set(field, colNumber)
    })
    if (columns.size > (best?.columns.size ?? 1)) best = { row: rowNumber, columns }
  }
  return best && best.columns.size >= 2 ? best : null
}

const USERS_SHEET_KEYS = new Set(Object.values(SHEET_NAMES.users).map(normalizeKey))

/** Reads the Users tab of an import workbook (either language) into raw rows. */
export async function parseUserImportFile(data: ArrayBuffer): Promise<ParseResult> {
  const ExcelJS = await loadExcel()
  const workbook = new ExcelJS.Workbook()
  try {
    await workbook.xlsx.load(data)
  } catch {
    return { ok: false, error: { code: 'invalidFile' } }
  }

  const visible = workbook.worksheets.filter(sheet => sheet.state === 'visible' || sheet.state === undefined)
  const named = visible.find(sheet => USERS_SHEET_KEYS.has(normalizeKey(sheet.name)))
  let target: { sheet: Worksheet; header: NonNullable<ReturnType<typeof findHeader>> } | null = null
  for (const sheet of named ? [named, ...visible.filter(item => item !== named)] : visible) {
    const header = findHeader(sheet)
    if (header?.columns.has('email')) { target = { sheet, header }; break }
  }
  if (!target) {
    if (named) return { ok: false, error: { code: 'missingHeaders', missing: [...REQUIRED_FIELDS] } }
    return { ok: false, error: { code: 'missingSheet' } }
  }

  const missing = REQUIRED_FIELDS.filter(field => !target!.header.columns.has(field))
  if (missing.length > 0) return { ok: false, error: { code: 'missingHeaders', missing } }

  const rows: RawImportRow[] = []
  const { sheet, header } = target
  for (let rowNumber = header.row + 1; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber)
    const read = (field: ImportField) => {
      const col = header.columns.get(field)
      return col ? cellText(row.getCell(col).value) : ''
    }
    const raw: RawImportRow = {
      rowNumber,
      fullName: read('fullName'),
      email: read('email'),
      role: read('role'),
      department: read('department'),
      jobPosition: read('jobPosition'),
      targetRole: read('targetRole'),
      level: read('level'),
    }
    if (IMPORT_COLUMNS.some(column => raw[column.field])) rows.push(raw)
  }

  if (rows.length === 0) return { ok: false, error: { code: 'empty' } }
  if (rows.length > MAX_IMPORT_ROWS) return { ok: false, error: { code: 'tooManyRows', count: rows.length } }
  return { ok: true, rows }
}
