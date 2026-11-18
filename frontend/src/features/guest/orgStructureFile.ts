import type { Borders, CellValue, DataValidation, Fill, Font, Workbook, Worksheet } from 'exceljs'

export interface DepartmentRow { row: number; code: string; name: string; description: string }
export interface JobPositionRow { row: number; departmentCode: string; code: string; name: string }
export interface TargetRoleRow { row: number; jobPositionCode: string; code: string; name: string; scope: string }
export interface LevelRow { row: number; targetRoleCode: string; name: string; rank: string }
/** The four data sheets of an organization structure workbook; the server validates them again. */
export interface OrgStructureSheets {
  departments: DepartmentRow[]
  jobPositions: JobPositionRow[]
  targetRoles: TargetRoleRow[]
  levels: LevelRow[]
}
export type SheetKey = keyof OrgStructureSheets

export const MAX_STRUCTURE_ROWS = 500
export const MAX_STRUCTURE_FILE_BYTES = 1024 * 1024
export const STRUCTURE_TEMPLATE_FILE = 'organization-structure-template.xlsx'
const LAST_ROW = MAX_STRUCTURE_ROWS + 1

type Kind = 'code' | 'name' | 'text' | 'ref' | 'lookup' | 'rank'
interface ColumnSpec { field: string; header: string; vi: string; kind: Kind; width: number; hint: string }
interface SheetSpec { key: SheetKey; name: string; vi: string; purpose: [string, string]; columns: ColumnSpec[]; examples: (string | number)[][] }

/** Sheet and header names are canonical: backend row errors use the same sheet and column names. */
export const STRUCTURE_SHEETS: SheetSpec[] = [
  { key: 'departments', name: 'Departments', vi: 'Phòng ban', purpose: ['One row per department.', 'Mỗi dòng là một phòng ban.'], columns: [
    { field: 'code', header: 'Department code', vi: 'Mã phòng ban', kind: 'code', width: 20, hint: 'Unique short code, e.g. ENG. Letters, digits, . _ - only.' },
    { field: 'name', header: 'Department name', vi: 'Tên phòng ban', kind: 'name', width: 32, hint: 'Full name, up to 120 characters.' },
    { field: 'description', header: 'Department description', vi: 'Mô tả phòng ban', kind: 'text', width: 60, hint: 'Purpose and scope, up to 1000 characters.' },
  ], examples: [
    ['ENG', 'Software Engineering', 'Builds and maintains our products and platforms.'],
    ['QA', 'Quality Assurance', 'Owns product quality and testing.'],
  ] },
  { key: 'jobPositions', name: 'Job positions', vi: 'Vị trí công việc', purpose: ['One row per job position, inside one department.', 'Mỗi dòng là một vị trí công việc thuộc một phòng ban.'], columns: [
    { field: 'departmentCode', header: 'Department code', vi: 'Mã phòng ban', kind: 'ref', width: 20, hint: 'Pick a code from the Departments sheet.' },
    { field: 'departmentName', header: 'Department name', vi: 'Tên phòng ban', kind: 'lookup', width: 30, hint: '' },
    { field: 'code', header: 'Job position code', vi: 'Mã vị trí công việc', kind: 'code', width: 22, hint: 'Unique short code, e.g. DEV. Letters, digits, . _ - only.' },
    { field: 'name', header: 'Job position name', vi: 'Tên vị trí công việc', kind: 'name', width: 32, hint: 'Full name, up to 120 characters.' },
  ], examples: [['ENG', '', 'DEV', 'Software Developer'], ['QA', '', 'QA-ENG', 'QA Engineer']] },
  { key: 'targetRoles', name: 'Roles', vi: 'Vai trò', purpose: ['One row per role, inside one job position.', 'Mỗi dòng là một vai trò thuộc một vị trí công việc.'], columns: [
    { field: 'jobPositionCode', header: 'Job position code', vi: 'Mã vị trí công việc', kind: 'ref', width: 22, hint: 'Pick a code from the Job positions sheet.' },
    { field: 'jobPositionName', header: 'Job position name', vi: 'Tên vị trí công việc', kind: 'lookup', width: 30, hint: '' },
    { field: 'code', header: 'Role code', vi: 'Mã vai trò', kind: 'code', width: 22, hint: 'Unique short code, e.g. BE-DEV. Letters, digits, . _ - only.' },
    { field: 'name', header: 'Role name', vi: 'Tên vai trò', kind: 'name', width: 30, hint: 'Full name, up to 120 characters.' },
    { field: 'scope', header: 'Role scope', vi: 'Phạm vi vai trò', kind: 'text', width: 56, hint: 'What this role is responsible for, up to 1000 characters.' },
  ], examples: [
    ['DEV', '', 'BE-DEV', 'Backend Developer', 'Designs and builds server-side services and APIs.'],
    ['DEV', '', 'FE-DEV', 'Frontend Developer', 'Builds accessible web interfaces.'],
    ['QA-ENG', '', 'QA-AUTO', 'Automation Tester', 'Automates regression and API testing.'],
  ] },
  { key: 'levels', name: 'Levels', vi: 'Cấp độ', purpose: ['One row per level of a role.', 'Mỗi dòng là một cấp độ của vai trò.'], columns: [
    { field: 'targetRoleCode', header: 'Role code', vi: 'Mã vai trò', kind: 'ref', width: 22, hint: 'Pick a code from the Roles sheet.' },
    { field: 'targetRoleName', header: 'Role name', vi: 'Tên vai trò', kind: 'lookup', width: 30, hint: '' },
    { field: 'name', header: 'Level name', vi: 'Tên cấp độ', kind: 'name', width: 24, hint: 'E.g. Junior. Unique within the role.' },
    { field: 'rank', header: 'Level rank', vi: 'Thứ hạng cấp độ', kind: 'rank', width: 14, hint: 'Whole number 1-99, 1 = most junior. Unique within the role.' },
  ], examples: [
    ['BE-DEV', '', 'Junior', 1], ['BE-DEV', '', 'Senior', 2], ['FE-DEV', '', 'Junior', 1],
    ['QA-AUTO', '', 'Junior', 1], ['QA-AUTO', '', 'Senior', 2],
  ] },
]

