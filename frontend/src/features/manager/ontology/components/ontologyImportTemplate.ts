import type { DataValidation, Workbook } from 'exceljs'
import { EXCEL_COLOR as COLOR, columnLetter, downloadWorkbook, excelFont as font, loadExcel, solid, thin,
  type RangeValidations } from '../../../../shared/lib/excelTemplateStyle'

export type OntologyTemplateMode = 'competency' | 'micro-skill'

const TEMPLATE_ROWS = 500
const LAST_ROW = TEMPLATE_ROWS + 1
export const ONTOLOGY_TEMPLATE_FILE: Record<OntologyTemplateMode, string> = {
  competency: 'Competency_Import_Template.xlsx',
  'micro-skill': 'MicroSkill_Import_Template.xlsx',
}

type Kind = 'code' | 'name' | 'text' | 'mode' | 'level' | 'ref' | 'free'
interface ColumnSpec { header: string; kind: Kind; width: number; required: boolean; hint: string; refSheet?: string }
interface SheetSpec { name: string; required: boolean; purpose: string; columns: ColumnSpec[]; examples: string[][] }

const MODES = '"Module,Certificate"'
const LEVELS = '"Foundation,Intermediate,Advanced"'
const modeHint = (level: string) => `${level} level: Module or Certificate. Leave blank if this level is not offered.`

const competencySheet: SheetSpec = { name: 'Competencies', required: true, purpose: 'One row per competency.', columns: [
  { header: 'Code', kind: 'code', width: 20, required: true, hint: 'Unique code, e.g. COMP-SYS-01. No spaces; converted to upper case.' },
  { header: 'Name', kind: 'name', width: 40, required: true, hint: 'Competency title, up to 255 characters.' },
  { header: 'Description', kind: 'text', width: 66, required: false, hint: 'Capabilities and observable mastery.' },
], examples: [
  ['COMP-SYS-01', 'System Architecture & Scalability', 'Ability to architect distributed systems, microservices, and fault-tolerant topologies.'],
  ['COMP-SEC-01', 'Cloud & Infrastructure Security', 'Knowledge of identity access management, transport encryption, and vulnerability management.'],
] }

const microSkillSheet: SheetSpec = { name: 'Micro_Skills', required: true, purpose: 'One row per micro-skill with its verification mode per knowledge level.', columns: [
  { header: 'Code', kind: 'code', width: 18, required: true, hint: 'Unique code, e.g. MS-SKILL01. No spaces; converted to upper case.' },
  { header: 'Name', kind: 'name', width: 40, required: true, hint: 'Micro-skill title, up to 255 characters.' },
  { header: 'Description', kind: 'text', width: 60, required: false, hint: 'What the learner will study and demonstrate.' },
  { header: 'Foundation_Mode', kind: 'mode', width: 20, required: false, hint: modeHint('Foundation') },
  { header: 'Intermediate_Mode', kind: 'mode', width: 20, required: false, hint: modeHint('Intermediate') },
  { header: 'Advanced_Mode', kind: 'mode', width: 20, required: false, hint: modeHint('Advanced') },
], examples: [
  ['MS-SKILL01', 'Database Indexing & Query Optimization', 'Understand B-Tree indexes, composite keys, and analyze SQL execution plans.', 'Module', 'Module', 'Certificate'],
  ['MS-SKILL02', 'Asynchronous Event Processing', 'Design event-driven architectures with Kafka topics and consumer groups.', 'Module', 'Certificate', ''],
  ['MS-SKILL03', 'OAuth2 & JWT Token Security', 'Validate RS256 token signatures, claim scopes, and public key rotations.', '', 'Module', 'Module'],
] }

const relationSheet = (mode: OntologyTemplateMode): SheetSpec => ({ name: 'Competency_Skills', required: false,
  purpose: 'Optional. One row per competency - micro-skill link.', columns: [
    mode === 'competency'
      ? { header: 'Competency_Code', kind: 'ref', refSheet: 'Competencies', width: 24, required: true, hint: 'Pick a code from the Competencies sheet or type an existing competency code.' }
      : { header: 'Competency_Code', kind: 'free', width: 24, required: true, hint: 'Code of an existing competency, e.g. COMP-SYS-01.' },
    mode === 'competency'
      ? { header: 'Micro_Skill_Code', kind: 'free', width: 24, required: true, hint: 'Code of an existing micro-skill, e.g. MS-SKILL01.' }
      : { header: 'Micro_Skill_Code', kind: 'ref', refSheet: 'Micro_Skills', width: 24, required: true, hint: 'Pick a code from the Micro_Skills sheet or type an existing micro-skill code.' },
  ], examples: mode === 'competency'
    ? [['COMP-SYS-01', 'MS-SKILL01'], ['COMP-SYS-01', 'MS-SKILL02'], ['COMP-SEC-01', 'MS-SKILL03']]
    : [['COMP-SYS-01', 'MS-SKILL01'], ['COMP-SYS-01', 'MS-SKILL02']] })

