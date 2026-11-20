import * as React from 'react'
import * as XLSX from 'xlsx'
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RotateCcw,
  FileCheck2,
} from 'lucide-react'
import { Button } from '../../../../shared/components/ui/Button'
import { Badge } from '../../../../shared/components/ui/Badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../../shared/components/ui/Card'
import { useToast } from '../../../../shared/hooks/useToast'
import type { TargetRoleModel, SkillTargetConfig } from '../../../manager/data/ldManagerMockData'
import type { CompetencyDto } from '../../../../shared/api/competencyApi'
import type { MicroSkillDto } from '../../../../shared/api/microSkillApi'

export interface RoleConfigExcelImportTabProps {
  role: TargetRoleModel
  roleLevels: string[]
  availableCompetencies: CompetencyDto[]
  availableMicroSkills: MicroSkillDto[]
  onApplyConfig: (
    levelCompetencies: Record<string, string[]>,
    competencyIds: string[],
    skillTargets: SkillTargetConfig[],
  ) => void
  onCancel: () => void
}

interface ParsedConfigRow {
  rowNum: number
  level: string
  competencyCode: string
  competencyName: string
  skillCode: string
  skillName: string
  knowledgeLevel: 'FOUNDATION' | 'INTERMEDIATE' | 'ADVANCED'
  isValid: boolean
  warning?: string
  resolvedCompId?: string
  resolvedSkillId?: string
}

