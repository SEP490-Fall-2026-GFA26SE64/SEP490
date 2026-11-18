import type { Borders, Cell, Fill, Font, Workbook, Worksheet } from 'exceljs'
import {
  ERROR_COLUMN_HEADER,
  IMPORT_COLUMNS,
  IMPORT_ROLES,
  MAX_IMPORT_ROWS,
  ROLE_LABELS,
  SHEET_NAMES,
  columnHeader,
  type ImportCatalog,
  type ImportField,
  type ImportLanguage,
  type RawImportRow,
} from './userImportShared'

type ExcelModule = typeof import('exceljs')

async function loadExcel(): Promise<ExcelModule> {
  const mod = await import('exceljs')
  return ((mod as unknown as { default?: ExcelModule }).default ?? mod) as ExcelModule
}

// Workbook palette mirrors the design tokens in shared/styles/tokens.css (ARGB required by Excel).
const COLOR = {
  primary: 'FFEA580C',
  primaryDark: 'FFC2410C',
  tint: 'FFFFF5EB',
  canvas: 'FFF8FAFC',
  muted: 'FFF1F5F9',
  border: 'FFE2E8F0',
  text: 'FF0F172A',
  textMuted: 'FF64748B',
  slate: 'FF334155',
  white: 'FFFFFFFF',
  destructive: 'FFDC2626',
  destructiveTint: 'FFFEF2F2',
}
const FONT_NAME = 'Calibri'
const FIRST_DATA_ROW = 2
const HEADER_ROW = 1
const OPTIONS_SHEET = 'Options'

const fill = (argb: string): Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })
const font = (overrides: Partial<Font> = {}): Partial<Font> => ({ name: FONT_NAME, size: 11, color: { argb: COLOR.text }, ...overrides })
const thinBorder = (argb = COLOR.border): Partial<Borders> => ({
  top: { style: 'thin', color: { argb } },
  left: { style: 'thin', color: { argb } },
  bottom: { style: 'thin', color: { argb } },
  right: { style: 'thin', color: { argb } },
})

function txt(language: ImportLanguage, en: string, vi: string) {
  return language === 'vi' ? vi : en
}

function roleLabel(role: (typeof IMPORT_ROLES)[number], language: ImportLanguage) {
  return ROLE_LABELS[role][language]
}

/** Approximate row height for wrapped text, because Excel does not auto-fit merged cells. */
function fitHeight(text: string, widthChars: number, base = 16): number {
  const lines = text.split('\n').reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / Math.max(widthChars * 1.05, 1))), 0)
  return Math.max(base + 4, lines * base + 6)
}

function mergedWidth(sheet: Worksheet, from: number, to: number) {
  let width = 0
  for (let index = from; index <= to; index++) width += sheet.getColumn(index).width ?? 10
  return width
}

function writeMerged(sheet: Worksheet, row: number, from: number, to: number, value: string, style: { font?: Partial<Font>; fill?: Fill; border?: boolean; wrap?: boolean; align?: 'left' | 'center' } = {}) {
  if (to > from) sheet.mergeCells(row, from, row, to)
  const cell = sheet.getCell(row, from)
  cell.value = value
  cell.font = style.font ?? font()
  cell.alignment = { vertical: 'middle', horizontal: style.align ?? 'left', wrapText: style.wrap ?? true, indent: style.align === 'center' ? 0 : 1 }
  for (let col = from; col <= to; col++) {
    const target = sheet.getCell(row, col)
    if (style.fill) target.fill = style.fill
    if (style.border) target.border = thinBorder()
  }
  return cell
}

function sectionBanner(sheet: Worksheet, row: number, from: number, to: number, label: string) {
  writeMerged(sheet, row, from, to, label, { font: font({ bold: true, size: 13 }) })
  sheet.getRow(row).height = 24
}

function tableHeader(sheet: Worksheet, row: number, spans: [number, number, string][]) {
  for (const [from, to, label] of spans) {
    writeMerged(sheet, row, from, to, label, { font: font({ bold: true, color: { argb: COLOR.white } }), fill: fill(COLOR.primary), border: true })
  }
  sheet.getRow(row).height = 22
}

