import * as React from 'react'
import * as XLSX from 'xlsx'
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../../shared/components/ui/Dialog'
import { Button } from '../../../../shared/components/ui/Button'
import { Badge } from '../../../../shared/components/ui/Badge'
import { Text } from '../../../../shared/components/typography/Text'
import { useToast } from '../../../../shared/hooks/useToast'
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  RefreshCw,
  Layers,
} from 'lucide-react'
import {
  createCompetency,
  updateCompetency,
  type CompetencyDto,
} from '../../../../shared/api/competencyApi'
import {
  createMicroSkill,
  updateMicroSkill,
  type MicroSkillDto,
} from '../../../../shared/api/microSkillApi'
import { createPrerequisite } from '../../../../shared/api/prerequisiteApi'

export interface OntologyExcelImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'competency' | 'micro-skill'
  organizationId: string
  existingCompetencies: CompetencyDto[]
  existingMicroSkills: MicroSkillDto[]
  onImportSuccess: () => Promise<void> | void
}

interface ParsedCompetencyRow {
  code: string
  name: string
  description: string
  isValid: boolean
  errors: string[]
}

interface ParsedMicroSkillRow {
  code: string
  name: string
  description: string
  foundationMode: 'MODULE_ONLY' | 'CERTIFICATE_ONLY' | ''
  intermediateMode: 'MODULE_ONLY' | 'CERTIFICATE_ONLY' | ''
  advancedMode: 'MODULE_ONLY' | 'CERTIFICATE_ONLY' | ''
  isValid: boolean
  errors: string[]
}

interface ParsedCompetencyRelationRow {
  competencyCode: string
  microSkillCode: string
  isValid: boolean
  errors: string[]
}

interface ParsedPrerequisiteRow {
  dependentCode: string
  dependentLevel: string
  prerequisiteCode: string
  prerequisiteLevel: string
  isValid: boolean
  errors: string[]
}