/** Where a reference column takes its values from: the code (first) and name (second) columns of the parent sheet. */
const PARENT: Partial<Record<SheetKey, { sheet: string; code: string; name: string }>> = {
  jobPositions: { sheet: 'Departments', code: 'A', name: 'B' },
  targetRoles: { sheet: 'Job positions', code: 'C', name: 'D' },
  levels: { sheet: 'Roles', code: 'C', name: 'D' },
}

export type StructureFileProblem =
  | { code: 'unsupportedType' }
  | { code: 'tooLarge' }
  | { code: 'unreadable' }
  | { code: 'missingSheets'; missing: string[] }
  | { code: 'missingColumns'; sheet: string; missing: string[] }
  | { code: 'empty' }
  | { code: 'tooManyRows'; sheet: string; count: number }

export class StructureFileError extends Error {
  readonly problem: StructureFileProblem

  constructor(problem: StructureFileProblem) {
    super(problem.code)
    this.name = 'StructureFileError'
    this.problem = problem
  }
}

type ExcelModule = typeof import('exceljs')

async function loadExcel(): Promise<ExcelModule> {
  const mod = await import('exceljs')
  return ((mod as unknown as { default?: ExcelModule }).default ?? mod) as ExcelModule
}

const normalize = (value: string) => value.normalize('NFC').toLowerCase().replace(/[\s_*]+/g, ' ').trim()
const HEADER_SCAN_ROWS = 10

function cellText(value: CellValue): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'object') {
    if ('richText' in value && Array.isArray(value.richText)) return value.richText.map(part => part.text).join('')
    if ('text' in value) return cellText(value.text as CellValue)
    if ('result' in value) return cellText((value.result ?? null) as CellValue)
    return ''
  }
  return String(value)
}