function tableRow(sheet: Worksheet, row: number, spans: [number, number, string, Partial<Font>?][], zebra: boolean) {
  let height = 20
  for (const [from, to, value, cellFont] of spans) {
    writeMerged(sheet, row, from, to, value, { font: cellFont ?? font(), fill: fill(zebra ? COLOR.canvas : COLOR.white), border: true })
    height = Math.max(height, fitHeight(value, mergedWidth(sheet, from, to)))
  }
  sheet.getRow(row).height = height
}

export interface TemplateContext {
  language: ImportLanguage
  organizationName?: string | null
  catalog: ImportCatalog
  generatedAt?: Date
}

interface FieldCopy { description: string; example: string }

function fieldCopy(field: ImportField, language: ImportLanguage, sample: Sample): FieldCopy {
  const t = (en: string, vi: string) => txt(language, en, vi)
  switch (field) {
    case 'fullName': return { description: t('User\'s full name as it should appear in the system (max 120 characters).', 'Họ tên đầy đủ của người dùng, hiển thị trong hệ thống (tối đa 120 ký tự).'), example: t('An Nguyen', 'Nguyễn Văn An') }
    case 'email': return { description: t('Work email that receives the activation link. Must be unique and not yet used in the workspace.', 'Email công việc để nhận liên kết kích hoạt. Không được trùng và chưa được dùng trong không gian làm việc.'), example: 'an.nguyen@company.com' }
    case 'role': return { description: t('Pick from the list: Employee, Domain Expert or L&D Manager.', 'Chọn từ danh sách: Nhân viên, Chuyên gia hoặc Quản lý L&D.'), example: roleLabel('EMPLOYEE', language) }
    case 'department': return { description: t('Required for every role. Pick from the list (see the Lists tab). An L&D Manager becomes the head of this department.', 'Bắt buộc với mọi vai trò. Chọn từ danh sách (xem tab Danh mục). Quản lý L&D sẽ trở thành trưởng phòng ban này.'), example: sample.department }
    case 'jobPosition': return { description: t('Required for Employee and Domain Expert; leave empty for L&D Manager. Must belong to the chosen department.', 'Bắt buộc với Nhân viên và Chuyên gia; để trống với Quản lý L&D. Phải thuộc phòng ban đã chọn.'), example: sample.jobPosition }
    case 'targetRole': return { description: t('Optional, Employee only. A published Target role of the chosen job position.', 'Không bắt buộc, chỉ dùng cho Nhân viên. Vai trò mục tiêu đã xuất bản của vị trí đã chọn.'), example: sample.targetRole }
    case 'level': return { description: t('Optional, needs a Target role. Leave empty to use the entry level of that role.', 'Không bắt buộc, cần có Vai trò mục tiêu. Để trống sẽ dùng cấp độ khởi điểm của vai trò.'), example: sample.level }
  }
}

interface Sample { department: string; jobPosition: string; targetRole: string; level: string; departmentAlt: string }

function sampleFrom(catalog: ImportCatalog, language: ImportLanguage): Sample {
  const department = catalog.find(entry => entry.jobPositions.some(jp => jp.targetRoles.length > 0)) ?? catalog.find(entry => entry.jobPositions.length > 0) ?? catalog[0]
  const jobPosition = department?.jobPositions.find(jp => jp.targetRoles.length > 0) ?? department?.jobPositions[0]
  const targetRole = jobPosition?.targetRoles[0]
  return {
    department: department?.label ?? txt(language, 'ENG - Engineering', 'ENG - Kỹ thuật'),
    jobPosition: jobPosition?.label ?? '15-1252.00 - Software Developers',
    targetRole: targetRole?.label ?? '',
    level: targetRole?.levels[targetRole.levels.length - 1] ?? '',
    departmentAlt: (catalog[1] ?? department)?.label ?? txt(language, 'ENG - Engineering', 'ENG - Kỹ thuật'),
  }
}