export function OntologyExcelImportModal({
  open,
  onOpenChange,
  mode,
  organizationId,
  existingCompetencies,
  existingMicroSkills,
  onImportSuccess,
}: OntologyExcelImportModalProps) {
  const { toast } = useToast()
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const [file, setFile] = React.useState<File | null>(null)
  const [parsing, setParsing] = React.useState(false)
  const [importing, setImporting] = React.useState(false)

  // Parsed datasets
  const [competencyRows, setCompetencyRows] = React.useState<ParsedCompetencyRow[]>([])
  const [microSkillRows, setMicroSkillRows] = React.useState<ParsedMicroSkillRow[]>([])
  const [relationRows, setRelationRows] = React.useState<ParsedCompetencyRelationRow[]>([])
  const [prereqRows, setPrereqRows] = React.useState<ParsedPrerequisiteRow[]>([])

  const resetState = () => {
    setFile(null)
    setParsing(false)
    setImporting(false)
    setCompetencyRows([])
    setMicroSkillRows([])
    setRelationRows([])
    setPrereqRows([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  React.useEffect(() => {
    if (!open) {
      resetState()
    }
  }, [open])

  // Download Sample Template with configured tabs
  const handleDownloadTemplate = () => {
    const workbook = XLSX.utils.book_new()

    if (mode === 'competency') {
      // Tab 1: Instructions & Guide
      const instructionsData = [
        ['COMPETENCY BULK IMPORT - USER GUIDE & INSTRUCTIONS'],
        [''],
        ['1. OVERVIEW'],
        ['This template allows you to bulk import competencies and associate them with micro-skills.'],
        ['This workbook has two data sheets: "Competencies" and "Competency_Skills".'],
        [''],
        ['2. DATA SHEETS & COLUMN SPECIFICATIONS'],
        [''],
        ['--- Sheet: Competencies (Required) ---'],
        ['Column Name', 'Required?', 'Format / Type', 'Description & Example'],
        ['Code', 'YES', 'Unique String', 'Unique code for the competency (e.g. COMP-SYS-01). Must not contain spaces.'],
        ['Name', 'YES', 'Text (Max 255)', 'The descriptive title of the competency (e.g. System Architecture & Scalability).'],
        ['Description', 'Optional', 'Text', 'Detailed overview of capabilities and observable mastery.'],
        [''],
        ['--- Sheet: Competency_Skills (Optional) ---'],
        ['Column Name', 'Required?', 'Format / Type', 'Description & Example'],
        ['Competency_Code', 'YES', 'String', 'The competency Code (e.g. COMP-SYS-01).'],
        ['Micro_Skill_Code', 'YES', 'String', 'The code of an existing Micro-Skill to map to this competency (e.g. MS-SKILL01).'],
        [''],
        ['3. TIPS & RULES FOR IMPORT'],
        ['• Do not modify or delete the sheet names ("Competencies", "Competency_Skills").'],
        ['• The first row of each data sheet must contain the exact column headers.'],
        ['• All Codes will be automatically trimmed and converted to uppercase upon import.'],
        ['• Before saving, you will be able to review all parsed rows and any validation issues.'],
      ]
      const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData)
      instructionsSheet['!cols'] = [{ wch: 22 }, { wch: 12 }, { wch: 25 }, { wch: 60 }]
      XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions')

      // Tab 2: Competencies
      const compData = [
        {
          Code: 'COMP-SYS-01',
          Name: 'System Architecture & Scalability',
          Description: 'Ability to architect distributed systems, microservices, and fault-tolerant topologies.',
        },
        {
          Code: 'COMP-SEC-01',
          Name: 'Cloud & Infrastructure Security',
          Description: 'Knowledge of identity access management, transport encryption, and vulnerability management.',
        },
      ]
      const compSheet = XLSX.utils.json_to_sheet(compData)
      compSheet['!cols'] = [{ wch: 18 }, { wch: 38 }, { wch: 65 }]
      XLSX.utils.book_append_sheet(workbook, compSheet, 'Competencies')

      // Tab 3: Competency Relations
      const relData = [
        {
          Competency_Code: 'COMP-SYS-01',
          Micro_Skill_Code: 'MS-SKILL01',
        },
        {
          Competency_Code: 'COMP-SYS-01',
          Micro_Skill_Code: 'MS-SKILL02',
        },
        {
          Competency_Code: 'COMP-SEC-01',
          Micro_Skill_Code: 'MS-SKILL03',
        },
      ]
      const relSheet = XLSX.utils.json_to_sheet(relData)
      relSheet['!cols'] = [{ wch: 22 }, { wch: 22 }]
      XLSX.utils.book_append_sheet(workbook, relSheet, 'Competency_Skills')

      XLSX.writeFile(workbook, 'Competency_Import_Template.xlsx')
    } else {
      // Tab 1: Instructions & Guide
      const instructionsData = [
        ['MICRO-SKILL BULK IMPORT - USER GUIDE & INSTRUCTIONS'],
        [''],
        ['1. OVERVIEW'],
        ['This template allows you to bulk import Micro-Skills, configure learning verification modes for each knowledge tier,'],
        ['associate skills with competencies, and establish prerequisite progression dependencies.'],
        ['This workbook has three data sheets: "Micro_Skills", "Competency_Skills", and "Prerequisites".'],
        [''],
        ['2. DATA SHEETS & COLUMN SPECIFICATIONS'],
        [''],
        ['--- Sheet: Micro_Skills (Required) ---'],
        ['Column Name', 'Required?', 'Accepted Values', 'Description & Example'],
        ['Code', 'YES', 'Unique String', 'Unique code for the skill (e.g. MS-SKILL01). Must not contain spaces.'],
        ['Name', 'YES', 'Text (Max 255)', 'The descriptive title of the micro-skill (e.g. Database Indexing & Query Optimization).'],
        ['Description', 'Optional', 'Text', 'Clear summary of what the learner will study and demonstrate.'],
        ['Foundation_Mode', 'Optional', 'Module, Certificate, or blank', 'Verification mode for Foundation level. Type "Module" or "Certificate" (or leave blank if none).'],
        ['Intermediate_Mode', 'Optional', 'Module, Certificate, or blank', 'Verification mode for Intermediate level. Type "Module" or "Certificate" (or leave blank if none).'],
        ['Advanced_Mode', 'Optional', 'Module, Certificate, or blank', 'Verification mode for Advanced level. Type "Module" or "Certificate" (or leave blank if none).'],
        [''],
        ['--- Sheet: Competency_Skills (Optional) ---'],
        ['Column Name', 'Required?', 'Accepted Values', 'Description & Example'],
        ['Competency_Code', 'YES', 'String', 'Code of the parent competency (e.g. COMP-SYS-01).'],
        ['Micro_Skill_Code', 'YES', 'String', 'Code of the micro-skill to map (e.g. MS-SKILL01).'],
        [''],
        ['--- Sheet: Prerequisites (Optional) ---'],
        ['Column Name', 'Required?', 'Accepted Values', 'Description & Example'],
        ['Dependent_Skill_Code', 'YES', 'String', 'Code of the skill that requires prior knowledge (e.g. MS-SKILL02).'],
        ['Dependent_Knowledge_Level', 'YES', 'Foundation, Intermediate, Advanced', 'Tier of the dependent skill that requires prerequisite mastery (e.g. Intermediate).'],
        ['Prerequisite_Skill_Code', 'YES', 'String', 'Code of the required prerequisite skill (e.g. MS-SKILL01).'],
        ['Prerequisite_Knowledge_Level', 'YES', 'Foundation, Intermediate, Advanced', 'Tier required in the prerequisite skill (e.g. Foundation).'],
        [''],
        ['3. TIPS & RULES FOR IMPORT'],
        ['• Learning Modes: You can simply type "Module" or "Certificate" (or "Module Only", "Certificate Only"). Case does not matter!'],
        ['• If a knowledge level is not covered or has no content, simply leave that column blank.'],
        ['• Do not modify or delete the sheet names ("Micro_Skills", "Competency_Skills", "Prerequisites").'],
        ['• The first row of each data sheet must contain the exact column headers.'],
        ['• All Codes will be automatically trimmed and converted to uppercase upon import.'],
        ['• Before saving, you will be able to review all parsed rows and any validation issues.'],
      ]
      const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData)
      instructionsSheet['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 32 }, { wch: 65 }]
      XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions')

      // Tab 2: Micro-skills
      const skillData = [
        {
          Code: 'MS-SKILL01',
          Name: 'Database Indexing & Query Optimization',
          Description: 'Understand B-Tree indexes, composite keys, and analyze SQL execution plans.',
          Foundation_Mode: 'Module',
          Intermediate_Mode: 'Module',
          Advanced_Mode: 'Certificate',
        },
        {
          Code: 'MS-SKILL02',
          Name: 'Asynchronous Event Processing',
          Description: 'Design event-driven architectures with Kafka topics and consumer groups.',
          Foundation_Mode: 'Module',
          Intermediate_Mode: 'Certificate',
          Advanced_Mode: '',
        },
        {
          Code: 'MS-SKILL03',
          Name: 'OAuth2 & JWT Token Security',
          Description: 'Validate RS256 token signatures, claim scopes, and public key rotations.',
          Foundation_Mode: '',
          Intermediate_Mode: 'Module',
          Advanced_Mode: 'Module',
        },
      ]
      const skillSheet = XLSX.utils.json_to_sheet(skillData)
      skillSheet['!cols'] = [{ wch: 18 }, { wch: 40 }, { wch: 65 }, { wch: 18 }, { wch: 20 }, { wch: 18 }]
      XLSX.utils.book_append_sheet(workbook, skillSheet, 'Micro_Skills')

      // Tab 3: Competency Relations
      const relData = [
        {
          Competency_Code: 'COMP-SYS-01',
          Micro_Skill_Code: 'MS-SKILL01',
        },
        {
          Competency_Code: 'COMP-SYS-01',
          Micro_Skill_Code: 'MS-SKILL02',
        },
      ]
      const relSheet = XLSX.utils.json_to_sheet(relData)
      relSheet['!cols'] = [{ wch: 22 }, { wch: 22 }]
      XLSX.utils.book_append_sheet(workbook, relSheet, 'Competency_Skills')

      // Tab 4: Prerequisites
      const prereqData = [
        {
          Dependent_Skill_Code: 'MS-SKILL02',
          Dependent_Knowledge_Level: 'Intermediate',
          Prerequisite_Skill_Code: 'MS-SKILL01',
          Prerequisite_Knowledge_Level: 'Foundation',
        },
        {
          Dependent_Skill_Code: 'MS-SKILL03',
          Dependent_Knowledge_Level: 'Advanced',
          Prerequisite_Skill_Code: 'MS-SKILL01',
          Prerequisite_Knowledge_Level: 'Intermediate',
        },
      ]
      const prereqSheet = XLSX.utils.json_to_sheet(prereqData)
      prereqSheet['!cols'] = [{ wch: 24 }, { wch: 28 }, { wch: 24 }, { wch: 28 }]
      XLSX.utils.book_append_sheet(workbook, prereqSheet, 'Prerequisites')

      XLSX.writeFile(workbook, 'MicroSkill_Import_Template.xlsx')
    }
  }

  // Parse Excel File
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setParsing(true)

    try {
      const buffer = await selectedFile.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })

      const sheetNames = workbook.SheetNames
      const findSheet = (...names: string[]) => {
        const lowerNames = names.map((n) => n.toLowerCase())
        // 1. Exact match
        const exactMatch = sheetNames.find((s) => lowerNames.includes(s.toLowerCase().trim()))
        if (exactMatch) return workbook.Sheets[exactMatch]

        // 2. Fuzzy match excluding instructions / guide
        const fuzzy = sheetNames.find((s) => {
          const l = s.toLowerCase().trim()
          if (l.includes('instruct') || l.includes('guide') || l.includes('help') || l.includes('readme')) return false
          return lowerNames.some((n) => l.includes(n))
        })
        return fuzzy ? workbook.Sheets[fuzzy] : null
      }

      if (mode === 'competency') {
        const compSheet = findSheet('Competencies', 'Competency') || (sheetNames.length > 0 && !sheetNames[0].toLowerCase().includes('instruct') ? workbook.Sheets[sheetNames[0]] : null)
        const compRaw: Record<string, unknown>[] = compSheet ? XLSX.utils.sheet_to_json(compSheet) : []

        const parsedComps: ParsedCompetencyRow[] = compRaw.map((row) => {
          const code = String(row['Code'] || row['code'] || row['Competency Code'] || '').trim().toUpperCase()
          const name = String(row['Name'] || row['name'] || row['Competency Name'] || '').trim()
          const description = String(row['Description'] || row['description'] || '').trim()

          const errors: string[] = []
          if (!code) errors.push('Code is required')
          if (!name) errors.push('Name is required')

          return {
            code,
            name,
            description,
            isValid: errors.length === 0,
            errors,
          }
        })
        setCompetencyRows(parsedComps)

        // Parse Relations sheet (optional)
        const relSheet = findSheet('Competency_Skills', 'CompetencySkills', 'Relations', 'Skills')
        if (relSheet) {
          const relRaw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(relSheet)
          const parsedRels: ParsedCompetencyRelationRow[] = relRaw.map((row) => {
            const competencyCode = String(row['Competency_Code'] || row['Competency Code'] || row['competency_code'] || '').trim().toUpperCase()
            const microSkillCode = String(row['Micro_Skill_Code'] || row['Micro Skill Code'] || row['micro_skill_code'] || row['Skill_Code'] || '').trim().toUpperCase()

            const errors: string[] = []
            if (!competencyCode) errors.push('Competency code required')
            if (!microSkillCode) errors.push('Micro-skill code required')

            return {
              competencyCode,
              microSkillCode,
              isValid: errors.length === 0,
              errors,
            }
          })
          setRelationRows(parsedRels)
        }
      } else {
        // Micro-skill mode
        const skillSheet = findSheet('Micro_Skills', 'MicroSkills', 'Micro-Skills', 'Skills')
        const skillRaw: Record<string, unknown>[] = skillSheet ? XLSX.utils.sheet_to_json(skillSheet) : []

        const parseMode = (val: unknown): 'MODULE_ONLY' | 'CERTIFICATE_ONLY' | '' => {
          const s = String(val || '').trim().toUpperCase()
          if (!s || s === 'NONE' || s === 'N/A' || s === '-') return ''
          if (s.includes('CERT')) return 'CERTIFICATE_ONLY'
          if (s.includes('MOD')) return 'MODULE_ONLY'
          return ''
        }

        const parsedSkills: ParsedMicroSkillRow[] = skillRaw.map((row) => {
          const code = String(row['Code'] || row['code'] || row['Skill Code'] || '').trim().toUpperCase()
          const name = String(row['Name'] || row['name'] || row['Skill Name'] || '').trim()
          const description = String(row['Description'] || row['description'] || '').trim()
          const foundationMode = parseMode(row['Foundation_Mode'] || row['Foundation'] || row['foundation_mode'])
          const intermediateMode = parseMode(row['Intermediate_Mode'] || row['Intermediate'] || row['intermediate_mode'])
          const advancedMode = parseMode(row['Advanced_Mode'] || row['Advanced'] || row['advanced_mode'])

          const errors: string[] = []
          if (!code) errors.push('Code is required')
          if (!name) errors.push('Name is required')

          return {
            code,
            name,
            description,
            foundationMode,
            intermediateMode,
            advancedMode,
            isValid: errors.length === 0,
            errors,
          }
        })
        setMicroSkillRows(parsedSkills)

        // Tab 2: Competency Relations
        const relSheet = findSheet('Competency_Skills', 'CompetencySkills', 'Relations')
        if (relSheet) {
          const relRaw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(relSheet)
          const parsedRels: ParsedCompetencyRelationRow[] = relRaw.map((row) => {
            const competencyCode = String(row['Competency_Code'] || row['Competency Code'] || row['competency_code'] || '').trim().toUpperCase()
            const microSkillCode = String(row['Micro_Skill_Code'] || row['Micro Skill Code'] || row['micro_skill_code'] || row['Skill_Code'] || '').trim().toUpperCase()

            const errors: string[] = []
            if (!competencyCode) errors.push('Competency code required')
            if (!microSkillCode) errors.push('Micro-skill code required')

            return {
              competencyCode,
              microSkillCode,
              isValid: errors.length === 0,
              errors,
            }
          })
          setRelationRows(parsedRels)
        }

        // Tab 3: Prerequisites
        const prereqSheet = findSheet('Prerequisites', 'Prereqs', 'Dependencies')
        if (prereqSheet) {
          const prereqRaw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(prereqSheet)
          const validLevels = new Set(['FOUNDATION', 'INTERMEDIATE', 'ADVANCED'])

          const normalizeLevel = (rawVal: unknown, defaultLevel: string) => {
            const s = String(rawVal || defaultLevel).trim().toUpperCase()
            if (s.startsWith('FOUND')) return 'FOUNDATION'
            if (s.startsWith('INTER')) return 'INTERMEDIATE'
            if (s.startsWith('ADV')) return 'ADVANCED'
            return s
          }

          const parsedPrereqs: ParsedPrerequisiteRow[] = prereqRaw.map((row) => {
            const dependentCode = String(row['Dependent_Skill_Code'] || row['Dependent Skill Code'] || row['dependent_skill_code'] || row['Dependent'] || '').trim().toUpperCase()
            const rawDepLevel = row['Dependent_Knowledge_Level'] || row['Dependent Level'] || row['dependent_knowledge_level'] || 'INTERMEDIATE'
            const dependentLevel = normalizeLevel(rawDepLevel, 'INTERMEDIATE')

            const prerequisiteCode = String(row['Prerequisite_Skill_Code'] || row['Prerequisite Skill Code'] || row['prerequisite_skill_code'] || row['Prerequisite'] || '').trim().toUpperCase()
            const rawPrereqLevel = row['Prerequisite_Knowledge_Level'] || row['Prerequisite Level'] || row['prerequisite_knowledge_level'] || 'FOUNDATION'
            const prerequisiteLevel = normalizeLevel(rawPrereqLevel, 'FOUNDATION')

            const errors: string[] = []
            if (!dependentCode) errors.push('Dependent skill code required')
            if (!prerequisiteCode) errors.push('Prerequisite skill code required')
            if (dependentCode && prerequisiteCode && dependentCode === prerequisiteCode && dependentLevel === prerequisiteLevel) {
              errors.push('Self-loop prerequisite not allowed')
            }
            if (!validLevels.has(dependentLevel)) errors.push(`Invalid dependent level: ${dependentLevel}`)
            if (!validLevels.has(prerequisiteLevel)) errors.push(`Invalid prerequisite level: ${prerequisiteLevel}`)

            return {
              dependentCode,
              dependentLevel,
              prerequisiteCode,
              prerequisiteLevel,
              isValid: errors.length === 0,
              errors,
            }
          })
          setPrereqRows(parsedPrereqs)
        }
      }
    } catch {
      toast({
        title: 'File Read Error',
        description: 'Failed to parse Excel workbook. Ensure the file is a valid .xlsx format.',
        variant: 'destructive',
      })
    } finally {
      setParsing(false)
    }
  }

  // Execute Import
  const handleConfirmImport = async () => {
    setImporting(true)
    const orgId = organizationId

    try {
      if (mode === 'competency') {
        const validComps = competencyRows.filter((r) => r.isValid)
        const compMap = new Map<string, CompetencyDto>()
        existingCompetencies.forEach((c) => {
          if (c.code) compMap.set(c.code.toUpperCase(), c)
        })

        // Create or Update Competencies
        for (const comp of validComps) {
          const existing = compMap.get(comp.code)
          if (existing) {
            await updateCompetency(orgId, existing.id, {
              name: comp.name,
              description: comp.description || existing.description,
            }).catch(() => {})
          } else {
            const created = await createCompetency(orgId, {
              code: comp.code,
              name: comp.name,
              description: comp.description || '',
            })
            compMap.set(comp.code, created)
          }
        }

        // Process Relations
        const validRels = relationRows.filter((r) => r.isValid)
        if (validRels.length > 0) {
          // Group skills by competency
          const compToSkills = new Map<string, string[]>()
          const skillLookup = new Map<string, MicroSkillDto>()
          existingMicroSkills.forEach((s) => skillLookup.set(s.code.toUpperCase(), s))

          for (const rel of validRels) {
            const targetSkill = skillLookup.get(rel.microSkillCode)
            if (targetSkill) {
              const current = compToSkills.get(rel.competencyCode) || []
              if (!current.includes(targetSkill.id)) {
                current.push(targetSkill.id)
              }
              compToSkills.set(rel.competencyCode, current)
            }
          }

          // Update competencies with new mapped skills
          for (const [cCode, skillIds] of compToSkills.entries()) {
            const comp = compMap.get(cCode)
            if (comp) {
              const mergedSkills = Array.from(new Set([...(comp.skillIds || []), ...skillIds]))
              await updateCompetency(orgId, comp.id, {
                name: comp.name,
                description: comp.description,
                skillIds: mergedSkills,
              }).catch(() => {})
            }
          }
        }

        toast({
          title: 'Import Completed',
          description: `Successfully imported ${validComps.length} competencies and ${validRels.length} skill mappings.`,
          variant: 'success',
        })
      } else {
        // Micro-skill mode
        const validSkills = microSkillRows.filter((r) => r.isValid)
        const skillMap = new Map<string, MicroSkillDto>()
        existingMicroSkills.forEach((s) => skillMap.set(s.code.toUpperCase(), s))

        for (const skill of validSkills) {
          const moduleOnly: string[] = []
          const certOnly: string[] = []

          if (skill.foundationMode === 'MODULE_ONLY') moduleOnly.push('FOUNDATION')
          if (skill.foundationMode === 'CERTIFICATE_ONLY') certOnly.push('FOUNDATION')

          if (skill.intermediateMode === 'MODULE_ONLY') moduleOnly.push('INTERMEDIATE')
          if (skill.intermediateMode === 'CERTIFICATE_ONLY') certOnly.push('INTERMEDIATE')

          if (skill.advancedMode === 'MODULE_ONLY') moduleOnly.push('ADVANCED')
          if (skill.advancedMode === 'CERTIFICATE_ONLY') certOnly.push('ADVANCED')

          const existing = skillMap.get(skill.code)
          if (existing) {
            const updated = await updateMicroSkill(orgId, existing.id, {
              name: skill.name,
              description: skill.description || existing.description,
              moduleOnlyKnowledgeLevels: moduleOnly,
              certificateOnlyKnowledgeLevels: certOnly,
            }).catch(() => null)
            if (updated) skillMap.set(skill.code, updated)
          } else {
            const created = await createMicroSkill(orgId, {
              code: skill.code,
              name: skill.name,
              description: skill.description || '',
              moduleOnlyKnowledgeLevels: moduleOnly,
              certificateOnlyKnowledgeLevels: certOnly,
            })
            skillMap.set(skill.code, created)
          }
        }

        // Process Competency-Skill Relations
        const validRels = relationRows.filter((r) => r.isValid)
        if (validRels.length > 0) {
          const compMap = new Map<string, CompetencyDto>()
          existingCompetencies.forEach((c) => { if (c.code) compMap.set(c.code.toUpperCase(), c) })

          const compToSkills = new Map<string, string[]>()
          for (const rel of validRels) {
            const targetSkill = skillMap.get(rel.microSkillCode)
            if (targetSkill) {
              const current = compToSkills.get(rel.competencyCode) || []
              if (!current.includes(targetSkill.id)) {
                current.push(targetSkill.id)
              }
              compToSkills.set(rel.competencyCode, current)
            }
          }

          for (const [cCode, skillIds] of compToSkills.entries()) {
            const comp = compMap.get(cCode)
            if (comp) {
              const merged = Array.from(new Set([...(comp.skillIds || []), ...skillIds]))
              await updateCompetency(orgId, comp.id, {
                name: comp.name,
                description: comp.description,
                skillIds: merged,
              }).catch(() => {})
            }
          }
        }

        // Process Prerequisites (Tab 3)
        const validPrereqs = prereqRows.filter((r) => r.isValid)
        let prereqSuccessCount = 0
        for (const prereq of validPrereqs) {
          const source = skillMap.get(prereq.dependentCode)
          const target = skillMap.get(prereq.prerequisiteCode)
          if (source && target) {
            try {
              await createPrerequisite(orgId, {
                sourceSkillId: source.id,
                targetSkillId: target.id,
                dependentKnowledgeLevel: prereq.dependentLevel,
                prerequisiteKnowledgeLevel: prereq.prerequisiteLevel,
              })
              prereqSuccessCount++
            } catch {
              // Ignore already existing or cyclic prerequisites
            }
          }
        }

        toast({
          title: 'Import Completed',
          description: `Successfully imported ${validSkills.length} micro-skills, ${validRels.length} competency mappings, and ${prereqSuccessCount} prerequisites.`,
          variant: 'success',
        })
      }

      await onImportSuccess()
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import failed'
      toast({
        title: 'Import Error',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setImporting(false)
    }
  }

  const hasData =
    mode === 'competency'
      ? competencyRows.length > 0
      : microSkillRows.length > 0

  const totalValid =
    mode === 'competency'
      ? competencyRows.filter((r) => r.isValid).length
      : microSkillRows.filter((r) => r.isValid).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-2xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
      <DialogHeader className="shrink-0 mb-3">
        <div className="flex items-center justify-between">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <span>
              {mode === 'competency'
                ? 'Import Competencies from Excel'
                : 'Import Micro-skills from Excel'}
            </span>
          </DialogTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            className="text-xs h-7 font-semibold"
            leftIcon={<Download className="h-3.5 w-3.5 text-primary" />}
          >
            Download Template (.xlsx)
          </Button>
        </div>
        <DialogDescription className="text-xs text-muted-foreground mt-1">
          {mode === 'competency'
            ? 'Upload an Excel workbook with a "Competencies" sheet and an optional "Competency_Skills" sheet for mapping micro-skills.'
            : 'Upload an Excel workbook with "Micro_Skills" (including knowledge level configs), optional "Competency_Skills", and optional "Prerequisites" sheets.'}
        </DialogDescription>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs min-h-0">
        {/* Upload Dropzone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 rounded-xl p-5 text-center cursor-pointer transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={handleFileChange}
          />
          <UploadCloud className="h-8 w-8 mx-auto text-primary mb-2 opacity-80" />
          <Text variant="body-sm" className="font-semibold text-foreground">
            {file ? file.name : 'Click to select or drag and drop Excel workbook'}
          </Text>
          <Text variant="caption" className="text-muted-foreground mt-1 block">
            Accepts .xlsx files with multiple sheets for entities and relationships
          </Text>
        </div>

        {parsing && (
          <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
            <span>Parsing workbook sheets...</span>
          </div>
        )}

        {/* Validation Summary Card */}
        {hasData && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                  {mode === 'competency' ? 'Competencies' : 'Micro-skills'}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-bold font-mono text-foreground">
                    {totalValid}
                  </span>
                  <Badge variant="outline" className="text-[10px] text-success border-success/30 bg-success/5 font-semibold">
                    Valid
                  </Badge>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                  Skill Mappings
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-bold font-mono text-foreground">
                    {relationRows.filter((r) => r.isValid).length}
                  </span>
                  <Badge variant="secondary" className="text-[10px] font-semibold">
                    Mapped
                  </Badge>
                </div>
              </div>

              {mode === 'micro-skill' && (
                <div className="p-3 rounded-lg border border-border bg-card space-y-1 col-span-2 sm:col-span-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                    Prerequisites
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-bold font-mono text-foreground">
                      {prereqRows.filter((r) => r.isValid).length}
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-semibold">
                      Graph Edges
                    </Badge>
                  </div>
                </div>
              )}
            </div>

            {/* Preview Sheet Details */}
            <div className="p-3 rounded-lg border border-border bg-card space-y-2">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                Sheet Content Preview
              </span>

              <div className="max-h-48 overflow-y-auto border border-border rounded-md">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-muted/40 text-muted-foreground font-semibold sticky top-0 border-b border-border">
                    <tr>
                      <th className="p-2">Code</th>
                      <th className="p-2">Name</th>
                      {mode === 'micro-skill' && (
                        <>
                          <th className="p-2 text-center">FND</th>
                          <th className="p-2 text-center">INT</th>
                          <th className="p-2 text-center">ADV</th>
                        </>
                      )}
                      <th className="p-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {mode === 'competency'
                      ? competencyRows.slice(0, 10).map((row, idx) => (
                          <tr key={idx} className="hover:bg-muted/20">
                            <td className="p-2 font-mono font-semibold text-foreground">{row.code || '—'}</td>
                            <td className="p-2 text-foreground truncate max-w-[220px]" title={row.name}>{row.name || '—'}</td>
                            <td className="p-2 text-right">
                              {row.isValid ? (
                                <span className="inline-flex items-center text-success gap-1 text-[10px] font-semibold">
                                  <CheckCircle2 className="h-3 w-3" /> Ready
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-destructive gap-1 text-[10px] font-semibold" title={row.errors.join(', ')}>
                                  <AlertTriangle className="h-3 w-3" /> Invalid
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      : microSkillRows.slice(0, 10).map((row, idx) => (
                          <tr key={idx} className="hover:bg-muted/20">
                            <td className="p-2 font-mono font-semibold text-foreground">{row.code || '—'}</td>
                            <td className="p-2 text-foreground truncate max-w-[180px]" title={row.name}>{row.name || '—'}</td>
                            <td className="p-2 text-center text-[10px] text-muted-foreground">{row.foundationMode || '—'}</td>
                            <td className="p-2 text-center text-[10px] text-muted-foreground">{row.intermediateMode || '—'}</td>
                            <td className="p-2 text-center text-[10px] text-muted-foreground">{row.advancedMode || '—'}</td>
                            <td className="p-2 text-right">
                              {row.isValid ? (
                                <span className="inline-flex items-center text-success gap-1 text-[10px] font-semibold">
                                  <CheckCircle2 className="h-3 w-3" /> Ready
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-destructive gap-1 text-[10px] font-semibold" title={row.errors.join(', ')}>
                                  <AlertTriangle className="h-3 w-3" /> Invalid
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
              <span className="text-[10px] text-muted-foreground block text-right">
                Showing top preview records. Full workbook will be imported upon confirmation.
              </span>
            </div>
          </div>
        )}
      </div>

      <DialogFooter className="shrink-0 mt-3 pt-3 border-t border-border flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={importing}
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={!hasData || totalValid === 0 || importing}
          isLoading={importing}
          onClick={handleConfirmImport}
          leftIcon={<FileCheck className="h-4 w-4" />}
        >
          Confirm &amp; Import
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
