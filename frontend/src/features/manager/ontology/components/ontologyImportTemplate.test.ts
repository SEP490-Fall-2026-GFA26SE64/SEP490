import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { buildOntologyTemplate, ONTOLOGY_TEMPLATE_SHEETS, type OntologyTemplateMode } from './ontologyImportTemplate'

async function roundTrip(mode: OntologyTemplateMode) {
  const buffer = await (await buildOntologyTemplate(mode)).xlsx.writeBuffer()
  const ExcelJS = await import('exceljs')
  const excel = new ExcelJS.Workbook()
  await excel.xlsx.load(buffer)
  return { excel, sheetJs: XLSX.read(new Uint8Array(buffer as ArrayBuffer), { type: 'array' }) }
}

describe.each<OntologyTemplateMode>(['competency', 'micro-skill'])('%s import template', mode => {
  it('has Instructions first, styled data tabs and rows the import parser reads back as the examples', async () => {
    const { excel, sheetJs } = await roundTrip(mode)
    const specs = ONTOLOGY_TEMPLATE_SHEETS[mode]
    expect(sheetJs.SheetNames).toEqual(['Instructions', ...specs.map(spec => spec.name)])
    for (const spec of specs) {
      const sheet = excel.getWorksheet(spec.name)!
      expect(sheet.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 })
      const header = sheet.getRow(1).getCell(1)
      expect(header.fill).toMatchObject({ fgColor: { argb: 'FFEA580C' } })
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheetJs.Sheets[spec.name], { defval: '' })
      expect(rows).toEqual(spec.examples.map(example => Object.fromEntries(spec.columns.map((column, index) => [column.header, example[index]]))))
    }
  })
})

describe('micro-skill import template validation', () => {
  it('offers mode dropdowns and warns on skill codes missing from the workbook', async () => {
    const { excel } = await roundTrip('micro-skill')
    const at = (sheet: string, cell: string, range: string) => {
      const model = (excel.getWorksheet(sheet) as unknown as { dataValidations: { model: Record<string, { type: string; formulae: string[]; errorStyle?: string }> } }).dataValidations.model
      return model[cell] ?? model[range]
    }
    expect(at('Micro_Skills', 'D2', 'D2:D501')).toMatchObject({ type: 'list', formulae: ['"Module,Certificate"'] })
    expect(at('Prerequisites', 'A2', 'A2:A501')).toMatchObject({ type: 'list', errorStyle: 'warning' })
    expect(at('Prerequisites', 'B2', 'B2:B501')).toMatchObject({ type: 'list', errorStyle: 'warning' })
    expect(at('Micro_Skills', 'A2', 'A2:A501').formulae[0]).toContain('COUNTIF($A$2:$A$501,A2)=1')
  })

  it('verifies Demo/04_MicroSkills_JavaBackend.xlsx Prerequisites sheet has only Dependent_Skill_Code and Prerequisite_Skill_Code', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const demoPath = path.resolve(process.cwd(), '../Demo/04_MicroSkills_JavaBackend.xlsx')
    const buf = fs.readFileSync(demoPath)
    const wb = XLSX.read(buf, { type: 'buffer' })
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets['Prerequisites'])
    expect(rows.length).toBe(15)
    for (const row of rows) {
      expect(Object.keys(row)).toEqual(['Dependent_Skill_Code', 'Prerequisite_Skill_Code'])
      expect(row.Dependent_Skill_Code).toMatch(/^MS-/)
      expect(row.Prerequisite_Skill_Code).toMatch(/^MS-/)
    }
  })
})
