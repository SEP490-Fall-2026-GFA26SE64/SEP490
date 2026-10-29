import {

  AlertCircle,

  AlertTriangle,

  Briefcase,

  Check,

  CheckCircle2,

  ChevronDown,

  ChevronRight,

  Clock,

  CornerDownRight,

  Diff,

  Eye,

  Edit3,

  History,

  Layers,

  Lock,

  Network as NetworkIcon,

  Plus,

  Search,

  Send,

  Sliders,

  Trash2,

  X,

  XCircle,

} from 'lucide-react'

import * as React from 'react'

import { Badge } from '../../../shared/components/ui/Badge'

import { Button } from '../../../shared/components/ui/Button'

import { PageHeader } from '../../../shared/components/ui/PageHeader'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'

import { Pagination } from '../../../shared/components/ui/Pagination'

import {

  Dialog,

  DialogDescription,

  DialogFooter,

  DialogHeader,

  DialogTitle,

} from '../../../shared/components/ui/Dialog'

import { StatCard } from '../../../shared/components/ui/StatCard'

import { useToast } from '../../../shared/hooks/useToast'

import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'

import { getActiveCompany, updateActiveCompany } from '../../../shared/stores/companyStore'

import {

  ELIGIBLE_EXPERTS,

  JOB_DOMAINS,

  resolveOccupationForRole,

  compareRoleVersions,

  formatDate,

  sortTargetRolesWithDraftsBelowPublished,

  type MicroSkillModel,

  type SkillTargetConfig,

  type TargetRoleModel,

} from '../../manager/data/ldManagerMockData'

import { Combobox, type ComboboxOption } from '../../../shared/components/ui/Combobox'

import { fetchMicroSkills } from '../../../shared/api/microSkillApi'

import { fetchCompetencies, type CompetencyDto } from '../../../shared/api/competencyApi'

import { fetchPrerequisites, type PrerequisiteEdgeDto } from '../../../shared/api/prerequisiteApi'

import { TargetRoleGraphModal } from '../../manager/target-roles/components/TargetRoleGraphModal'

import { TargetRoleVersionDiff } from '../../manager/target-roles/components/TargetRoleVersionDiff'



export type ExpertRoleStatus = 'published' | 'submitted' | 'sent' | 'approved' | 'draft' | 'feedback' | 'rejected'



export const getExpertEffectiveStatus = (role: TargetRoleModel): ExpertRoleStatus => {

  if (role.status === 'published') return 'published'

  if (role.status === 'submitted') return 'submitted'

  // When L&D manager sends to expert, expert sees status draft (not dispatched)

  if (role.status === 'sent') return 'draft'

  if (role.status === 'rejected') {

    return 'rejected'

  }

  return 'draft'

}



