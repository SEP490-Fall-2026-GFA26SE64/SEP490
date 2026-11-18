import type { Workbook } from 'exceljs'
import { describe, expect, it } from 'vitest'
import { buildStructureTemplate, parseStructureFile, STRUCTURE_SHEETS, StructureFileError } from './orgStructureFile'

type Validation = { type: string; formulae: string[]; showErrorMessage?: boolean; prompt?: string }
const toFile = async (workbook: Workbook, name = 'structure.xlsx') => new File([await workbook.xlsx.writeBuffer()], name)
const problem = async (promise: Promise<unknown>) => {
  try { await promise } catch (error) { if (error instanceof StructureFileError) return error.problem }
  throw new Error('Expected a file problem')
}
/** Reads the validation covering a cell whether the reader kept the range key or expanded it per cell. */
function validationAt(workbook: Workbook, sheet: string, cell: string, range: string): Validation {
  const model = (workbook.getWorksheet(sheet) as unknown as { dataValidations: { model: Record<string, Validation> } }).dataValidations.model
  return model[cell] ?? model[range]
}
async function reloaded() {
  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await (await buildStructureTemplate()).xlsx.writeBuffer())
  return workbook
}

describe('organization structure workbook', () => {
  it('builds Instructions plus four styled data tabs with dropdowns, Excel validation and automatic name columns', async () => {
    const workbook = await reloaded()
    expect(workbook.worksheets.map(sheet => sheet.name)).toEqual(['Instructions', 'Departments', 'Job positions', 'Target roles', 'Levels'])
    for (const spec of STRUCTURE_SHEETS) {
      const sheet = workbook.getWorksheet(spec.name)!
      expect(spec.columns.map((_, index) => sheet.getRow(1).getCell(index + 1).value)).toEqual(spec.columns.map(column => column.header))
      expect(sheet.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 })
    }
    expect(validationAt(workbook, 'Job positions', 'A2', 'A2:A501')).toMatchObject({ type: 'list', showErrorMessage: true })
    expect(validationAt(workbook, 'Job positions', 'A2', 'A2:A501').formulae[0]).toContain("'Departments'!$A$2")
    expect(validationAt(workbook, 'Target roles', 'A2', 'A2:A501').formulae[0]).toContain("'Job positions'!$C$2")
    expect(validationAt(workbook, 'Levels', 'A2', 'A2:A501').formulae[0]).toContain("'Target roles'!$C$2")
    expect(validationAt(workbook, 'Departments', 'A2', 'A2:A501').formulae[0]).toContain('COUNTIF($A$2:$A$501,A2)=1')
    expect(validationAt(workbook, 'Levels', 'D2', 'D2:D501').formulae[0]).toContain('D2>=1,D2<=99')
    const lookup = workbook.getWorksheet('Levels')!.getCell('B501').value as { formula: string }
    expect(lookup.formula).toContain("MATCH($A501,'Target roles'!$C$2:$C$501,0)")
    const levels = workbook.getWorksheet('Levels')!
    // Excel's default is locked, so only unlocked input cells carry an explicit protection flag.
    expect(levels.getCell('B2').protection?.locked).not.toBe(false)
    expect(levels.getCell('C2').protection?.locked).toBe(false)
    expect((levels as unknown as { sheetProtection?: { sheet?: boolean } }).sheetProtection?.sheet).toBe(true)
  }, 30_000)

  it('round-trips the template examples into per-tab rows, ignoring automatic columns and unused formatted rows', async () => {
    const sheets = await parseStructureFile(await toFile(await buildStructureTemplate()))
    expect(sheets.departments).toEqual([
      { row: 2, code: 'ENG', name: 'Software Engineering', description: 'Builds and maintains our products and platforms.' },
      { row: 3, code: 'QA', name: 'Quality Assurance', description: 'Owns product quality and testing.' }])
    expect(sheets.jobPositions[1]).toEqual({ row: 3, departmentCode: 'QA', code: 'QA-ENG', name: 'QA Engineer' })
    expect(sheets.targetRoles).toHaveLength(3)
    expect(sheets.levels.map(level => `${level.row}:${level.targetRoleCode}:${level.name}:${level.rank}`))
      .toEqual(['2:BE-DEV:Junior:1', '3:BE-DEV:Senior:2', '4:FE-DEV:Junior:1', '5:QA-AUTO:Junior:1', '6:QA-AUTO:Senior:2'])
  }, 30_000)

  it('accepts Vietnamese tab and header names with the header below a title row', async () => {
    const ExcelJS = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    for (const spec of STRUCTURE_SHEETS) {
      const sheet = workbook.addWorksheet(spec.vi)
      sheet.addRow(['Ghi chú'])
      sheet.addRow(spec.columns.map(column => column.vi))
      sheet.addRow(spec.examples[0])
    }
    const sheets = await parseStructureFile(await toFile(workbook))
    expect(sheets.departments).toEqual([{ row: 3, code: 'ENG', name: 'Software Engineering', description: 'Builds and maintains our products and platforms.' }])
    expect(sheets.levels).toEqual([{ row: 3, targetRoleCode: 'BE-DEV', name: 'Junior', rank: '1' }])
  }, 30_000)

  it('reports file, sheet, column, empty and size problems before calling the server', async () => {
    expect(await problem(parseStructureFile(new File(['a,b'], 'structure.csv')))).toEqual({ code: 'unsupportedType' })
    expect(await problem(parseStructureFile(new File([new Uint8Array(1024 * 1024 + 1)], 'structure.xlsx')))).toEqual({ code: 'tooLarge' })
    expect(await problem(parseStructureFile(new File(['not a zip'], 'structure.xlsx')))).toEqual({ code: 'unreadable' })

    const ExcelJS = await import('exceljs')
    const partial = new ExcelJS.Workbook()
    partial.addWorksheet('Departments').addRow(STRUCTURE_SHEETS[0].columns.map(column => column.header))
    expect(await problem(parseStructureFile(await toFile(partial)))).toEqual({ code: 'missingSheets', missing: ['Job positions', 'Target roles', 'Levels'] })

    const template = await buildStructureTemplate()
    template.getWorksheet('Levels')!.getCell('D1').value = 'Rank'
    expect(await problem(parseStructureFile(await toFile(template)))).toEqual({ code: 'missingColumns', sheet: 'Levels', missing: ['Level rank'] })

    const empty = await buildStructureTemplate()
    for (const spec of STRUCTURE_SHEETS) {
      const sheet = empty.getWorksheet(spec.name)!
      for (let row = 2; row <= 6; row++) spec.columns.forEach((column, index) => { if (column.kind !== 'lookup') sheet.getRow(row).getCell(index + 1).value = null })
    }
    expect(await problem(parseStructureFile(await toFile(empty)))).toEqual({ code: 'empty' })

    const many = await buildStructureTemplate()
    const levels = many.getWorksheet('Levels')!
    for (let row = 2; row <= 502; row++) { levels.getCell(`A${row}`).value = 'BE-DEV'; levels.getCell(`C${row}`).value = `L${row}`; levels.getCell(`D${row}`).value = 1 }
    expect(await problem(parseStructureFile(await toFile(many)))).toEqual({ code: 'tooManyRows', sheet: 'Levels', count: 501 })
  }, 60_000)
})