const prerequisiteSheet: SheetSpec = { name: 'Prerequisites', required: false,
  purpose: 'Optional. One row per prerequisite: one micro-skill requires another micro-skill.', columns: [
    { header: 'Dependent_Skill_Code', kind: 'ref', refSheet: 'Micro_Skills', width: 28, required: true, hint: 'Skill that requires prior knowledge. Pick from Micro_Skills or type an existing code.' },
    { header: 'Prerequisite_Skill_Code', kind: 'ref', refSheet: 'Micro_Skills', width: 28, required: true, hint: 'Skill that must be mastered first. Must differ from the dependent skill.' },
  ], examples: [['MS-SKILL02', 'MS-SKILL01'], ['MS-SKILL03', 'MS-SKILL01']] }

export const ONTOLOGY_TEMPLATE_SHEETS: Record<OntologyTemplateMode, SheetSpec[]> = {
  competency: [competencySheet, relationSheet('competency')],
  'micro-skill': [microSkillSheet, relationSheet('micro-skill'), prerequisiteSheet],
}

const RULES: Record<OntologyTemplateMode, string[]> = {
  competency: [
    'Do not rename the tabs or the header row. The first row of each data tab must keep the exact column headers.',
    'Orange columns are required; light orange columns are optional. Competency_Skills is optional and may be left empty.',
    'Codes have no spaces and must be unique in the Competencies tab; they are trimmed and converted to upper case on import.',
    'Competency_Code offers a dropdown of the codes in the Competencies tab; codes of existing competencies are also accepted.',
    'Micro_Skill_Code must be the code of a micro-skill that already exists in your organization.',
    'Names: up to 255 characters. Up to 500 rows per tab. Replace or delete the example rows before uploading.',
    'You can review every parsed row and its validation issues before saving.',
  ],
  'micro-skill': [
    'Do not rename the tabs or the header row. The first row of each data tab must keep the exact column headers.',
    'Orange columns are required; light orange columns are optional. Competency_Skills and Prerequisites may be left empty.',
    'Codes have no spaces and must be unique in the Micro_Skills tab; they are trimmed and converted to upper case on import.',
    'Mode columns offer Module or Certificate. Leave a mode blank when that knowledge level is not offered.',
    'Skill code columns offer a dropdown of the codes in Micro_Skills; codes of existing micro-skills are also accepted.',
    'A skill cannot be its own prerequisite.',
    'Names: up to 255 characters. Up to 500 rows per tab. Replace or delete the example rows before uploading.',
  ],
}

const TITLE: Record<OntologyTemplateMode, string> = {
  competency: 'Competency import template',
  'micro-skill': 'Micro-skill import template',
}

function validationFor(column: ColumnSpec, col: string): DataValidation | null {
  const base = { allowBlank: true, showInputMessage: true, promptTitle: column.header.slice(0, 32), prompt: column.hint,
    showErrorMessage: true, errorStyle: 'stop' as const, errorTitle: 'Invalid value' }
  switch (column.kind) {
    case 'code':
      return { ...base, type: 'custom', formulae: [`AND(ISERROR(FIND(" ",${col}2)),COUNTIF($${col}$2:$${col}$${LAST_ROW},${col}2)=1)`],
        error: 'Codes must not contain spaces and must be unique in this sheet.' }
    case 'name':
      return { ...base, type: 'textLength', operator: 'lessThanOrEqual', formulae: [255], error: 'Use at most 255 characters.' }
    case 'mode':
      return { ...base, type: 'list', formulae: [MODES], error: 'Choose Module or Certificate, or leave the cell blank.' }
    case 'level':
      return { ...base, type: 'list', formulae: [LEVELS], error: 'Choose Foundation, Intermediate or Advanced.' }
    case 'ref': {
      const sheet = `'${column.refSheet}'`
      // Warning only: codes of records that already exist in the organization are valid too.
      return { ...base, type: 'list', errorStyle: 'warning', errorTitle: 'Code not in this workbook',
        formulae: [`OFFSET(${sheet}!$A$2,0,0,MAX(1,COUNTA(${sheet}!$A$2:$A$${LAST_ROW})),1)`],
        error: `This code is not in the ${column.refSheet} sheet. Continue only if it already exists in your organization.` }
    }
    case 'free':
      return { ...base, type: 'custom', formulae: [`ISERROR(FIND(" ",${col}2))`], error: 'Codes must not contain spaces.' }
    default:
      return null
  }
}