function readSheet(sheet: Worksheet, spec: SheetSpec): Record<string, string | number>[] {
  const inputs = spec.columns.filter(column => column.kind !== 'lookup')
  const names = new Map(inputs.flatMap(column => [[normalize(column.header), column.field], [normalize(column.vi), column.field]]))
  let header: { row: number; columns: Map<string, number> } | null = null
  for (let rowNumber = 1; rowNumber <= Math.min(sheet.rowCount, HEADER_SCAN_ROWS); rowNumber++) {
    const columns = new Map<string, number>()
    sheet.getRow(rowNumber).eachCell({ includeEmpty: false }, (cell, column) => {
      const field = names.get(normalize(cellText(cell.value)))
      if (field && !columns.has(field)) columns.set(field, column)
    })
    if (columns.size > (header?.columns.size ?? 0)) header = { row: rowNumber, columns }
  }
  const missing = inputs.filter(column => !header?.columns.has(column.field)).map(column => column.header)
  if (!header || missing.length) throw new StructureFileError({ code: 'missingColumns', sheet: spec.name, missing })
  const rows: Record<string, string | number>[] = []
  for (let rowNumber = header.row + 1; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber)
    const values: Record<string, string | number> = { row: rowNumber }
    for (const column of inputs) values[column.field] = cellText(row.getCell(header.columns.get(column.field)!).value).trim()
    if (inputs.some(column => values[column.field])) rows.push(values)
  }
  if (rows.length > MAX_STRUCTURE_ROWS) throw new StructureFileError({ code: 'tooManyRows', sheet: spec.name, count: rows.length })
  return rows
}

/** Reads the four tabs of an uploaded .xlsx workbook into raw rows; the server performs authoritative validation. */
export async function parseStructureFile(file: File): Promise<OrgStructureSheets> {
  if (!file.name.toLowerCase().endsWith('.xlsx')) throw new StructureFileError({ code: 'unsupportedType' })
  if (file.size > MAX_STRUCTURE_FILE_BYTES) throw new StructureFileError({ code: 'tooLarge' })
  const ExcelJS = await loadExcel()
  const workbook = new ExcelJS.Workbook()
  try {
    await workbook.xlsx.load(await file.arrayBuffer())
  } catch {
    throw new StructureFileError({ code: 'unreadable' })
  }
  const byName = new Map(workbook.worksheets.map(sheet => [normalize(sheet.name), sheet]))
  const find = (spec: SheetSpec) => byName.get(normalize(spec.name)) ?? byName.get(normalize(spec.vi))
  const missing = STRUCTURE_SHEETS.filter(spec => !find(spec)).map(spec => spec.name)
  if (missing.length) throw new StructureFileError({ code: 'missingSheets', missing })
  const result = Object.fromEntries(STRUCTURE_SHEETS.map(spec => [spec.key, readSheet(find(spec)!, spec)])) as unknown as OrgStructureSheets
  if (STRUCTURE_SHEETS.every(spec => !result[spec.key].length)) throw new StructureFileError({ code: 'empty' })
  return result
}

// Workbook palette mirrors shared/styles/tokens.css (Excel needs ARGB).
const COLOR = { primary: 'FFEA580C', primaryDark: 'FFC2410C', tint: 'FFFFF5EB', canvas: 'FFF8FAFC', muted: 'FFF1F5F9',
  border: 'FFE2E8F0', text: 'FF0F172A', textMuted: 'FF64748B', slate: 'FF334155', white: 'FFFFFFFF' }
const FONT = 'Calibri'
const solid = (argb: string): Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })
const thin = (argb: string): Partial<Borders> => ({ top: { style: 'thin', color: { argb } }, bottom: { style: 'thin', color: { argb } },
  left: { style: 'thin', color: { argb } }, right: { style: 'thin', color: { argb } } })
const font = (extra: Partial<Font> = {}): Partial<Font> => ({ name: FONT, size: 11, color: { argb: COLOR.text }, ...extra })
const letter = (index: number) => String.fromCharCode(65 + index)
type RangeValidations = { dataValidations: { add(address: string, validation: DataValidation): void; model: Record<string, DataValidation> } }