export function RoleConfigExcelImportTab({
  role,
  roleLevels,
  availableCompetencies,
  availableMicroSkills,
  onApplyConfig,
  onCancel,
}: RoleConfigExcelImportTabProps) {
  const { toast } = useToast()
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const [isDragging, setIsDragging] = React.useState(false)
  const [selectedFileName, setSelectedFileName] = React.useState<string | null>(null)
  const [parsedRows, setParsedRows] = React.useState<ParsedConfigRow[]>([])
  const [isProcessing, setIsProcessing] = React.useState(false)

  // Download template with current role's metadata and sample data
  const handleDownloadTemplate = () => {
    try {
      const wb = XLSX.utils.book_new()

      const instructionsData = [
        ['Role Configuration Import Guide'],
        [''],
        ['Rule', 'Description'],
        ['1. Target Role', `This template is configured for ${role.title} (${role.code}).`],
        ['2. Levels', `Allowed levels: ${roleLevels.join(', ')}`],
        ['3. Required Knowledge Level', 'Allowed values: Foundation, Intermediate, Advanced (or F, I, A).'],
        ['4. Overwrite Policy', 'Importing this file will set the competency and micro-skill configuration for this draft.'],
      ]
      const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData)
      XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions')

      // Pre-fill sample rows using available competencies and skills
      const sampleRows: Array<Record<string, string>> = []
      const defaultLevels = roleLevels.length > 0 ? roleLevels : ['Junior', 'Middle', 'Senior']

      defaultLevels.forEach((lvl, idx) => {
        const comp = availableCompetencies[idx % availableCompetencies.length]
        const skill = availableMicroSkills[idx % availableMicroSkills.length]
        const kLevel = idx === 0 ? 'Foundation' : idx === 1 ? 'Intermediate' : 'Advanced'

        sampleRows.push({
          'Role Code': role.code || 'ROLE',
          'Role Level': lvl,
          'Competency Code': (comp && comp.code) ? comp.code : 'COMP-CORE',
          'Competency Name': (comp && comp.name) ? comp.name : 'Core Domain Competency',
          'Micro-skill Code': (skill && skill.code) ? skill.code : 'MS-SKILL-01',
          'Micro-skill Title': (skill && skill.name) ? skill.name : 'Core Micro-skill Target',
          'Required Knowledge Level': kLevel,
        })
      })

      const wsConfig = XLSX.utils.json_to_sheet(sampleRows)
      XLSX.utils.book_append_sheet(wb, wsConfig, 'Role Configuration')

      const filename = `${role.code || 'Role'}_Configuration_Template.xlsx`
      XLSX.writeFile(wb, filename)

      toast({
        title: 'Template Downloaded',
        description: `Exported ${filename} successfully. Fill in the sheet and upload below.`,
        variant: 'success',
      })
    } catch (err) {
      console.error('Failed to export role config template:', err)
      toast({
        title: 'Download Failed',
        description: 'Unable to generate template file. Please try again.',
        variant: 'destructive',
      })
    }
  }

  // Parse uploaded workbook
  const parseWorkbook = (file: File) => {
    setIsProcessing(true)
    setSelectedFileName(file.name)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })

        // Find sheet: 'Role Configuration' or fallback to the first sheet that isn't 'Instructions'
        let targetSheetName = wb.SheetNames.find(
          (name) => name.toLowerCase().includes('role') || name.toLowerCase().includes('config'),
        )
        if (!targetSheetName) {
          targetSheetName = wb.SheetNames.find((name) => name.toLowerCase() !== 'instructions') || wb.SheetNames[0]
        }

        const ws = wb.Sheets[targetSheetName]
        if (!ws) {
          throw new Error('Workbook contains no readable configuration sheets.')
        }

        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
        if (rawRows.length === 0) {
          throw new Error('The configuration sheet is empty.')
        }

        const parsed: ParsedConfigRow[] = []

        rawRows.forEach((row, idx) => {
          // Normalize header keys (case-insensitive trim)
          const normalizedRow: Record<string, string> = {}
          Object.keys(row).forEach((k) => {
            normalizedRow[k.trim().toLowerCase()] = String(row[k] ?? '').trim()
          })

          const getCol = (...candidates: string[]): string => {
            for (const c of candidates) {
              const val = normalizedRow[c.toLowerCase()]
              if (val !== undefined && val !== '') return val
            }
            return ''
          }

          const rawLevel = getCol('role level', 'level', 'level name', 'tier')
          const rawCompCode = getCol('competency code', 'comp code', 'competency', 'comp')
          const rawCompName = getCol('competency name', 'comp name', 'competency title')
          const rawSkillCode = getCol('micro-skill code', 'microskill code', 'skill code', 'micro-skill', 'skill')
          const rawSkillTitle = getCol('micro-skill title', 'microskill title', 'skill title', 'skill name', 'title')
          const rawKLevel = getCol('required knowledge level', 'knowledge level', 'level required', 'mastery')

          if (!rawLevel && !rawCompCode && !rawSkillCode) {
            return // Skip blank rows
          }

          // Match level against available role levels (case-insensitive)
          const matchedLevel =
            roleLevels.find((lvl) => lvl.toLowerCase() === rawLevel.toLowerCase()) ||
            roleLevels[0] ||
            rawLevel ||
            'Junior'

          // Resolve Competency
          const rawCompCodeClean = rawCompCode.trim().toLowerCase()
          const rawCompNameClean = rawCompName.trim().toLowerCase()
          const resolvedComp = availableCompetencies.find(
            (c) =>
              Boolean(c.code && c.code.trim().toLowerCase() === rawCompCodeClean) ||
              Boolean(c.id && c.id.trim().toLowerCase() === rawCompCodeClean) ||
              Boolean(rawCompNameClean && c.name && c.name.trim().toLowerCase() === rawCompNameClean),
          )

          // Resolve Micro-skill
          const rawSkillCodeClean = rawSkillCode.trim().toLowerCase()
          const rawSkillTitleClean = rawSkillTitle.trim().toLowerCase()
          const resolvedSkill = availableMicroSkills.find(
            (s) =>
              Boolean(s.code && s.code.trim().toLowerCase() === rawSkillCodeClean) ||
              Boolean(s.id && s.id.trim().toLowerCase() === rawSkillCodeClean) ||
              Boolean(rawSkillTitleClean && s.name && s.name.trim().toLowerCase() === rawSkillTitleClean),
          )

          // Parse Knowledge Level (Strictly UPPERCASE as required by domain knowledge schema)
          let kLevel: 'FOUNDATION' | 'INTERMEDIATE' | 'ADVANCED' = 'FOUNDATION'
          const kLower = rawKLevel.trim().toLowerCase()
          if (kLower.includes('adv') || kLower === 'a' || kLower === '3') {
            kLevel = 'ADVANCED'
          } else if (kLower.includes('int') || kLower.includes('mid') || kLower === 'i' || kLower === '2') {
            kLevel = 'INTERMEDIATE'
          } else {
            kLevel = 'FOUNDATION'
          }

          const warnings: string[] = []
          if (!resolvedComp && rawCompCode) {
            warnings.push(`Competency "${rawCompCode}" not found in ontology`)
          }
          if (!resolvedSkill && rawSkillCode) {
            warnings.push(`Skill "${rawSkillCode}" not found in ontology`)
          }

          parsed.push({
            rowNum: idx + 2,
            level: matchedLevel,
            competencyCode: (resolvedComp && resolvedComp.code) ? resolvedComp.code : rawCompCode || 'COMP-GENERIC',
            competencyName: (resolvedComp && resolvedComp.name) ? resolvedComp.name : rawCompName || rawCompCode || 'Generic Competency',
            skillCode: (resolvedSkill && resolvedSkill.code) ? resolvedSkill.code : rawSkillCode || `MS-ROW-${idx + 1}`,
            skillName: (resolvedSkill && resolvedSkill.name) ? resolvedSkill.name : rawSkillTitle || rawSkillCode || 'Configured Skill',
            knowledgeLevel: kLevel,
            isValid: Boolean(resolvedComp || rawCompCode) && Boolean(resolvedSkill || rawSkillCode),
            warning: warnings.length > 0 ? warnings.join(', ') : undefined,
            resolvedCompId: resolvedComp?.id,
            resolvedSkillId: resolvedSkill?.id,
          })
        })

        if (parsed.length === 0) {
          throw new Error('No valid skill target rows found in the sheet.')
        }

        setParsedRows(parsed)
        toast({
          title: 'Workbook Parsed',
          description: `Loaded ${parsed.length} row(s) from "${file.name}". Review the preview before applying.`,
          variant: 'success',
        })
      } catch (err: unknown) {
        console.error('Failed to parse role config excel:', err)
        const msg = err instanceof Error ? err.message : 'Invalid file format.'
        toast({
          title: 'Parse Failed',
          description: msg,
          variant: 'destructive',
        })
        setParsedRows([])
        setSelectedFileName(null)
      } finally {
        setIsProcessing(false)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) parseWorkbook(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) parseWorkbook(file)
  }

  // Apply parsed configuration to the active draft role
  const handleApply = () => {
    if (parsedRows.length === 0) return

    const newLevelCompetencies: Record<string, string[]> = {
      ...(role.levelCompetencies || {}),
    }

    const newSkillTargets: SkillTargetConfig[] = []
    const distinctCompIds = new Set<string>(role.competencyIds || [])

    parsedRows.forEach((row) => {
      const compKey = row.resolvedCompId || row.competencyCode
      const skillKey = row.resolvedSkillId || row.skillCode

      // Ensure level has competency
      if (!newLevelCompetencies[row.level]) {
        newLevelCompetencies[row.level] = []
      }
      if (!newLevelCompetencies[row.level].includes(compKey)) {
        newLevelCompetencies[row.level].push(compKey)
      }
      distinctCompIds.add(compKey)

      // Deduplicate skill per level
      const existingIdx = newSkillTargets.findIndex(
        (st) =>
          (st.skillId === skillKey || st.skillCode === row.skillCode) &&
          st.level?.toLowerCase() === row.level.toLowerCase(),
      )

      if (existingIdx >= 0) {
        // Update required knowledge levels
        newSkillTargets[existingIdx].requiredKnowledgeLevels = [row.knowledgeLevel]
      } else {
        newSkillTargets.push({
          skillId: skillKey,
          skillCode: row.skillCode,
          skillName: row.skillName,
          threshold: 0,
          requiredKnowledgeLevels: [row.knowledgeLevel],
          level: row.level,
        })
      }
    })

    onApplyConfig(newLevelCompetencies, Array.from(distinctCompIds), newSkillTargets)

    toast({
      title: 'Configuration Applied',
      description: `Imported ${newSkillTargets.length} micro-skill target(s) across ${Object.keys(newLevelCompetencies).length} level(s). Reviewing in Manual Configuration.`,
      variant: 'success',
    })
  }

  const validCount = parsedRows.filter((r) => r.isValid).length
  const warningCount = parsedRows.filter((r) => r.warning).length

  return (
    <div className="space-y-4 text-xs">
      {/* Template Download Card */}
      <Card className="border border-primary/20 bg-primary/5">
        <CardContent className="p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0 border border-primary/30">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-xs">
                Download Official Role Configuration Template
              </p>
              <p className="text-[11px] text-muted-foreground">
                Includes sample mappings for {role.title} ({role.code}) and formatting rules.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            leftIcon={<Download className="h-3.5 w-3.5 text-primary" />}
            className="border-primary/30 text-primary hover:bg-primary/10"
          >
            Download Excel Template
          </Button>
        </CardContent>
      </Card>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-primary bg-primary/10 shadow-xs'
            : 'border-border hover:border-primary/50 hover:bg-muted/30 bg-card'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <UploadCloud className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-xs">
              {selectedFileName ? selectedFileName : 'Click to select or drag and drop your Excel file here'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Supports Microsoft Excel (.xlsx, .xls) with columns for Level, Competency, and Micro-skill.
            </p>
          </div>
          {isProcessing && (
            <div className="flex items-center gap-1.5 text-xs text-primary font-medium mt-1">
              <Sparkles className="h-3.5 w-3.5 animate-spin" />
              <span>Processing spreadsheet...</span>
            </div>
          )}
        </div>
      </div>

      {/* Preview Section */}
      {parsedRows.length > 0 && (
        <Card className="border border-border">
          <CardHeader className="p-3 pb-2 border-b border-border">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-primary" />
                <CardTitle className="text-xs font-bold text-foreground">
                  Configuration Preview ({parsedRows.length} Rows)
                </CardTitle>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="success" className="text-[10px] px-2 py-0.5">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {validCount} Ready
                </Badge>
                {warningCount > 0 && (
                  <Badge variant="warning" className="text-[10px] px-2 py-0.5">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {warningCount} Warnings
                  </Badge>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setParsedRows([])
                    setSelectedFileName(null)
                  }}
                  leftIcon={<RotateCcw className="h-3 w-3" />}
                  className="text-muted-foreground h-6 px-2 text-[11px]"
                >
                  Clear
                </Button>
              </div>
            </div>
            <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
              Verify level and skill assignments before applying them to the active draft role.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0 max-h-64 overflow-y-auto [scrollbar-gutter:stable]">
            <table className="w-full text-[11px] text-left border-collapse">
              <thead className="bg-muted/50 border-b border-border sticky top-0 z-10 text-muted-foreground uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-2 px-3">Level</th>
                  <th className="py-2 px-3">Competency</th>
                  <th className="py-2 px-3">Micro-skill</th>
                  <th className="py-2 px-3">Mastery</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parsedRows.map((r, idx) => (
                  <tr key={idx} className="hover:bg-muted/20 transition-colors">
                    <td className="py-1.5 px-3 font-semibold text-foreground">
                      <Badge variant="outline" className="text-[10px]">
                        {r.level}
                      </Badge>
                    </td>
                    <td className="py-1.5 px-3">
                      <span className="font-medium text-foreground block">{r.competencyCode}</span>
                      <span className="text-[10px] text-muted-foreground line-clamp-1">{r.competencyName}</span>
                    </td>
                    <td className="py-1.5 px-3">
                      <span className="font-medium text-foreground block">{r.skillCode}</span>
                      <span className="text-[10px] text-muted-foreground line-clamp-1">{r.skillName}</span>
                    </td>
                    <td className="py-1.5 px-3">
                      <Badge
                        variant={
                          r.knowledgeLevel === 'ADVANCED'
                            ? 'primary'
                            : r.knowledgeLevel === 'INTERMEDIATE'
                              ? 'warning'
                              : 'secondary'
                        }
                        className="text-[10px] px-1.5 py-0.2"
                      >
                        {r.knowledgeLevel === 'ADVANCED'
                          ? 'Advanced'
                          : r.knowledgeLevel === 'INTERMEDIATE'
                            ? 'Intermediate'
                            : 'Foundation'}
                      </Badge>
                    </td>
                    <td className="py-1.5 px-3">
                      {r.warning ? (
                        <span className="text-[10px] text-amber-700 flex items-center gap-1" title={r.warning}>
                          <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600" />
                          <span className="line-clamp-1">{r.warning}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-700 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" />
                          <span>Ready</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
        >
          Back to Manual View
        </Button>

        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={parsedRows.length === 0}
          onClick={handleApply}
          leftIcon={<Sparkles className="h-4 w-4" />}
          className="shadow-xs font-semibold"
        >
          Apply to Role Draft ({parsedRows.length} Rows)
        </Button>
      </div>
    </div>
  )
}