function buildGuideSheet(workbook: Workbook, context: TemplateContext, sample: Sample) {
  const { language } = context
  const t = (en: string, vi: string) => txt(language, en, vi)
  const sheet = workbook.addWorksheet(SHEET_NAMES.guide[language], {
    views: [{ showGridLines: false }],
    properties: { tabColor: { argb: COLOR.slate } },
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })
  ;[3, 24, 46, 70].forEach((width, index) => { sheet.getColumn(index + 1).width = width })
  const usersTab = SHEET_NAMES.users[language]
  const listsTab = SHEET_NAMES.lists[language]
  const write = (row: number, values: string[], style: { font?: Partial<Font>; fill?: string; height?: number } = {}) => {
    const r = sheet.getRow(row)
    values.forEach((value, index) => {
      const cell = r.getCell(index + 2)
      cell.value = value
      cell.font = font(style.font)
      cell.alignment = { vertical: 'top', wrapText: true }
      if (style.fill) cell.fill = fill(style.fill)
    })
    r.height = style.height ?? Math.max(20, ...values.map((value, index) => fitHeight(value, sheet.getColumn(index + 2).width ?? 10)))
  }
  const heading = (row: number, label: string) => write(row, [label], { font: { bold: true, size: 13 }, height: 22 })
  const tableHead = (row: number, labels: string[]) => write(row, labels, { font: { bold: true, color: { argb: COLOR.white } }, fill: COLOR.primary, height: 22 })

  write(2, [t('User import template', 'Mẫu nhập người dùng')], { font: { size: 18, bold: true, color: { argb: COLOR.primary } }, height: 30 })
  const generated = (context.generatedAt ?? new Date()).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-GB')
  const org = context.organizationName ? `${t('Organization', 'Tổ chức')}: ${context.organizationName}  ·  ` : ''
  write(3, [t(
    `Fill the orange "${usersTab}" tab (up to ${MAX_IMPORT_ROWS} users), save the file as .xlsx and upload it in User Accounts → Import Excel. ${org}${t('Generated', 'Ngày tạo')}: ${generated}.`,
    `Điền tab màu cam "${usersTab}" (tối đa ${MAX_IMPORT_ROWS} người dùng), lưu tệp dạng .xlsx và tải lên tại Tài khoản người dùng → Nhập Excel. ${org}${t('Generated', 'Ngày tạo')}: ${generated}.`,
  )], { font: { color: { argb: COLOR.textMuted } }, height: 34 })
  sheet.mergeCells('B2:D2')
  sheet.mergeCells('B3:D3')

  let row = 5
  tableHead(row++, [t('Sheet', 'Tab'), t('One row means', 'Mỗi dòng là'), t('Columns', 'Các cột')])
  const sheets: [string, string, string][] = [
    [usersTab, t('One user to invite. Each valid row sends an activation email; seats are counted only after activation.', 'Một người dùng cần mời. Mỗi dòng hợp lệ gửi một email kích hoạt; ghế chỉ được tính sau khi kích hoạt.'),
      IMPORT_COLUMNS.map(column => `${columnHeader(column, language)}${column.required ? '' : t(' - see rules', ' - xem quy tắc')}`).join('\n')],
    [listsTab, t('Reference only: departments, job positions, Target roles and levels of your workspace.', 'Chỉ để tham khảo: phòng ban, vị trí công việc, vai trò mục tiêu và cấp độ của không gian làm việc.'), t('Not imported', 'Không được nhập')],
  ]
  sheets.forEach((values, index) => write(row++, values, { fill: index % 2 ? COLOR.canvas : COLOR.white }))
  row++

  heading(row++, t('Columns', 'Mô tả các cột'))
  tableHead(row++, [t('Column', 'Cột'), t('Required', 'Bắt buộc'), t('Description and example', 'Mô tả và ví dụ')])
  IMPORT_COLUMNS.forEach((column, index) => {
    const copy = fieldCopy(column.field, language, sample)
    const required = column.required
      ? t('Yes', 'Có')
      : column.field === 'department' ? t('Yes (all roles)', 'Có (mọi vai trò)')
        : column.field === 'jobPosition' ? t('Employee and Domain Expert', 'Nhân viên và Chuyên gia') : t('No', 'Không')
    const example = copy.example ? `\n${t('Example', 'Ví dụ')}: ${copy.example}` : ''
    write(row++, [columnHeader(column, language), required, `${copy.description}${example}`], { fill: index % 2 ? COLOR.canvas : COLOR.white })
  })
  row++

  const rules = [
    t(`Enter one user per row in the "${usersTab}" tab, right below the header row. Use the drop-down lists for Role, Department, Job position, Target role and Level.`,
      `Nhập mỗi người dùng một dòng trong tab "${usersTab}", ngay dưới dòng tiêu đề. Dùng danh sách thả xuống cho Vai trò, Phòng ban, Vị trí công việc, Vai trò mục tiêu và Cấp độ.`),
    t(`${roleLabel('EMPLOYEE', language)}: department and job position are required; Target role is optional and Level needs a Target role.`,
      `${roleLabel('EMPLOYEE', language)}: bắt buộc phòng ban và vị trí công việc; vai trò mục tiêu không bắt buộc, cấp độ cần có vai trò mục tiêu.`),
    t(`${roleLabel('DOMAIN_EXPERT', language)}: department and job position are required; leave Target role and Level empty.`,
      `${roleLabel('DOMAIN_EXPERT', language)}: bắt buộc phòng ban và vị trí công việc; để trống vai trò mục tiêu và cấp độ.`),
    t(`${roleLabel('LD_MANAGER', language)}: department is required and the user becomes its head; leave the other columns empty.`,
      `${roleLabel('LD_MANAGER', language)}: bắt buộc phòng ban và người dùng trở thành trưởng phòng ban; để trống các cột còn lại.`),
    t(`Check valid combinations in the "${listsTab}" tab: Department → Job position → Target role → Level.`, `Kiểm tra các tổ hợp hợp lệ ở tab "${listsTab}": Phòng ban → Vị trí công việc → Vai trò mục tiêu → Cấp độ.`),
    t('Each email may appear only once in the file and must not already have an account or a pending invitation. Administrator accounts cannot be imported.',
      'Mỗi email chỉ xuất hiện một lần trong tệp và chưa có tài khoản hoặc lời mời đang chờ. Không thể nhập tài khoản Quản trị viên.'),
    t('Do not rename the tabs or the header row. Lists reflect the workspace when this file was downloaded; download a new template after changing the structure.',
      'Không đổi tên các tab hoặc dòng tiêu đề. Danh mục phản ánh cấu hình khi tải tệp; hãy tải mẫu mới sau khi thay đổi cơ cấu.'),
    t('The preview imports valid rows and skips rows with errors. Download the error report, fix it and import again.',
      'Màn hình xem trước nhập các dòng hợp lệ và bỏ qua dòng lỗi. Tải báo cáo lỗi, sửa và nhập lại.'),
  ]
  heading(row++, t('Rules', 'Quy tắc'))
  rules.forEach((rule, index) => {
    sheet.mergeCells(`B${row}:D${row}`)
    write(row, [`${index + 1}.  ${rule}`], { height: fitHeight(rule, 140) })
    row++
  })
  row++
  heading(row++, t('Legend', 'Chú giải'))
  write(row++, [t('Required', 'Bắt buộc'), t('Orange header, marked with *', 'Tiêu đề màu cam, có dấu *')], { fill: COLOR.tint })
  write(row, [t('Depends on role / optional', 'Tùy vai trò / không bắt buộc'), t('Light orange header', 'Tiêu đề màu cam nhạt')], { fill: COLOR.muted })
}

