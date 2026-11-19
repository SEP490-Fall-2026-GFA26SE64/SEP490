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
  AlertCircle,
  FileCheck,
  RefreshCw,
  Layers,
  Trash2,
  X,
} from 'lucide-react'
import {
  createCompetency,
  updateCompetency,
  type CompetencyDto,
} from '../../../../shared/api/competencyApi'
import {
  createMicroSkill,
  type MicroSkillDto,
} from '../../../../shared/api/microSkillApi'
import {
  createPrerequisite,
  fetchPrerequisites,
  type PrerequisiteEdgeDto,
} from '../../../../shared/api/prerequisiteApi'
import { type PrerequisiteEdge } from '../../../manager/data/ldManagerMockData'
import { downloadOntologyTemplate } from './ontologyImportTemplate'

export interface OntologyExcelImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'competency' | 'micro-skill'
  organizationId: string
  existingCompetencies: CompetencyDto[]
  existingMicroSkills: MicroSkillDto[]
  existingPrerequisites?: PrerequisiteEdge[]
  onImportSuccess: () => Promise<void> | void
}

interface ParsedCompetencyRow {
  code: string
  name: string
  description: string
  isValid: boolean
  isConflicted: boolean
  conflictReason?: string
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
  isConflicted: boolean
  conflictReason?: string
  errors: string[]
}

interface ParsedCompetencyRelationRow {
  competencyCode: string
  microSkillCode: string
  isValid: boolean
  isConflicted: boolean
  conflictReason?: string
  errors: string[]
}

interface ParsedPrerequisiteRow {
  dependentCode: string
  prerequisiteCode: string
  isValid: boolean
  isConflicted: boolean
  conflictReason?: string
  errors: string[]
}