export function ExpertAssignedRolesPage() {

  const { toast } = useToast()



  // Company state

  const activeCompany = getActiveCompany()

  const orgId = activeCompany?.id || 'comp-technova'

  const [realMicroSkills, setRealMicroSkills] = React.useState<MicroSkillModel[]>([])

  const [realCompetencies, setRealCompetencies] = React.useState<CompetencyDto[]>([])

  const [realPrerequisites, setRealPrerequisites] = React.useState<PrerequisiteEdgeDto[]>([])



  const fetchSkills = React.useCallback(async () => {

    try {

      const [skillsList, compsList, prereqsList] = await Promise.all([

        fetchMicroSkills(orgId).catch(() => []),

        fetchCompetencies(orgId).catch(() => []),

        fetchPrerequisites(orgId).catch(() => []),

      ])

      if (prereqsList) setRealPrerequisites(prereqsList)



      if (skillsList && skillsList.length > 0) {

        const mapped: MicroSkillModel[] = skillsList.map((s): MicroSkillModel => ({

          id: s.id,

          code: s.code,

          name: s.name,

          description: s.description || '',

          status: (s.status as MicroSkillModel['status']) || 'ACTIVE',

          macroCompetencyCode: s.macroCompetencyCode || 'KNOWLEDGE',

          createdAt: s.createdAt,

          updatedAt: s.updatedAt,

        }))

        setRealMicroSkills(mapped)

      }



      if (compsList && compsList.length > 0) {

        setRealCompetencies(compsList)

      }

    } catch {

      // API error: realMicroSkills remains empty

    }

  }, [orgId])



  React.useEffect(() => {

    fetchSkills()

  }, [fetchSkills])



  // Strictly 100% real data fetched from Neo4j database via /api/v1/organizations/{orgId}/micro-skills

  const companyMicroSkills = realMicroSkills



  // Active Expert identity

  const [selectedExpertId, setSelectedExpertId] = React.useState<string>(() => {

    return localStorage.getItem('expert_active_id') || ELIGIBLE_EXPERTS[0].id

  })



  const [roles, setRoles] = React.useState<TargetRoleModel[]>([])

  const [isLoading, setIsLoading] = React.useState(true)



  const activeExpert = ELIGIBLE_EXPERTS.find((e) => e.id === selectedExpertId) || ELIGIBLE_EXPERTS[0]



  const fetchAssignedRoles = React.useCallback(async () => {

    try {

      const currentCompany = getActiveCompany()

      const res = await fetch(

        `/api/v1/organizations/${orgId}/target-roles?assignedExpertId=${encodeURIComponent(selectedExpertId)}`,

        {

          headers: {

            'X-User-Role': 'DOMAIN_EXPERT',

            'X-User-Id': selectedExpertId,

          },

        }

      )

      if (res.ok) {

        const data = await res.json()

        const mapped: TargetRoleModel[] = (data as Record<string, unknown>[]).map((r) => {

          const storeRole = (currentCompany?.targetRoles || []).find((tr) => tr.id === String(r.id || '') || (tr.code === String(r.code || '') && tr.version === String(r.version || '1.0')))

          const effectiveLevelComps = (r.levelCompetencies as Record<string, string[]>) || storeRole?.levelCompetencies || {}

          const rawCompetencyIds = Array.isArray(r.competencyIds) && (r.competencyIds as string[]).length > 0

            ? (r.competencyIds as string[])

            : (storeRole?.competencyIds && storeRole.competencyIds.length > 0

                ? storeRole.competencyIds

                : Array.from(new Set(Object.values(effectiveLevelComps).flat())))

          return {

            id: String(r.id || ''),

            stableId: String(r.code || ''),

            code: String(r.code || ''),

            title: String(r.name || ''),

            domainCode: String(r.domainCode || ''),

            familyCode: String(r.familyCode || ''),

            track: r.track as TargetRoleModel['track'],

            seniority: String(r.seniority || (r.track === 'MANAGEMENT' ? 'M3' : 'P3')),

            assignedExpertId: r.assignedExpertId ? String(r.assignedExpertId) : undefined,

            assignedExpertName: ELIGIBLE_EXPERTS.find((e) => e.id === r.assignedExpertId)?.name || String(r.assignedExpertId || ''),

            department: JOB_DOMAINS.find((d) => d.code === r.domainCode)?.name || String(r.domainCode || 'Information Technology'),

            description: String(r.description || ''),

            responsibilities: Array.isArray(r.responsibilities) ? (r.responsibilities as string[]) : [],

            version: String(r.version || '1.0'),

            status: (String(r.status || '').toLowerCase() === 'active' ? 'published' : String(r.status || 'draft').toLowerCase()) as TargetRoleModel['status'],

            rejectionReason: String(r.rejectionReason || ''),

            levelCompetencies: effectiveLevelComps,

            competencyIds: rawCompetencyIds,

            skillTargets: Array.isArray(r.skillTargets) ? (r.skillTargets as TargetRoleModel['skillTargets']) : [],

            levels: Array.isArray(r.levels) && (r.levels as string[]).length > 0

              ? (r.levels as string[])

              : (storeRole?.levels || ['Junior', 'Middle', 'Senior']),

            activeEnrollments: 0,

            createdAt: r.createdAt ? String(r.createdAt) : (r.updatedAt ? String(r.updatedAt) : '2026-01-01T00:00:00Z'),

            updatedAt: r.updatedAt ? String(r.updatedAt) : (r.createdAt ? String(r.createdAt) : '2026-01-01T00:00:00Z'),

          }

        })

        setRoles((prevRoles) => {

          return mapped.map((m) => {

            const prev = prevRoles.find((p) => p.id === m.id || (p.code === m.code && p.version === m.version))

            const storeRole = (currentCompany?.targetRoles || []).find((tr) => tr.id === m.id || (tr.code === m.code && tr.version === m.version))

            const prevLevelComps = (m.levelCompetencies && Object.keys(m.levelCompetencies).length > 0)

              ? m.levelCompetencies

              : (prev?.levelCompetencies && Object.keys(prev.levelCompetencies).length > 0)

              ? prev.levelCompetencies

              : storeRole?.levelCompetencies || {}

            const prevCompetencyIds = (m.competencyIds && m.competencyIds.length > 0)

              ? m.competencyIds

              : (prev?.competencyIds && prev.competencyIds.length > 0)

              ? prev.competencyIds

              : (storeRole?.competencyIds && storeRole.competencyIds.length > 0

                  ? storeRole.competencyIds

                  : Array.from(new Set(Object.values(prevLevelComps).flat())))

            const effectiveSkills = (m.skillTargets && m.skillTargets.length > 0)

              ? m.skillTargets

              : (prev?.skillTargets && prev.skillTargets.length > 0)

              ? prev.skillTargets

              : storeRole?.skillTargets || []

            const effectiveLevels = (m.levels && m.levels.length > 0)

              ? m.levels

              : (prev?.levels && prev.levels.length > 0)

              ? prev.levels

              : storeRole?.levels || ['Junior', 'Middle', 'Senior']

            return {

              ...m,

              levels: effectiveLevels,

              skillTargets: effectiveSkills,

              levelCompetencies: prevLevelComps,

              competencyIds: prevCompetencyIds,

            }

          })

        })

      } else {

        const fallbackRoles = currentCompany?.targetRoles || []

        setRoles(fallbackRoles)

      }

    } catch {

      const fallbackRoles = getActiveCompany()?.targetRoles || []

      setRoles(fallbackRoles)

    } finally {

      setIsLoading(false)

    }

  }, [orgId, selectedExpertId])



  React.useEffect(() => {

    fetchAssignedRoles()

  }, [fetchAssignedRoles])



  // Synchronize state when active company scope changes

  React.useEffect(() => {

    const handleSync = () => {

      fetchAssignedRoles()

    }

    window.addEventListener('active_company_changed', handleSync)

    return () => {

      window.removeEventListener('active_company_changed', handleSync)

    }

  }, [fetchAssignedRoles])



  // Save roles update helper

  const saveAndSetRoles = React.useCallback(

    (updater: TargetRoleModel[] | ((prev: TargetRoleModel[]) => TargetRoleModel[])) => {

      setRoles((prev) => {

        const next = typeof updater === 'function' ? updater(prev) : updater

        updateActiveCompany((c) => ({

          ...c,

          targetRoles: next,

        }))

        return next

      })

    },

    []

  )



  // Filters & Search

  const [searchQuery, setSearchQuery] = React.useState('')

  const [statusFilter, setStatusFilter] = React.useState<

    'all' | 'published' | 'approved' | 'draft' | 'feedback' | 'rejected'

  >('all')

  const [expandedLineages, setExpandedLineages] = React.useState<Record<string, boolean>>({})



  const toggleLineage = (lineageKey: string) => {

    setExpandedLineages((prev) => ({

      ...prev,

      [lineageKey]: !prev[lineageKey],

    }))

  }



  // Sort criteria: defaults to 'latest' so newly created or updated roles go to the top

  const [sortBy, setSortBy] = React.useState<'latest' | 'title'>('latest')



  // Filter roles: STRICT ISOLATION by assignedExpertId, sorted with drafts below published

  const assignedRoles = React.useMemo(() => {

    const expertRoles = roles.filter((r) => r.assignedExpertId === selectedExpertId)

    return sortTargetRolesWithDraftsBelowPublished(expertRoles, sortBy)

  }, [roles, selectedExpertId, sortBy])



  const filteredRoles = React.useMemo(() => {

    const sorted = sortTargetRolesWithDraftsBelowPublished(assignedRoles, sortBy)

    const q = searchQuery.toLowerCase().trim()



    return sorted.filter((role) => {

      const effStatus = getExpertEffectiveStatus(role)

      const occ = resolveOccupationForRole(role)



      const matchesSearch =

        !q ||

        role.title.toLowerCase().includes(q) ||

        role.code.toLowerCase().includes(q) ||

        (role.department && role.department.toLowerCase().includes(q)) ||

        (role.domainCode && role.domainCode.toLowerCase().includes(q)) ||

        (role.familyCode && role.familyCode.toLowerCase().includes(q)) ||

        (role.description && role.description.toLowerCase().includes(q)) ||

        (role.seniority && role.seniority.toLowerCase().includes(q)) ||

        (role.track && role.track.toLowerCase().includes(q)) ||

        (occ && (occ.name.toLowerCase().includes(q) || occ.code.toLowerCase().includes(q))) ||

        role.skillTargets.some((st) => st.skillName.toLowerCase().includes(q) || st.skillCode.toLowerCase().includes(q))



      const matchesStatus =

        statusFilter === 'all' ||

        effStatus === statusFilter



      return matchesSearch && matchesStatus

    })

  }, [assignedRoles, searchQuery, statusFilter, sortBy])



  // Pagination states

  const [currentPage, setCurrentPage] = React.useState(1)

  const pageSize = 10



  // Reset page when filter/search/expert/sort changes

  React.useEffect(() => {

    setCurrentPage(1)

  }, [searchQuery, statusFilter, selectedExpertId, sortBy])



  // Visible roles considering collapsed/expanded lineages

  const visibleRoles = React.useMemo(() => {

    return filteredRoles.filter((role) => {

      const isPublished = role.status === 'published'

      const roleLineageKey = (role.stableId && role.stableId.trim()) || role.code.trim() || role.id



      const publishedInLineage = assignedRoles

        .filter((r) => {

          if (r.status !== 'published') return false

          const rLineageKey = (r.stableId && r.stableId.trim()) || r.code.trim() || r.id

          return rLineageKey === roleLineageKey

        })

        .sort((a, b) => compareRoleVersions(b.version, a.version))



      const newestPublished = publishedInLineage[0]

      const isOlderPublished = isPublished && newestPublished && role.id !== newestPublished.id

      const isLineageExpanded = Boolean(expandedLineages[roleLineageKey])



      return !(isOlderPublished && !isLineageExpanded)

    })

  }, [filteredRoles, assignedRoles, expandedLineages])



  const totalPages = Math.max(1, Math.ceil(visibleRoles.length / pageSize))

  const paginatedRoles = React.useMemo(() => {

    const start = (currentPage - 1) * pageSize

    return visibleRoles.slice(start, start + pageSize)

  }, [visibleRoles, currentPage, pageSize])



  // Aggregate Metrics: Expert views published, approved, draft, feedback, and rejected roles

  const publishedCount = assignedRoles.filter((r) => getExpertEffectiveStatus(r) === 'published').length

  const approvedCount = assignedRoles.filter((r) => getExpertEffectiveStatus(r) === 'approved').length

  const draftCount = assignedRoles.filter((r) => getExpertEffectiveStatus(r) === 'draft').length

  const rejectedCount = assignedRoles.filter((r) => getExpertEffectiveStatus(r) === 'rejected').length

  const totalSkillTargets = assignedRoles.reduce((sum, r) => sum + r.skillTargets.length, 0)



  // Target Role Details Modal State (Read-only view of role architecture)

  const [viewingDetailsRole, setViewingDetailsRole] = React.useState<TargetRoleModel | null>(null)

  const [detailViewMode, setDetailViewMode] = React.useState<'specs' | 'diff'>('specs')

  const [selectedDetailLevelTab, setSelectedDetailLevelTab] = React.useState<string>('ALL')

  const [graphRole, setGraphRole] = React.useState<TargetRoleModel | null>(null)



  // Successor draft handler for Published roles (Domain Expert creates subsequent drafts)

  const handleDraftNewVersion = async (role: TargetRoleModel) => {

    // Only 1 active draft revision allowed per target role lineage at a time

    const hasActiveSuccessor = assignedRoles.some(

      (r) =>

        (r.stableId === role.stableId || r.code === role.code) &&

        r.status !== 'published' &&

        r.id !== role.id

    )

    if (hasActiveSuccessor) {

      toast({

        title: 'Active Draft Exists',

        description: `An active draft revision already exists for ${role.title}. You can only create one draft at a time. Once published, you can create the next draft.`,

        variant: 'warning',

      })

      return

    }



    const versionParts = (role.version || '1.0').split('.')

    const major = parseInt(versionParts[0] || '1', 10)

    const minor = parseInt(versionParts[1] || '0', 10)

    const nextVersion = `${major}.${minor + 1}`



    const inheritedLevels = role.levels && role.levels.length > 0 ? [...role.levels] : ['Junior', 'Middle', 'Senior']

    const inheritedLevelCompetencies = role.levelCompetencies ? JSON.parse(JSON.stringify(role.levelCompetencies)) : {}

    const inheritedCompetencyIds = role.competencyIds ? [...role.competencyIds] : []

    const inheritedSkillTargets = role.skillTargets ? JSON.parse(JSON.stringify(role.skillTargets)) : []



    const successorPayload = {

      code: role.code,

      name: role.title,

      domainCode: role.domainCode,

      familyCode: role.familyCode,

      track: role.track,

      seniority: role.seniority,

      responsibilities: role.responsibilities || [],

      assignedExpertId: selectedExpertId,

      description: role.description,

      version: nextVersion,

      status: 'DRAFT',

      levels: inheritedLevels,

      skillTargets: inheritedSkillTargets,

    }



    const lineageKey = (role.stableId && role.stableId.trim()) || role.code.trim() || role.id

    setExpandedLineages((prev) => ({ ...prev, [lineageKey]: true }))



    try {

      const res = await fetch(`/api/v1/organizations/${orgId}/target-roles`, {

        method: 'POST',

        headers: {

          'Content-Type': 'application/json',

          'X-User-Role': 'DOMAIN_EXPERT',

          'X-User-Id': selectedExpertId,

        },

        body: JSON.stringify(successorPayload),

      })

      if (res.ok) {

        const createdRoleData = await res.json().catch(() => null)

        const newRoleId = createdRoleData?.id ? String(createdRoleData.id) : `${role.code}-v${nextVersion}`



        const newDraftRole: TargetRoleModel = {

          ...role,

          id: newRoleId,

          version: nextVersion,

          status: 'draft',

          levels: inheritedLevels,

          levelCompetencies: inheritedLevelCompetencies,

          competencyIds: inheritedCompetencyIds,

          skillTargets: inheritedSkillTargets,

          updatedAt: new Date().toISOString(),

          createdAt: new Date().toISOString(),

        }



        updateActiveCompany((c) => {

          const existing = c.targetRoles || []

          const filtered = existing.filter((r) => r.id !== newRoleId && !(r.code === role.code && r.version === nextVersion))

          return {

            ...c,

            targetRoles: [newDraftRole, ...filtered],

          }

        })



        // Instantly update local state with inherited competencies so count is never 0

        setRoles((prev) => [newDraftRole, ...prev.filter((r) => r.id !== newRoleId && !(r.code === role.code && r.version === nextVersion))])



        await fetchAssignedRoles()

        toast({

          title: 'Successor Draft Created',

          description: `Draft v${nextVersion} created with all configurations from v${role.version}. Click the edit icon to configure competencies and micro-skills.`,

          variant: 'success',

        })

        return

      }

    } catch {

      // API error: fallback in-memory

    }



    const createdFallback: TargetRoleModel = {

      ...role,

      id: `${role.code}-v${nextVersion}-${Date.now()}`,

      version: nextVersion,

      status: 'draft',

      levels: inheritedLevels,

      levelCompetencies: inheritedLevelCompetencies,

      competencyIds: inheritedCompetencyIds,

      skillTargets: inheritedSkillTargets,

      updatedAt: new Date().toISOString(),

      createdAt: new Date().toISOString(),

    }

    saveAndSetRoles((prev) => [createdFallback, ...prev])

    toast({

      title: 'Successor Draft Created',

      description: `Draft v${nextVersion} created with all configurations from v${role.version}. Click the edit icon to configure competencies and micro-skills.`,

      variant: 'success',

    })

  }



  // Competency authoring state inside Authoring Modal

  const [newCompetencyId, setNewCompetencyId] = React.useState('')

  const [configuredCompetencySearch, setConfiguredCompetencySearch] = React.useState('')



  // Micro-Skill Authoring Modal State

  const [authoringRole, setAuthoringRole] = React.useState<TargetRoleModel | null>(null)

  const [isAuthoringModalOpen, setIsAuthoringModalOpen] = React.useState(false)

  const [configuredSkillSearch, setConfiguredSkillSearch] = React.useState('')

  const [selectedAuthoringLevels, setSelectedAuthoringLevels] = React.useState<string[]>(['Junior'])

  const [isMultiLevelMode, setIsMultiLevelMode] = React.useState(false)



  // Skill target form state

  const [newSkillId, setNewSkillId] = React.useState('')

  const [newThreshold, setNewThreshold] = React.useState(80)



  // Inline edit state for configured micro-skill target mastery

  const [editingSkillKey, setEditingSkillKey] = React.useState<string | null>(null)

  const [editingMasteryValue, setEditingMasteryValue] = React.useState<number>(80)



  const handleSaveMasteryEdit = (skillId: string, level: string) => {

    if (!authoringRole) return

    const clamped = Math.max(1, Math.min(100, Math.round(Number(editingMasteryValue) || 80)))

    const updatedSkillTargets = authoringRole.skillTargets.map((st) => {

      const stLevel = st.level || currentRoleLevels[0]

      if (st.skillId === skillId && stLevel === level) {

        return { ...st, threshold: clamped }

      }

      return st

    })



    const updatedRole: TargetRoleModel = {

      ...authoringRole,

      skillTargets: updatedSkillTargets,

      updatedAt: new Date().toISOString(),

    }



    setAuthoringRole(updatedRole)

    setEditingSkillKey(null)

    toast({

      title: 'Target Mastery Updated',

      description: `Target mastery for skill updated to ${clamped}%. Remember to Save Draft to persist changes.`,

      variant: 'success',

    })

  }



  const currentRoleLevels = React.useMemo(() => {

    return authoringRole?.levels && authoringRole.levels.length > 0

      ? authoringRole.levels

      : ['Junior', 'Middle', 'Senior']

  }, [authoringRole])



  const isAllLevelsSelected = React.useMemo(() => {

    return (

      selectedAuthoringLevels.length === currentRoleLevels.length &&

      currentRoleLevels.every((lvl) => selectedAuthoringLevels.includes(lvl))

    )

  }, [selectedAuthoringLevels, currentRoleLevels])



  const selectedLevelNamesLabel = React.useMemo(() => {

    if (isAllLevelsSelected) return `All Levels (${currentRoleLevels.join(', ')})`

    return selectedAuthoringLevels.join(', ')

  }, [isAllLevelsSelected, selectedAuthoringLevels, currentRoleLevels])



  // Competencies in common across all selected levels

  const commonCompetencyIds = React.useMemo(() => {

    if (!authoringRole || selectedAuthoringLevels.length === 0) return []

    const firstLvlComps = authoringRole.levelCompetencies?.[selectedAuthoringLevels[0]] || []

    return firstLvlComps.filter((compId) =>

      selectedAuthoringLevels.every((lvl) => (authoringRole.levelCompetencies?.[lvl] || []).includes(compId))

    )

  }, [authoringRole, selectedAuthoringLevels])



  // Flatten configured competencies across selected levels for table presentation

  const displayedCompetenciesList = React.useMemo(() => {

    if (!authoringRole || selectedAuthoringLevels.length === 0) return []

    const list: { compId: string; level: string }[] = []

    selectedAuthoringLevels.forEach((lvl) => {

      const lvlComps = authoringRole.levelCompetencies?.[lvl] || []

      lvlComps.forEach((compId) => {

        list.push({ compId, level: lvl })

      })

    })

    return list

  }, [authoringRole, selectedAuthoringLevels])



  // Flatten configured micro-skills across selected levels for table presentation

  const displayedSkillTargets = React.useMemo(() => {

    if (!authoringRole || selectedAuthoringLevels.length === 0) return []

    return authoringRole.skillTargets.filter((st) =>

      selectedAuthoringLevels.includes(st.level || currentRoleLevels[0])

    )

  }, [authoringRole, selectedAuthoringLevels, currentRoleLevels])



  // Find member skills for common competencies

  const commonCompObjects = React.useMemo(() => {

    const compIds = new Set(commonCompetencyIds)

    return realCompetencies.filter((c) => compIds.has(c.id) || (c.code && compIds.has(c.code)))

  }, [realCompetencies, commonCompetencyIds])



  const commonSkillIdSet = React.useMemo(() => {

    const ids = new Set<string>()

    commonCompObjects.forEach((c) => {

      ;(c.skillIds || []).forEach((sid) => ids.add(sid))

    })

    return ids

  }, [commonCompObjects])



  const commonCompCodes = React.useMemo(() => {

    const codes = new Set<string>()

    commonCompObjects.forEach((c) => {

      if (c.code) codes.add(c.code)

      if (c.id) codes.add(c.id)

    })

    return codes

  }, [commonCompObjects])



  // Two-step confirmation state for unassigned prerequisites

  const [isAwaitingPrereqConfirmation, setIsAwaitingPrereqConfirmation] = React.useState(false)

  const prereqConfirmTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)



  // Cascading: Expert can only select micro-skills that belong to competencies common to all selected levels

  const availableSkills = React.useMemo(() => {

    if (!authoringRole || commonCompetencyIds.length === 0 || selectedAuthoringLevels.length === 0) return []



    return companyMicroSkills.filter((s) => {

      const belongs =

        commonSkillIdSet.has(s.id) ||

        (s.macroCompetencyCode && commonCompCodes.has(s.macroCompetencyCode))

      const isMapped = commonSkillIdSet.size > 0 || commonCompCodes.size > 0 ? belongs : true

      if (!isMapped) return false



      // Exclude if already assigned to all selected levels

      const alreadyAssignedToAllSelected = selectedAuthoringLevels.every((lvl) =>

        authoringRole.skillTargets.some(

          (st) => st.skillId === s.id && (st.level || currentRoleLevels[0]) === lvl

        )

      )

      return !alreadyAssignedToAllSelected

    })

  }, [authoringRole, companyMicroSkills, commonCompetencyIds, selectedAuthoringLevels, currentRoleLevels, commonSkillIdSet, commonCompCodes])



  // Missing prerequisites across configured levels in authoring role

  const authoringRoleMissingPrereqs = React.useMemo(() => {

    if (!authoringRole || !authoringRole.skillTargets || authoringRole.skillTargets.length === 0) return []



    const missingList: Array<{ skillCode: string; prereqCode: string; level: string }> = []



    authoringRole.skillTargets.forEach((st) => {

      const stLevel = st.level || currentRoleLevels[0]

      const missing = realPrerequisites.filter((p) => {

        const matchesSource = p.sourceSkillId === st.skillId || p.sourceSkillCode === st.skillCode

        if (!matchesSource) return false

        const targetPresent = authoringRole.skillTargets.some(

          (other) =>

            (other.skillId === p.targetSkillId || other.skillCode === p.targetSkillCode) &&

            (other.level === st.level || !other.level || !st.level)

        )

        return !targetPresent

      })



      missing.forEach((m) => {

        missingList.push({

          skillCode: st.skillCode,

          prereqCode: m.targetSkillCode || m.targetSkillId,

          level: stLevel,

        })

      })

    })



    return missingList

  }, [authoringRole, realPrerequisites, currentRoleLevels])



  // Reset confirmation state when authoring role or its skills change

  React.useEffect(() => {

    if (prereqConfirmTimerRef.current) clearTimeout(prereqConfirmTimerRef.current)

    setIsAwaitingPrereqConfirmation(false)

  }, [authoringRole?.id, authoringRole?.skillTargets.length])



  React.useEffect(() => {

    if (availableSkills.length > 0) {

      setNewSkillId((prev) => availableSkills.some((s) => s.id === prev) ? prev : availableSkills[0].id)

    } else {

      setNewSkillId('')

    }

  }, [availableSkills])



  const skillOptions: ComboboxOption[] = React.useMemo(() => {

    return availableSkills.map((skill) => ({

      value: skill.id,

      label: `${skill.code} — ${skill.name}`,

      description: skill.description || undefined,

    }))

  }, [availableSkills])



  // Competencies available to add: any competency not yet assigned to all selected levels

  const availableCompetencies = React.useMemo(() => {

    if (!authoringRole || selectedAuthoringLevels.length === 0) return []

    return realCompetencies.filter((c) => {

      return selectedAuthoringLevels.some((lvl) => {

        const lvlComps = authoringRole.levelCompetencies?.[lvl] || []

        return !lvlComps.includes(c.id) && (!c.code || !lvlComps.includes(c.code))

      })

    })

  }, [authoringRole, realCompetencies, selectedAuthoringLevels])



  const competencyOptions: ComboboxOption[] = React.useMemo(() => {

    return availableCompetencies.map((comp) => ({

      value: comp.id,

      label: `${comp.code || comp.id} — ${comp.name}`,

      description: comp.description || undefined,

    }))

  }, [availableCompetencies])



  // Add competency strictly to all currently selected levels

  const handleAddCompetency = (compId: string) => {

    if (!authoringRole || !compId || selectedAuthoringLevels.length === 0) return

    const updatedLevelCompetencies = { ...(authoringRole.levelCompetencies || {}) }

    selectedAuthoringLevels.forEach((lvl) => {

      const existing = updatedLevelCompetencies[lvl] || []

      if (!existing.includes(compId)) {

        updatedLevelCompetencies[lvl] = [...existing, compId]

      }

    })

    const allUnionComps = Array.from(new Set(Object.values(updatedLevelCompetencies).flat()))



    const updatedRole: TargetRoleModel = {

      ...authoringRole,

      levelCompetencies: updatedLevelCompetencies,

      competencyIds: allUnionComps,

      updatedAt: new Date().toISOString(),

    }



    setAuthoringRole(updatedRole)

    setNewCompetencyId('')

  }



  // Helper to determine if a skill belongs to a competency

  const doesSkillBelongToCompetency = React.useCallback(

    (skill: { id: string; code?: string; macroCompetencyCode?: string }, comp: CompetencyDto) => {

      if (comp.skillIds && comp.skillIds.includes(skill.id)) return true

      if (comp.memberSkills && comp.memberSkills.some((ms) => ms.id === skill.id || (skill.code && ms.code === skill.code))) return true

      if (skill.macroCompetencyCode && (skill.macroCompetencyCode === comp.code || skill.macroCompetencyCode === comp.id)) return true

      return false

    },

    []

  )



  // Remove competency from targeted level or all selected levels, cascading to its micro-skills

  const handleRemoveCompetency = (compId: string, targetLevel?: string) => {

    if (!authoringRole) return

    const updatedLevelCompetencies = { ...(authoringRole.levelCompetencies || {}) }

    const levelsToTouch = targetLevel ? [targetLevel] : selectedAuthoringLevels



    levelsToTouch.forEach((lvl) => {

      const current = updatedLevelCompetencies[lvl] || []

      updatedLevelCompetencies[lvl] = current.filter((id) => id !== compId)

    })



    const allUnionComps = Array.from(new Set(Object.values(updatedLevelCompetencies).flat()))



    // Find the competency being removed

    const targetCompObj = realCompetencies.find((c) => c.id === compId || c.code === compId)



    // Cascade: remove micro-skills belonging to the removed competency from touched levels

    // unless covered by another remaining competency on that level

    const updatedSkillTargets = authoringRole.skillTargets.filter((st) => {

      const stLevel = st.level || currentRoleLevels[0]

      if (!levelsToTouch.includes(stLevel)) {

        return true

      }



      const skillObj = companyMicroSkills.find((s) => s.id === st.skillId || (st.skillCode && s.code === st.skillCode))

      const belongsToRemovedComp = targetCompObj && skillObj

        ? doesSkillBelongToCompetency(skillObj, targetCompObj)

        : false



      if (!belongsToRemovedComp) {

        return true

      }



      // Check if any REMAINING competency on stLevel also covers this skill

      const remainingCompIdsOnLevel = updatedLevelCompetencies[stLevel] || []

      const remainingCompObjs = realCompetencies.filter((c) =>

        remainingCompIdsOnLevel.includes(c.id) || (c.code && remainingCompIdsOnLevel.includes(c.code))

      )



      const isCoveredByOtherComp = skillObj && remainingCompObjs.some((rc) => doesSkillBelongToCompetency(skillObj, rc))

      return isCoveredByOtherComp

    })



    const updatedRole: TargetRoleModel = {

      ...authoringRole,

      levelCompetencies: updatedLevelCompetencies,

      competencyIds: allUnionComps,

      skillTargets: updatedSkillTargets,

      updatedAt: new Date().toISOString(),

    }



    setAuthoringRole(updatedRole)

  }



  const handleOpenAuthoring = (role: TargetRoleModel) => {

    // Deep clone role so edits remain strictly in modal draft session

    const cloned: TargetRoleModel = JSON.parse(JSON.stringify(role))

    const roleLevels = cloned.levels && cloned.levels.length > 0 ? cloned.levels : ['Junior', 'Middle', 'Senior']

    const initLevel = roleLevels[0]



    // Explicitly initialize levelCompetencies map for all levels without cross-contamination

    const initialLevelComps: Record<string, string[]> = {}

    roleLevels.forEach((lvl: string) => {

      initialLevelComps[lvl] = Array.isArray(cloned.levelCompetencies?.[lvl])

        ? [...cloned.levelCompetencies[lvl]]

        : []

    })



    // Auto-heal: Ensure all levels that have skillTargets also have the corresponding competencies in initialLevelComps

    if (cloned.skillTargets && cloned.skillTargets.length > 0) {

      cloned.skillTargets.forEach((st) => {

        const lvl = st.level || initLevel

        if (!initialLevelComps[lvl]) {

          initialLevelComps[lvl] = []

        }

        const skillObj = companyMicroSkills.find((s) => s.id === st.skillId || (st.skillCode && s.code === st.skillCode))

        if (skillObj) {

          const comp = realCompetencies.find((c) =>

            (c.skillIds && c.skillIds.includes(skillObj.id)) ||

            (c.memberSkills && c.memberSkills.some((ms) => ms.id === skillObj.id || ms.code === skillObj.code)) ||

            (skillObj.macroCompetencyCode && (skillObj.macroCompetencyCode === c.code || skillObj.macroCompetencyCode === c.id))

          )

          if (comp && !initialLevelComps[lvl].includes(comp.id)) {

            initialLevelComps[lvl].push(comp.id)

          }

        }

      })

    }



    // If completely unassigned, seed only the first level with legacy competencyIds

    const totalAssignedComps = Object.values(initialLevelComps).reduce((sum, arr) => sum + arr.length, 0)

    if (totalAssignedComps === 0 && cloned.competencyIds && cloned.competencyIds.length > 0) {

      initialLevelComps[initLevel] = [...cloned.competencyIds]

    }

    cloned.levelCompetencies = initialLevelComps

    cloned.competencyIds = Array.from(new Set(Object.values(initialLevelComps).flat()))



    setAuthoringRole(cloned)

    setSelectedAuthoringLevels([initLevel])

    setIsMultiLevelMode(false)

    setNewThreshold(80)

    setNewCompetencyId('')

    setConfiguredSkillSearch('')

    setConfiguredCompetencySearch('')

    setIsAuthoringModalOpen(true)

  }



  // Add micro-skill target to all currently selected levels

  const handleAddSkillTarget = () => {

    if (!authoringRole || !newSkillId || selectedAuthoringLevels.length === 0) return



    const skillObj = companyMicroSkills.find((s) => s.id === newSkillId)

    if (!skillObj) return



    const newTargets: SkillTargetConfig[] = []

    selectedAuthoringLevels.forEach((lvl) => {

      const alreadyExists = authoringRole.skillTargets.some(

        (st) =>

          (st.skillId === newSkillId || (st.skillCode && st.skillCode === skillObj.code)) &&

          (st.level || currentRoleLevels[0]) === lvl

      )

      if (!alreadyExists) {

        newTargets.push({

          skillId: skillObj.id,

          skillCode: skillObj.code,

          skillName: skillObj.name,

          threshold: Number(newThreshold) || 80,

          level: lvl,

        })

      }

    })



    if (newTargets.length === 0) {

      toast({

        title: 'Duplicate Skill',

        description: `This micro-skill is already assigned to the selected level(s).`,

        variant: 'destructive',

      })

      return

    }



    const updatedRole: TargetRoleModel = {

      ...authoringRole,

      skillTargets: [...authoringRole.skillTargets, ...newTargets],

      updatedAt: new Date().toISOString(),

    }



    setAuthoringRole(updatedRole)



    // Reset skill selector

    const remaining = availableSkills.filter((s) => s.id !== newSkillId)

    setNewSkillId(remaining.length > 0 ? remaining[0].id : '')

  }



  // Remove micro-skill target from targeted level or all selected levels

  const handleRemoveSkillTarget = (skillId: string, targetLevel?: string) => {

    if (!authoringRole) return

    const levelsToTouch = targetLevel ? [targetLevel] : selectedAuthoringLevels



    const updatedRole: TargetRoleModel = {

      ...authoringRole,

      skillTargets: authoringRole.skillTargets.filter(

        (st) =>

          !((st.skillId === skillId || (st.skillCode && st.skillCode === skillId)) &&

            levelsToTouch.includes(st.level || currentRoleLevels[0]))

      ),

      updatedAt: new Date().toISOString(),

    }



    setAuthoringRole(updatedRole)

  }



  // Explicit Save Draft Handler: Persists modifications to database and state

  const [isSavingDraft, setIsSavingDraft] = React.useState(false)



  const handleSaveAuthoringDraft = async () => {

    if (!authoringRole) return

    setIsSavingDraft(true)

    const updatedRole: TargetRoleModel = {

      ...authoringRole,

      status: authoringRole.status === 'published' ? 'published' : authoringRole.status === 'rejected' ? 'rejected' : 'draft',

      updatedAt: new Date().toISOString(),

    }



    try {

      saveAndSetRoles((prev) => prev.map((r) => (r.id === updatedRole.id ? updatedRole : r)))

      const res = await fetch(`/api/v1/organizations/${orgId}/target-roles/${authoringRole.id}`, {

        method: 'PUT',

        headers: {

          'Content-Type': 'application/json',

          'X-User-Role': 'DOMAIN_EXPERT',

          'X-User-Id': selectedExpertId,

        },

        body: JSON.stringify({

          name: updatedRole.title,

          domainCode: updatedRole.domainCode,

          familyCode: updatedRole.familyCode,

          track: updatedRole.track,

          seniority: updatedRole.seniority,

          responsibilities: updatedRole.responsibilities,

          assignedExpertId: updatedRole.assignedExpertId,

          description: updatedRole.description,

          version: updatedRole.version,

          status: updatedRole.status === 'published' ? 'ACTIVE' : updatedRole.status === 'rejected' ? 'REJECTED' : 'DRAFT',

          skillTargets: updatedRole.skillTargets,

          levels: updatedRole.levels,

          levelCompetencies: updatedRole.levelCompetencies,

          competencyIds: updatedRole.competencyIds,

          rejectionReason: updatedRole.rejectionReason,

        }),

      })



      if (!res.ok) {

        const errorData = await res.json().catch(() => ({}))

        throw new Error(errorData.message || 'Failed to save draft configuration')

      }



      await fetchAssignedRoles()

      toast({

        title: 'Draft Saved',

        description: `Draft configuration for ${updatedRole.title} (v${updatedRole.version}) saved successfully.`,

        variant: 'success',

      })

      setIsAuthoringModalOpen(false)

      setAuthoringRole(null)

    } catch (e) {

      console.error('Failed to save draft:', e)

      toast({

        title: 'Save Draft Failed',

        description: 'Unable to save draft configuration. Please try again.',

        variant: 'destructive',

      })

    } finally {

      setIsSavingDraft(false)

    }

  }



  // Submit completed micro-skill configuration to L&D Manager for approval/publication

  const handleSubmitConfigurationToManager = async (roleToSubmit?: TargetRoleModel) => {

    const role = roleToSubmit || authoringRole

    if (!role) return



    if (role.skillTargets.length === 0) {

      toast({

        title: 'Micro-skills Required',

        description: 'You must configure at least one micro-skill target before submitting to the L&D Manager.',

        variant: 'destructive',

      })

      return

    }



    const updatedRole: TargetRoleModel = {

      ...role,

      status: 'submitted',

      rejectionReason: '',

      updatedAt: new Date().toISOString(),

    }



    saveAndSetRoles((prev) => prev.map((r) => (r.id === updatedRole.id ? updatedRole : r)))



    try {

      await fetch(`/api/v1/organizations/${orgId}/target-roles/${role.id}`, {

        method: 'PUT',

        headers: {

          'Content-Type': 'application/json',

          'X-User-Role': 'DOMAIN_EXPERT',

          'X-User-Id': selectedExpertId,

        },

        body: JSON.stringify({

          name: role.title,

          domainCode: role.domainCode,

          familyCode: role.familyCode,

          track: role.track,

          seniority: role.seniority,

          responsibilities: role.responsibilities,

          assignedExpertId: role.assignedExpertId,

          description: role.description,

          status: 'SUBMITTED',

          version: role.version,

          skillTargets: role.skillTargets,

          levels: role.levels,

          levelCompetencies: role.levelCompetencies,

          competencyIds: role.competencyIds,

          rejectionReason: '',

        }),

      })

      await fetchAssignedRoles()

    } catch {

      // Offline fallback already updated in local company store via saveAndSetRoles

    }



    if (authoringRole?.id === role.id) {

      setAuthoringRole(updatedRole)

      setIsAuthoringModalOpen(false)

    }



    toast({

      title: 'Configuration Submitted to L&D Manager',

      description: `${updatedRole.title} (${updatedRole.code} v${updatedRole.version}) has been submitted to the L&D Manager for approval and publication.`,

      variant: 'success',

    })

  }



  // Two-step submission initiation (checks unassigned prerequisites and prompts in-place)

  const handleInitiateSubmitToManager = () => {

    if (!authoringRole) return

    if (authoringRole.skillTargets.length === 0) {

      toast({

        title: 'Micro-skills Required',

        description: 'You must configure at least one micro-skill target before submitting to the L&D Manager.',

        variant: 'destructive',

      })

      return

    }



    // Step 1: If unassigned prerequisites exist and not yet in confirmation state, morph the button

    if (authoringRoleMissingPrereqs.length > 0 && !isAwaitingPrereqConfirmation) {

      setIsAwaitingPrereqConfirmation(true)

      if (prereqConfirmTimerRef.current) clearTimeout(prereqConfirmTimerRef.current)

      prereqConfirmTimerRef.current = setTimeout(() => {

        setIsAwaitingPrereqConfirmation(false)

      }, 6000)



      toast({

        title: 'Unassigned Prerequisites Detected',

        description: `${authoringRoleMissingPrereqs.length} prerequisite skill(s) are missing from this role level. Click the button again within 6 seconds to confirm and submit anyway.`,

        variant: 'default',

      })

      return

    }



    // Step 2: Second click or no missing prereqs -> execute submission

    if (prereqConfirmTimerRef.current) clearTimeout(prereqConfirmTimerRef.current)

    setIsAwaitingPrereqConfirmation(false)

    handleSubmitConfigurationToManager(authoringRole)

  }



  return (

    <WorkspaceLayout>

      <div className="space-y-6 pb-16">

        <PageHeader
          actions={

            <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5 shadow-2xs">

              <span className="text-xs text-muted-foreground font-medium">Active Expert:</span>

              <select

                value={selectedExpertId}

                onChange={(e) => {

                  const newId = e.target.value

                  setSelectedExpertId(newId)

                  localStorage.setItem('expert_active_id', newId)

                  window.dispatchEvent(new CustomEvent('user_profile_updated'))

                }}

                className="text-xs font-semibold bg-transparent text-foreground border-0 focus:outline-none cursor-pointer"

              >

                {ELIGIBLE_EXPERTS.map((exp) => (

                  <option key={exp.id} value={exp.id}>

                    {exp.name} ({exp.title})

                  </option>

                ))}

              </select>

            </div>

          }

        />



        {/* Aggregate KPI StatCards */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          <StatCard

            variant="gradient"

            icon={<Clock className="h-4 w-4 text-sky-500" />}

            title="Submitted Roles"

            value={approvedCount.toString()}

            valueClassName="text-sky-600 dark:text-sky-400"

            description="Submitted to L&D for confirmation"

          />



          <StatCard

            variant="gradient"

            icon={<CheckCircle2 className="h-4 w-4 text-success" />}

            title="Published Roles"

            value={publishedCount.toString()}

            valueClassName="text-success"

            description="Active in knowledge graph"

          />



          <StatCard

            variant="gradient"

            icon={<Sliders className="h-4 w-4 text-primary" />}

            title="Configured Micro-skills"

            value={totalSkillTargets.toString()}

            valueClassName="text-primary"

            description="Benchmark mastery targets defined"

          />



          <StatCard

            variant="gradient"

            icon={<XCircle className="h-4 w-4 text-destructive" />}

            title="Rejected Roles"

            value={rejectedCount.toString()}

            valueClassName="text-destructive"

            description="Returned by L&D Manager for revision"

          />

        </div>



        {/* Target Roles Catalog Card */}

        <Card>

          <CardHeader>

            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">

              <div className="min-w-0 pr-2">

                <CardTitle className="flex items-center gap-2">

                  <Briefcase className="h-4 w-4 text-primary shrink-0" />

                  <span>Target Role Version Catalog</span>

                </CardTitle>

                <CardDescription>

                  Review assigned target roles, author micro-skill mastery benchmarks, and submit completed configurations for L&D publication.

                </CardDescription>

              </div>



              {/* Search and Status Filters - Guaranteed 1 Single Row */}

              <div className="flex items-center gap-2.5 shrink-0 flex-nowrap overflow-x-auto pb-0.5">

                <div className="relative w-48 sm:w-56 shrink-0">

                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />

                  <input

                    type="text"

                    placeholder="Search roles..."

                    value={searchQuery}

                    onChange={(e) => setSearchQuery(e.target.value)}

                    className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs transition-all"

                  />

                  {searchQuery && (

                    <button

                      type="button"

                      onClick={() => setSearchQuery('')}

                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded"

                      title="Clear search"

                    >

                      <X size={12} />

                    </button>

                  )}

                </div>



                <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1.5 shadow-2xs shrink-0">

                  <span className="text-[11px] text-muted-foreground font-medium">Status:</span>

                  <select

                    value={statusFilter}

                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'published' | 'approved' | 'draft' | 'feedback' | 'rejected')}

                    aria-label="Filter by Status"

                    className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer font-medium"

                  >

                    <option value="all">All ({assignedRoles.length})</option>

                    <option value="published">Published ({publishedCount})</option>

                    <option value="approved">Submitted ({approvedCount})</option>

                    <option value="draft">Drafts ({draftCount})</option>

                    <option value="rejected">Rejected ({rejectedCount})</option>

                  </select>

                </div>



                <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1.5 shadow-2xs shrink-0">

                  <span className="text-[11px] text-muted-foreground font-medium">Sort:</span>

                  <select

                    value={sortBy}

                    onChange={(e) => setSortBy(e.target.value as 'latest' | 'title')}

                    aria-label="Sort Target Roles"

                    className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer font-medium"

                  >

                    <option value="latest">Latest</option>

                    <option value="title">Title (A–Z)</option>

                  </select>

                </div>

              </div>

            </div>

          </CardHeader>



          <CardContent className="p-0">

            {isLoading ? (

              <div className="text-center py-16 text-muted-foreground">

                <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-3" />

                <p className="text-sm font-medium">Loading target roles from database...</p>

              </div>

            ) : visibleRoles.length === 0 ? (

              <div className="text-center py-12 text-muted-foreground">

                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />

                <p className="text-sm font-semibold">No target roles found.</p>

                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">

                  {searchQuery || statusFilter !== 'all'

                    ? 'No target roles match your active search query or status filter.'

                    : 'No target roles are currently assigned to your expert profile.'}

                </p>

                {(searchQuery || statusFilter !== 'all') && (

                  <Button

                    variant="outline"

                    size="sm"

                    className="mt-3 font-semibold"

                    onClick={() => {

                      setStatusFilter('all')

                      setSearchQuery('')

                    }}

                  >

                    Clear Active Filters

                  </Button>

                )}

              </div>

            ) : (

              <>

                <div className="overflow-x-auto">

                  <table className="w-full text-left text-xs border-collapse">

                    <thead>

                      <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[11px] font-semibold">

                        <th className="py-2.5 px-3">Role Code</th>

                        <th className="py-2.5 px-3">Title &amp; Version</th>

                        <th className="py-2.5 px-3">Occupation</th>

                        <th className="py-2.5 px-3 text-center whitespace-nowrap">Levels</th>

                        <th className="py-2.5 px-3 text-center">Competency</th>

                        <th className="py-2.5 px-3 text-center">Micro-skill</th>

                        <th className="py-2.5 px-3">Status</th>

                        <th className="py-2.5 px-3 text-right">Actions</th>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-border">

                      {paginatedRoles.map((role) => {

                        const effStatus = getExpertEffectiveStatus(role)

                        const isDraft = effStatus === 'draft'

                        const isSubmitted = effStatus === 'submitted'

                        const isSent = effStatus === 'sent'

                        const isApproved = effStatus === 'approved'

                        const isFeedback = effStatus === 'feedback'

                        const isRejected = effStatus === 'rejected'

                        const isPublished = effStatus === 'published'

                        const cleanRejectionReason = (role.rejectionReason || '').replace(/^\[(EXPERT|LD_MANAGER)\]:\s*/, '')



                        // Lineage identification for published versions

                        const publishedInLineage = assignedRoles

                          .filter((r) => (r.stableId === role.stableId || r.code === role.code) && r.status === 'published')

                          .sort((a, b) => compareRoleVersions(b.version, a.version))



                        const newestPublished = publishedInLineage[0]

                        const isNewestPublished = isPublished && newestPublished && role.id === newestPublished.id

                        const isOlderPublished = isPublished && !isNewestPublished

                        const hasOlderPublished = isNewestPublished && publishedInLineage.length > 1

                        const lineageKey = role.stableId || role.code

                        const isLineageExpanded = Boolean(expandedLineages[lineageKey])



                        // Collapse older published versions if lineage dropdown is not expanded

                        if (isOlderPublished && !isLineageExpanded) {

                          return null

                        }



                        // Identify successor role placed under a published role

                        const predecessorPublished = assignedRoles.find(

                          (r) => (r.stableId === role.stableId || r.code === role.code) && r.status === 'published' && r.id !== role.id

                        )

                        const isSuccessor = !isPublished && Boolean(predecessorPublished)



                        // Check if this published role lineage already has an active revision draft/submission

                        const hasActiveSuccessor = assignedRoles.some(

                          (r) =>

                            (r.stableId === role.stableId || r.code === role.code) &&

                            r.status !== 'published' &&

                            r.id !== role.id

                        )



                        return (

                          <tr

                            key={role.id}

                            onClick={() => {

                              if (hasOlderPublished) {

                                toggleLineage(lineageKey)

                              }

                            }}

                            className={`transition-colors ${

                              hasOlderPublished

                                ? 'cursor-pointer select-none hover:bg-primary/5'

                                : 'hover:bg-muted/20'

                            } ${

                              isOlderPublished

                                ? 'bg-muted/5 text-muted-foreground'

                                : isSuccessor

                                ? 'bg-muted/10 border-l-2 border-l-primary/60'

                                : ''

                            }`}

                            title={

                              hasOlderPublished

                                ? isLineageExpanded

                                  ? 'Click row to collapse previous versions'

                                  : 'Click row to view previous versions'

                                : undefined

                            }

                          >

                            <td className="py-3 px-3 font-mono font-bold text-foreground">

                              {isOlderPublished ? (

                                <div className="flex items-center gap-1.5 pl-6 text-muted-foreground" title={`Historical version v${role.version}`}>

                                  <History className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

                                  <span className="text-muted-foreground font-normal">{role.code}</span>

                                </div>

                              ) : isSuccessor ? (

                                <div className="flex items-center gap-1.5 pl-3" title="Successor draft positioned below published version">

                                  <CornerDownRight className="h-3.5 w-3.5 text-primary shrink-0" />

                                  <span>{role.code}</span>

                                </div>

                              ) : (

                                <div className="flex items-center gap-1.5">

                                  {hasOlderPublished && (

                                    <span className="text-primary/70 shrink-0">

                                      {isLineageExpanded ? (

                                        <ChevronDown className="h-3.5 w-3.5" />

                                      ) : (

                                        <ChevronRight className="h-3.5 w-3.5" />

                                      )}

                                    </span>

                                  )}

                                  <span>{role.code}</span>

                                </div>

                              )}

                            </td>

                            <td className="py-3 px-3">

                              <div className="font-semibold text-foreground flex items-center gap-1.5 flex-wrap">

                                <span>{role.title}</span>

                                {isOlderPublished && (

                                  <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono text-muted-foreground border-border">

                                    Previous v{role.version}

                                  </Badge>

                                )}

                              </div>

                              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5 flex-wrap">

                                <Badge variant="secondary" className="font-mono text-[10px] py-0 px-1">

                                  v{role.version}

                                </Badge>

                                <span>Updated {formatDate(role.updatedAt)}</span>

                              </div>

                              {isFeedback && cleanRejectionReason && (

                                <div className="text-[11px] text-black flex items-center gap-1 mt-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25 w-fit" title={cleanRejectionReason}>

                                  <AlertTriangle className="h-3 w-3 shrink-0 text-black" />

                                  <span className="font-semibold text-black">Revision Feedback:</span>

                                  <span className="truncate max-w-xs text-black">{cleanRejectionReason}</span>

                                </div>

                              )}

                              {isRejected && cleanRejectionReason && (

                                <div className="text-[11px] text-destructive flex items-center gap-1 mt-1 bg-destructive/5 px-2 py-0.5 rounded border border-destructive/20 w-fit" title={cleanRejectionReason}>

                                  <AlertTriangle className="h-3 w-3 shrink-0" />

                                  <span className="font-semibold">Proposal Rejected:</span>

                                  <span className="truncate max-w-xs">{cleanRejectionReason}</span>

                                </div>

                              )}

                            </td>

                            <td className="py-3 px-3">

                              {(() => {

                                const occ = resolveOccupationForRole(role)

                                return (

                                  <span className="text-xs font-medium text-foreground">

                                    {role.occupationTitle || occ.name}

                                  </span>

                                )

                              })()}

                            </td>

                            <td className="py-3 px-3 text-center">

                              <span className="font-semibold text-foreground text-xs font-mono">

                                {(role.levels && role.levels.length > 0 ? role.levels : ['Junior', 'Middle', 'Senior']).length}

                              </span>

                            </td>

                            <td className="py-3 px-3 text-center">

                              <span className="font-semibold text-foreground text-xs font-mono">

                                {role.competencyIds.length}

                              </span>

                            </td>

                            <td className="py-3 px-3 text-center">

                              <span className="font-semibold text-foreground text-xs font-mono">

                                {role.skillTargets.length}

                              </span>

                            </td>

                            <td className="py-3 px-3">

                              {isPublished && <Badge variant="success">PUBLISHED</Badge>}

                              {isSubmitted && (

                                <Badge variant="primary" className="font-bold">

                                  SUBMITTED

                                </Badge>

                              )}

                              {isSent && <Badge variant="warning">DRAFT</Badge>}

                              {isApproved && (

                                <Badge variant="success" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold dark:text-emerald-400">

                                  APPROVED

                                </Badge>

                              )}

                              {(isFeedback || isRejected) && <Badge variant="destructive">REJECTED</Badge>}

                              {isDraft && !isSent && <Badge variant="warning">DRAFT</Badge>}

                            </td>

                            <td className="py-3 px-3 text-right">

                              <div className="flex items-center justify-end gap-1.5">

                                {/* View Details */}

                                <Button

                                  variant="outline"

                                  size="sm"

                                  className="h-8 w-8 p-0"

                                  onClick={(e) => {

                                    e.stopPropagation()

                                    setViewingDetailsRole(role)

                                  }}

                                  title="View Details"

                                  aria-label="View Details"

                                >

                                  <Eye className="h-4 w-4 text-primary" />

                                </Button>



                                {/* View Knowledge Graph (REQ-018-F01) */}

                                <Button

                                  variant="outline"

                                  size="sm"

                                  className="h-8 w-8 p-0"

                                  onClick={(e) => {

                                    e.stopPropagation()

                                    setGraphRole(role)

                                  }}

                                  title="View Competency Knowledge Graph"

                                  aria-label="View Competency Knowledge Graph"

                                >

                                  <NetworkIcon className="h-4 w-4 text-primary" />

                                </Button>



                                {/* Create Successor Draft (Domain Expert creates later drafts) */}

                                {isPublished && isNewestPublished && !hasActiveSuccessor && (

                                  <Button

                                    variant="outline"

                                    size="sm"

                                    className="h-8 px-2.5 text-xs font-semibold text-primary hover:bg-primary/10 border-primary/30"

                                    onClick={(e) => {

                                      e.stopPropagation()

                                      handleDraftNewVersion(role)

                                    }}

                                    title="Create Next Version Draft"

                                  >

                                    <Plus className="h-3.5 w-3.5 mr-1" />

                                    New Draft

                                  </Button>

                                )}



                                {/* Configure Micro-skills (when in draft, sent, or rejected) */}

                                {(isDraft || isSent || isFeedback || isRejected) && (

                                  <Button

                                    variant="outline"

                                    size="sm"

                                    className="h-8 w-8 p-0 text-foreground hover:border-primary hover:text-primary"

                                    onClick={(e) => {

                                      e.stopPropagation()

                                      handleOpenAuthoring(role)

                                    }}

                                    title={isFeedback || isRejected ? "Revise Micro-skills Based on Manager Feedback" : "Edit Micro-skills"}

                                    aria-label={isFeedback || isRejected ? "Revise Micro-skills Based on Manager Feedback" : "Edit Micro-skills"}

                                  >

                                    <Edit3 className="h-4 w-4" />

                                  </Button>

                                )}



                              </div>

                            </td>

                          </tr>

                        )

                      })}

                    </tbody>

                  </table>

                </div>



                {visibleRoles.length > 0 && (

                  <Pagination

                    currentPage={currentPage}

                    totalPages={totalPages}

                    totalItems={visibleRoles.length}

                    pageSize={pageSize}

                    onPageChange={setCurrentPage}

                    itemLabel="roles"

                  />

                )}

              </>

            )}

          </CardContent>

        </Card>

      </div>



      {/* MICRO-SKILL AUTHORING MODAL (EXCLUSIVE TO DOMAIN EXPERT) */}

      {authoringRole && (() => {

        const authoringEffStatus = getExpertEffectiveStatus(authoringRole)

        const isAuthoringApproved = authoringEffStatus === 'approved'

        const isAuthoringFeedback = authoringEffStatus === 'feedback'

        const isAuthoringRejected = authoringEffStatus === 'rejected'

        const cleanAuthoringRejectionReason = (authoringRole.rejectionReason || '').replace(/^\[(EXPERT|LD_MANAGER)\]:\s*/, '')



        return (

        <Dialog

          open={isAuthoringModalOpen}

          onOpenChange={(open) => {

            if (!open) {

              setIsAuthoringModalOpen(false)

              setAuthoringRole(null)

            }

          }}

          className="max-w-5xl w-full h-[88vh] max-h-[88vh] flex flex-col p-6 overflow-hidden transition-all duration-200"

        >

          <DialogHeader className="shrink-0 mb-2">

              <div className="flex flex-wrap items-center justify-between gap-2.5">

                <DialogTitle className="flex items-center gap-2">

                  <Sliders className="h-5 w-5 text-primary shrink-0" />

                  <span>

                    Configure Skills: {authoringRole.title}

                  </span>

                </DialogTitle>

                <Badge

                  variant={

                    authoringRole.status === 'sent'

                      ? 'outline'

                      : authoringEffStatus === 'published' || isAuthoringApproved

                      ? 'success'

                      : isAuthoringRejected || isAuthoringFeedback

                      ? 'destructive'

                      : 'warning'

                  }

                  className={

                    authoringRole.status === 'sent'

                      ? 'bg-[#EA580C] text-white border-transparent font-bold hover:bg-[#C2410C]'

                      : isAuthoringApproved

                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold dark:text-emerald-400'

                      : isAuthoringRejected || isAuthoringFeedback

                      ? 'font-bold'

                      : 'font-bold'

                  }

                >

                  v{authoringRole.version} {authoringRole.status === 'sent' ? 'SENT' : authoringEffStatus.toUpperCase()}

                </Badge>

              </div>

            </DialogHeader>



            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">

              {/* Revision Feedback Banner when in feedback / rejected state */}

              {(isAuthoringFeedback || isAuthoringRejected) && cleanAuthoringRejectionReason && (

                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/25 text-destructive flex items-start gap-2.5">

                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />

                  <div className="space-y-0.5 text-xs">

                    <span className="font-semibold block text-foreground">L&amp;D Manager Revision Feedback</span>

                    <p className="text-[11px] leading-relaxed text-foreground">

                      {cleanAuthoringRejectionReason}

                    </p>

                  </div>

                </div>

              )}



              {/* Read-Only Role Overview (Cannot be edited by Domain Expert) */}

              <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-3">

                <div className="flex items-center justify-between">

                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">

                    <Lock className="h-3 w-3 text-muted-foreground" />

                    Role Overview (Read-Only)

                  </span>

                  <span className="text-[10px] text-muted-foreground italic">

                    Authored by L&amp;D Manager · Uneditable

                  </span>

                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">

                  <div className="p-2 rounded bg-card border border-border">

                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Role Code</span>

                    <span className="font-mono font-bold text-foreground mt-0.5 block">{authoringRole.code}</span>

                  </div>

                  <div className="p-2 rounded bg-card border border-border">

                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Version</span>

                    <span className="font-mono font-bold text-foreground mt-0.5 block">v{authoringRole.version}</span>

                  </div>

                  <div className="p-2 rounded bg-card border border-border">

                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Assigned Domain Expert</span>

                    <span className="font-semibold text-primary mt-0.5 truncate block">

                      {authoringRole.assignedExpertName || ELIGIBLE_EXPERTS.find((e) => e.id === authoringRole.assignedExpertId)?.name || activeExpert.name}

                    </span>

                  </div>

                  <div className="p-2 rounded bg-card border border-border col-span-2 sm:col-span-3">

                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Occupation</span>

                    {(() => {

                      const occ = resolveOccupationForRole(authoringRole)

                      return (

                        <div className="flex items-center gap-2 mt-0.5">

                          <span className="font-semibold text-foreground truncate">{authoringRole.occupationTitle || occ.name}</span>

                          <Badge variant="outline" className="font-mono text-[10px] font-semibold text-primary border-primary/30 shrink-0">

                            {authoringRole.occupationCode || occ.code}

                          </Badge>

                        </div>

                      )

                    })()}

                  </div>

                </div>



                {authoringRole.description && (

                  <div className="p-2.5 rounded bg-card border border-border text-xs">

                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">

                      Role Objective &amp; Scope

                    </span>

                    <p className="text-foreground leading-relaxed">

                      {authoringRole.description}

                    </p>

                  </div>

                )}



                {authoringRole.responsibilities && authoringRole.responsibilities.length > 0 && (

                  <div className="p-2.5 rounded bg-card border border-border space-y-1 text-xs">

                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">

                      Core Responsibilities ({authoringRole.responsibilities.length})

                    </span>

                    <ul className="list-disc list-inside space-y-0.5 text-foreground leading-relaxed">

                      {authoringRole.responsibilities.map((resp, idx) => (

                        <li key={idx} className="pl-0.5 text-xs">

                          {resp}

                        </li>

                      ))}

                    </ul>

                  </div>

                )}

              </div>



              {/* Role Level Tier Selector (Configuring competencies and micro-skills per level) */}

              <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-2.5">

                <div className="flex items-center justify-between flex-wrap gap-2">

                  <div className="flex items-center gap-3 flex-wrap">

                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">

                      Target Role Levels — Select Level To Configure

                    </span>

                    <label className="flex items-center gap-1.5 text-xs text-foreground cursor-pointer font-medium">

                      <input

                        type="checkbox"

                        checked={isMultiLevelMode}

                        onChange={(e) => {

                          const checked = e.target.checked

                          setIsMultiLevelMode(checked)

                          if (!checked && selectedAuthoringLevels.length > 1) {

                            setSelectedAuthoringLevels([selectedAuthoringLevels[0] || currentRoleLevels[0]])

                          }

                        }}

                        className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary cursor-pointer"

                      />

                      <span className="text-[11px] font-semibold">Multi-level edit</span>

                    </label>

                  </div>

                </div>

                <div className="flex items-center gap-2 flex-wrap">

                  {/* All Levels Option */}

                  <button

                    type="button"

                    onClick={() => {

                      setSelectedAuthoringLevels([...currentRoleLevels])

                    }}

                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-2 border cursor-pointer ${

                      isAllLevelsSelected

                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'

                        : 'bg-card text-foreground hover:bg-muted/40 border-border'

                    }`}

                  >

                    <span>All Levels ({currentRoleLevels.length})</span>

                  </button>

                  {currentRoleLevels.map((lvl) => {

                    const isSelected = selectedAuthoringLevels.includes(lvl)

                    const lvlComps = (authoringRole.levelCompetencies?.[lvl] || (lvl === currentRoleLevels[0] ? authoringRole.competencyIds : [])) || []

                    const lvlSkills = authoringRole.skillTargets.filter((st) => (st.level || currentRoleLevels[0]) === lvl)

                    return (

                      <button

                        key={lvl}

                        type="button"

                        onClick={() => {

                          if (isMultiLevelMode) {

                            if (isSelected && selectedAuthoringLevels.length > 1) {

                              setSelectedAuthoringLevels(selectedAuthoringLevels.filter((l) => l !== lvl))

                            } else {

                              setSelectedAuthoringLevels(Array.from(new Set([...selectedAuthoringLevels, lvl])))

                            }

                          } else {

                            setSelectedAuthoringLevels([lvl])

                          }

                        }}

                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-2 border cursor-pointer ${

                          isSelected && !isAllLevelsSelected

                            ? 'bg-primary text-primary-foreground border-primary shadow-xs'

                            : isSelected

                            ? 'bg-primary/80 text-primary-foreground border-primary'

                            : 'bg-card text-foreground hover:bg-muted/40 border-border'

                        }`}

                      >

                        <span>{lvl}</span>

                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>

                          {lvlSkills.length} skills · {lvlComps.length} comps

                        </span>

                      </button>

                    )

                  })}

                </div>

              </div>



              {/* Target Role Competencies Section (Configured by Domain Expert for Selected Level(s)) */}

              <div className="p-3.5 rounded-lg border border-border bg-card space-y-3 relative z-30">

                <div className="font-semibold text-foreground flex items-center justify-between">

                  <span className="flex items-center gap-1.5">

                    <Layers className="h-4 w-4 text-primary" />

                    Required Competencies for {selectedLevelNamesLabel} ({displayedCompetenciesList.length})

                  </span>

                  <span className="text-[10px] text-muted-foreground font-normal">

                    Macro knowledge &amp; functional capability clusters for {selectedLevelNamesLabel}

                  </span>

                </div>



                {authoringRole.status !== 'published' && authoringRole.status !== 'submitted' && (

                  <div className="flex items-end gap-2.5">

                    <div className="flex-1">

                      <label className="text-[11px] font-semibold text-foreground block mb-1">

                        Select Competency for {selectedLevelNamesLabel}

                      </label>

                      <Combobox

                        size="sm"

                        clearable={false}

                        options={competencyOptions}

                        value={newCompetencyId}

                        onChange={(val) => setNewCompetencyId(val)}

                        placeholder={`Search & select competency for ${selectedLevelNamesLabel}...`}

                        searchPlaceholder="Search by competency code or title..."

                        emptyMessage={`All competencies are already assigned to ${selectedLevelNamesLabel}`}

                      />

                    </div>

                    <Button

                      type="button"

                      variant="primary"

                      size="sm"

                      disabled={!newCompetencyId}

                      onClick={() => handleAddCompetency(newCompetencyId)}

                      className="font-semibold shadow-2xs whitespace-nowrap px-3 text-xs shrink-0"

                      leftIcon={<Plus className="h-3.5 w-3.5" />}

                    >

                      Add Competency

                    </Button>

                  </div>

                )}



                {displayedCompetenciesList.length > 2 && (

                  <div className="relative">

                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />

                    <input

                      type="text"

                      placeholder="Filter configured competencies by code or name..."

                      value={configuredCompetencySearch}

                      onChange={(e) => setConfiguredCompetencySearch(e.target.value)}

                      className="w-full pl-8 pr-3 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"

                    />

                  </div>

                )}



                {displayedCompetenciesList.length === 0 ? (

                  <div className="p-6 rounded-lg border border-dashed border-border text-center text-muted-foreground space-y-1">

                    <AlertCircle className="h-5 w-5 mx-auto text-warning" />

                    <p className="font-semibold text-foreground">No Competencies Configured Yet</p>

                    <p className="text-[11px]">

                      Select and add macro competencies above to structure requirements for {selectedLevelNamesLabel}.

                    </p>

                  </div>

                ) : (() => {

                  const filteredCompetencies = displayedCompetenciesList.filter((item) => {

                    const compObj = realCompetencies.find((c) => c.id === item.compId || c.code === item.compId)

                    const code = compObj?.code || item.compId

                    const name = compObj?.name || item.compId

                    const q = configuredCompetencySearch.trim().toLowerCase()

                    return !q || code.toLowerCase().includes(q) || name.toLowerCase().includes(q)

                  })



                  if (filteredCompetencies.length === 0) {

                    return (

                      <div className="p-4 rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground">

                        No configured competencies match the search query.

                      </div>

                    )

                  }



                  return (

                    <div className="rounded-lg border border-border overflow-hidden">

                      <table className="w-full text-left text-xs">

                        <thead className="bg-muted/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">

                          <tr>

                            <th className="py-2.5 px-3">Level</th>

                            <th className="py-2.5 px-3">Competency Code &amp; Name</th>

                            <th className="py-2.5 px-3">Description</th>

                            {authoringRole.status !== 'published' && authoringRole.status !== 'submitted' && (

                              <th className="py-2.5 px-3 text-right">Action</th>

                            )}

                          </tr>

                        </thead>

                        <tbody className="divide-y divide-border">

                          {filteredCompetencies.map(({ compId, level }) => {

                            const compObj = realCompetencies.find((c) => c.id === compId || c.code === compId)

                            const code = compObj?.code || compId

                            const name = compObj?.name || compId

                            const desc = compObj?.description || 'Macro capability cluster for target role'



                            return (

                              <tr key={`${compId}-${level}`} className="hover:bg-muted/20">

                                <td className="py-2.5 px-3">

                                  <Badge variant="secondary" className="font-semibold text-[10px]">

                                    {level}

                                  </Badge>

                                </td>

                                <td className="py-2.5 px-3">

                                  <span className="font-mono font-bold text-primary mr-1.5">{code}</span>

                                  <span className="text-foreground font-medium">{name}</span>

                                </td>

                                <td className="py-2.5 px-3 text-muted-foreground">

                                  <div className="line-clamp-2 overflow-hidden text-xs text-muted-foreground leading-relaxed break-words" title={desc}>

                                    {desc}

                                  </div>

                                </td>

                                {authoringRole.status !== 'published' && authoringRole.status !== 'submitted' && (

                                  <td className="py-2.5 px-3 text-right">

                                    <Button

                                      variant="ghost"

                                      size="sm"

                                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"

                                      onClick={() => handleRemoveCompetency(compId, level)}

                                      title={`Detach Competency from ${level}`}

                                      aria-label={`Detach Competency from ${level}`}

                                    >

                                      <Trash2 className="h-3.5 w-3.5" />

                                    </Button>

                                  </td>

                                )}

                              </tr>

                            )

                          })}

                        </tbody>

                      </table>

                    </div>

                  )

                })()}

              </div>



              {/* Form to Add New Micro-Skill Target for Selected Level(s) */}

              {authoringRole.status !== 'published' && authoringRole.status !== 'submitted' && (

                <div className="p-3.5 rounded-lg border border-border bg-card space-y-3 relative z-20">

                  <div className="font-semibold text-foreground flex items-center justify-between">

                    <span className="flex items-center gap-1.5">

                      <Plus className="h-4 w-4 text-primary" />

                      Add Micro-skill Target ({selectedLevelNamesLabel})

                    </span>

                    <span className="text-[10px] text-muted-foreground font-normal">

                      Assign required target mastery to {selectedLevelNamesLabel}

                    </span>

                  </div>



                  {commonCompetencyIds.length === 0 ? (

                    <div className="p-4 rounded-lg border border-dashed border-border bg-muted/20 text-center text-xs text-muted-foreground">

                      {selectedAuthoringLevels.length === 1 ? (

                        <span>Please assign at least one competency for <strong>{selectedLevelNamesLabel}</strong> level above before configuring required micro-skills.</span>

                      ) : (

                        <span>The selected levels (<strong>{selectedLevelNamesLabel}</strong>) do not share any common competencies yet. Assign at least one common competency above or select an individual level to configure micro-skills.</span>

                      )}

                    </div>

                  ) : (

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">

                      <div className="sm:col-span-7">

                        <label className="text-[11px] font-semibold text-foreground block mb-1">

                          Micro-skill for {selectedLevelNamesLabel} <span className="text-destructive">*</span>

                        </label>

                        <Combobox

                          size="sm"

                          clearable={false}

                          options={skillOptions}

                          value={newSkillId}

                          onChange={(val) => setNewSkillId(val)}

                          placeholder={`Search & select micro-skill for ${selectedLevelNamesLabel}...`}

                          searchPlaceholder="Search by skill code or title..."

                          emptyMessage={`All member skills for ${selectedLevelNamesLabel} are already assigned`}

                        />

                      </div>



                      <div className="sm:col-span-2">

                        <label className="text-[11px] font-semibold text-foreground block mb-1">

                          Target Mastery (%)

                        </label>

                        <input

                          type="number"

                          min={1}

                          max={100}

                          step={5}

                          value={newThreshold}

                          onChange={(e) => setNewThreshold(Number(e.target.value))}

                          className="w-full px-2.5 py-1.5 rounded-md bg-background border border-border text-foreground text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary text-center"

                        />

                      </div>



                      <div className="sm:col-span-3">

                        <Button

                          type="button"

                          variant="primary"

                          size="sm"

                          disabled={!newSkillId}

                          onClick={handleAddSkillTarget}

                          className="w-full font-semibold shadow-2xs whitespace-nowrap px-3 text-xs justify-center"

                          leftIcon={<Plus className="h-3.5 w-3.5 shrink-0" />}

                        >

                          Assign Skill

                        </Button>

                      </div>

                    </div>

                  )}

                </div>

              )}



              {/* Table of Assigned Micro-Skill Targets for Selected Level(s) */}

              <div className="space-y-2.5">

                <div className="flex items-center justify-between text-xs font-semibold text-foreground">

                  <span className="flex items-center gap-1.5">

                    <Layers className="h-4 w-4 text-primary" />

                    Configured Micro-skills for {selectedLevelNamesLabel} ({displayedSkillTargets.length})

                  </span>

                  <span className="text-[10px] text-muted-foreground font-normal">

                    Target Mastery Required

                  </span>

                </div>



                {displayedSkillTargets.length > 2 && (

                  <div className="relative">

                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />

                    <input

                      type="text"

                      placeholder="Filter configured targets by code or name..."

                      value={configuredSkillSearch}

                      onChange={(e) => setConfiguredSkillSearch(e.target.value)}

                      className="w-full pl-8 pr-3 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"

                    />

                  </div>

                )}



                {displayedSkillTargets.length === 0 ? (

                  <div className="p-6 rounded-lg border border-dashed border-border text-center text-muted-foreground space-y-1">

                    <AlertCircle className="h-5 w-5 mx-auto text-warning" />

                    <p className="font-semibold text-foreground">No Micro-skills Configured for {selectedLevelNamesLabel}</p>

                    <p className="text-[11px]">

                      Add the required micro-skills above to specify proficiency targets for {selectedLevelNamesLabel}.

                    </p>

                  </div>

                ) : (() => {

                  const filteredTargets = displayedSkillTargets.filter((st) => {

                    const matchesSearch =

                      !configuredSkillSearch.trim() ||

                      st.skillCode.toLowerCase().includes(configuredSkillSearch.toLowerCase()) ||

                      st.skillName.toLowerCase().includes(configuredSkillSearch.toLowerCase())

                    return matchesSearch

                  })



                  if (filteredTargets.length === 0) {

                    return (

                      <div className="p-4 rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground">

                        No configured targets match the search query for {selectedLevelNamesLabel}.

                      </div>

                    )

                  }



                  return (

                    <div className="rounded-lg border border-border overflow-hidden">

                      <table className="w-full text-left text-xs">

                        <thead className="bg-muted/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">

                          <tr>

                            <th className="py-2.5 px-3">Level</th>

                            <th className="py-2.5 px-3">Skill Code &amp; Name</th>

                            <th className="py-2.5 px-3 text-center">Target Mastery</th>

                            {authoringRole.status !== 'published' && authoringRole.status !== 'submitted' && (

                              <th className="py-2.5 px-3 text-right">Action</th>

                            )}

                          </tr>

                        </thead>

                        <tbody className="divide-y divide-border">

                          {filteredTargets.map((st) => {

                            const stLevel = st.level || currentRoleLevels[0]

                            const prereqOf = realPrerequisites.filter(

                              (p) =>

                                (p.targetSkillId === st.skillId || p.targetSkillCode === st.skillCode) &&

                                displayedSkillTargets.some((other) => other.skillId === p.sourceSkillId || other.skillCode === p.sourceSkillCode)

                            )

                            const requiresSkill = realPrerequisites.filter(

                              (p) =>

                                (p.sourceSkillId === st.skillId || p.sourceSkillCode === st.skillCode) &&

                                displayedSkillTargets.some((other) => other.skillId === p.targetSkillId || other.skillCode === p.targetSkillCode)

                            )

                            const missingPrereqs = realPrerequisites.filter(

                              (p) =>

                                (p.sourceSkillId === st.skillId || p.sourceSkillCode === st.skillCode) &&

                                !displayedSkillTargets.some((other) => other.skillId === p.targetSkillId || other.skillCode === p.targetSkillCode)

                            )



                            const isEditingThisSkill = editingSkillKey === `${st.skillId}-${stLevel}`



                            return (

                              <tr key={`${st.skillId}-${stLevel}`} className="hover:bg-muted/20">

                                <td className="py-2.5 px-3">

                                  <Badge variant="secondary" className="font-semibold text-[10px]">

                                    {stLevel}

                                  </Badge>

                                </td>

                                <td className="py-2.5 px-3">

                                  <div className="flex items-center gap-1.5 flex-wrap">

                                    <span className="font-mono font-bold text-foreground mr-1.5">{st.skillCode}</span>

                                    <span className="text-muted-foreground">{st.skillName}</span>

                                    {prereqOf.length > 0 && (

                                      <Badge variant="outline" className="text-[9.5px] font-mono text-primary border-primary/30 bg-primary/5">

                                        Prereq for {prereqOf.map((p) => p.sourceSkillCode || p.sourceSkillId).join(', ')}

                                      </Badge>

                                    )}

                                    {requiresSkill.length > 0 && (

                                      <Badge variant="outline" className="text-[9.5px] font-mono text-amber-600 border-amber-500/30 bg-amber-500/5">

                                        Requires {requiresSkill.map((p) => p.targetSkillCode || p.targetSkillId).join(', ')}

                                      </Badge>

                                    )}

                                    {missingPrereqs.length > 0 && (

                                      <Badge variant="outline" className="text-[9.5px] font-mono text-destructive border-destructive/30 bg-destructive/5" title="Prerequisite skill not yet added to this level">

                                        Missing prereq: {missingPrereqs.map((p) => p.targetSkillCode || p.targetSkillId).join(', ')}

                                      </Badge>

                                    )}

                                  </div>

                                </td>

                                <td className="py-2.5 px-3 text-center">

                                  {isEditingThisSkill ? (

                                    <div className="flex items-center justify-center gap-1">

                                      <input

                                        type="number"

                                        min={1}

                                        max={100}

                                        value={editingMasteryValue}

                                        onChange={(e) => setEditingMasteryValue(Number(e.target.value))}

                                        onKeyDown={(e) => {

                                          if (e.key === 'Enter') handleSaveMasteryEdit(st.skillId, stLevel)

                                          if (e.key === 'Escape') setEditingSkillKey(null)

                                        }}

                                        autoFocus

                                        className="w-16 h-7 text-center font-mono font-bold text-xs bg-card border border-primary rounded px-1 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"

                                      />

                                      <span className="text-xs font-mono font-semibold text-muted-foreground">%</span>

                                    </div>

                                  ) : (

                                    <span className="font-mono font-bold text-primary">

                                      {st.threshold}%

                                    </span>

                                  )}

                                </td>

                                {authoringRole.status !== 'published' && authoringRole.status !== 'submitted' && (

                                  <td className="py-2.5 px-3 text-right">

                                    {isEditingThisSkill ? (

                                      <div className="flex items-center justify-end gap-1">

                                        <Button

                                          variant="primary"

                                          size="sm"

                                          className="h-7 px-2 text-xs font-semibold gap-1 cursor-pointer"

                                          onClick={() => handleSaveMasteryEdit(st.skillId, stLevel)}

                                          title="Save target mastery"

                                        >

                                          <Check className="h-3 w-3" />

                                          <span>Save</span>

                                        </Button>

                                        <Button

                                          variant="ghost"

                                          size="sm"

                                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"

                                          onClick={() => setEditingSkillKey(null)}

                                          title="Cancel editing"

                                        >

                                          <X className="h-3.5 w-3.5" />

                                        </Button>

                                      </div>

                                    ) : (

                                      <div className="flex items-center justify-end gap-1">

                                        <Button

                                          variant="ghost"

                                          size="sm"

                                          className="h-7 w-7 p-0 text-muted-foreground hover:text-primary cursor-pointer"

                                          onClick={() => {

                                            setEditingSkillKey(`${st.skillId}-${stLevel}`)

                                            setEditingMasteryValue(st.threshold)

                                          }}

                                          title="Edit Target Mastery"

                                          aria-label="Edit Target Mastery"

                                        >

                                          <Edit3 className="h-3.5 w-3.5" />

                                        </Button>

                                        <Button

                                          variant="ghost"

                                          size="sm"

                                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive cursor-pointer"

                                          onClick={() => handleRemoveSkillTarget(st.skillId, stLevel)}

                                          title="Detach Micro-skill"

                                          aria-label="Detach Micro-skill"

                                        >

                                          <Trash2 className="h-3.5 w-3.5" />

                                        </Button>

                                      </div>

                                    )}

                                  </td>

                                )}

                              </tr>

                            )

                          })}

                        </tbody>

                      </table>

                    </div>

                  )

                })()}

              </div>

            </div>



            <DialogFooter className="shrink-0 flex items-center justify-between sm:justify-between w-full pt-3 border-t border-border mt-2">

              <Button

                variant="outline"

                size="sm"

                onClick={() => {

                  if (prereqConfirmTimerRef.current) clearTimeout(prereqConfirmTimerRef.current)

                  setIsAwaitingPrereqConfirmation(false)

                  setIsAuthoringModalOpen(false)

                  setAuthoringRole(null)

                }}

              >

                Close

              </Button>

              {!isAuthoringApproved && authoringRole.status !== 'published' && (

                <div className="flex items-center gap-2">

                  <Button

                    variant="outline"

                    size="sm"

                    disabled={isSavingDraft}

                    onClick={() => {

                      if (prereqConfirmTimerRef.current) clearTimeout(prereqConfirmTimerRef.current)

                      setIsAwaitingPrereqConfirmation(false)

                      handleSaveAuthoringDraft()

                    }}

                    className="font-semibold"

                  >

                    {isSavingDraft ? 'Saving Draft...' : 'Save Draft'}

                  </Button>

                  {isAwaitingPrereqConfirmation ? (

                    <Button

                      variant="primary"

                      size="sm"

                      onClick={handleInitiateSubmitToManager}

                      className="font-semibold shadow-md bg-amber-600 hover:bg-amber-700 text-white border-amber-600 animate-pulse transition-all duration-200"

                      leftIcon={<AlertTriangle className="h-4 w-4" />}

                      title="Click again within 6 seconds to confirm submission with unassigned prerequisites"

                    >

                      Confirm Submit ({authoringRoleMissingPrereqs.length} Missing Prereq{authoringRoleMissingPrereqs.length > 1 ? 's' : ''})

                    </Button>

                  ) : (

                    <Button

                      variant="primary"

                      size="sm"

                      disabled={authoringRole.skillTargets.length === 0 || isSavingDraft}

                      onClick={handleInitiateSubmitToManager}

                      className="font-semibold shadow-2xs"

                      leftIcon={<Send className="h-4 w-4" />}

                    >

                      {isAuthoringFeedback || isAuthoringRejected ? 'Re-submit to L&D Manager' : 'Submit to L&D Manager'}

                    </Button>

                  )}

                </div>

              )}

            </DialogFooter>

        </Dialog>

        )

      })()}



      {/* TARGET ROLE DETAILS MODAL (Read-Only Architectural Metadata for Domain Expert) */}

      {viewingDetailsRole && (

        <Dialog

          open={Boolean(viewingDetailsRole)}

          onOpenChange={(open) => !open && setViewingDetailsRole(null)}

          className="max-w-5xl w-full h-[88vh] max-h-[88vh] flex flex-col p-6 overflow-hidden"

        >

          <DialogHeader className="shrink-0 mb-3">

              <div className="flex flex-wrap items-center justify-between gap-2.5">

                <DialogTitle className="flex items-center gap-2">

                  <Briefcase className="h-5 w-5 text-primary shrink-0" />

                  <span>Target Role Details: {viewingDetailsRole.title}</span>

                </DialogTitle>

                {(() => {

                  const viewEffStatus = getExpertEffectiveStatus(viewingDetailsRole)

                  return (

                    <Badge

                      variant={

                        viewEffStatus === 'published' || viewEffStatus === 'approved'

                          ? 'success'

                          : viewEffStatus === 'feedback'

                          ? 'outline'

                          : viewEffStatus === 'rejected'

                          ? 'destructive'

                          : 'warning'

                      }

                      className={

                        viewEffStatus === 'approved'

                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold dark:text-emerald-400 text-xs'

                          : viewEffStatus === 'feedback'

                          ? 'bg-amber-500/15 !text-black border-amber-500/30 font-bold dark:!text-black text-xs'

                          : 'font-bold text-xs'

                      }

                    >

                      {viewEffStatus.toUpperCase()}

                    </Badge>

                  )

                })()}

              </div>

              <DialogDescription>

                View role specifications, competency requirements, and benchmark proficiency levels.

              </DialogDescription>

            </DialogHeader>



          <div className="flex-1 overflow-y-auto pr-1.5 space-y-4 text-xs min-h-0">



            {/* Rejection / Revision Feedback Callout */}

            {(() => {

              const viewEffStatus = getExpertEffectiveStatus(viewingDetailsRole)

              const cleanViewRejectionReason = (viewingDetailsRole.rejectionReason || '').replace(/^\[(EXPERT|LD_MANAGER)\]:\s*/, '')

              if (!cleanViewRejectionReason) return null



              if (viewEffStatus === 'feedback') {

                return (

                  <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-black flex items-start gap-2.5">

                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-black" />

                    <div className="text-black">

                      <div className="font-bold text-black">L&amp;D Manager Revision Feedback:</div>

                      <div className="mt-1 leading-relaxed whitespace-pre-wrap text-black">{cleanViewRejectionReason}</div>

                    </div>

                  </div>

                )

              }



              if (viewEffStatus === 'rejected') {

                return (

                  <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/25 text-xs text-destructive flex items-start gap-2.5">

                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-destructive" />

                    <div>

                      <div className="font-bold text-foreground">Proposal Rejected Notes:</div>

                      <div className="mt-1 text-foreground leading-relaxed whitespace-pre-wrap">{cleanViewRejectionReason}</div>

                    </div>

                  </div>

                )

              }

              return null

            })()}



            {/* Meta Grid (Exactly matching screenshot) */}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">

              <div className="p-3 rounded-lg border border-border bg-card">

                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Role Code</span>

                <span className="font-mono font-bold text-foreground mt-0.5 block">{viewingDetailsRole.code}</span>

              </div>

              <div className="p-3 rounded-lg border border-border bg-card">

                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Version</span>

                <span className="font-mono font-bold text-foreground mt-0.5 block">v{viewingDetailsRole.version}</span>

              </div>

              <div className="p-3 rounded-lg border border-border bg-card">

                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Assigned Domain Expert</span>

                <span className="font-semibold text-primary mt-0.5 truncate block">

                  {viewingDetailsRole.assignedExpertName || ELIGIBLE_EXPERTS.find((e) => e.id === viewingDetailsRole.assignedExpertId)?.name || activeExpert.name}

                </span>

              </div>

            </div>



            {/* O*NET Occupation Banner */}

            {(() => {

              const occ = resolveOccupationForRole(viewingDetailsRole)

              return (

                <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">

                  <div>

                    <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">

                      Occupation

                    </div>

                    <div className="text-sm font-bold text-foreground flex items-center gap-2 mt-0.5">

                      <span>{viewingDetailsRole.occupationTitle || occ.name}</span>

                      <Badge variant="outline" className="font-mono text-xs font-semibold text-primary border-primary/30">

                        {viewingDetailsRole.occupationCode || occ.code}

                      </Badge>

                    </div>

                    <p className="text-[11px] text-muted-foreground mt-1 max-w-xl">

                      {occ.description}

                    </p>

                  </div>

                  <div className="shrink-0 text-right sm:border-l sm:border-border sm:pl-4">

                    <Badge variant="secondary" className="text-[10px] font-semibold">

                      Job Zone 4

                    </Badge>

                    <div className="text-[10px] text-muted-foreground mt-1">Considerable Preparation</div>

                  </div>

                </div>

              )

            })()}



            {/* Role Objective & Scope (Read-only) */}

            <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2 text-xs">

              <div>

                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">

                  Role Objective &amp; Scope

                </span>

                <p className="text-foreground leading-relaxed">

                  {viewingDetailsRole.description || 'Specialist responsible for enterprise prompt pipelines, agentic orchestration, and domain knowledge injection. Awaiting domain expert micro-skill configuration.'}

                </p>

              </div>

            </div>



            {/* Core Responsibilities (Read-only) */}

            {viewingDetailsRole.responsibilities && viewingDetailsRole.responsibilities.length > 0 && (

              <div className="p-3 rounded-lg border border-border bg-card space-y-1.5 text-xs">

                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">

                  Core Responsibilities ({viewingDetailsRole.responsibilities.length})

                </span>

                <ul className="list-disc list-inside space-y-1 text-foreground leading-relaxed">

                  {viewingDetailsRole.responsibilities.map((resp, idx) => (

                    <li key={idx} className="pl-1 text-xs">

                      {resp}

                    </li>

                  ))}

                </ul>

              </div>

            )}



                  {/* View Mode Toggle: Specifications vs Version Diff */}

                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border">

                    <div className="inline-flex p-0.5 rounded-lg bg-muted border border-border">

                      <button

                        type="button"

                        onClick={() => setDetailViewMode('specs')}

                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${

                          detailViewMode === 'specs'

                            ? 'bg-card text-foreground font-bold shadow-2xs border border-border/80'

                            : 'text-muted-foreground hover:text-foreground'

                        }`}

                      >

                        Architecture Specifications

                      </button>

                      <button

                        type="button"

                        onClick={() => setDetailViewMode('diff')}

                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${

                          detailViewMode === 'diff'

                            ? 'bg-card text-foreground font-bold shadow-2xs border border-border/80'

                            : 'text-muted-foreground hover:text-foreground'

                        }`}

                      >

                        <Diff className="h-3.5 w-3.5 text-primary" />

                        <span>Version Changes (Diff)</span>

                      </button>

                    </div>



                    <span className="text-[11px] text-muted-foreground font-medium">

                      {detailViewMode === 'diff'

                        ? 'Compare against previous baseline'

                        : 'Inspect levels, competencies & skills'}

                    </span>

                  </div>



                  {detailViewMode === 'diff' ? (

                    <TargetRoleVersionDiff

                      currentRole={viewingDetailsRole}

                      allRoles={assignedRoles}

                      competencies={realCompetencies}

                      microSkills={companyMicroSkills}

                    />

                  ) : (

                    <>

                  {/* Dynamic Target Role Levels & Competency Matrix */}

                  {(() => {

                    const detailRoleLevels = viewingDetailsRole.levels && viewingDetailsRole.levels.length > 0

                      ? viewingDetailsRole.levels

                      : ['Junior', 'Middle', 'Senior']



                    return (

                      <div className="space-y-3">

                        <div className="flex items-center justify-between flex-wrap gap-2">

                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">

                            Target Role Levels &amp; Competency Matrix

                          </span>

                          <div className="flex items-center gap-1.5 flex-wrap">

                            <button

                              type="button"

                              onClick={() => setSelectedDetailLevelTab('ALL')}

                              className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all cursor-pointer ${

                                selectedDetailLevelTab === 'ALL'

                                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'

                                  : 'bg-card text-muted-foreground hover:bg-muted/40 border-border'

                              }`}

                            >

                              All Levels Overview

                            </button>

                            {detailRoleLevels.map((lvl) => {

                              const compCount = (viewingDetailsRole.levelCompetencies?.[lvl] || (lvl === detailRoleLevels[0] ? viewingDetailsRole.competencyIds : []))?.length || 0

                              const skillCount = viewingDetailsRole.skillTargets.filter((st) => (st.level || detailRoleLevels[0]) === lvl).length

                              return (

                                <button

                                  key={lvl}

                                  type="button"

                                  onClick={() => setSelectedDetailLevelTab(lvl)}

                                  className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${

                                    selectedDetailLevelTab === lvl

                                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'

                                      : 'bg-card text-foreground hover:bg-muted/40 border-border'

                                  }`}

                                >

                                  <span>{lvl}</span>

                                  <span className={`text-[10px] px-1 py-0.2 rounded-full font-mono ${selectedDetailLevelTab === lvl ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>

                                    {skillCount} skills · {compCount} comps

                                  </span>

                                </button>

                              )

                            })}

                          </div>

                        </div>



                        {/* Level Details View */}

                        {selectedDetailLevelTab === 'ALL' ? (

                          <div className="space-y-3">

                            {detailRoleLevels.map((lvl) => {

                              const compIds = (viewingDetailsRole.levelCompetencies?.[lvl] || (lvl === detailRoleLevels[0] ? viewingDetailsRole.competencyIds : [])) || []

                              const lvlSkills = viewingDetailsRole.skillTargets.filter((st) => (st.level || detailRoleLevels[0]) === lvl)



                              return (

                                <div key={lvl} className="p-3 rounded-lg border border-border bg-card space-y-2.5">

                                  <div className="flex items-center justify-between">

                                    <div className="flex items-center gap-2">

                                      <Badge variant="primary" className="font-bold text-xs">

                                        {lvl} Level

                                      </Badge>

                                      <span className="text-xs text-muted-foreground">

                                        {compIds.length} Competencies · {lvlSkills.length} Micro-skills

                                      </span>

                                    </div>

                                  </div>



                                  {/* Competencies */}

                                  <div>

                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">

                                      Required Competencies ({compIds.length})

                                    </span>

                                    {compIds.length === 0 ? (

                                      <p className="text-[11px] text-muted-foreground italic">No competencies configured for this level.</p>

                                    ) : (

                                      <div className="flex flex-wrap gap-1.5">

                                        {compIds.map((cid) => {

                                          const comp = realCompetencies.find((c) => c.id === cid || c.code === cid)

                                          return (

                                            <Badge key={cid} variant="secondary" className="text-[11px] py-1 px-2 font-medium">

                                              <span className="font-mono font-bold text-primary mr-1">{comp?.code || cid}:</span>

                                              <span>{comp?.name || cid}</span>

                                            </Badge>

                                          )

                                        })}

                                      </div>

                                    )}

                                  </div>



                                  {/* Micro-skills */}

                                  <div>

                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">

                                      Configured Micro-skills ({lvlSkills.length})

                                    </span>

                                    {lvlSkills.length === 0 ? (

                                      <p className="text-[11px] text-muted-foreground italic">No micro-skills configured for this level.</p>

                                    ) : (

                                      <div className="border border-border rounded overflow-hidden">

                                        <table className="w-full text-left text-xs">

                                          <thead className="bg-muted/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">

                                            <tr>

                                              <th className="py-1.5 px-2.5">Skill Code &amp; Name</th>

                                              <th className="py-1.5 px-2.5 text-center">Target Mastery</th>

                                            </tr>

                                          </thead>

                                          <tbody className="divide-y divide-border">

                                            {lvlSkills.map((st) => (

                                              <tr key={st.skillId || st.skillCode} className="hover:bg-muted/20">

                                                <td className="py-1.5 px-2.5">

                                                  <span className="font-mono font-bold text-foreground mr-1.5">{st.skillCode}</span>

                                                  <span className="text-muted-foreground">{st.skillName}</span>

                                                </td>

                                                <td className="py-1.5 px-2.5 text-center font-mono font-bold text-primary">

                                                  {st.threshold}%

                                                </td>

                                              </tr>

                                            ))}

                                          </tbody>

                                        </table>

                                      </div>

                                    )}

                                  </div>

                                </div>

                              )

                            })}

                          </div>

                        ) : (

                          // Single level active view

                          (() => {

                            const lvl = selectedDetailLevelTab

                            const compIds = (viewingDetailsRole.levelCompetencies?.[lvl] || (lvl === detailRoleLevels[0] ? viewingDetailsRole.competencyIds : [])) || []

                            const lvlSkills = viewingDetailsRole.skillTargets.filter((st) => (st.level || detailRoleLevels[0]) === lvl)



                            return (

                              <div className="p-3.5 rounded-lg border border-border bg-card space-y-3">

                                <div className="flex items-center justify-between pb-2 border-b border-border">

                                  <Badge variant="primary" className="font-bold text-xs">

                                    {lvl} Level Architecture

                                  </Badge>

                                  <span className="text-xs text-muted-foreground">

                                    {compIds.length} Competencies · {lvlSkills.length} Micro-skills

                                  </span>

                                </div>



                                {/* Competencies Table */}

                                <div className="space-y-1.5">

                                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">

                                    Required Competencies for {lvl} ({compIds.length})

                                  </span>

                                  {compIds.length === 0 ? (

                                    <div className="p-3 rounded border border-dashed border-border text-center text-xs text-muted-foreground">

                                      No competencies configured for {lvl} level yet.

                                    </div>

                                  ) : (

                                    <div className="border border-border rounded overflow-hidden">

                                      <table className="w-full text-left text-xs">

                                        <thead className="bg-muted/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">

                                          <tr>

                                            <th className="py-2 px-3">Code &amp; Name</th>

                                            <th className="py-2 px-3">Description</th>

                                          </tr>

                                        </thead>

                                        <tbody className="divide-y divide-border">

                                          {compIds.map((cid) => {

                                            const comp = realCompetencies.find((c) => c.id === cid || c.code === cid)

                                            return (

                                              <tr key={cid} className="hover:bg-muted/20">

                                                <td className="py-2 px-3">

                                                  <span className="font-mono font-bold text-primary mr-1.5">{comp?.code || cid}</span>

                                                  <span className="font-semibold text-foreground">{comp?.name || cid}</span>

                                                </td>

                                                <td className="py-2 px-3 text-muted-foreground">

                                                  <div className="line-clamp-2 overflow-hidden text-xs text-muted-foreground leading-relaxed break-words" title={comp?.description}>

                                                    {comp?.description || 'Core knowledge and functional capability cluster.'}

                                                  </div>

                                                </td>

                                              </tr>

                                            )

                                          })}

                                        </tbody>

                                      </table>

                                    </div>

                                  )}

                                </div>



                                {/* Micro-skills Table */}

                                <div className="space-y-1.5">

                                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">

                                    Configured Micro-skills for {lvl} ({lvlSkills.length})

                                  </span>

                                  {lvlSkills.length === 0 ? (

                                    <div className="p-3 rounded border border-dashed border-border text-center text-xs text-muted-foreground">

                                      No micro-skills configured for {lvl} level yet.

                                    </div>

                                  ) : (

                                    <div className="border border-border rounded overflow-hidden">

                                      <table className="w-full text-left text-xs">

                                        <thead className="bg-muted/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">

                                          <tr>

                                            <th className="py-2 px-3">Skill Code &amp; Name</th>

                                            <th className="py-2 px-3 text-center">Target Mastery</th>

                                          </tr>

                                        </thead>

                                        <tbody className="divide-y divide-border">

                                          {lvlSkills.map((st) => (

                                            <tr key={st.skillId || st.skillCode} className="hover:bg-muted/20">

                                              <td className="py-2 px-3">

                                                <span className="font-mono font-bold text-foreground mr-1.5">{st.skillCode}</span>

                                                <span className="text-muted-foreground">{st.skillName}</span>

                                              </td>

                                              <td className="py-2 px-3 text-center font-mono font-bold text-primary">

                                                {st.threshold}%

                                              </td>

                                            </tr>

                                          ))}

                                        </tbody>

                                      </table>

                                    </div>

                                  )}

                                </div>

                              </div>

                            )

                          })()

                        )}

                      </div>

                    )

                  })()}

                    </>

                  )}



          </div>



          <DialogFooter className="shrink-0 pt-3 border-t border-border mt-3 flex items-center justify-end gap-2 w-full">

            <Button variant="outline" size="sm" onClick={() => setViewingDetailsRole(null)}>

              Close

            </Button>

            {viewingDetailsRole.status !== 'published' && (

              <Button

                variant="primary"

                size="sm"

                onClick={() => {

                  const r = viewingDetailsRole

                  setViewingDetailsRole(null)

                  handleOpenAuthoring(r)

                }}

                leftIcon={<Sliders className="h-3.5 w-3.5" />}

              >

                Configure Micro-skills

              </Button>

            )}

          </DialogFooter>

        </Dialog>

      )}



      {/* Target-Role Knowledge Graph View Modal (REQ-018-F01) */}

      <TargetRoleGraphModal

        open={Boolean(graphRole)}

        onOpenChange={(open: boolean) => !open && setGraphRole(null)}

        roleId={graphRole?.id || null}

        organizationId={orgId}

        roleTitle={graphRole?.title}

        role={graphRole}

        skillTargets={graphRole?.skillTargets}

        levels={graphRole?.levels}

      />

    </WorkspaceLayout>

  )

}