function validationFor(spec: SheetSpec, column: ColumnSpec, col: string): DataValidation | null {
  const range = `$${col}$2:$${col}$${LAST_ROW}`
  const base = { allowBlank: true, showInputMessage: !!column.hint, promptTitle: column.header.slice(0, 32), prompt: column.hint,
    showErrorMessage: true, errorStyle: 'stop' as const, errorTitle: 'Invalid value' }
  switch (column.kind) {
    case 'ref': {
      const parent = PARENT[spec.key]!
      const sheet = `'${parent.sheet}'`
      return { ...base, type: 'list', formulae: [`OFFSET(${sheet}!$${parent.code}$2,0,0,MAX(1,COUNTA(${sheet}!$${parent.code}$2:$${parent.code}$${LAST_ROW})),1)`],
        error: `Choose a code that exists in the ${parent.sheet} sheet.` }
    }
    case 'code':
      return { ...base, type: 'custom', formulae: [`AND(LEN(${col}2)<=64,COUNTIF(${range},${col}2)=1)`],
        error: 'Codes must be unique in this sheet and at most 64 characters.' }
    case 'name':
      if (spec.key === 'levels')
        return { ...base, type: 'custom', formulae: [`AND(LEN(${col}2)<=120,COUNTIFS($A$2:$A$${LAST_ROW},$A2,${range},${col}2)=1)`],
          error: 'Level names must be unique within a role and at most 120 characters.' }
      return { ...base, type: 'textLength', operator: 'lessThanOrEqual', formulae: [120], error: 'Use at most 120 characters.' }
    case 'text':
      return { ...base, type: 'textLength', operator: 'lessThanOrEqual', formulae: [1000], error: 'Use at most 1000 characters.' }
    case 'rank':
      return { ...base, type: 'custom',
        formulae: [`AND(ISNUMBER(${col}2),${col}2=INT(${col}2),${col}2>=1,${col}2<=99,COUNTIFS($A$2:$A$${LAST_ROW},$A2,${range},${col}2)=1)`],
        error: 'Use a whole number from 1 to 99 that is not already used by another level of this role.' }
    default:
      return null
  }
}

function buildDataSheet(workbook: Workbook, spec: SheetSpec) {
  const sheet = workbook.addWorksheet(spec.name, { properties: { tabColor: { argb: COLOR.primary } },
    views: [{ state: 'frozen', ySplit: 1, activeCell: 'A2', showGridLines: false }] })
  sheet.columns = spec.columns.map(column => ({ key: column.field, width: column.width }))
  const header = sheet.getRow(1)
  header.height = 30
  spec.columns.forEach((column, index) => {
    const cell = header.getCell(index + 1)
    const lookup = column.kind === 'lookup'
    cell.value = column.header
    cell.font = font({ bold: true, color: { argb: lookup ? COLOR.slate : COLOR.white }, italic: lookup })
    cell.fill = solid(lookup ? COLOR.muted : COLOR.primary)
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    cell.border = thin(lookup ? COLOR.border : COLOR.primaryDark)
    if (!lookup) cell.note = { texts: [{ text: column.hint }] }
  })
  const parent = PARENT[spec.key]
  for (let rowNumber = 2; rowNumber <= LAST_ROW; rowNumber++) {
    const row = sheet.getRow(rowNumber)
    const example = spec.examples[rowNumber - 2]
    spec.columns.forEach((column, index) => {
      const cell = row.getCell(index + 1)
      const lookup = column.kind === 'lookup'
      if (lookup && parent) {
        const sheetRef = `'${parent.sheet}'`
        cell.value = { formula: `IF($A${rowNumber}="","",IFERROR(INDEX(${sheetRef}!$${parent.name}$2:$${parent.name}$${LAST_ROW},`
          + `MATCH($A${rowNumber},${sheetRef}!$${parent.code}$2:$${parent.code}$${LAST_ROW},0)),"Not found"))` }
      } else if (example && example[index] !== '') cell.value = example[index]
      cell.font = font(lookup ? { italic: true, color: { argb: COLOR.textMuted } } : {})
      cell.fill = solid(lookup ? COLOR.canvas : rowNumber % 2 === 0 ? COLOR.white : COLOR.canvas)
      cell.border = thin(COLOR.border)
      cell.alignment = column.kind === 'rank' ? { vertical: 'top', horizontal: 'center' }
        : { vertical: 'top', wrapText: column.kind === 'text', indent: 1 }
      // Input cells stay editable on the protected sheet; only automatic name columns are locked.
      cell.protection = { locked: lookup }
    })
  }
  spec.columns.forEach((column, index) => {
    const col = letter(index)
    const validation = validationFor(spec, column, col)
    // exceljs 4.4 supports range validations at runtime but omits `dataValidations` from its typings.
    if (validation) (sheet as unknown as RangeValidations).dataValidations.add(`${col}2:${col}${LAST_ROW}`, validation)
  })
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: spec.columns.length } }
  // No password: protection only guards the automatic columns against accidental edits.
  void sheet.protect('', { selectLockedCells: true, selectUnlockedCells: true, formatCells: true, formatColumns: true,
    formatRows: true, insertRows: true, sort: true, autoFilter: true })
}