interface OptionRanges { role: string; department?: string; jobPosition?: string; targetRole?: string; level?: string }

function optionColumns(context: TemplateContext): [keyof OptionRanges, string[]][] {
  const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean)))
  return [
    ['role', IMPORT_ROLES.map(role => roleLabel(role, context.language))],
    ['department', unique(context.catalog.map(entry => entry.label))],
    ['jobPosition', unique(context.catalog.flatMap(entry => entry.jobPositions.map(jp => jp.label)))],
    ['targetRole', unique(context.catalog.flatMap(entry => entry.jobPositions.flatMap(jp => jp.targetRoles.map(role => role.label))))],
    ['level', unique(context.catalog.flatMap(entry => entry.jobPositions.flatMap(jp => jp.targetRoles.flatMap(role => role.levels))))],
  ]
}

function optionRanges(columns: [keyof OptionRanges, string[]][]): OptionRanges {
  const ranges: OptionRanges = { role: '' }
  columns.forEach(([key, values], index) => {
    const letter = String.fromCharCode(65 + index)
    if (values.length > 0) ranges[key] = `${OPTIONS_SHEET}!$${letter}$1:$${letter}$${values.length}`
  })
  return ranges
}

/** Hidden source lists for the drop-downs; added last so the visible tab order stays Guide, Users, Lists. */
function buildOptionsSheet(workbook: Workbook, columns: [keyof OptionRanges, string[]][]) {
  const sheet = workbook.addWorksheet(OPTIONS_SHEET, { state: 'veryHidden' })
  columns.forEach(([, values], index) => {
    const letter = String.fromCharCode(65 + index)
    values.forEach((value, rowIndex) => { sheet.getCell(`${letter}${rowIndex + 1}`).value = value })
  })
}

