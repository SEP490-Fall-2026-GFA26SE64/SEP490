import { describe, expect, it } from 'vitest'
import type { TargetRoleModel } from '../../../manager/data/ldManagerMockData'
import { buildUserImportWorkbook, loadExcel } from './userImportTemplate'
import { parseUserImportFile } from './userImportParser'
import { validateImportRows } from './userImportValidation'
import { buildInvitationPayload } from './userImportSubmit'
import type { ImportCatalog, RawImportRow } from './userImportShared'

const en = (english: string) => english

const targetRole = { id: 'tr-1', code: 'SWE', title: 'Software Engineer', status: 'published', levels: ['Senior', 'Middle', 'Junior'] } as TargetRoleModel
const catalog: ImportCatalog = [
  {
    department: { id: 'dept-eng', code: 'ENG', name: 'Engineering', linkedJobPositions: ['15-1252.00'], uuid: 'u1', uuidCode: 'u2' },
    label: 'ENG - Engineering',
    jobPositions: [{
      item: { code: '15-1252.00', name: 'Software Developers', jobPositionReferenceId: 'jp-ref-1', jobPositionName: '15-1252.00 - Software Developers', uuid: 'u3' },
      label: '15-1252.00 - Software Developers',
      targetRoles: [{ role: targetRole, label: 'SWE - Software Engineer', levels: ['Senior', 'Middle', 'Junior'] }],
    }],
  },
  {
    department: { id: 'dept-hr', code: 'HR', name: 'People', linkedJobPositions: [], uuid: 'u4', uuidCode: 'u5' },
    label: 'HR - People',
    jobPositions: [],
  },
]

function raw(overrides: Partial<RawImportRow>): RawImportRow {
  return { rowNumber: 4, fullName: 'An Nguyen', email: 'an@company.com', role: 'Employee', department: 'ENG - Engineering', jobPosition: '15-1252.00 - Software Developers', targetRole: '', level: '', ...overrides }
}

async function toBuffer(workbook: Awaited<ReturnType<typeof buildUserImportWorkbook>>): Promise<ArrayBuffer> {
  const buffer = await workbook.xlsx.writeBuffer()
  return buffer as ArrayBuffer
}

describe('user import template', () => {
  it('puts the Instructions tab first, then Users and Lists, with an orange row-1 header and drop-downs', async () => {
    const workbook = await buildUserImportWorkbook({ language: 'vi', organizationName: 'Acme', catalog })
    const reloaded = new (await loadExcel()).Workbook()
    await reloaded.xlsx.load(await toBuffer(workbook))

    const visible = reloaded.worksheets.filter(sheet => sheet.state !== 'veryHidden' && sheet.state !== 'hidden').map(sheet => sheet.name)
    expect(visible).toEqual(['Hướng dẫn', 'Người dùng', 'Danh mục'])

    const users = reloaded.getWorksheet('Người dùng')!
    expect(users.getRow(1).values).toEqual([undefined, 'Họ và tên *', 'Email *', 'Vai trò *', 'Phòng ban', 'Vị trí công việc', 'Vai trò hiện tại', 'Cấp độ'])
    expect(users.getCell('A1').fill).toMatchObject({ fgColor: { argb: 'FFEA580C' } })
    expect(users.getCell('D1').fill).toMatchObject({ fgColor: { argb: 'FFFFF5EB' } })
    expect(users.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 })
    expect(users.getCell('C2').dataValidation).toMatchObject({ type: 'list', formulae: ['Options!$A$1:$A$3'] })
    expect(users.getCell('D51').dataValidation).toMatchObject({ type: 'list', formulae: ['Options!$B$1:$B$2'] })

    const english = await buildUserImportWorkbook({ language: 'en', catalog })
    expect(english.worksheets[0].name).toBe('Instructions')
  })

  it('round-trips an error report and ignores its error column', async () => {
    const workbook = await buildUserImportWorkbook({ language: 'en', catalog }, [
      { values: { fullName: 'An Nguyen', email: 'an@company.com', role: 'Employee', department: 'ENG - Engineering', jobPosition: '15-1252.00 - Software Developers' }, error: 'Email already exists.' },
    ])
    const result = await parseUserImportFile(await toBuffer(workbook))
    expect(result).toEqual({ ok: true, rows: [raw({ rowNumber: 2 })] })
  })
})