function buildInstructions(workbook: Workbook) {
  const sheet = workbook.addWorksheet('Instructions', { properties: { tabColor: { argb: COLOR.slate } }, views: [{ showGridLines: false }] })
  sheet.columns = [{ width: 3 }, { width: 24 }, { width: 46 }, { width: 70 }]
  const write = (row: number, values: (string | null)[], style: { font?: Partial<Font>; fill?: string; height?: number } = {}) => {
    const r = sheet.getRow(row)
    values.forEach((value, index) => {
      if (value === null) return
      const cell = r.getCell(index + 2)
      cell.value = value
      cell.font = font(style.font)
      cell.alignment = { vertical: 'top', wrapText: true }
      if (style.fill) cell.fill = solid(style.fill)
    })
    if (style.height) r.height = style.height
  }
  write(2, ['Organization structure import template'], { font: { size: 18, bold: true, color: { argb: COLOR.primary } }, height: 30 })
  write(3, ['Fill the four orange tabs from left to right, save the file as .xlsx and upload it during registration.'],
    { font: { color: { argb: COLOR.textMuted } } })
  sheet.mergeCells('B2:D2')
  sheet.mergeCells('B3:D3')
  write(5, ['Sheet', 'One row means', 'Columns'], { font: { bold: true, color: { argb: COLOR.white } }, fill: COLOR.primary, height: 22 })
  STRUCTURE_SHEETS.forEach((spec, index) => write(6 + index, [spec.name, spec.purpose[0],
    spec.columns.map(column => column.kind === 'lookup' ? `${column.header} - filled automatically` : column.header).join('\n')],
  { fill: index % 2 ? COLOR.canvas : COLOR.white }))
  const rules = [
    'Every cell in an orange column is required. Grey columns show the matching name automatically and cannot be edited.',
    'Codes use letters, digits, ".", "_" and "-" (max 64) and must be unique within their sheet; upper/lower case is ignored.',
    'Reference columns offer a dropdown of codes from the previous sheet. Add parents first, then pick them.',
    'Every department needs at least one job position, every job position at least one role, and every role at least one level.',
    'Level rank is a whole number from 1 to 99 (1 = most junior). Level names and ranks must be unique within a role.',
    'Names: up to 120 characters. Department description and role scope: up to 1000 characters. Up to 500 rows per sheet, file up to 1 MB.',
    'To remove a row, clear its cells. Replace or delete the example rows before uploading.',
  ]
  write(11, ['Rules'], { font: { bold: true, size: 13 } })
  rules.forEach((rule, index) => { write(12 + index, [`${index + 1}.  ${rule}`]); sheet.mergeCells(`B${12 + index}:D${12 + index}`) })
  write(20, ['Legend'], { font: { bold: true, size: 13 } })
  write(21, ['You fill', 'Orange header'], { fill: COLOR.tint })
  write(22, ['Automatic', 'Grey header, read-only'], { fill: COLOR.muted })
}

export async function buildStructureTemplate(): Promise<Workbook> {
  const ExcelJS = await loadExcel()
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Adapt Learn Graph'
  workbook.created = new Date()
  buildInstructions(workbook)
  for (const spec of STRUCTURE_SHEETS) buildDataSheet(workbook, spec)
  // Recalculate automatic name columns when the file is first opened.
  workbook.calcProperties.fullCalcOnLoad = true
  workbook.views = [{ x: 0, y: 0, width: 20000, height: 12000, firstSheet: 0, activeTab: 1, visibility: 'visible' }]
  return workbook
}

export async function downloadStructureTemplate(): Promise<void> {
  const workbook = await buildStructureTemplate()
  const blob = new Blob([await workbook.xlsx.writeBuffer()],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = STRUCTURE_TEMPLATE_FILE
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