function headerNote(field: ImportField, language: ImportLanguage, sample: Sample) {
  return fieldCopy(field, language, sample).description
}

function buildUsersSheet(workbook: Workbook, context: TemplateContext, ranges: OptionRanges, sample: Sample, prefill?: PrefillRow[]) {
  const { language } = context
  const t = (en: string, vi: string) => txt(language, en, vi)
  const withErrors = Boolean(prefill)
  const lastCol = IMPORT_COLUMNS.length + (withErrors ? 1 : 0)
  const sheet = workbook.addWorksheet(SHEET_NAMES.users[language], {
    views: [{ state: 'frozen', ySplit: HEADER_ROW, activeCell: 'A2', showGridLines: false }],
    properties: { tabColor: { argb: COLOR.primary } },
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  })
  IMPORT_COLUMNS.forEach((column, index) => { sheet.getColumn(index + 1).width = column.width })
  if (withErrors) sheet.getColumn(lastCol).width = 60

  const headerRow = sheet.getRow(HEADER_ROW)
  headerRow.height = 30
  IMPORT_COLUMNS.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1)
    cell.value = columnHeader(column, language)
    cell.font = font({ bold: true, color: { argb: column.required ? COLOR.white : COLOR.primaryDark } })
    cell.fill = fill(column.required ? COLOR.primary : COLOR.tint)
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    cell.border = thinBorder(column.required ? COLOR.primaryDark : COLOR.border)
    cell.note = { texts: [{ text: headerNote(column.field, language, sample) }] }
  })
  if (withErrors) {
    const cell = headerRow.getCell(lastCol)
    cell.value = ERROR_COLUMN_HEADER[language]
    cell.font = font({ bold: true, color: { argb: COLOR.white } })
    cell.fill = fill(COLOR.destructive)
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    cell.border = thinBorder(COLOR.destructive)
    cell.note = { texts: [{ text: t('Rows that were not imported. Fix the issue shown here and import this file again.', 'Các dòng chưa được nhập. Sửa lỗi ghi ở cột này và nhập lại tệp.') }] }
  }
  sheet.autoFilter = { from: { row: HEADER_ROW, column: 1 }, to: { row: HEADER_ROW, column: lastCol } }

  const validations: Partial<Record<ImportField, { range?: string; strict: boolean; message: string }>> = {
    role: { range: ranges.role, strict: true, message: t('Pick Employee, Domain Expert or L&D Manager.', 'Chọn Nhân viên, Chuyên gia hoặc Quản lý L&D.') },
    department: { range: ranges.department, strict: false, message: t('Pick a department from the list.', 'Hãy chọn phòng ban trong danh sách.') },
    jobPosition: { range: ranges.jobPosition, strict: false, message: t('Pick a job position of the chosen department.', 'Hãy chọn vị trí thuộc phòng ban đã chọn.') },
    targetRole: { range: ranges.targetRole, strict: false, message: t('Pick a published Target role of the job position.', 'Hãy chọn vai trò mục tiêu đã xuất bản của vị trí.') },
    level: { range: ranges.level, strict: false, message: t('Pick a level of the Target role.', 'Hãy chọn cấp độ của vai trò mục tiêu.') },
  }

  const rowCount = Math.max(MAX_IMPORT_ROWS, prefill?.length ?? 0)
  for (let offset = 0; offset < rowCount; offset++) {
    const rowNumber = FIRST_DATA_ROW + offset
    const row = sheet.getRow(rowNumber)
    row.height = 20
    const data = prefill?.[offset]
    IMPORT_COLUMNS.forEach((column, index) => {
      const cell: Cell = row.getCell(index + 1)
      if (data) cell.value = data.values[column.field] || null
      cell.font = font()
      cell.fill = fill(offset % 2 === 1 ? COLOR.canvas : COLOR.white)
      cell.border = thinBorder()
      cell.alignment = { vertical: 'middle' }
      const rule = validations[column.field]
      if (rule?.range) {
        cell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [rule.range],
          showErrorMessage: true,
          errorStyle: rule.strict ? 'stop' : 'warning',
          errorTitle: t('Value not in list', 'Giá trị không có trong danh sách'),
          error: rule.message,
        }
      } else if (column.field === 'fullName') {
        cell.dataValidation = { type: 'textLength', operator: 'lessThanOrEqual', allowBlank: true, formulae: [120], showErrorMessage: true, errorStyle: 'stop', error: t('Max 120 characters.', 'Tối đa 120 ký tự.') }
      }
    })
    if (withErrors) {
      const cell = row.getCell(lastCol)
      cell.value = data?.error ?? null
      cell.font = font({ color: { argb: COLOR.destructive } })
      cell.fill = fill(data ? COLOR.destructiveTint : COLOR.white)
      cell.border = thinBorder()
      cell.alignment = { vertical: 'middle', wrapText: true }
      if (data?.error) row.height = fitHeight(data.error, 60)
    }
  }
}