describe('user import parser', () => {
  it('rejects files that are not a workbook, have no rows, miss headers or exceed 50 rows', async () => {
    expect(await parseUserImportFile(new TextEncoder().encode('not excel').buffer as ArrayBuffer)).toEqual({ ok: false, error: { code: 'invalidFile' } })

    const empty = await buildUserImportWorkbook({ language: 'en', catalog })
    expect(await parseUserImportFile(await toBuffer(empty))).toEqual({ ok: false, error: { code: 'empty' } })

    const ExcelJS = await loadExcel()
    const missing = new ExcelJS.Workbook()
    missing.addWorksheet('Users').addRow(['Email', 'Department'])
    expect(await parseUserImportFile(await toBuffer(missing))).toEqual({ ok: false, error: { code: 'missingHeaders', missing: ['fullName', 'role'] } })

    const many = new ExcelJS.Workbook()
    const sheet = many.addWorksheet('Users')
    sheet.addRow(['Full name *', 'Email *', 'Role *'])
    for (let i = 0; i < 51; i++) sheet.addRow([`User ${i}`, `u${i}@company.com`, 'Employee'])
    expect(await parseUserImportFile(await toBuffer(many))).toEqual({ ok: false, error: { code: 'tooManyRows', count: 51 } })
  })

  it('reads English headers, hyperlink emails and skips blank rows', async () => {
    const ExcelJS = await loadExcel()
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Users')
    sheet.addRow(['Role *', 'Full name *', 'Email *'])
    sheet.addRow([])
    sheet.addRow(['L&D Manager', 'Lan Pham', { text: 'lan@company.com', hyperlink: 'mailto:lan@company.com' }])
    const result = await parseUserImportFile(await toBuffer(workbook))
    expect(result).toEqual({ ok: true, rows: [{ rowNumber: 3, fullName: 'Lan Pham', email: 'lan@company.com', role: 'L&D Manager', department: '', jobPosition: '', targetRole: '', level: '' }] })
  })

  it('still reads the legacy "Target role" header of older templates', async () => {
    const ExcelJS = await loadExcel()
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Users')
    sheet.addRow(['Full name *', 'Email *', 'Role *', 'Target role', 'Level'])
    sheet.addRow(['An Nguyen', 'an@company.com', 'Employee', 'SWE', 'Junior'])
    const result = await parseUserImportFile(await toBuffer(workbook))
    expect(result).toMatchObject({ ok: true, rows: [{ targetRole: 'SWE', level: 'Junior' }] })
  })
})

describe('user import validation', () => {
  const messages = (row: RawImportRow, existing: string[] = []) =>
    validateImportRows([row], catalog, existing, en)[0].issues.map(issue => issue.message)

  it('accepts a complete employee row in either language and defaults the level to the entry level', () => {
    const [row] = validateImportRows([raw({ role: 'Nhân viên', department: 'eng', targetRole: 'SWE' })], catalog, [], en)
    expect(row.issues).toEqual([])
    expect(row.resolved).toMatchObject({ role: 'EMPLOYEE', level: 'Junior', targetRole: { label: 'SWE - Software Engineer' } })
  })

  it('reports required fields, bad email, unknown role and existing emails', () => {
    expect(messages(raw({ fullName: '', email: 'bad', role: 'Boss' }))).toEqual([
      'Full name is required.',
      'Email format is invalid.',
      'Role must be Employee, Domain Expert or L&D Manager.',
    ])
    expect(messages(raw({}), ['AN@company.com'])).toEqual(['This email already has an account or a pending invitation.'])
  })

  it('flags duplicate emails after the first occurrence', () => {
    const rows = validateImportRows([raw({ rowNumber: 4 }), raw({ rowNumber: 5, email: ' AN@company.com ' })], catalog, [], en)
    expect(rows[0].issues).toEqual([])
    expect(rows[1].issues.map(issue => issue.message)).toEqual(['Email is duplicated with row 4.'])
  })

  it('enforces the department → job position → current role → level chain', () => {
    expect(messages(raw({ department: '' }))).toContain('Department is required for this role.')
    expect(messages(raw({ jobPosition: '' }))).toEqual(['Job position is required for Employee and Domain Expert.'])
    expect(messages(raw({ department: 'HR - People' }))).toEqual(['Job position "15-1252.00 - Software Developers" does not belong to department HR - People.'])
    expect(messages(raw({ targetRole: 'Data Scientist' }))).toEqual(['Current role "Data Scientist" is not published or staged for job position 15-1252.00 - Software Developers.'])
    expect(messages(raw({ targetRole: 'SWE', level: 'Principal' }))).toEqual(['Level must be one of: Senior, Middle, Junior.'])
    expect(messages(raw({ level: 'Senior' }))).toEqual(['Level requires a Current role.'])
    expect(messages(raw({ role: 'Domain Expert', targetRole: 'SWE' }))).toEqual(['Current role and Level apply only to Employee rows. Leave them empty.'])
  })

  it('lets an L&D manager row omit and ignore the job position', () => {
    const [row] = validateImportRows([raw({ role: 'LD_MANAGER', department: 'HR', jobPosition: 'anything' })], catalog, [], en)
    expect(row.issues).toEqual([])
    expect(row.resolved?.jobPosition).toBeNull()
  })
})

describe('user import payload', () => {
  it('builds the same invitation payload as the Create User form', () => {
    const [employee, manager] = validateImportRows([
      raw({ targetRole: 'SWE - Software Engineer', level: 'Rank 1: Senior' }),
      raw({ rowNumber: 5, fullName: 'Lan Pham', email: 'lan@company.com', role: 'L&D Manager', department: 'ENG', jobPosition: '' }),
    ], catalog, [], en)

    expect(buildInvitationPayload(employee.resolved!)).toEqual({
      fullName: 'An Nguyen',
      email: 'an@company.com',
      roles: ['EMPLOYEE'],
      departmentId: 'dept-eng',
      jobPositionReferenceId: 'jp-ref-1',
      departmentName: 'Engineering',
      jobPositionName: expect.stringMatching(/^15-1252\.00 - Software Developers.+tr-1::SWE::Software Engineer::Senior$/),
    })
    expect(buildInvitationPayload(manager.resolved!)).toEqual({
      fullName: 'Lan Pham',
      email: 'lan@company.com',
      roles: ['LD_MANAGER'],
      departmentId: 'dept-eng',
      jobPositionReferenceId: null,
      departmentName: 'Engineering',
      jobPositionName: null,
    })
  })
})