function buildDataSheet(workbook: Workbook, spec: SheetSpec) {
  const sheet = workbook.addWorksheet(spec.name, { properties: { tabColor: { argb: COLOR.primary } },
    views: [{ state: 'frozen', ySplit: 1, activeCell: 'A2', showGridLines: false }] })
  sheet.columns = spec.columns.map(column => ({ width: column.width }))
  const header = sheet.getRow(1)
  header.height = 30
  spec.columns.forEach((column, index) => {
    const cell = header.getCell(index + 1)
    cell.value = column.header
    cell.font = font({ bold: true, color: { argb: column.required ? COLOR.white : COLOR.primaryDark } })
    cell.fill = solid(column.required ? COLOR.primary : COLOR.tint)
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    cell.border = thin(column.required ? COLOR.primaryDark : COLOR.border)
    cell.note = { texts: [{ text: `${column.required ? 'Required' : 'Optional'}. ${column.hint}` }] }
  })
  for (let rowNumber = 2; rowNumber <= LAST_ROW; rowNumber++) {
    const row = sheet.getRow(rowNumber)
    const example = spec.examples[rowNumber - 2]
    spec.columns.forEach((column, index) => {
      const cell = row.getCell(index + 1)
      if (example && example[index]) cell.value = example[index]
      cell.font = font()
      cell.fill = solid(rowNumber % 2 === 0 ? COLOR.white : COLOR.canvas)
      cell.border = thin(COLOR.border)
      cell.alignment = { vertical: 'top', wrapText: column.kind === 'text', indent: 1 }
    })
  }
  spec.columns.forEach((column, index) => {
    const col = columnLetter(index)
    const validation = validationFor(column, col)
    if (validation) (sheet as unknown as RangeValidations).dataValidations.add(`${col}2:${col}${LAST_ROW}`, validation)
  })
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: spec.columns.length } }
}

function buildInstructions(workbook: Workbook, mode: OntologyTemplateMode) {
  const sheets = ONTOLOGY_TEMPLATE_SHEETS[mode]
  const sheet = workbook.addWorksheet('Instructions', { properties: { tabColor: { argb: COLOR.slate } }, views: [{ showGridLines: false }] })
  sheet.columns = [{ width: 3 }, { width: 24 }, { width: 46 }, { width: 70 }]
  const write = (row: number, values: string[], style: { font?: Parameters<typeof font>[0]; fill?: string; height?: number } = {}) => {
    const r = sheet.getRow(row)
    values.forEach((value, index) => {
      const cell = r.getCell(index + 2)
      cell.value = value
      cell.font = font(style.font)
      cell.alignment = { vertical: 'top', wrapText: true }
      if (style.fill) cell.fill = solid(style.fill)
    })
    if (style.height) r.height = style.height
  }
  write(2, [TITLE[mode]], { font: { size: 18, bold: true, color: { argb: COLOR.primary } }, height: 30 })
  write(3, [`Fill the orange tabs from left to right, save the file as .xlsx and upload it in the ${mode === 'competency' ? 'competency' : 'micro-skill'} import dialog.`],
    { font: { color: { argb: COLOR.textMuted } } })
  sheet.mergeCells('B2:D2')
  sheet.mergeCells('B3:D3')
  write(5, ['Sheet', 'One row means', 'Columns'], { font: { bold: true, color: { argb: COLOR.white } }, fill: COLOR.primary, height: 22 })
  sheets.forEach((spec, index) => write(6 + index, [`${spec.name}${spec.required ? '' : ' (optional)'}`, spec.purpose,
    spec.columns.map(column => `${column.header}${column.required ? '' : ' - optional'}`).join('\n')],
  { fill: index % 2 ? COLOR.canvas : COLOR.white }))
  let row = 7 + sheets.length
  write(row++, ['Rules'], { font: { bold: true, size: 13 } })
  RULES[mode].forEach((rule, index) => { write(row, [`${index + 1}.  ${rule}`]); sheet.mergeCells(`B${row}:D${row}`); row++ })
  row++
  write(row++, ['Legend'], { font: { bold: true, size: 13 } })
  write(row++, ['Required', 'Orange header'], { fill: COLOR.tint })
  write(row, ['Optional', 'Light orange header, may be left blank'], { fill: COLOR.muted })
}

export async function buildOntologyTemplate(mode: OntologyTemplateMode): Promise<Workbook> {
  const ExcelJS = await loadExcel()
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Adapt Learn Graph'
  workbook.created = new Date()
  buildInstructions(workbook, mode)
  for (const spec of ONTOLOGY_TEMPLATE_SHEETS[mode]) buildDataSheet(workbook, spec)
  workbook.views = [{ x: 0, y: 0, width: 20000, height: 12000, firstSheet: 0, activeTab: 1, visibility: 'visible' }]
  return workbook
}

export async function downloadOntologyTemplate(mode: OntologyTemplateMode): Promise<void> {
  await downloadWorkbook(await buildOntologyTemplate(mode), ONTOLOGY_TEMPLATE_FILE[mode])
}