function buildListsSheet(workbook: Workbook, context: TemplateContext) {
  const { language, catalog } = context
  const t = (en: string, vi: string) => txt(language, en, vi)
  const sheet = workbook.addWorksheet(SHEET_NAMES.lists[language], {
    views: [{ showGridLines: false }],
    properties: { tabColor: { argb: COLOR.slate } },
  })
  ;[3, 34, 44, 40, 30].forEach((width, index) => { sheet.getColumn(index + 1).width = width })
  let row = 2
  writeMerged(sheet, row, 2, 5, t('Valid values', 'Danh mục giá trị hợp lệ'), { font: font({ bold: true, size: 18, color: { argb: COLOR.primary } }), wrap: false })
  sheet.getRow(row++).height = 30
  writeMerged(sheet, row, 2, 5, t('Taken from your workspace when this file was downloaded. Read each line as Department → Job position → Target role → Levels (highest first).', 'Lấy từ cấu hình không gian làm việc khi tải tệp. Đọc mỗi dòng theo thứ tự Phòng ban → Vị trí công việc → Vai trò mục tiêu → Cấp độ (cao nhất trước).'), { font: font({ color: { argb: COLOR.textMuted } }) })
  sheet.getRow(row++).height = 34
  row++

  sectionBanner(sheet, row++, 2, 5, t('Roles', 'Vai trò'))
  tableHeader(sheet, row++, [[2, 2, t('Value to enter', 'Giá trị cần nhập')], [3, 5, t('Who it is for', 'Dành cho')]])
  const roleInfo: Record<(typeof IMPORT_ROLES)[number], string> = {
    EMPLOYEE: t('Learners who follow learning paths. Needs department and job position; Target role is optional.', 'Người học theo lộ trình. Cần phòng ban và vị trí công việc; vai trò mục tiêu không bắt buộc.'),
    DOMAIN_EXPERT: t('Subject-matter experts who review content. Needs department and job position.', 'Chuyên gia nghiệp vụ duyệt nội dung. Cần phòng ban và vị trí công việc.'),
    LD_MANAGER: t('Learning & Development managers. Needs a department and becomes its head.', 'Quản lý đào tạo & phát triển. Cần phòng ban và sẽ trở thành trưởng phòng ban đó.'),
  }
  IMPORT_ROLES.forEach((role, index) => {
    tableRow(sheet, row++, [[2, 2, roleLabel(role, language), font({ bold: true })], [3, 5, roleInfo[role]]], index % 2 === 1)
  })
  row++

  sectionBanner(sheet, row++, 2, 5, t('Departments, job positions and Target roles', 'Phòng ban, vị trí công việc và vai trò mục tiêu'))
  tableHeader(sheet, row++, [[2, 2, t('Department', 'Phòng ban')], [3, 3, t('Job position', 'Vị trí công việc')], [4, 4, t('Target role (Employee only)', 'Vai trò mục tiêu (chỉ Nhân viên)')], [5, 5, t('Levels', 'Cấp độ')]])
  if (catalog.length === 0) {
    tableRow(sheet, row++, [[2, 5, t('No departments are configured yet. Configure departments and job positions before importing users.', 'Chưa có phòng ban nào. Hãy thiết lập phòng ban và vị trí công việc trước khi nhập người dùng.'), font({ italic: true, color: { argb: COLOR.textMuted } })]], false)
    return
  }
  const none = (en: string, vi: string) => [t(en, vi), font({ italic: true, color: { argb: COLOR.textMuted } })] as const
  catalog.forEach((entry, deptIndex) => {
    const zebra = deptIndex % 2 === 1
    const lines: [string, string, string][] = []
    if (entry.jobPositions.length === 0) lines.push(['', '', ''])
    for (const jp of entry.jobPositions) {
      if (jp.targetRoles.length === 0) lines.push([jp.label, '', ''])
      for (const role of jp.targetRoles) lines.push([jp.label, role.label, role.levels.join(' › ')])
    }
    lines.forEach(([jp, role, levels], lineIndex) => {
      const deptCell: [number, number, string, Partial<Font>?] = [2, 2, lineIndex === 0 ? entry.label : '', font({ bold: true })]
      const jpCell: [number, number, string, Partial<Font>?] = jp ? [3, 3, jp] : [3, 3, ...none('No job position linked', 'Chưa liên kết vị trí')]
      const roleCell: [number, number, string, Partial<Font>?] = role ? [4, 4, role] : [4, 4, ...(jp ? none('No published Target role', 'Chưa có vai trò mục tiêu đã xuất bản') : ['', font()] as const)]
      tableRow(sheet, row++, [deptCell, jpCell, roleCell, [5, 5, levels]], zebra)
    })
  })
}