export function OntologyExcelImportModal({
  open,
  onOpenChange,
  mode,
  organizationId,
  existingCompetencies,
  existingMicroSkills,
  existingPrerequisites,
  onImportSuccess,
}: OntologyExcelImportModalProps) {
  const { toast } = useToast()
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const [file, setFile] = React.useState<File | null>(null)
  const [parsing, setParsing] = React.useState(false)
  const [importing, setImporting] = React.useState(false)
  const [activePreviewTab, setActivePreviewTab] = React.useState<'entities' | 'relations' | 'prerequisites'>('entities')

  // Parsed datasets
  const [competencyRows, setCompetencyRows] = React.useState<ParsedCompetencyRow[]>([])
  const [microSkillRows, setMicroSkillRows] = React.useState<ParsedMicroSkillRow[]>([])
  const [relationRows, setRelationRows] = React.useState<ParsedCompetencyRelationRow[]>([])
  const [prereqRows, setPrereqRows] = React.useState<ParsedPrerequisiteRow[]>([])

  const resetState = React.useCallback(() => {
    setFile(null)
    setParsing(false)
    setImporting(false)
    setActivePreviewTab('entities')
    setCompetencyRows([])
    setMicroSkillRows([])
    setRelationRows([])
    setPrereqRows([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  React.useEffect(() => {
    let active = true
    if (!open) {
      queueMicrotask(() => { if (active) resetState() })
    }
    return () => { active = false }
  }, [open, resetState])

  const handleDownloadTemplate = async () => {
    try {
      await downloadOntologyTemplate(mode)
    } catch {
      toast({ title: 'Template download failed', description: 'Please try again.', variant: 'destructive' })
    }
  }

  // Parse Excel File
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setParsing(true)

    try {
      // Fetch fresh live prerequisites if not supplied
      let livePrereqs: Array<{
        sourceSkillId: string
        sourceSkillCode?: string
        targetSkillId: string
        targetSkillCode?: string
        dependentKnowledgeLevel?: string | null
        prerequisiteKnowledgeLevel?: string | null
      }> = existingPrerequisites || []

      if (livePrereqs.length === 0 && organizationId) {
        try {
          const fetched: PrerequisiteEdgeDto[] = await fetchPrerequisites(organizationId)
          livePrereqs = fetched.map((p) => ({
            sourceSkillId: p.sourceSkillId,
            sourceSkillCode: p.sourceSkillCode,
            targetSkillId: p.targetSkillId,
            targetSkillCode: p.targetSkillCode,
            dependentKnowledgeLevel: p.dependentKnowledgeLevel,
            prerequisiteKnowledgeLevel: p.prerequisiteKnowledgeLevel,
          }))
        } catch {
          // Ignore network error during fallback
        }
      }

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

        const seenCompCodes = new Set<string>()
        const parsedComps: ParsedCompetencyRow[] = compRaw.map((row) => {
          const code = String(row['Code'] || row['code'] || row['Competency Code'] || '').trim().toUpperCase()
          const name = String(row['Name'] || row['name'] || row['Competency Name'] || '').trim()
          const description = String(row['Description'] || row['description'] || '').trim()

          const errors: string[] = []
          if (!code) errors.push('Code is required')
          if (!name) errors.push('Name is required')

          let isConflicted = false
          let conflictReason: string | undefined

          if (code) {
            const existsInOrg = existingCompetencies.some(
              (c) => (c.code || '').trim().toUpperCase() === code
            )
            if (existsInOrg) {
              isConflicted = true
              conflictReason = `Competency code "${code}" already exists in this organization`
            } else if (seenCompCodes.has(code)) {
              isConflicted = true
              conflictReason = `Duplicate competency code "${code}" in workbook`
            }
            seenCompCodes.add(code)
          }

          return {
            code,
            name,
            description,
            isValid: errors.length === 0,
            isConflicted,
            conflictReason,
            errors,
          }
        })
        setCompetencyRows(parsedComps)

        // Parse Relations sheet (optional)
        const relSheet = findSheet('Competency_Skills', 'CompetencySkills', 'Relations', 'Skills')
        if (relSheet) {
          const relRaw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(relSheet)
          const seenPairs = new Set<string>()

          const parsedRels: ParsedCompetencyRelationRow[] = relRaw.map((row) => {
            const competencyCode = String(row['Competency_Code'] || row['Competency Code'] || row['competency_code'] || '').trim().toUpperCase()
            const microSkillCode = String(row['Micro_Skill_Code'] || row['Micro Skill Code'] || row['micro_skill_code'] || row['Skill_Code'] || '').trim().toUpperCase()

            const errors: string[] = []
            if (!competencyCode) errors.push('Competency code required')
            if (!microSkillCode) errors.push('Micro-skill code required')

            let isConflicted = false
            let conflictReason: string | undefined

            if (competencyCode && microSkillCode) {
              const pairKey = `${competencyCode}::${microSkillCode}`
              const comp = existingCompetencies.find(
                (c) => (c.code || '').trim().toUpperCase() === competencyCode
              )
              const skill = existingMicroSkills.find(
                (s) => (s.code || '').trim().toUpperCase() === microSkillCode
              )

              const alreadyLinked = Boolean(
                comp && skill && comp.skillIds && comp.skillIds.includes(skill.id)
              )

              if (alreadyLinked) {
                isConflicted = true
                conflictReason = `Relationship already exists (competency "${competencyCode}" already contains skill "${microSkillCode}")`
              } else if (seenPairs.has(pairKey)) {
                isConflicted = true
                conflictReason = `Duplicate relationship "${competencyCode} -> ${microSkillCode}" in workbook`
              }
              seenPairs.add(pairKey)
            }

            return {
              competencyCode,
              microSkillCode,
              isValid: errors.length === 0,
              isConflicted,
              conflictReason,
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

        const seenSkillCodes = new Set<string>()
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

          let isConflicted = false
          let conflictReason: string | undefined

          if (code) {
            const existsInOrg = existingMicroSkills.some(
              (s) => (s.code || '').trim().toUpperCase() === code
            )
            if (existsInOrg) {
              isConflicted = true
              conflictReason = `Micro-skill code "${code}" already exists in this organization`
            } else if (seenSkillCodes.has(code)) {
              isConflicted = true
              conflictReason = `Duplicate micro-skill code "${code}" in workbook`
            }
            seenSkillCodes.add(code)
          }

          return {
            code,
            name,
            description,
            foundationMode,
            intermediateMode,
            advancedMode,
            isValid: errors.length === 0,
            isConflicted,
            conflictReason,
            errors,
          }
        })
        setMicroSkillRows(parsedSkills)

        // Tab 2: Competency Relations
        const relSheet = findSheet('Competency_Skills', 'CompetencySkills', 'Relations')
        if (relSheet) {
          const relRaw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(relSheet)
          const seenPairs = new Set<string>()

          const parsedRels: ParsedCompetencyRelationRow[] = relRaw.map((row) => {
            const competencyCode = String(row['Competency_Code'] || row['Competency Code'] || row['competency_code'] || '').trim().toUpperCase()
            const microSkillCode = String(row['Micro_Skill_Code'] || row['Micro Skill Code'] || row['micro_skill_code'] || row['Skill_Code'] || '').trim().toUpperCase()

            const errors: string[] = []
            if (!competencyCode) errors.push('Competency code required')
            if (!microSkillCode) errors.push('Micro-skill code required')

            let isConflicted = false
            let conflictReason: string | undefined

            if (competencyCode && microSkillCode) {
              const pairKey = `${competencyCode}::${microSkillCode}`
              const comp = existingCompetencies.find(
                (c) => (c.code || '').trim().toUpperCase() === competencyCode
              )
              const skill = existingMicroSkills.find(
                (s) => (s.code || '').trim().toUpperCase() === microSkillCode
              )

              const alreadyLinked = Boolean(
                comp && skill && comp.skillIds && comp.skillIds.includes(skill.id)
              )

              if (alreadyLinked) {
                isConflicted = true
                conflictReason = `Relationship already exists (competency "${competencyCode}" already contains skill "${microSkillCode}")`
              } else if (seenPairs.has(pairKey)) {
                isConflicted = true
                conflictReason = `Duplicate relationship "${competencyCode} -> ${microSkillCode}" in workbook`
              }
              seenPairs.add(pairKey)
            }

            return {
              competencyCode,
              microSkillCode,
              isValid: errors.length === 0,
              isConflicted,
              conflictReason,
              errors,
            }
          })
          setRelationRows(parsedRels)
        }

        // Tab 3: Prerequisites
        const prereqSheet = findSheet('Prerequisites', 'Prereqs', 'Dependencies')
        if (prereqSheet) {
          const prereqRaw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(prereqSheet)
          const seenPrereqs = new Set<string>()

          const parsedPrereqs: ParsedPrerequisiteRow[] = prereqRaw.map((row) => {
            const dependentCode = String(row['Dependent_Skill_Code'] || row['Dependent Skill Code'] || row['dependent_skill_code'] || row['Dependent'] || '').trim().toUpperCase()
            const prerequisiteCode = String(row['Prerequisite_Skill_Code'] || row['Prerequisite Skill Code'] || row['prerequisite_skill_code'] || row['Prerequisite'] || '').trim().toUpperCase()

            const errors: string[] = []
            if (!dependentCode) errors.push('Dependent skill code required')
            if (!prerequisiteCode) errors.push('Prerequisite skill code required')
            if (dependentCode && prerequisiteCode && dependentCode === prerequisiteCode) {
              errors.push('Self-loop prerequisite not allowed')
            }

            let isConflicted = false
            let conflictReason: string | undefined

            if (dependentCode && prerequisiteCode) {
              const prereqKey = `${dependentCode}->${prerequisiteCode}`

              const depSkill = existingMicroSkills.find(
                (s) => (s.code || '').trim().toUpperCase() === dependentCode
              )
              const prereqSkill = existingMicroSkills.find(
                (s) => (s.code || '').trim().toUpperCase() === prerequisiteCode
              )

              const alreadyInOrg = livePrereqs.some((p) => {
                const matchDep =
                  (depSkill && p.sourceSkillId === depSkill.id) ||
                  (p.sourceSkillCode && p.sourceSkillCode.toUpperCase() === dependentCode)
                const matchTarget =
                  (prereqSkill && p.targetSkillId === prereqSkill.id) ||
                  (p.targetSkillCode && p.targetSkillCode.toUpperCase() === prerequisiteCode)
                return Boolean(matchDep && matchTarget)
              })

              if (alreadyInOrg) {
                isConflicted = true
                conflictReason = `Prerequisite dependency "${dependentCode} -> ${prerequisiteCode}" already exists in organization graph`
              } else if (seenPrereqs.has(prereqKey)) {
                isConflicted = true
                conflictReason = `Duplicate prerequisite dependency in workbook`
              }
              seenPrereqs.add(prereqKey)
            }

            return {
              dependentCode,
              prerequisiteCode,
              isValid: errors.length === 0,
              isConflicted,
              conflictReason,
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

  // Remove All Conflicted action
  const handleRemoveAllConflicted = () => {
    const conflictedComps = competencyRows.filter((r) => r.isConflicted).length
    const conflictedSkills = microSkillRows.filter((r) => r.isConflicted).length
    const conflictedRels = relationRows.filter((r) => r.isConflicted).length
    const conflictedPrereqs = prereqRows.filter((r) => r.isConflicted).length
    const totalCount = conflictedComps + conflictedSkills + conflictedRels + conflictedPrereqs

    if (totalCount === 0) return

    setCompetencyRows((prev) => prev.filter((r) => !r.isConflicted))
    setMicroSkillRows((prev) => prev.filter((r) => !r.isConflicted))
    setRelationRows((prev) => prev.filter((r) => !r.isConflicted))
    setPrereqRows((prev) => prev.filter((r) => !r.isConflicted))

    toast({
      title: 'Conflicted records removed',
      description: `Removed ${totalCount} conflicted record${totalCount > 1 ? 's' : ''} from import list.`,
      variant: 'info',
    })
  }

  // Remove individual row
  const handleRemoveRow = (type: 'competency' | 'micro-skill' | 'relation' | 'prereq', index: number) => {
    if (type === 'competency') {
      setCompetencyRows((prev) => prev.filter((_, i) => i !== index))
    } else if (type === 'micro-skill') {
      setMicroSkillRows((prev) => prev.filter((_, i) => i !== index))
    } else if (type === 'relation') {
      setRelationRows((prev) => prev.filter((_, i) => i !== index))
    } else if (type === 'prereq') {
      setPrereqRows((prev) => prev.filter((_, i) => i !== index))
    }
  }

  // Execute Import (Non-destructive, strictly additive)
  const handleConfirmImport = async () => {
    setImporting(true)
    const orgId = organizationId

    try {
      if (mode === 'competency') {
        // Filter strictly valid and non-conflicted rows
        const toImportComps = competencyRows.filter((r) => r.isValid && !r.isConflicted)
        const toImportRels = relationRows.filter((r) => r.isValid && !r.isConflicted)

        const compMap = new Map<string, CompetencyDto>()
        existingCompetencies.forEach((c) => {
          if (c.code) compMap.set(c.code.toUpperCase(), c)
        })

        // Add newly defined competencies (never delete or overwrite existing ones)
        for (const comp of toImportComps) {
          const created = await createCompetency(orgId, {
            code: comp.code,
            name: comp.name,
            description: comp.description || '',
          })
          compMap.set(comp.code, created)
        }

        // Process Relations (additive only, appending to existing skillIds)
        if (toImportRels.length > 0) {
          const compToSkills = new Map<string, string[]>()
          const skillLookup = new Map<string, MicroSkillDto>()
          existingMicroSkills.forEach((s) => skillLookup.set(s.code.toUpperCase(), s))

          for (const rel of toImportRels) {
            const targetSkill = skillLookup.get(rel.microSkillCode)
            if (targetSkill) {
              const current = compToSkills.get(rel.competencyCode) || []
              if (!current.includes(targetSkill.id)) {
                current.push(targetSkill.id)
              }
              compToSkills.set(rel.competencyCode, current)
            }
          }

          // Update competencies with merged skills (strictly preserving existing relations)
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
          description: `Successfully added ${toImportComps.length} new competencies and ${toImportRels.length} skill mappings.`,
          variant: 'success',
        })
      } else {
        // Micro-skill mode
        const toImportSkills = microSkillRows.filter((r) => r.isValid && !r.isConflicted)
        const toImportRels = relationRows.filter((r) => r.isValid && !r.isConflicted)
        const toImportPrereqs = prereqRows.filter((r) => r.isValid && !r.isConflicted)

        const skillMap = new Map<string, MicroSkillDto>()
        existingMicroSkills.forEach((s) => skillMap.set(s.code.toUpperCase(), s))

        // Create new micro-skills
        for (const skill of toImportSkills) {
          const moduleOnly: string[] = []
          const certOnly: string[] = []

          if (skill.foundationMode === 'MODULE_ONLY') moduleOnly.push('FOUNDATION')
          if (skill.foundationMode === 'CERTIFICATE_ONLY') certOnly.push('FOUNDATION')

          if (skill.intermediateMode === 'MODULE_ONLY') moduleOnly.push('INTERMEDIATE')
          if (skill.intermediateMode === 'CERTIFICATE_ONLY') certOnly.push('INTERMEDIATE')

          if (skill.advancedMode === 'MODULE_ONLY') moduleOnly.push('ADVANCED')
          if (skill.advancedMode === 'CERTIFICATE_ONLY') certOnly.push('ADVANCED')

          const created = await createMicroSkill(orgId, {
            code: skill.code,
            name: skill.name,
            description: skill.description || '',
            moduleOnlyKnowledgeLevels: moduleOnly,
            certificateOnlyKnowledgeLevels: certOnly,
          })
          skillMap.set(skill.code, created)
        }

        // Process Competency-Skill Relations (strictly additive, preserving existing skills)
        if (toImportRels.length > 0) {
          const compMap = new Map<string, CompetencyDto>()
          existingCompetencies.forEach((c) => { if (c.code) compMap.set(c.code.toUpperCase(), c) })

          const compToSkills = new Map<string, string[]>()
          for (const rel of toImportRels) {
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

        // Process Prerequisites (strictly additive)
        let prereqSuccessCount = 0
        for (const prereq of toImportPrereqs) {
          const source = skillMap.get(prereq.dependentCode)
          const target = skillMap.get(prereq.prerequisiteCode)
          if (source && target) {
            try {
              await createPrerequisite(orgId, {
                sourceSkillId: source.id,
                targetSkillId: target.id,
              })
              prereqSuccessCount++
            } catch {
              // Ignore if edge already registered
            }
          }
        }

        toast({
          title: 'Import Completed',
          description: `Successfully added ${toImportSkills.length} new micro-skills, ${toImportRels.length} competency mappings, and ${prereqSuccessCount} prerequisites.`,
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
      ? competencyRows.length > 0 || relationRows.length > 0
      : microSkillRows.length > 0 || relationRows.length > 0 || prereqRows.length > 0

  // Conflict and Ready counts
  const compReady = competencyRows.filter((r) => r.isValid && !r.isConflicted).length
  const compConflicted = competencyRows.filter((r) => r.isConflicted).length
  const compInvalid = competencyRows.filter((r) => !r.isValid).length

  const skillReady = microSkillRows.filter((r) => r.isValid && !r.isConflicted).length
  const skillConflicted = microSkillRows.filter((r) => r.isConflicted).length
  const skillInvalid = microSkillRows.filter((r) => !r.isValid).length

  const relReady = relationRows.filter((r) => r.isValid && !r.isConflicted).length
  const relConflicted = relationRows.filter((r) => r.isConflicted).length
  const relInvalid = relationRows.filter((r) => !r.isValid).length

  const prereqReady = prereqRows.filter((r) => r.isValid && !r.isConflicted).length
  const prereqConflicted = prereqRows.filter((r) => r.isConflicted).length
  const prereqInvalid = prereqRows.filter((r) => !r.isValid).length

  const totalConflicted =
    (mode === 'competency' ? compConflicted : skillConflicted) +
    relConflicted +
    prereqConflicted

  const totalReadyToImport =
    (mode === 'competency' ? compReady : skillReady) +
    relReady +
    prereqReady

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="w-full max-w-5xl max-h-[90vh] flex flex-col p-6 sm:p-7 overflow-hidden">
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
            <span>Parsing workbook sheets and checking graph conflicts...</span>
          </div>
        )}

        {/* Validation & Conflict Summary Cards */}
        {hasData && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="p-3 rounded-lg border border-border bg-card space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                  {mode === 'competency' ? 'Competencies' : 'Micro-skills'}
                </span>
                <div className="flex items-center flex-wrap gap-1.5">
                  <span className="text-base font-bold font-mono text-foreground">
                    {mode === 'competency'
                      ? (compConflicted > 0 && compReady === 0 ? compConflicted : compReady)
                      : (skillConflicted > 0 && skillReady === 0 ? skillConflicted : skillReady)}
                  </span>
                  {(mode === 'competency' ? compConflicted : skillConflicted) === 0 ? (
                    <Badge variant="outline" className="text-[10px] text-success border-success/30 bg-success/5 font-semibold">
                      Valid
                    </Badge>
                  ) : (
                    <>
                      <Badge variant="warning" className="text-[10px] font-semibold">
                        {mode === 'competency' ? compConflicted : skillConflicted} Conflicted
                      </Badge>
                      {(mode === 'competency' ? compReady : skillReady) > 0 && (
                        <Badge variant="outline" className="text-[10px] text-success border-success/30 bg-success/5 font-semibold">
                          {mode === 'competency' ? compReady : skillReady} Valid
                        </Badge>
                      )}
                    </>
                  )}
                  {(mode === 'competency' ? compInvalid : skillInvalid) > 0 && (
                    <Badge variant="destructive" className="text-[10px] font-semibold">
                      {mode === 'competency' ? compInvalid : skillInvalid} Invalid
                    </Badge>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border bg-card space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                  Skill Mappings
                </span>
                <div className="flex items-center flex-wrap gap-1.5">
                  <span className="text-base font-bold font-mono text-foreground">
                    {relConflicted > 0 && relReady === 0 ? relConflicted : relReady}
                  </span>
                  {relConflicted === 0 ? (
                    <Badge variant="secondary" className="text-[10px] font-semibold">
                      Mapped
                    </Badge>
                  ) : (
                    <>
                      <Badge variant="warning" className="text-[10px] font-semibold">
                        {relConflicted} Conflicted
                      </Badge>
                      {relReady > 0 && (
                        <Badge variant="secondary" className="text-[10px] font-semibold">
                          {relReady} Mapped
                        </Badge>
                      )}
                    </>
                  )}
                  {relInvalid > 0 && (
                    <Badge variant="destructive" className="text-[10px] font-semibold">
                      {relInvalid} Invalid
                    </Badge>
                  )}
                </div>
              </div>

              {mode === 'micro-skill' && (
                <div className="p-3 rounded-lg border border-border bg-card space-y-1.5 col-span-2 sm:col-span-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                    Prerequisites
                  </span>
                  <div className="flex items-center flex-wrap gap-1.5">
                    <span className="text-base font-bold font-mono text-foreground">
                      {prereqConflicted > 0 && prereqReady === 0 ? prereqConflicted : prereqReady}
                    </span>
                    {prereqConflicted === 0 ? (
                      <Badge variant="secondary" className="text-[10px] font-semibold">
                        Graph Edges
                      </Badge>
                    ) : (
                      <>
                        <Badge variant="warning" className="text-[10px] font-semibold">
                          {prereqConflicted} Conflicted
                        </Badge>
                        {prereqReady > 0 && (
                          <Badge variant="secondary" className="text-[10px] font-semibold">
                            {prereqReady} Graph Edges
                          </Badge>
                        )}
                      </>
                    )}
                    {prereqInvalid > 0 && (
                      <Badge variant="destructive" className="text-[10px] font-semibold">
                        {prereqInvalid} Invalid
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Preview Sheet Details with Tabs & "Remove Conflicted" Button */}
            <div className="p-4 rounded-lg border border-border bg-card space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-border">
                {/* Sheet Tabs */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActivePreviewTab('entities')}
                    className={`px-3 py-1.5 rounded-md font-semibold text-xs transition-colors flex items-center gap-1.5 ${
                      activePreviewTab === 'entities'
                        ? 'bg-primary text-primary-foreground shadow-2xs'
                        : 'text-muted-foreground hover:bg-muted/60'
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>{mode === 'competency' ? 'Competencies' : 'Micro-skills'}</span>
                    <span className="text-[10px] opacity-80">
                      ({mode === 'competency' ? competencyRows.length : microSkillRows.length})
                    </span>
                  </button>

                  {relationRows.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActivePreviewTab('relations')}
                      className={`px-3 py-1.5 rounded-md font-semibold text-xs transition-colors flex items-center gap-1.5 ${
                        activePreviewTab === 'relations'
                          ? 'bg-primary text-primary-foreground shadow-2xs'
                          : 'text-muted-foreground hover:bg-muted/60'
                      }`}
                    >
                      <span>Skill Mappings</span>
                      <span className="text-[10px] opacity-80">({relationRows.length})</span>
                    </button>
                  )}

                  {mode === 'micro-skill' && prereqRows.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActivePreviewTab('prerequisites')}
                      className={`px-3 py-1.5 rounded-md font-semibold text-xs transition-colors flex items-center gap-1.5 ${
                        activePreviewTab === 'prerequisites'
                          ? 'bg-primary text-primary-foreground shadow-2xs'
                          : 'text-muted-foreground hover:bg-muted/60'
                      }`}
                    >
                      <span>Prerequisites</span>
                      <span className="text-[10px] opacity-80">({prereqRows.length})</span>
                    </button>
                  )}
                </div>

                {/* "Remove Conflicted" Button */}
                {totalConflicted > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveAllConflicted}
                    className="text-xs h-7.5 font-semibold border-warning/50 bg-warning/15 hover:bg-warning/25 text-foreground shadow-2xs"
                    leftIcon={<Trash2 className="h-3.5 w-3.5 text-warning" />}
                  >
                    Remove Conflicted ({totalConflicted})
                  </Button>
                )}
              </div>

              {/* Table View */}
              <div className="max-h-72 sm:max-h-80 overflow-y-auto border border-border rounded-lg shadow-2xs">
                {activePreviewTab === 'entities' && (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                      <tr>
                        <th className="py-2.5 px-3 w-40">Code</th>
                        <th className="py-2.5 px-3 min-w-[200px]">Name</th>
                        {mode === 'micro-skill' && (
                          <>
                            <th className="py-2.5 px-3 text-center w-28">FND</th>
                            <th className="py-2.5 px-3 text-center w-28">INT</th>
                            <th className="py-2.5 px-3 text-center w-28">ADV</th>
                          </>
                        )}
                        <th className="py-2.5 px-3 text-center w-28">Status</th>
                        <th className="py-2.5 px-3 text-right w-12">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {mode === 'competency'
                        ? competencyRows.map((row, idx) => (
                            <tr key={idx} className={`hover:bg-muted/20 ${row.isConflicted ? 'bg-warning/5' : ''}`}>
                              <td className="py-2 px-3 font-mono font-semibold text-foreground whitespace-nowrap">{row.code || '—'}</td>
                              <td className="py-2 px-3 text-foreground" title={row.name}>{row.name || '—'}</td>
                              <td className="py-2 px-3 text-center whitespace-nowrap">
                                {row.isConflicted ? (
                                  <span
                                    className="inline-flex items-center text-warning gap-1 text-[11px] font-semibold cursor-help"
                                    title={row.conflictReason}
                                  >
                                    <AlertTriangle className="h-3.5 w-3.5 text-warning" /> Conflicted
                                  </span>
                                ) : row.isValid ? (
                                  <span className="inline-flex items-center text-success gap-1 text-[11px] font-semibold">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                                  </span>
                                ) : (
                                  <span
                                    className="inline-flex items-center text-destructive gap-1 text-[11px] font-semibold cursor-help"
                                    title={row.errors.join(', ')}
                                  >
                                    <AlertCircle className="h-3.5 w-3.5" /> Invalid
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRow('competency', idx)}
                                  className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                                  title="Remove row from import preview"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        : microSkillRows.map((row, idx) => (
                            <tr key={idx} className={`hover:bg-muted/20 ${row.isConflicted ? 'bg-warning/5' : ''}`}>
                              <td className="py-2 px-3 font-mono font-semibold text-foreground whitespace-nowrap">{row.code || '—'}</td>
                              <td className="py-2 px-3 text-foreground" title={row.name}>{row.name || '—'}</td>
                              <td className="py-2 px-3 text-center text-xs text-muted-foreground whitespace-nowrap">{row.foundationMode || '—'}</td>
                              <td className="py-2 px-3 text-center text-xs text-muted-foreground whitespace-nowrap">{row.intermediateMode || '—'}</td>
                              <td className="py-2 px-3 text-center text-xs text-muted-foreground whitespace-nowrap">{row.advancedMode || '—'}</td>
                              <td className="py-2 px-3 text-center whitespace-nowrap">
                                {row.isConflicted ? (
                                  <span
                                    className="inline-flex items-center text-warning gap-1 text-[11px] font-semibold cursor-help"
                                    title={row.conflictReason}
                                  >
                                    <AlertTriangle className="h-3.5 w-3.5 text-warning" /> Conflicted
                                  </span>
                                ) : row.isValid ? (
                                  <span className="inline-flex items-center text-success gap-1 text-[11px] font-semibold">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                                  </span>
                                ) : (
                                  <span
                                    className="inline-flex items-center text-destructive gap-1 text-[11px] font-semibold cursor-help"
                                    title={row.errors.join(', ')}
                                  >
                                    <AlertCircle className="h-3.5 w-3.5" /> Invalid
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRow('micro-skill', idx)}
                                  className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                                  title="Remove row from import preview"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                    </tbody>
                  </table>
                )}

                {activePreviewTab === 'relations' && (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                      <tr>
                        <th className="py-2.5 px-3 w-48">Competency Code</th>
                        <th className="py-2.5 px-3 min-w-[200px]">Micro-Skill Code</th>
                        <th className="py-2.5 px-3 text-center w-28">Status</th>
                        <th className="py-2.5 px-3 text-right w-12">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {relationRows.map((row, idx) => (
                        <tr key={idx} className={`hover:bg-muted/20 ${row.isConflicted ? 'bg-warning/5' : ''}`}>
                          <td className="py-2 px-3 font-mono font-semibold text-foreground whitespace-nowrap">{row.competencyCode || '—'}</td>
                          <td className="py-2 px-3 font-mono text-foreground whitespace-nowrap">{row.microSkillCode || '—'}</td>
                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            {row.isConflicted ? (
                              <span
                                className="inline-flex items-center text-warning gap-1 text-[11px] font-semibold cursor-help"
                                title={row.conflictReason}
                              >
                                <AlertTriangle className="h-3.5 w-3.5 text-warning" /> Conflicted
                              </span>
                            ) : row.isValid ? (
                              <span className="inline-flex items-center text-success gap-1 text-[11px] font-semibold">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center text-destructive gap-1 text-[11px] font-semibold cursor-help"
                                title={row.errors.join(', ')}
                              >
                                <AlertCircle className="h-3.5 w-3.5" /> Invalid
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow('relation', idx)}
                              className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                              title="Remove relationship from import preview"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activePreviewTab === 'prerequisites' && (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                      <tr>
                        <th className="py-2.5 px-3 min-w-[180px]">Dependent Micro-skill</th>
                        <th className="py-2.5 px-3 min-w-[180px]">Prerequisite Micro-skill</th>
                        <th className="py-2.5 px-3 text-center w-28">Status</th>
                        <th className="py-2.5 px-3 text-right w-12">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {prereqRows.map((row, idx) => (
                        <tr key={idx} className={`hover:bg-muted/20 ${row.isConflicted ? 'bg-warning/5' : ''}`}>
                          <td className="py-2 px-3 text-foreground whitespace-nowrap">
                            <span className="font-mono font-semibold">{row.dependentCode}</span>
                          </td>
                          <td className="py-2 px-3 text-foreground whitespace-nowrap">
                            <span className="font-mono font-semibold">{row.prerequisiteCode}</span>
                          </td>
                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            {row.isConflicted ? (
                              <span
                                className="inline-flex items-center text-warning gap-1 text-[11px] font-semibold cursor-help"
                                title={row.conflictReason}
                              >
                                <AlertTriangle className="h-3.5 w-3.5 text-warning" /> Conflicted
                              </span>
                            ) : row.isValid ? (
                              <span className="inline-flex items-center text-success gap-1 text-[11px] font-semibold">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center text-destructive gap-1 text-[11px] font-semibold cursor-help"
                                title={row.errors.join(', ')}
                              >
                                <AlertCircle className="h-3.5 w-3.5" /> Invalid
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow('prereq', idx)}
                              className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                              title="Remove prerequisite from import preview"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <span className="text-[10.5px] text-muted-foreground block text-right">
                Import is strictly additive: existing nodes and relationships will not be removed or overwritten.
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
          disabled={!hasData || totalReadyToImport === 0 || importing}
          isLoading={importing}
          onClick={handleConfirmImport}
          leftIcon={<FileCheck className="h-4 w-4" />}
        >
          Confirm &amp; Import ({totalReadyToImport})
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