export interface PrefillRow {
  values: Partial<Record<ImportField, string>>
  error?: string
}

export async function buildUserImportWorkbook(context: TemplateContext, prefill?: PrefillRow[]): Promise<Workbook> {
  const ExcelJS = await loadExcel()
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'User Accounts'
  workbook.created = context.generatedAt ?? new Date()
  const sample = sampleFrom(context.catalog, context.language)
  const columns = optionColumns(context)
  buildGuideSheet(workbook, context, sample)
  buildUsersSheet(workbook, context, optionRanges(columns), sample, prefill)
  buildListsSheet(workbook, context)
  buildOptionsSheet(workbook, columns)
  workbook.views = [{ x: 0, y: 0, width: 20000, height: 12000, firstSheet: 0, activeTab: 0, visibility: 'visible' }]
  return workbook
}

export function prefillFromRows(rows: { raw: RawImportRow; error: string }[]): PrefillRow[] {
  return rows.map(({ raw, error }) => ({
    values: { fullName: raw.fullName, email: raw.email, role: raw.role, department: raw.department, jobPosition: raw.jobPosition, targetRole: raw.targetRole, level: raw.level },
    error,
  }))
}

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export async function workbookToBlob(workbook: Workbook): Promise<Blob> {
  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], { type: XLSX_MIME })
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export { loadExcel }
