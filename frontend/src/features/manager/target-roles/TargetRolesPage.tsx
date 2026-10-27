import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CornerDownRight,
  Edit3,
  Eye,
  FileCheck,
  History,
  Layers,
  Network as NetworkIcon,
  Plus,
  Search,
  Send,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react'

import * as React from 'react'
import { TargetRoleGraphModal } from './components/TargetRoleGraphModal'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { Pagination } from '../../../shared/components/ui/Pagination'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../shared/components/ui/Dialog'
import { StatCard } from '../../../shared/components/ui/StatCard'
import {
  QuickConfigImportModal,
  type ImportPreset,
} from '../../../shared/components/import/QuickConfigImportModal'
import { useToast } from '../../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import {
  getActiveCompany,
  updateActiveCompany,
} from '../../../shared/stores/companyStore'
import {
  ELIGIBLE_EXPERTS,
  ONET_OCCUPATIONS,
  compareRoleVersions,
  formatDate,
  getEligibleExpertsForOccupation,
  resolveOccupationForRole,
  sortTargetRolesWithDraftsBelowPublished,
  type RoleLevelThresholds,
  type TargetRoleModel,
} from '../data/ldManagerMockData'
import { Combobox, type ComboboxOption } from '../../../shared/components/ui/Combobox'

const OCCUPATION_OPTIONS: ComboboxOption[] = ONET_OCCUPATIONS.map((occ) => ({
  value: occ.code,
  label: `${occ.code} — ${occ.name}`,
  description: occ.description,
}))

const getExpertOptionsForOccupation = (occupationCode?: string): ComboboxOption[] => {
  const eligible = getEligibleExpertsForOccupation(occupationCode)
  return eligible.map((exp) => ({
    value: exp.id,
    label: exp.name,
    description: exp.title,
  }))
}



const ROLE_PRESETS: ImportPreset[] = []

export type ManagerRoleStatus = 'published' | 'submitted' | 'sent' | 'draft' | 'feedback' | 'rejected'

export const getManagerEffectiveStatus = (role: TargetRoleModel): ManagerRoleStatus => {
  if (role.status === 'published') return 'published'
  if (role.status === 'submitted') return 'submitted'
  if (role.status === 'sent') return 'sent'
  if (role.status === 'rejected') {
    return role.rejectionReason?.startsWith('[LD_MANAGER]:') ? 'rejected' : 'feedback'
  }
  return 'draft'
}

export function TargetRolesPage() {
  const { toast } = useToast()

  // Master roles state
  const [roles, setRoles] = React.useState<TargetRoleModel[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<
    'all' | 'published' | 'draft' | 'submitted' | 'sent' | 'feedback' | 'rejected'
  >('all')
  const [expandedLineages, setExpandedLineages] = React.useState<Record<string, boolean>>({})

  const toggleLineage = (lineageKey: string) => {
    setExpandedLineages((prev) => ({
      ...prev,
      [lineageKey]: !prev[lineageKey],
    }))
  }

  const activeComp = getActiveCompany()
  const orgId = activeComp?.id || 'comp-technova'

  const fetchRoles = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/target-roles`, {
        headers: {
          'X-User-Role': 'LD_MANAGER',
        },
      })
      if (res.ok) {
        const data = await res.json()
        const mapped: TargetRoleModel[] = (data as Record<string, unknown>[]).map((r) => {
          const occ = resolveOccupationForRole({
            code: String(r.code || ''),
            title: String(r.name || ''),
            domainCode: String(r.domainCode || ''),
            familyCode: String(r.familyCode || ''),
            occupationCode: typeof r.occupationCode === 'string' ? r.occupationCode : undefined,
          })
          return {
            id: String(r.id || ''),
            stableId: String(r.code || ''),
            code: String(r.code || ''),
            title: String(r.name || ''),
            occupationCode: occ.code,
            occupationTitle: occ.name,
            scope: String(r.scope || r.description || occ.description),
            levels: Array.isArray(r.levels) && (r.levels as string[]).length > 0
              ? (r.levels as string[])
              : ((activeComp?.targetRoles || []).find((tr) => tr.id === String(r.id || '') || tr.code === String(r.code || ''))?.levels || ['Junior', 'Middle', 'Senior']),
            levelThresholds: (r.levelThresholds as RoleLevelThresholds) || { J: 60, M: 75, S: 90 },
            domainCode: String(r.domainCode || 'ICT'),
            familyCode: String(r.familyCode || occ.profiles[0] || 'DEV'),
            track: (r.track as TargetRoleModel['track']) || 'PROFESSIONAL',
            seniority: String(r.seniority || 'P3'),
            assignedExpertId: r.assignedExpertId ? String(r.assignedExpertId) : undefined,
            assignedExpertName: ELIGIBLE_EXPERTS.find((e) => e.id === r.assignedExpertId)?.name || String(r.assignedExpertId || ''),
            department: occ.name,
            description: String(r.description || ''),
            responsibilities: Array.isArray(r.responsibilities) ? (r.responsibilities as string[]) : [],
            version: String(r.version || '1.0'),
            status: (String(r.status || '').toLowerCase() === 'active' ? 'published' : String(r.status || 'draft').toLowerCase()) as TargetRoleModel['status'],
            rejectionReason: String(r.rejectionReason || ''),
            levelCompetencies: (r.levelCompetencies as Record<string, string[]>) || ((activeComp?.targetRoles || []).find((tr) => tr.id === String(r.id || '') || tr.code === String(r.code || ''))?.levelCompetencies || {}),
            competencyIds: Array.isArray(r.competencyIds) && (r.competencyIds as string[]).length > 0
              ? (r.competencyIds as string[])
              : ((activeComp?.targetRoles || []).find((tr) => tr.id === String(r.id || '') || tr.code === String(r.code || ''))?.competencyIds || []),
            skillTargets: Array.isArray(r.skillTargets) ? (r.skillTargets as TargetRoleModel['skillTargets']) : [],
            activeEnrollments: 0,
            createdAt: r.createdAt ? String(r.createdAt) : (r.updatedAt ? String(r.updatedAt) : '2026-01-01T00:00:00Z'),
            updatedAt: r.updatedAt ? String(r.updatedAt) : (r.createdAt ? String(r.createdAt) : '2026-01-01T00:00:00Z'),
          }
        })
        setRoles((prevRoles) => {
          return mapped.map((m) => {
            const prev = prevRoles.find((p) => p.id === m.id || p.code === m.code)
            const prevLevelComps = prev?.levelCompetencies && Object.keys(prev.levelCompetencies).length > 0
              ? prev.levelCompetencies
              : (m.levelCompetencies && Object.keys(m.levelCompetencies).length > 0 ? m.levelCompetencies : {})
            const prevCompetencyIds = prev?.competencyIds && prev.competencyIds.length > 0
              ? prev.competencyIds
              : (m.competencyIds && m.competencyIds.length > 0 ? m.competencyIds : Array.from(new Set(Object.values(prevLevelComps).flat())))
            return {
              ...m,
              levelCompetencies: prevLevelComps,
              competencyIds: prevCompetencyIds,
            }
          })
        })
      } else {
        setRoles([])
      }
    } catch {
      setRoles([])
    } finally {
      setIsLoading(false)
    }
  }, [orgId])

  React.useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  // Synchronize state when active company scope changes
  React.useEffect(() => {
    const handleSync = () => {
      fetchRoles()
    }
    window.addEventListener('active_company_changed', handleSync)
    return () => {
      window.removeEventListener('active_company_changed', handleSync)
    }
  }, [fetchRoles])

  // Explicit persistence helper to prevent circular re-render loops
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

  const companyCompetencies = activeComp?.competencies || []
  const companyMicroSkills = activeComp?.microSkills || []

  // Modals state
  const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = React.useState(false)
  const [isMappingsModalOpen, setIsMappingsModalOpen] = React.useState(false)
  const [isSkillTargetsModalOpen, setIsSkillTargetsModalOpen] = React.useState(false)
  const [isPublishModalOpen, setIsPublishModalOpen] = React.useState(false)
  const [isManagerRejectDialogOpen, setIsManagerRejectDialogOpen] = React.useState(false)
  const [managerRejectingRole, setManagerRejectingRole] = React.useState<TargetRoleModel | null>(null)
  const [managerRejectionReason, setManagerRejectionReason] = React.useState('')
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false)
  const [selectedRole, setSelectedRole] = React.useState<TargetRoleModel | null>(null)
  const [viewingDetailsRole, setViewingDetailsRole] = React.useState<TargetRoleModel | null>(null)
  const [graphRole, setGraphRole] = React.useState<TargetRoleModel | null>(null)
  const [deletingRole, setDeletingRole] = React.useState<TargetRoleModel | null>(null)
  const [selectedDetailLevelTab, setSelectedDetailLevelTab] = React.useState<string>('ALL')
  const [compSearchQuery, setCompSearchQuery] = React.useState('')

  const handleImportRoles = (data: unknown) => {
    const list = Array.isArray(data)
      ? data
      : (typeof data === 'object' && data !== null && 'roles' in data && Array.isArray((data as Record<string, unknown>).roles))
      ? ((data as Record<string, unknown>).roles as unknown[])
      : []
    const normalized: TargetRoleModel[] = list.map((itemRecord: unknown, idx: number) => {
      const item = (typeof itemRecord === 'object' && itemRecord !== null ? itemRecord : {}) as Record<string, unknown>
      return {
        id: (item.id as string) || `role-${Date.now()}-${idx}`,
        stableId: (item.stableId as string) || `role-uuid-${Date.now()}-${idx}`,
        code: String(item.code || `ROLE-IMP-${idx + 1}`).trim().toUpperCase(),
        title: String(item.title || 'Untitled Target Role').trim(),
        department: String(item.department || 'Machine Learning & Cognitive Architecture').trim(),
        description: String(item.description || 'Target career role definition').trim(),
        version: String(item.version || '1.0'),
        status: (item.status === 'draft' || item.status === 'submitted' || item.status === 'sent' || item.status === 'rejected') ? item.status : 'published',
        competencyIds: Array.isArray(item.competencyIds) ? (item.competencyIds as string[]) : [],
        skillTargets: Array.isArray(item.skillTargets) ? (item.skillTargets as TargetRoleModel['skillTargets']) : [],
        activeEnrollments: Number(item.activeEnrollments) || 0,
        updatedAt: String(item.updatedAt || new Date().toISOString().slice(0, 10)),
      }
    })
    saveAndSetRoles((prev) => [...normalized, ...prev])
  }

  // Form states for creating role
  const [roleForm, setRoleForm] = React.useState({
    code: '',
    title: '',
    occupationCode: '15-1252.00',
    scope: 'Design, code, and test applications, systems software, and infrastructure pipelines.',
    familyCode: 'DEV',
    domainCode: 'ICT' as 'ICT' | 'DATA' | 'AI',
    track: 'PROFESSIONAL' as 'PROFESSIONAL' | 'MANAGEMENT',
    seniority: 'P3',
    levelNames: ['Junior', 'Middle', 'Senior'],
    assignedExpertId: 'expert-chen',
    description: '',
  })

  // Form states for editing role (L&D Manager view/edit scope)
  const [editRoleForm, setEditRoleForm] = React.useState({
    title: '',
    occupationCode: '15-1252.00',
    scope: '',
    familyCode: 'DEV',
    domainCode: 'ICT' as 'ICT' | 'DATA' | 'AI',
    track: 'PROFESSIONAL' as 'PROFESSIONAL' | 'MANAGEMENT',
    seniority: 'P3',
    levelNames: ['Junior', 'Middle', 'Senior'],
    assignedExpertId: '',
    description: '',
  })

  // Dynamic expert options filtered to experts certified for the selected occupation
  const createExpertOptions: ComboboxOption[] = React.useMemo(() => {
    return getExpertOptionsForOccupation(roleForm.occupationCode)
  }, [roleForm.occupationCode])

  const editExpertOptions: ComboboxOption[] = React.useMemo(() => {
    return getExpertOptionsForOccupation(editRoleForm.occupationCode)
  }, [editRoleForm.occupationCode])

  // Sort criteria: defaults to 'latest' so newly created or updated roles go to the top
  const [sortBy, setSortBy] = React.useState<'latest' | 'title'>('latest')

  // Pagination states
  const [currentPage, setCurrentPage] = React.useState(1)
  const pageSize = 10

  // Reset page when search/filter/sort changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, sortBy])

  // Base list of roles visible to L&D Manager: hide unsubmitted expert successor drafts until submitted
  const managerVisibleRoles = React.useMemo(() => {
    return roles.filter((r) => {
      const isUnsubmittedSuccessorDraft =
        r.status === 'draft' &&
        roles.some(
          (p) =>
            (p.code === r.code || (p.stableId && p.stableId === r.stableId)) &&
            p.status === 'published' &&
            p.id !== r.id
        )
      return !isUnsubmittedSuccessorDraft
    })
  }, [roles])

  // Filtered and sorted roles: Drafts always immediately below their previous published version
  const filteredRoles = React.useMemo(() => {
    const sorted = sortTargetRolesWithDraftsBelowPublished(managerVisibleRoles, sortBy)
    return sorted.filter((r) => {
      const effStatus = getManagerEffectiveStatus(r)
      const matchesStatus =
        statusFilter === 'all' ||
        effStatus === statusFilter
      const matchesSearch =
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.department && r.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.domainCode && r.domainCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.familyCode && r.familyCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.assignedExpertName && r.assignedExpertName.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchesStatus && matchesSearch
    })
  }, [managerVisibleRoles, statusFilter, searchQuery, sortBy])

  // Visible roles considering collapsed/expanded lineages
  const visibleRoles = React.useMemo(() => {
    return filteredRoles.filter((role) => {
      const isPublished = role.status === 'published'
      const publishedInLineage = managerVisibleRoles
        .filter((r) => (r.stableId === role.stableId || r.code === role.code) && r.status === 'published')
        .sort((a, b) => compareRoleVersions(b.version, a.version))
      const newestPublished = publishedInLineage[0]
      const isOlderPublished = isPublished && newestPublished && role.id !== newestPublished.id
      const lineageKey = role.stableId || role.code
      const isLineageExpanded = Boolean(expandedLineages[lineageKey])
      return !(isOlderPublished && !isLineageExpanded)
    })
  }, [filteredRoles, managerVisibleRoles, expandedLineages])

  const totalPages = Math.max(1, Math.ceil(visibleRoles.length / pageSize))
  const paginatedRoles = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return visibleRoles.slice(start, start + pageSize)
  }, [visibleRoles, currentPage, pageSize])

  // Aggregate stats (based on managerVisibleRoles so unsubmitted expert drafts don't skew counts)
  const totalRoles = managerVisibleRoles.length
  const publishedRoles = managerVisibleRoles.filter((r) => getManagerEffectiveStatus(r) === 'published').length
  const draftRoles = managerVisibleRoles.filter((r) => getManagerEffectiveStatus(r) === 'draft').length
  const sentRoles = managerVisibleRoles.filter((r) => getManagerEffectiveStatus(r) === 'sent').length
  const submittedRoles = managerVisibleRoles.filter((r) => getManagerEffectiveStatus(r) === 'submitted').length
  const feedbackRoles = managerVisibleRoles.filter((r) => getManagerEffectiveStatus(r) === 'feedback').length
  const rejectedRoles = managerVisibleRoles.filter((r) => getManagerEffectiveStatus(r) === 'rejected').length


  // Handlers
  const handleOpenCreateRole = () => {
    const defaultOcc = ONET_OCCUPATIONS[0]
    const eligibleExperts = getEligibleExpertsForOccupation(defaultOcc.code)
    setRoleForm({
      code: `ROLE-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      title: '',
      occupationCode: defaultOcc.code,
      scope: defaultOcc.description,
      familyCode: defaultOcc.profiles[0] || 'DEV',
      domainCode: 'ICT',
      track: 'PROFESSIONAL',
      seniority: 'P3',
      levelNames: ['Junior', 'Middle', 'Senior'],
      assignedExpertId: eligibleExperts[0]?.id || 'expert-chen',
      description: defaultOcc.description,
    })
    setIsCreateRoleModalOpen(true)
  }

  const handleCreateRoleSubmit = async (targetStatus: 'draft' | 'sent' = 'draft') => {
    if (!roleForm.code.trim() || !roleForm.title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Role Code and Title are strictly required.',
        variant: 'destructive',
      })
      return
    }

    // Check unique code among active roles
    if (roles.some((r) => r.code.toUpperCase() === roleForm.code.trim().toUpperCase())) {
      toast({
        title: 'Duplicate Role Code',
        description: `Role Code ${roleForm.code} already exists in the role catalog.`,
        variant: 'destructive',
      })
      return
    }

    const orgId = activeComp?.id || 'comp-technova'
    let generatedId = `role-${Date.now()}`
    const selectedOcc = ONET_OCCUPATIONS.find((o) => o.code === roleForm.occupationCode) || ONET_OCCUPATIONS[0]
    const roleCode = roleForm.code.trim().toUpperCase()
    const backendStatus = targetStatus === 'sent' ? 'SENT' : 'DRAFT'
    const assignedExpert = ELIGIBLE_EXPERTS.find((e) => e.id === roleForm.assignedExpertId)
    const expertName = assignedExpert?.name || 'Assigned Expert'

    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/target-roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': 'LD_MANAGER',
        },
        body: JSON.stringify({
          code: roleCode,
          name: roleForm.title.trim(),
          domainCode: roleForm.domainCode,
          familyCode: roleForm.familyCode,
          track: roleForm.track,
          seniority: roleForm.seniority,
          responsibilities: [],
          assignedExpertId: roleForm.assignedExpertId,
          description: roleForm.scope || roleForm.description || selectedOcc.description,
          competencyIds: [],
          levels: roleForm.levelNames,
          status: backendStatus,
        }),
      })

      if (res.status === 409) {
        toast({
          title: 'Duplicate Role Code',
          description: `Role Code ${roleForm.code} already exists for this organization.`,
          variant: 'destructive',
        })
        return
      }

      if (res.ok) {
        await fetchRoles()
        setIsCreateRoleModalOpen(false)
        toast({
          title: targetStatus === 'sent' ? 'Target Role Created & Sent to Expert' : 'Target Role Draft Created',
          description: targetStatus === 'sent'
            ? `Role ${roleForm.title.trim()} (${roleCode}) created and dispatched to ${expertName}.`
            : `Draft role ${roleCode} - ${roleForm.title.trim()} created and saved to database.`,
          variant: 'success',
        })
        return
      }
    } catch {
      // Backend unavailable fallback
    }

    const newRole: TargetRoleModel = {
      id: generatedId,
      stableId: `role-uuid-${Date.now()}`,
      code: roleCode,
      title: roleForm.title.trim(),
      occupationCode: selectedOcc.code,
      occupationTitle: selectedOcc.name,
      scope: roleForm.scope || selectedOcc.description,
      levels: roleForm.levelNames,
      domainCode: roleForm.domainCode || 'ICT',
      familyCode: roleForm.familyCode || selectedOcc.profiles[0] || 'DEV',
      track: roleForm.track || 'PROFESSIONAL',
      seniority: roleForm.seniority || 'P3',
      responsibilities: [],
      assignedExpertId: roleForm.assignedExpertId,
      assignedExpertName: expertName,
      department: selectedOcc.name,
      description: roleForm.scope || roleForm.description || selectedOcc.description,
      version: '1.0',
      status: targetStatus === 'sent' ? 'sent' : 'draft',
      competencyIds: [],
      skillTargets: [],
      activeEnrollments: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    saveAndSetRoles([newRole, ...roles])
    setIsCreateRoleModalOpen(false)
    toast({
      title: targetStatus === 'sent' ? 'Target Role Created & Sent to Expert' : 'Target Role Draft Created',
      description: targetStatus === 'sent'
        ? `Role ${newRole.title} (${newRole.code}) created and dispatched to ${expertName}.`
        : `Draft role ${newRole.code} - ${newRole.title} initialized.`,
      variant: 'success',
    })
  }




  // Delete Target Role (Draft or Published)
  const handleDeleteRole = async (role: TargetRoleModel) => {
    const orgId = activeComp?.id || 'comp-technova'
    try {
      await fetch(`/api/v1/organizations/${orgId}/target-roles/${role.id}`, {
        method: 'DELETE',
        headers: {
          'X-User-Role': 'LD_MANAGER',
        },
      })
      await fetchRoles()
    } catch {
      // Local fallback
    }

    saveAndSetRoles((prev) => prev.filter((r) => r.id !== role.id))
    setDeletingRole(null)
    if (selectedRole?.id === role.id) {
      setIsSkillTargetsModalOpen(false)
      setSelectedRole(null)
    }
    if (viewingDetailsRole?.id === role.id) {
      setViewingDetailsRole(null)
    }
    toast({
      title: role.status === 'draft' ? 'Draft Role Discarded' : 'Target Role Deleted',
      description: `${role.title} (${role.code} v${role.version}) has been permanently deleted from the organization catalog.`,
      variant: 'info',
    })
  }

  // Open edit role modal (L&D Manager scope: edit attributes & assigned expert)
  const handleOpenEditRole = (role: TargetRoleModel) => {
    const occ = resolveOccupationForRole(role)
    const occCode = role.occupationCode || occ.code
    const eligibleExperts = getEligibleExpertsForOccupation(occCode)
    const isCurrentEligible = eligibleExperts.some((e) => e.id === role.assignedExpertId)
    const effectiveExpertId = isCurrentEligible
      ? (role.assignedExpertId || '')
      : (eligibleExperts[0]?.id || role.assignedExpertId || '')

    setSelectedRole(role)
    setEditRoleForm({
      title: role.title,
      occupationCode: occCode,
      scope: role.scope || role.description || occ.description,
      familyCode: role.familyCode || occ.profiles[0] || 'DEV',
      domainCode: (role.domainCode || 'ICT') as 'ICT' | 'DATA' | 'AI',
      track: (role.track || 'PROFESSIONAL') as 'PROFESSIONAL' | 'MANAGEMENT',
      seniority: role.seniority || 'P3',
      levelNames: role.levels && role.levels.length > 0 ? [...role.levels] : ['Junior', 'Middle', 'Senior'],
      assignedExpertId: effectiveExpertId,
      description: role.description || role.scope || occ.description,
    })
    setIsSkillTargetsModalOpen(true)
  }

  // Save updated role attributes (L&D Manager scope)
  const handleSaveEditRole = async (targetStatus?: 'draft' | 'sent') => {
    if (!selectedRole) return
    if (!editRoleForm.title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Role Title is strictly required.',
        variant: 'destructive',
      })
      return
    }

    const assignedExpert = ELIGIBLE_EXPERTS.find((e) => e.id === editRoleForm.assignedExpertId)
    const expertName = assignedExpert?.name || 'Assigned Expert'
    const selectedOcc = ONET_OCCUPATIONS.find((o) => o.code === editRoleForm.occupationCode) || ONET_OCCUPATIONS[0]
    const orgId = activeComp?.id || 'comp-technova'

    const newStatus = targetStatus === 'sent'
      ? 'SENT'
      : (selectedRole.status === 'published' ? 'ACTIVE' : selectedRole.status === 'sent' ? 'SENT' : selectedRole.status === 'submitted' ? 'SUBMITTED' : selectedRole.status === 'rejected' ? 'REJECTED' : 'DRAFT')

    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/target-roles/${selectedRole.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': 'LD_MANAGER',
        },
        body: JSON.stringify({
          name: editRoleForm.title.trim(),
          domainCode: editRoleForm.domainCode,
          familyCode: editRoleForm.familyCode,
          track: editRoleForm.track,
          seniority: editRoleForm.seniority,
          responsibilities: [],
          assignedExpertId: editRoleForm.assignedExpertId,
          description: editRoleForm.scope || editRoleForm.description || selectedOcc.description,
          status: newStatus,
          version: selectedRole.version,
          skillTargets: selectedRole.skillTargets,
          levels: editRoleForm.levelNames,
        }),
      })
      if (res.ok) {
        await fetchRoles()
      }
    } catch {
      // Local fallback
    }

    const updatedRole: TargetRoleModel = {
      ...selectedRole,
      title: editRoleForm.title.trim(),
      occupationCode: selectedOcc.code,
      occupationTitle: selectedOcc.name,
      scope: editRoleForm.scope || editRoleForm.description || selectedOcc.description,
      levels: editRoleForm.levelNames,
      domainCode: editRoleForm.domainCode || selectedRole.domainCode || 'ICT',
      familyCode: editRoleForm.familyCode || selectedRole.familyCode || selectedOcc.profiles[0] || 'DEV',
      track: editRoleForm.track || selectedRole.track || 'PROFESSIONAL',
      seniority: editRoleForm.seniority || selectedRole.seniority || 'P3',
      responsibilities: [],
      assignedExpertId: editRoleForm.assignedExpertId,
      assignedExpertName: expertName,
      department: selectedOcc.name,
      description: editRoleForm.scope || editRoleForm.description || selectedOcc.description,
      status: targetStatus === 'sent' ? 'sent' : selectedRole.status,
      updatedAt: new Date().toISOString(),
    }

    saveAndSetRoles((prev) => prev.map((r) => (r.id === selectedRole.id ? updatedRole : r)))
    setSelectedRole(updatedRole)
    setIsSkillTargetsModalOpen(false)
    toast({
      title: targetStatus === 'sent' ? 'Target Role Sent to Expert' : 'Target Role Updated',
      description: targetStatus === 'sent'
        ? `${updatedRole.title} (${updatedRole.code} v${updatedRole.version}) has been dispatched to ${expertName}.`
        : `Saved changes to ${updatedRole.code} - ${updatedRole.title}.`,
      variant: 'success',
    })
  }

  // L&D Manager: Approve and Publish submitted configuration (REQ-052)
  const handleApproveAndPublishRole = async (role: TargetRoleModel) => {
    const orgId = activeComp?.id || 'comp-technova'
    const updatedRole: TargetRoleModel = {
      ...role,
      status: 'published',
      updatedAt: new Date().toISOString(),
    }

    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/target-roles/${role.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': 'LD_MANAGER',
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
          status: 'ACTIVE',
          version: role.version,
          skillTargets: role.skillTargets,
          competencyIds: role.competencyIds,
          levels: role.levels,
        }),
      })
      if (res.ok) {
        await fetchRoles()
      } else {
        saveAndSetRoles((prev) => prev.map((r) => (r.id === role.id ? updatedRole : r)))
      }
    } catch {
      saveAndSetRoles((prev) => prev.map((r) => (r.id === role.id ? updatedRole : r)))
    }

    if (viewingDetailsRole?.id === role.id) {
      setViewingDetailsRole(updatedRole)
    }

    toast({
      title: 'Target Role Published',
      description: `${role.title} (${role.code} v${role.version}) has been approved and published to the organization catalog.`,
      variant: 'success',
    })
  }

  // L&D Manager: Open Reject dialog
  const handleOpenManagerRejectDialog = (role: TargetRoleModel) => {
    setManagerRejectingRole(role)
    setManagerRejectionReason('')
    setIsManagerRejectDialogOpen(true)
  }

  // L&D Manager: Confirm Reject & return configuration to expert for revision (REQ-052)
  const handleConfirmManagerRejection = async () => {
    if (!managerRejectingRole) return
    if (!managerRejectionReason.trim()) {
      toast({
        title: 'Revision Feedback Required',
        description: 'Please specify clear guidance or revision notes for the domain expert.',
        variant: 'destructive',
      })
      return
    }

    const orgId = activeComp?.id || 'comp-technova'
    const fullRejectionReason = `[LD_MANAGER]: ${managerRejectionReason.trim()}`
    const updatedRole: TargetRoleModel = {
      ...managerRejectingRole,
      status: 'rejected',
      rejectionReason: fullRejectionReason,
      updatedAt: new Date().toISOString(),
    }

    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/target-roles/${managerRejectingRole.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': 'LD_MANAGER',
        },
        body: JSON.stringify({
          name: managerRejectingRole.title,
          domainCode: managerRejectingRole.domainCode,
          familyCode: managerRejectingRole.familyCode,
          track: managerRejectingRole.track,
          seniority: managerRejectingRole.seniority,
          responsibilities: managerRejectingRole.responsibilities,
          assignedExpertId: managerRejectingRole.assignedExpertId,
          description: managerRejectingRole.description,
          status: 'REJECTED',
          version: managerRejectingRole.version,
          skillTargets: managerRejectingRole.skillTargets,
          competencyIds: managerRejectingRole.competencyIds,
          rejectionReason: fullRejectionReason,
        }),
      })
      if (res.ok) {
        await fetchRoles()
      } else {
        saveAndSetRoles((prev) => prev.map((r) => (r.id === managerRejectingRole.id ? updatedRole : r)))
      }
    } catch {
      saveAndSetRoles((prev) => prev.map((r) => (r.id === managerRejectingRole.id ? updatedRole : r)))
    }

    if (viewingDetailsRole?.id === managerRejectingRole.id) {
      setViewingDetailsRole(updatedRole)
    }

    setIsManagerRejectDialogOpen(false)
    setManagerRejectingRole(null)
    setManagerRejectionReason('')

    toast({
      title: 'Target Role Returned for Revision',
      description: `${updatedRole.title} (${updatedRole.code}) returned to draft status with revision guidance for the expert.`,
      variant: 'info',
    })
  }


  // Toggle Competency Mapping
  const handleToggleCompetency = (roleId: string, compId: string) => {
    // Check if competency is archived
    const comp = companyCompetencies.find((c) => c.id === compId)
    if (comp?.status === 'archived') {
      toast({
        title: 'Mapping Rejected',
        description: `Cannot link archived competency ${comp.code}. Only active or draft competencies may be mapped.`,
        variant: 'destructive',
      })
      return
    }

    saveAndSetRoles((prev) =>
      prev.map((r) => {
        if (r.id !== roleId) return r
        const alreadyLinked = r.competencyIds.includes(compId)
        const updatedCompIds = alreadyLinked
          ? r.competencyIds.filter((id) => id !== compId)
          : [...r.competencyIds, compId]
        return { ...r, competencyIds: updatedCompIds, updatedAt: new Date().toISOString() }
      }),
    )

    if (selectedRole && selectedRole.id === roleId) {
      setSelectedRole((prev) =>
        prev
          ? {
              ...prev,
              competencyIds: prev.competencyIds.includes(compId)
                ? prev.competencyIds.filter((id) => id !== compId)
                : [...prev.competencyIds, compId],
            }
          : null,
      )
    }
  }



  // Publish validation check
  const getPublishValidation = (role: TargetRoleModel) => {
    const hasTitle = Boolean(role.title.trim())
    const hasCode = Boolean(role.code.trim())
    const hasCompetencies = role.competencyIds.length > 0
    const hasSkillTargets = role.skillTargets.length > 0
    const validThresholds = role.skillTargets.every((st) => st.threshold > 0 && st.threshold <= 100)

    const canPublish =
      hasTitle && hasCode && hasCompetencies && hasSkillTargets && validThresholds

    return {
      canPublish,
      hasTitle,
      hasCode,
      hasCompetencies,
      hasSkillTargets,
      validThresholds,
    }
  }

  // Execute Publication
  const handleExecutePublish = async (role: TargetRoleModel) => {
    const validation = getPublishValidation(role)
    if (!validation.canPublish) {
      toast({
        title: 'Publication Blocked',
        description: 'Complete all required competency links and micro-skill targets before publication.',
        variant: 'destructive',
      })
      return
    }

    try {
      await fetch(`/api/v1/organizations/${orgId}/target-roles/${role.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': 'LD_MANAGER',
        },
        body: JSON.stringify({
          name: role.title,
          domainCode: role.domainCode,
          familyCode: role.familyCode,
          track: role.track,
          assignedExpertId: role.assignedExpertId,
          description: role.description,
          status: 'ACTIVE',
          version: role.version,
          skillTargets: role.skillTargets,
        }),
      })
      await fetchRoles()
    } catch {
      saveAndSetRoles((prev) =>
        prev.map((r) => (r.id === role.id ? { ...r, status: 'published', updatedAt: new Date().toISOString() } : r)),
      )
    }

    setIsPublishModalOpen(false)
    toast({
      title: 'Target Role Published',
      description: `${role.code} (${role.version}) is now published and active for enterprise diagnostic matching.`,
      variant: 'success',
    })
  }

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        {/* Actions Bar */}
        <PageHeader
          title="Target Roles Catalog"
          description="Define target job roles, customize required skills, and establish benchmark proficiency targets for your workforce."
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Upload className="h-4 w-4" />}
                onClick={() => setIsImportModalOpen(true)}
                className="bg-secondary text-primary border border-primary/20 hover:bg-secondary/80 font-semibold shadow-2xs"
              >
                Import
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={handleOpenCreateRole}
                className="font-semibold shadow-2xs"
              >
                Create
              </Button>
            </div>
          }
        />

        {/* Aggregate KPI StatCards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            variant="gradient"
            icon={<Briefcase className="h-4 w-4 text-primary" />}
            title="Total Role Profiles"
            value={totalRoles.toString()}
            valueClassName="text-primary"
            description="Across technical architectures"
          />

          <StatCard
            variant="gradient"
            icon={<CheckCircle2 className="h-4 w-4 text-success" />}
            title="Published Versions"
            value={publishedRoles.toString()}
            valueClassName="text-success"
            description="Active for diagnostic pathways"
          />

          <StatCard
            variant="gradient"
            icon={<Edit3 className="h-4 w-4 text-warning" />}
            title="In-Flight Profiles"
            value={(draftRoles + sentRoles + submittedRoles + feedbackRoles + rejectedRoles).toString()}
            valueClassName="text-warning"
            description={`${draftRoles} drafts · ${sentRoles} sent · ${submittedRoles} submitted · ${feedbackRoles} feedback`}
          />
        </div>

        {/* Roles Table and Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div className="min-w-0 pr-2">
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary shrink-0" />
                  <span>Target Role Version Catalog</span>
                </CardTitle>
                <CardDescription>
                  Draft and published role definitions with mapped competencies and micro-skill thresholds.
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
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1.5 shadow-2xs shrink-0">
                  <span className="text-[11px] text-muted-foreground font-medium">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'published' | 'draft' | 'sent' | 'submitted' | 'feedback' | 'rejected')}
                    className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer font-medium"
                  >
                    <option value="all">All ({totalRoles})</option>
                    <option value="published">Published ({publishedRoles})</option>
                    <option value="sent">Sent ({sentRoles})</option>
                    <option value="submitted">Submitted ({submittedRoles})</option>
                    <option value="draft">Drafts ({draftRoles})</option>
                    <option value="feedback">Feedback ({feedbackRoles})</option>
                    <option value="rejected">Rejected ({rejectedRoles})</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1.5 shadow-2xs shrink-0">
                  <span className="text-[11px] text-muted-foreground font-medium">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'latest' | 'title')}
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
            ) : filteredRoles.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                <p className="text-sm font-semibold">No target roles found.</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setStatusFilter('all')}>
                  Reset Filter
                </Button>
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
                      <th className="py-2.5 px-3">Assigned Expert</th>
                      <th className="py-2.5 px-3 text-center">Competency</th>
                      <th className="py-2.5 px-3 text-center">Micro-skill</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredRoles.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-10 text-muted-foreground text-xs">
                          No target roles registered yet for this company. Click "+ New Target Role" or import a role matrix to begin.
                        </td>
                      </tr>
                    ) : (
                      paginatedRoles.map((role) => {
                      const effStatus = getManagerEffectiveStatus(role)
                      const isDraft = effStatus === 'draft'
                      const isSent = effStatus === 'sent'
                      const isSubmitted = effStatus === 'submitted'
                      const isFeedback = effStatus === 'feedback'
                      const isRejected = effStatus === 'rejected'
                      const isPublished = effStatus === 'published'
                      const cleanRejectionReason = (role.rejectionReason || '').replace(/^\[(EXPERT|LD_MANAGER)\]:\s*/, '')

                      // Lineage identification for published versions
                      const publishedInLineage = roles
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

                      // Identify if role is a successor placed below a published version
                      const predecessorPublished = roles.find(
                        (r) => (r.stableId === role.stableId || r.code === role.code) && r.status === 'published' && r.id !== role.id
                      )
                      const isSuccessor = !isPublished && Boolean(predecessorPublished)

                      const expert = ELIGIBLE_EXPERTS.find((e) => e.id === role.assignedExpertId)

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
                                <span className="font-semibold text-black">Expert Feedback:</span>
                                <span className="truncate max-w-xs text-black">{cleanRejectionReason}</span>
                              </div>
                            )}
                            {isRejected && cleanRejectionReason && (
                              <div className="text-[11px] text-destructive flex items-center gap-1 mt-1 bg-destructive/5 px-2 py-0.5 rounded border border-destructive/20 w-fit" title={cleanRejectionReason}>
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                <span className="font-semibold">Revision Notes:</span>
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
                          <td className="py-3 px-3">
                            {role.assignedExpertName || expert ? (
                              <div className="flex items-center gap-1.5">
                                <div className="h-6 w-6 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">
                                  {(role.assignedExpertName || expert?.name || 'E').slice(0, 2).toUpperCase()}
                                </div>
                                <span className="text-xs font-medium text-foreground">
                                  {role.assignedExpertName || expert?.name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground italic">Unassigned</span>
                            )}
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
                              <Badge variant="primary" className="bg-sky-500/10 text-sky-600 border-sky-500/20 font-bold dark:text-sky-400">
                                SUBMITTED
                              </Badge>
                            )}
                            {isSent && (
                              <Badge className="bg-[#EA580C] text-white border-transparent font-bold hover:bg-[#C2410C]">
                                SENT
                              </Badge>
                            )}
                            {isFeedback && (
                              <Badge variant="outline" className="bg-amber-500/15 !text-black border-amber-500/30 font-bold dark:!text-black">
                                FEEDBACK
                              </Badge>
                            )}
                            {isRejected && <Badge variant="destructive">REJECTED</Badge>}
                            {isDraft && <Badge variant="warning">DRAFT</Badge>}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View Details (Reviews submitted roles, inspects all fields per level) */}
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

                              {/* Edit Role (Draft/Feedback/Rejected) - Lock editing when Sent or Submitted or Published */}
                              {!isPublished && !isSent && !isSubmitted && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleOpenEditRole(role)
                                  }}
                                  title={
                                    isFeedback
                                      ? "Edit & Address Expert Feedback"
                                      : "Edit Role Details"
                                  }
                                  aria-label={
                                    isFeedback
                                      ? "Edit & Address Expert Feedback"
                                      : "Edit Role Details"
                                  }
                                >
                                  {isFeedback ? (
                                    <Edit3 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                  ) : (
                                    <Edit3 className="h-4 w-4" />
                                  )}
                                </Button>
                              )}

                              {/* Delete Role */}
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeletingRole(role)
                                }}
                                title={isPublished ? "Delete Published Role" : "Delete Draft"}
                                aria-label={isPublished ? "Delete Published Role" : "Delete Draft"}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    }))}
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

      {/* 1. CREATE TARGET ROLE MODAL */}
      <Dialog open={isCreateRoleModalOpen} onOpenChange={setIsCreateRoleModalOpen} className="max-w-3xl max-h-[88vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="shrink-0 mb-3">
          <div className="flex items-center justify-between pr-4">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary shrink-0" />
              <span>{roleForm.title.trim() || 'Create Target Role'}</span>
            </DialogTitle>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/25 font-bold text-xs">
              NEW DRAFT
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Define a target role profile, align with industry standards, and establish benchmark proficiency targets for your workforce.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1.5 space-y-3.5 text-xs min-h-0">
          {/* Card 1: Role Identity */}
          <div className="p-3.5 rounded-lg border border-border bg-card space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Role Identification &amp; Code
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-foreground block mb-1">
                  Unique Role Code <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. ROLE-AI-ARCH"
                  value={roleForm.code}
                  onChange={(e) => setRoleForm({ ...roleForm, code: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-md bg-background border border-border text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-foreground block mb-1">
                  Role Title <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. AI Knowledge Architect"
                  value={roleForm.title}
                  onChange={(e) => setRoleForm({ ...roleForm, title: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Industry Occupation Alignment */}
          <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                  Industry Occupation Alignment
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Align this role with a recognized O*NET industry occupation and benchmark standard.
                </p>
              </div>
              <Badge variant="secondary" className="text-[10px] font-semibold shrink-0 self-start sm:self-center">
                Job Zone 4
              </Badge>
            </div>

              <div className="pt-1">
                <label className="text-[11px] font-semibold text-foreground block mb-1">
                  Occupation <span className="text-destructive">*</span>
                </label>
                <Combobox
                  size="sm"
                  clearable={false}
                  options={OCCUPATION_OPTIONS}
                  value={roleForm.occupationCode}
                  onChange={(val) => {
                    if (!val) return
                    const occ = ONET_OCCUPATIONS.find((o) => o.code === val)
                    const eligible = getEligibleExpertsForOccupation(val)
                    const isCurrentEligible = eligible.some((e) => e.id === roleForm.assignedExpertId)
                    const newExpertId = isCurrentEligible ? roleForm.assignedExpertId : (eligible[0]?.id || '')
                    setRoleForm((prev) => ({
                      ...prev,
                      occupationCode: val,
                      assignedExpertId: newExpertId,
                      scope: prev.scope || occ?.description || '',
                      description: prev.description || occ?.description || '',
                    }))
                  }}
                  placeholder="Select Occupation..."
                  searchPlaceholder="Search occupation..."
                />
              </div>

            {(() => {
              const selectedOcc = ONET_OCCUPATIONS.find((o) => o.code === roleForm.occupationCode)
              if (!selectedOcc) return null
              return (
                <p className="text-[10.5px] text-muted-foreground bg-background/60 p-2 rounded border border-primary/10 leading-relaxed">
                  {selectedOcc.description}
                </p>
              )
            })()}
          </div>

          {/* Card 3: Role Seniority Levels */}
          <div className="p-3.5 rounded-lg border border-border bg-card space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-foreground block">
                  Role Seniority Levels
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Define progressive levels for this role. Level codes are automatically generated.
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRoleForm((prev) => ({ ...prev, levelNames: [...prev.levelNames, `Level ${prev.levelNames.length + 1}`] }))}
                className="h-7 text-xs font-semibold"
                leftIcon={<Plus className="h-3.5 w-3.5 text-primary" />}
              >
                Add Level
              </Button>
            </div>

            <div className="space-y-2">
              {roleForm.levelNames.map((name, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-md bg-muted/20 border border-border">
                  <Badge variant="secondary" className="font-mono text-xs px-2 shrink-0">
                    Rank {idx + 1}
                  </Badge>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      const newNames = [...roleForm.levelNames]
                      newNames[idx] = e.target.value
                      setRoleForm({ ...roleForm, levelNames: newNames })
                    }}
                    placeholder={`e.g. ${idx === 0 ? 'Junior' : idx === 1 ? 'Middle' : idx === 2 ? 'Senior' : 'Lead'}`}
                    className="flex-1 px-2.5 py-1 text-xs rounded border border-border bg-background text-foreground font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                  {roleForm.levelNames.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newNames = roleForm.levelNames.filter((_, i) => i !== idx)
                        setRoleForm({ ...roleForm, levelNames: newNames })
                      }}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      title="Remove Level"
                      aria-label="Remove Level"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Card 4: Assigned Subject Matter Expert */}
          <div className="p-3.5 rounded-lg border border-border bg-card space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Assigned Subject Matter Expert
              </span>
              <span className="text-[10px] text-primary font-medium">
                {createExpertOptions.length} eligible expert{createExpertOptions.length !== 1 ? 's' : ''} available for this occupation
              </span>
            </div>
            <div>
              <Combobox
                size="sm"
                clearable={false}
                options={createExpertOptions}
                value={roleForm.assignedExpertId}
                onChange={(val) => val && setRoleForm({ ...roleForm, assignedExpertId: val })}
                placeholder="Select assigned domain expert..."
                searchPlaceholder="Search eligible expert for this occupation..."
              />
              <span className="text-[10px] text-muted-foreground mt-1 block">
                Only subject matter experts assigned to {roleForm.occupationCode} ({ONET_OCCUPATIONS.find(o => o.code === roleForm.occupationCode)?.name || 'this occupation'}) are eligible to curate skills.
              </span>
            </div>
          </div>

          {/* Card 5: Role Scope & Summary */}
          <div className="p-3.5 rounded-lg border border-border bg-card space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Role Scope &amp; Summary
            </span>
            <div>
              <label className="text-[11px] font-semibold text-foreground block mb-1">
                Role Scope &amp; Summary
              </label>
              <textarea
                rows={3}
                placeholder="Summarize the purpose, scope, and strategic objectives of this target role..."
                value={roleForm.scope}
                onChange={(e) => setRoleForm({ ...roleForm, scope: e.target.value, description: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 pt-3 border-t border-border mt-3 flex items-center justify-between sm:justify-between w-full">
          <Button variant="outline" size="sm" onClick={() => setIsCreateRoleModalOpen(false)}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleCreateRoleSubmit('draft')}>
              Save as Draft
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Send className="h-4 w-4" />}
              onClick={() => handleCreateRoleSubmit('sent')}
            >
              Create &amp; Send to Expert
            </Button>
          </div>
        </DialogFooter>
      </Dialog>

      {/* 2. MAINTAIN ROLE-COMPETENCY MAPPINGS MODAL */}
      {selectedRole && (
        <Dialog open={isMappingsModalOpen} onOpenChange={setIsMappingsModalOpen}>
          <div className="space-y-4">
            <DialogHeader>
              <div className="flex items-center justify-between pr-4">
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  {selectedRole.title}
                </DialogTitle>
                <Badge
                  variant={
                    selectedRole.status === 'submitted' || selectedRole.status === 'sent'
                      ? 'success'
                      : selectedRole.status === 'draft'
                        ? 'warning'
                        : 'outline'
                  }
                >
                  {(selectedRole.status === 'sent' ? 'SUBMITTED' : selectedRole.status).toUpperCase()}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Link and maintain active competency requirements for this target role.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Available Competencies Catalog</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  {selectedRole.competencyIds.length} currently linked
                </span>
              </div>

              {/* Search at top of catalog */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search competencies by code, title, or definition..."
                  value={compSearchQuery}
                  onChange={(e) => setCompSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {companyCompetencies.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-xs border border-dashed rounded-lg">
                    No competencies registered for this company yet. Define competencies in Competency Management first.
                  </div>
                ) : (() => {
                  const filtered = companyCompetencies.filter(
                    (c) =>
                      !compSearchQuery.trim() ||
                      c.code.toLowerCase().includes(compSearchQuery.toLowerCase()) ||
                      c.name.toLowerCase().includes(compSearchQuery.toLowerCase()) ||
                      (c.description || '').toLowerCase().includes(compSearchQuery.toLowerCase())
                  )

                  if (filtered.length === 0) {
                    return (
                      <div className="p-4 text-center text-muted-foreground text-xs border border-dashed rounded-lg">
                        No competencies match &ldquo;{compSearchQuery}&rdquo;.
                      </div>
                    )
                  }

                  return filtered.map((comp) => {
                    const isLinked = selectedRole.competencyIds.includes(comp.id)
                    const isArchived = comp.status === 'archived'

                    return (
                      <div
                        key={comp.id}
                        className={`p-3 rounded-lg border flex items-start justify-between gap-3 transition-colors ${
                          isLinked
                            ? 'border-primary/40 bg-primary/5'
                            : isArchived
                            ? 'border-border/40 bg-muted/20 opacity-60'
                            : 'border-border bg-card hover:border-primary/30'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-foreground">{comp.code}</span>
                            <span className="font-semibold text-foreground truncate">{comp.name}</span>
                            <Badge variant={isArchived ? 'outline' : 'secondary'} className="text-[10px] py-0 px-1">
                              {comp.status}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{comp.description}</p>
                        </div>

                        <div className="shrink-0">
                          {isArchived ? (
                            <Badge variant="destructive" className="text-[10px]">
                              Archived (Rejected)
                            </Badge>
                          ) : selectedRole.status === 'published' ? (
                            <Badge variant={isLinked ? 'success' : 'outline'}>
                              {isLinked ? 'Linked (Locked)' : 'Unlinked'}
                            </Badge>
                          ) : (
                            <Button
                              variant={isLinked ? 'outline' : 'primary'}
                              size="sm"
                              onClick={() => handleToggleCompetency(selectedRole.id, comp.id)}
                            >
                              {isLinked ? 'Remove Link' : 'Link Competency'}
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>

              {selectedRole.status === 'published' && (
                <div className="p-2.5 rounded bg-warning/10 border border-warning/30 text-[11px] text-warning flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    This role is published. To modify competency links, create a successor draft first.
                  </span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="primary" size="sm" onClick={() => setIsMappingsModalOpen(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}

      {/* 3. SET ROLE SKILL TARGETS / REVIEW MODAL */}
      {selectedRole && (() => {
        const modalEffStatus = getManagerEffectiveStatus(selectedRole)
        const isSubmittedRole = modalEffStatus === 'submitted'
        const isSentRole = modalEffStatus === 'sent'
        const isPublishedRole = modalEffStatus === 'published'
        const isFeedbackRole = modalEffStatus === 'feedback'
        const isRejectedRole = modalEffStatus === 'rejected'
        const isDraftRole = modalEffStatus === 'draft' || isFeedbackRole || isRejectedRole
        const cleanModalRejectionReason = (selectedRole.rejectionReason || '').replace(/^\[(EXPERT|LD_MANAGER)\]:\s*/, '')

        return (
        <Dialog open={isSkillTargetsModalOpen} onOpenChange={setIsSkillTargetsModalOpen} className="max-w-3xl max-h-[88vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="shrink-0 mb-3">
            <div className="flex items-center justify-between pr-4">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                {isSubmittedRole ? (
                  <FileCheck className="h-5 w-5 text-foreground shrink-0" />
                ) : (
                  <Edit3 className="h-5 w-5 text-primary shrink-0" />
                )}
                <span>
                  {isSubmittedRole ? `Review Submitted Role: ${selectedRole.title}` : (editRoleForm?.title || selectedRole.title)}
                </span>
              </DialogTitle>
              <Badge
                variant={
                  isPublishedRole
                    ? 'success'
                    : isSubmittedRole
                    ? 'primary'
                    : isFeedbackRole
                    ? 'warning'
                    : isRejectedRole
                    ? 'destructive'
                    : isSentRole
                    ? 'outline'
                    : 'warning'
                }
                className={
                  isSubmittedRole
                    ? 'bg-sky-500/10 text-sky-600 border-sky-500/20 font-bold dark:text-sky-400'
                    : isSentRole
                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold dark:text-amber-400'
                    : isFeedbackRole
                    ? 'bg-amber-500/15 !text-black border-amber-500/30 font-bold dark:!text-black'
                    : ''
                }
              >
                {modalEffStatus.toUpperCase()}
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              {isSubmittedRole
                ? 'Review the target role configuration, competencies, and micro-skills submitted by the domain expert.'
                : isSentRole
                ? 'This role has been dispatched to the domain expert for micro-skill authoring and threshold configuration.'
                : isFeedbackRole
                ? 'The domain expert provided feedback requesting revisions on this proposal. Update details and re-dispatch.'
                : isRejectedRole
                ? 'This configuration was returned to the domain expert for revision.'
                : 'Update role details, customize benchmark proficiency targets, and manage expert assignments.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3.5 text-xs min-h-0">
            {/* Review Banner when submitted */}
            {isSubmittedRole && (
              <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-800 dark:text-sky-300 flex items-start gap-2.5">
                <FileCheck className="h-4 w-4 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" />
                <div className="space-y-0.5 text-xs">
                  <span className="font-semibold block">Configuration Submitted for Review</span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    The assigned Domain Expert has completed micro-skill authoring and submitted this configuration for your confirmation. Review the specifications below. Choose <strong>Approve &amp; Publish</strong> to activate the role or <strong>Return for Revision</strong> to send it back to draft.
                  </p>
                </div>
              </div>
            )}

            {/* Revision Feedback Banner when in feedback state */}
            {isFeedbackRole && cleanModalRejectionReason && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-black flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-black mt-0.5 shrink-0" />
                <div className="space-y-0.5 text-xs text-black">
                  <span className="font-semibold block text-black">Domain Expert Feedback</span>
                  <p className="text-[11px] leading-relaxed text-black">
                    {cleanModalRejectionReason}
                  </p>
                </div>
              </div>
            )}

            {/* Rejection Notes when manager returned configuration */}
            {isRejectedRole && cleanModalRejectionReason && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div className="space-y-0.5 text-xs">
                  <span className="font-semibold block">Revision Notes for Expert</span>
                  <p className="text-[11px] leading-relaxed">
                    {cleanModalRejectionReason}
                  </p>
                </div>
              </div>
            )}

            {/* Card 1: Role Identity */}
            <div className="p-3.5 rounded-lg border border-border bg-card space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Role Identification &amp; Code
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-foreground block mb-1">
                    Role Code <span className="text-[10px] text-muted-foreground font-normal">(Identifier)</span>
                  </label>
                  <input
                    type="text"
                    disabled
                    value={selectedRole.code}
                    className="w-full px-2.5 py-1.5 rounded-md bg-muted/50 border border-border text-foreground font-mono text-xs cursor-not-allowed opacity-80"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-foreground block mb-1">
                    Role Title <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={isSubmittedRole || isPublishedRole}
                    value={editRoleForm.title}
                    onChange={(e) => setEditRoleForm({ ...editRoleForm, title: e.target.value })}
                    className={`w-full px-2.5 py-1.5 rounded-md border text-xs shadow-2xs ${
                      isSubmittedRole || isPublishedRole
                        ? 'bg-muted/50 border-border text-foreground cursor-not-allowed opacity-80'
                        : 'bg-background border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Industry Occupation Alignment */}
            <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                    Industry Occupation Alignment
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Align this role with a recognized O*NET industry occupation and benchmark standard.
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px] font-semibold shrink-0 self-start sm:self-center">
                  Job Zone 4
                </Badge>
              </div>

              <div className="pt-1">
                <label className="text-[11px] font-semibold text-foreground block mb-1">
                  Occupation <span className="text-destructive">*</span>
                </label>
                <Combobox
                  size="sm"
                  clearable={false}
                  disabled={isSubmittedRole || isPublishedRole}
                  options={OCCUPATION_OPTIONS}
                  value={editRoleForm.occupationCode}
                  onChange={(val) => {
                    if (!val) return
                    const occ = ONET_OCCUPATIONS.find((o) => o.code === val)
                    const eligible = getEligibleExpertsForOccupation(val)
                    const isCurrentEligible = eligible.some((e) => e.id === editRoleForm.assignedExpertId)
                    const newExpertId = isCurrentEligible ? editRoleForm.assignedExpertId : (eligible[0]?.id || '')
                    setEditRoleForm((prev) => ({
                      ...prev,
                      occupationCode: val,
                      assignedExpertId: newExpertId,
                      scope: prev.scope || occ?.description || '',
                      description: prev.description || occ?.description || '',
                    }))
                  }}
                  placeholder="Select Occupation..."
                  searchPlaceholder="Search occupation..."
                />
              </div>

              {(() => {
                const selectedOcc = ONET_OCCUPATIONS.find((o) => o.code === editRoleForm.occupationCode)
                if (!selectedOcc) return null
                return (
                  <p className="text-[10.5px] text-muted-foreground bg-background/60 p-2 rounded border border-primary/10 leading-relaxed">
                    {selectedOcc.description}
                  </p>
                )
              })()}
            </div>

            {/* Card 3: Role Seniority Levels */}
            <div className="p-3.5 rounded-lg border border-border bg-card space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    Role Seniority Levels
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Define progressive levels for this role. Level codes are automatically generated.
                  </span>
                </div>
                {!isSubmittedRole && !isPublishedRole && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditRoleForm((prev) => ({ ...prev, levelNames: [...prev.levelNames, `Level ${prev.levelNames.length + 1}`] }))}
                    className="h-7 text-xs font-semibold"
                    leftIcon={<Plus className="h-3.5 w-3.5 text-primary" />}
                  >
                    Add Level
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                {editRoleForm.levelNames.map((name, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-md bg-muted/20 border border-border">
                    <Badge variant="secondary" className="font-mono text-xs px-2 shrink-0">
                      Rank {idx + 1}
                    </Badge>
                    <input
                      type="text"
                      disabled={isSubmittedRole || isPublishedRole}
                      value={name}
                      onChange={(e) => {
                        const newNames = [...editRoleForm.levelNames]
                        newNames[idx] = e.target.value
                        setEditRoleForm({ ...editRoleForm, levelNames: newNames })
                      }}
                      placeholder={`e.g. ${idx === 0 ? 'Junior' : idx === 1 ? 'Middle' : idx === 2 ? 'Senior' : 'Lead'}`}
                      className={`flex-1 px-2.5 py-1 text-xs rounded border border-border bg-background text-foreground font-medium focus:ring-1 focus:ring-primary focus:outline-none ${
                        isSubmittedRole || isPublishedRole ? 'bg-muted/50 cursor-not-allowed opacity-80' : ''
                      }`}
                    />
                    {!isSubmittedRole && !isPublishedRole && editRoleForm.levelNames.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newNames = editRoleForm.levelNames.filter((_, i) => i !== idx)
                          setEditRoleForm({ ...editRoleForm, levelNames: newNames })
                        }}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        title="Remove Level"
                        aria-label="Remove Level"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Card 4: Assigned Subject Matter Expert */}
            <div className="p-3.5 rounded-lg border border-border bg-card space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Assigned Subject Matter Expert
                </span>
                <span className="text-[10px] text-primary font-medium">
                  {editExpertOptions.length} eligible expert{editExpertOptions.length !== 1 ? 's' : ''} available for this occupation
                </span>
              </div>
              <div>
                <Combobox
                  size="sm"
                  clearable={false}
                  disabled={isSubmittedRole || isPublishedRole}
                  options={editExpertOptions}
                  value={editRoleForm.assignedExpertId}
                  onChange={(val) => val && setEditRoleForm({ ...editRoleForm, assignedExpertId: val })}
                  placeholder="Select assigned domain expert..."
                  searchPlaceholder="Search eligible expert for this occupation..."
                />
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  Only subject matter experts assigned to {editRoleForm.occupationCode} ({ONET_OCCUPATIONS.find(o => o.code === editRoleForm.occupationCode)?.name || 'this occupation'}) are eligible to curate skills.
                </span>
              </div>
            </div>

            {/* Card 5: Role Scope & Summary */}
            <div className="p-3.5 rounded-lg border border-border bg-card space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Role Scope &amp; Summary
              </span>
              <div>
                <label className="text-[11px] font-semibold text-foreground block mb-1">
                  Role Scope &amp; Summary
                </label>
                <textarea
                  rows={3}
                  disabled={isSubmittedRole || isPublishedRole}
                  placeholder="Summarize the purpose, scope, and strategic objectives of this target role..."
                  value={editRoleForm.scope}
                  onChange={(e) => setEditRoleForm({ ...editRoleForm, scope: e.target.value, description: e.target.value })}
                  className={`w-full px-2.5 py-1.5 rounded-md border text-xs shadow-2xs ${
                    isSubmittedRole || isPublishedRole
                      ? 'bg-muted/50 border-border text-foreground cursor-not-allowed opacity-80'
                      : 'bg-background border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary'
                  }`}
                />
              </div>
            </div>

            {/* Current assigned targets table (Read-only for L&D Manager) */}
            {selectedRole.skillTargets && selectedRole.skillTargets.length > 0 && (
              <div>
                <div className="font-semibold text-foreground mb-2 flex items-center justify-between">
                  <span>Assigned Micro-Skills Matrix ({selectedRole.skillTargets.length})</span>
                  <span className="text-[11px] text-muted-foreground">Configured by Domain Expert</span>
                </div>

                <div className="overflow-x-auto border rounded-lg border-border">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[10px] font-semibold">
                        <th className="py-2 px-3">Skill Code &amp; Name</th>
                        <th className="py-2 px-3 text-center">Required Threshold</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedRole.skillTargets.map((st) => (
                        <tr key={st.skillId} className="hover:bg-muted/10">
                          <td className="py-2.5 px-3">
                            <div className="font-mono font-bold text-foreground">{st.skillCode}</div>
                            <div className="text-[11px] text-muted-foreground">{st.skillName}</div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="font-bold text-primary">{st.threshold}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 pt-3 border-t border-border mt-3 flex items-center justify-between sm:justify-between w-full">
            {isSubmittedRole ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsSkillTargetsModalOpen(false)}>
                  Cancel
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 border-destructive/30 font-medium"
                    onClick={() => {
                      const r = selectedRole
                      setIsSkillTargetsModalOpen(false)
                      handleOpenManagerRejectDialog(r)
                    }}
                    leftIcon={<XCircle className="h-3.5 w-3.5 text-destructive" />}
                  >
                    Return for Revision
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={async () => {
                      const r = selectedRole
                      setIsSkillTargetsModalOpen(false)
                      handleApproveAndPublishRole(r)
                    }}
                    leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                  >
                    Approve &amp; Publish
                  </Button>
                </div>
              </>
            ) : isDraftRole || isSentRole ? (
              <>
                <Button
                  variant="destructive"
                  size="sm"
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  onClick={() => {
                    const r = selectedRole
                    setIsSkillTargetsModalOpen(false)
                    setDeletingRole(r)
                  }}
                >
                  {isDraftRole ? 'Delete Draft Role' : 'Delete Role'}
                </Button>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsSkillTargetsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleSaveEditRole('draft')}>
                    Save Changes
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Send className="h-4 w-4" />}
                    onClick={() => handleSaveEditRole('sent')}
                  >
                    {isSentRole || isFeedbackRole ? 'Save & Re-dispatch to Expert' : selectedRole.rejectionReason ? 'Save & Re-send to Expert' : 'Save & Send to Expert'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button
                  variant="destructive"
                  size="sm"
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  onClick={() => {
                    const r = selectedRole
                    setIsSkillTargetsModalOpen(false)
                    setDeletingRole(r)
                  }}
                >
                  Delete Role
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsSkillTargetsModalOpen(false)}>
                  Close
                </Button>
              </>
            )}
          </DialogFooter>
        </Dialog>
        )
      })()}


      {/* 4. PUBLICATION READINESS VERIFICATION MODAL */}
      {selectedRole && (
        <Dialog open={isPublishModalOpen} onOpenChange={setIsPublishModalOpen}>
          <div className="space-y-4">
            <DialogHeader>
              <div className="flex items-center justify-between pr-4">
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  {selectedRole.title}
                </DialogTitle>
                <Badge variant={selectedRole.status === 'published' ? 'success' : 'outline'}>
                  {selectedRole.status.toUpperCase()}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Verify all required competency links and skill thresholds before releasing to enterprise diagnostics.
              </DialogDescription>
            </DialogHeader>

            {(() => {
              const validation = getPublishValidation(selectedRole)

              return (
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                    <div className="font-semibold text-foreground mb-1">Publication Criteria Checklist</div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Unique Role Code &amp; Title defined</span>
                      {validation.hasTitle && validation.hasCode ? (
                        <span className="text-success font-semibold flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" /> Verified
                        </span>
                      ) : (
                        <span className="text-destructive font-semibold">Missing Code/Title</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Competency (&ge; 1 required)</span>
                      {validation.hasCompetencies ? (
                        <span className="text-success font-semibold flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" /> {selectedRole.competencyIds.length} Linked
                        </span>
                      ) : (
                        <span className="text-destructive font-semibold">0 Competencies</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Micro-skills configured</span>
                      {validation.hasSkillTargets ? (
                        <span className="text-success font-semibold flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" /> {selectedRole.skillTargets.length} Configured
                        </span>
                      ) : (
                        <span className="text-destructive font-semibold">0 Micro-skills</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Proficiency Thresholds (1–100%)</span>
                      {validation.validThresholds ? (
                        <span className="text-success font-semibold flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" /> Compliant
                        </span>
                      ) : (
                        <span className="text-destructive font-semibold">Invalid Threshold</span>
                      )}
                    </div>
                  </div>

                  {!validation.canPublish ? (
                    <div className="p-2.5 rounded bg-destructive/10 border border-destructive/20 text-destructive text-[11px] flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>
                        Publication rejected: Complete the checklist items above before this role can be published.
                      </span>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded bg-success/10 border border-success/20 text-success text-[11px] flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>
                        All validation checks passed! Publishing will make this version available for diagnostic gap
                        analysis.
                      </span>
                    </div>
                  )}
                </div>
              )
            })()}

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setIsPublishModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!getPublishValidation(selectedRole).canPublish}
                onClick={() => handleExecutePublish(selectedRole)}
              >
                Confirm &amp; Publish
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}

      {/* TARGET ROLE DETAILS MODAL (Miro Flow: Target Roles Management Screen -> Target Role Details) */}
      {viewingDetailsRole && (
        <Dialog
          open={Boolean(viewingDetailsRole)}
          onOpenChange={(open) => !open && setViewingDetailsRole(null)}
          className="max-w-3xl max-h-[90vh] flex flex-col p-6 overflow-hidden"
        >
          <DialogHeader className="shrink-0 mb-3">
            <div className="flex items-center justify-between pr-4">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary shrink-0" />
                <span>{viewingDetailsRole.title}</span>
              </DialogTitle>
              {(() => {
                const viewEffStatus = getManagerEffectiveStatus(viewingDetailsRole)
                return (
                  <Badge
                    variant={
                      viewEffStatus === 'published'
                        ? 'success'
                        : viewEffStatus === 'feedback'
                        ? 'outline'
                        : viewEffStatus === 'rejected'
                        ? 'destructive'
                        : 'warning'
                    }
                    className={
                      viewEffStatus === 'feedback'
                        ? 'bg-amber-500/15 !text-black border-amber-500/30 font-bold dark:!text-black text-xs'
                        : viewEffStatus === 'submitted'
                        ? 'bg-sky-500/10 text-sky-600 border-sky-500/20 font-bold dark:text-sky-400 text-xs'
                        : viewEffStatus === 'sent'
                        ? 'bg-[#EA580C] text-white border-transparent font-bold text-xs hover:bg-[#C2410C]'
                        : 'font-bold text-xs'
                    }
                  >
                    {viewEffStatus.toUpperCase()}
                  </Badge>
                )
              })()}
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Comprehensive role specifications, level-by-level competency requirements, and workforce alignment.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1.5 space-y-4 text-xs min-h-0">

            {/* Rejection / Feedback Notice */}
            {(() => {
              const viewEffStatus = getManagerEffectiveStatus(viewingDetailsRole)
              const cleanViewRejectionReason = (viewingDetailsRole.rejectionReason || '').replace(/^\[(EXPERT|LD_MANAGER)\]:\s*/, '')
              if (!cleanViewRejectionReason) return null

              if (viewEffStatus === 'feedback') {
                return (
                  <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-black flex items-start gap-2.5">
                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-black" />
                    <div className="text-black">
                      <div className="font-bold text-black">Domain Expert Feedback:</div>
                      <div className="mt-1 text-black leading-relaxed whitespace-pre-wrap">{cleanViewRejectionReason}</div>
                    </div>
                  </div>
                )
              }

              if (viewEffStatus === 'rejected') {
                return (
                  <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/25 text-xs text-destructive flex items-start gap-2.5">
                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-destructive" />
                    <div>
                      <div className="font-bold text-foreground">Revision Notes:</div>
                      <div className="mt-1 text-foreground leading-relaxed whitespace-pre-wrap">{cleanViewRejectionReason}</div>
                    </div>
                  </div>
                )
              }

              return null
            })()}

            {/* O*NET Occupation & Ontology Levels Banner */}
            {(() => {
              const occ = resolveOccupationForRole(viewingDetailsRole)
              return (
                <div className="space-y-3">
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

                  {/* Role Seniority Levels */}
                  <div className="p-3 rounded-lg border border-border bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-foreground">
                        Role Seniority Levels
                      </span>
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        {(viewingDetailsRole.levels?.length || 3)} Progressive Levels
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(viewingDetailsRole.levels && viewingDetailsRole.levels.length > 0
                        ? viewingDetailsRole.levels
                        : ['Junior', 'Middle', 'Senior']
                      ).map((lvlName, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 p-2 rounded-md bg-muted/30 border border-border/80">
                          <Badge variant="secondary" className="text-[9px] py-0 px-1 font-mono">Rank {idx + 1}</Badge>
                          <span className="font-bold text-foreground text-xs">{lvlName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Meta Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg border border-border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Role Code</span>
                <span className="font-mono font-bold text-foreground mt-0.5 block">{viewingDetailsRole.code}</span>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Version</span>
                <span className="font-mono font-bold text-foreground mt-0.5 block">v{viewingDetailsRole.version}</span>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-card col-span-2 sm:col-span-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Assigned Domain Expert</span>
                <span className="font-semibold text-primary mt-0.5 truncate block">
                  {viewingDetailsRole.assignedExpertName || ELIGIBLE_EXPERTS.find((e) => e.id === viewingDetailsRole.assignedExpertId)?.name || 'Unassigned'}
                </span>
              </div>
            </div>

            {/* Role Scope & Operational Objectives */}
            <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1.5 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Role Scope &amp; Summary
              </span>
              <p className="text-foreground leading-relaxed">
                {viewingDetailsRole.scope || viewingDetailsRole.description || 'Defines standardized competency requirements and skill milestones for this enterprise role profile.'}
              </p>
            </div>

            {/* Level-Specific Competencies & Micro-skills Breakdown */}
            {(() => {
              const detailRoleLevels = viewingDetailsRole.levels && viewingDetailsRole.levels.length > 0
                ? viewingDetailsRole.levels
                : ['Junior', 'Middle', 'Senior']

              return (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-primary" />
                      Level Competencies &amp; Micro-skill Requirements
                    </span>
                    <span className="text-[11px] text-muted-foreground font-medium">
                      Select level to inspect isolated competencies &amp; skills
                    </span>
                  </div>

                  {/* Level Tabs */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelectedDetailLevelTab('ALL')}
                      className={`px-3 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                        selectedDetailLevelTab === 'ALL'
                          ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                          : 'bg-card text-muted-foreground hover:bg-muted/30 border-border'
                      }`}
                    >
                      All Levels Overview
                    </button>
                    {detailRoleLevels.map((lvl) => {
                      const lvlComps = (viewingDetailsRole.levelCompetencies?.[lvl] || (lvl === detailRoleLevels[0] ? viewingDetailsRole.competencyIds : [])) || []
                      const lvlSkills = viewingDetailsRole.skillTargets.filter((st) => (st.level || detailRoleLevels[0]) === lvl)
                      const isSelected = selectedDetailLevelTab === lvl

                      return (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setSelectedDetailLevelTab(lvl)}
                          className={`px-3 py-1 rounded-md text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                              : 'bg-card text-foreground hover:bg-muted/30 border-border'
                          }`}
                        >
                          <span>{lvl}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            {lvlSkills.length} skills · {lvlComps.length} comps
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Content for All Levels or Selected Level */}
                  {selectedDetailLevelTab === 'ALL' ? (
                    <div className="space-y-3">
                      {detailRoleLevels.map((lvl, lIdx) => {
                        const lvlComps = (viewingDetailsRole.levelCompetencies?.[lvl] || (lvl === detailRoleLevels[0] ? viewingDetailsRole.competencyIds : [])) || []
                        const lvlSkills = viewingDetailsRole.skillTargets.filter((st) => (st.level || detailRoleLevels[0]) === lvl)

                        return (
                          <div key={lvl} className="p-3.5 rounded-lg border border-border bg-card space-y-2.5">
                            <div className="flex items-center justify-between pb-1.5 border-b border-border">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="font-mono text-[10px]">Rank {lIdx + 1}</Badge>
                                <span className="font-bold text-foreground text-xs">{lvl} Level</span>
                              </div>
                              <span className="text-[11px] text-muted-foreground font-mono">
                                {lvlSkills.length} skills configured · {lvlComps.length} competencies
                              </span>
                            </div>

                            {/* Competencies for this Level */}
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                                Level Competencies ({lvlComps.length})
                              </span>
                              {lvlComps.length === 0 ? (
                                <span className="text-[11px] text-muted-foreground italic">No competencies assigned to {lvl} level.</span>
                              ) : (
                                <div className="flex flex-wrap gap-1.5">
                                  {lvlComps.map((cid) => {
                                    const comp = companyCompetencies.find((c) => c.id === cid || c.code === cid)
                                    return (
                                      <span
                                        key={cid}
                                        className="px-2 py-0.5 rounded bg-secondary text-primary font-medium text-[11px] border border-primary/20"
                                      >
                                        {comp ? `${comp.code}: ${comp.name}` : cid}
                                      </span>
                                    )
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Micro-skills for this Level */}
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                                Required Micro-skills ({lvlSkills.length})
                              </span>
                              {lvlSkills.length === 0 ? (
                                <span className="text-[11px] text-muted-foreground italic">No micro-skills configured for {lvl} level.</span>
                              ) : (
                                <div className="rounded border border-border overflow-hidden">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-muted/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                                      <tr>
                                        <th className="py-1.5 px-2.5">Skill Code &amp; Title</th>
                                        <th className="py-1.5 px-2.5 text-center w-28">Threshold</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                      {lvlSkills.map((st) => {
                                        const skill = companyMicroSkills.find((s) => s.id === st.skillId || s.code === st.skillCode)
                                        return (
                                          <tr key={st.skillId || st.skillCode} className="hover:bg-muted/20">
                                            <td className="py-1.5 px-2.5">
                                              <span className="font-mono font-bold text-primary mr-1">{st.skillCode || skill?.code}</span>
                                              <span className="text-foreground">{st.skillName || skill?.name}</span>
                                            </td>
                                            <td className="py-1.5 px-2.5 text-center font-mono font-bold text-primary">
                                              {st.threshold}%
                                            </td>
                                          </tr>
                                        )
                                      })}
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
                    <div className="p-3.5 rounded-lg border border-border bg-card space-y-3">
                      {/* Competencies for selected Level */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                          Assigned Competencies for {selectedDetailLevelTab}
                        </span>
                        {(() => {
                          const lvlComps = (viewingDetailsRole.levelCompetencies?.[selectedDetailLevelTab] || (selectedDetailLevelTab === detailRoleLevels[0] ? viewingDetailsRole.competencyIds : [])) || []
                          if (lvlComps.length === 0) {
                            return <div className="text-[11px] text-muted-foreground italic">No competencies assigned to {selectedDetailLevelTab}.</div>
                          }
                          return (
                            <div className="flex flex-wrap gap-1.5">
                              {lvlComps.map((cid) => {
                                const comp = companyCompetencies.find((c) => c.id === cid || c.code === cid)
                                return (
                                  <span key={cid} className="px-2.5 py-1 rounded bg-secondary text-primary font-medium text-xs border border-primary/20">
                                    {comp ? `${comp.code}: ${comp.name}` : cid}
                                  </span>
                                )
                              })}
                            </div>
                          )
                        })()}
                      </div>

                      {/* Micro-skills Table for selected Level */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                          Target Micro-skills for {selectedDetailLevelTab}
                        </span>
                        {(() => {
                          const lvlSkills = viewingDetailsRole.skillTargets.filter((st) => (st.level || detailRoleLevels[0]) === selectedDetailLevelTab)
                          if (lvlSkills.length === 0) {
                            return <div className="text-[11px] text-muted-foreground italic">No micro-skills configured for {selectedDetailLevelTab}.</div>
                          }
                          return (
                            <div className="rounded-lg border border-border overflow-hidden">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-muted/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                                  <tr>
                                    <th className="py-2 px-3">Skill Code &amp; Title</th>
                                    <th className="py-2 px-3 text-center w-32">Threshold</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                  {lvlSkills.map((st) => {
                                    const skill = companyMicroSkills.find((s) => s.id === st.skillId || s.code === st.skillCode)
                                    return (
                                      <tr key={st.skillId || st.skillCode} className="hover:bg-muted/20">
                                        <td className="py-2 px-3">
                                          <span className="font-mono font-bold text-primary mr-1.5">{st.skillCode || skill?.code}</span>
                                          <span className="text-foreground">{st.skillName || skill?.name}</span>
                                        </td>
                                        <td className="py-2 px-3 text-center font-mono font-bold text-primary">
                                          {st.threshold}%
                                        </td>
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
                  )}
                </div>
              )
            })()}

          </div>

          <DialogFooter className="shrink-0 pt-3 border-t border-border mt-3 flex items-center justify-between sm:justify-between w-full">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                const r = viewingDetailsRole
                setViewingDetailsRole(null)
                setDeletingRole(r)
              }}
              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
            >
              Delete Role
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setViewingDetailsRole(null)}>
                Close
              </Button>
              {(viewingDetailsRole.status === 'submitted' || viewingDetailsRole.status === 'sent') && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 border-destructive/30"
                    onClick={() => {
                      const r = viewingDetailsRole
                      setViewingDetailsRole(null)
                      handleOpenManagerRejectDialog(r)
                    }}
                    leftIcon={<XCircle className="h-3.5 w-3.5 text-destructive" />}
                  >
                    Return for Revision
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const r = viewingDetailsRole
                      handleApproveAndPublishRole(r)
                    }}
                    leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                  >
                    Approve & Publish
                  </Button>
                </>
              )}
              {viewingDetailsRole.status !== 'published' && viewingDetailsRole.status !== 'submitted' && viewingDetailsRole.status !== 'sent' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const r = viewingDetailsRole
                    setViewingDetailsRole(null)
                    handleOpenEditRole(r)
                  }}
                  leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                >
                  Edit Target Role
                </Button>
              )}
            </div>
          </DialogFooter>
        </Dialog>
      )}

      {/* 5. CONFIRMATION PROMPT TO DELETE TARGET ROLE (DRAFT OR PUBLISHED) */}
      <Dialog
        open={Boolean(deletingRole)}
        onOpenChange={(open) => !open && setDeletingRole(null)}
      >
        {deletingRole && (
          <>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                {deletingRole.status === 'published' ? 'Delete Published Target Role?' : 'Delete Draft Target Role?'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Are you sure you want to delete <strong className="text-foreground">{deletingRole.title}</strong>?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
                <div className="font-semibold text-foreground">
                  {deletingRole.title}
                </div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                  <span>{deletingRole.track || 'PROFESSIONAL'}</span>
                  <span>•</span>
                  <span>v{deletingRole.version}</span>
                  <span>•</span>
                  <span>{deletingRole.skillTargets?.length || 0} Skills</span>
                  <span>•</span>
                  <span>{deletingRole.competencyIds?.length || 0} Competencies</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/25 text-xs flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                <div className="text-[11.5px] leading-relaxed text-foreground">
                  <strong className="text-destructive font-semibold">
                    {deletingRole.status === 'published' ? 'Active Role Impact:' : 'Draft Removal Impact:'}
                  </strong>{' '}
                  {deletingRole.status === 'published'
                    ? 'Deleting this published role will detach all micro-skill targets and remove it from active employee career pathways immediately. This action cannot be undone.'
                    : 'All uncommitted micro-skill benchmark thresholds, responsibilities, and configuration changes for this draft will be permanently deleted from the database.'}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingRole(null)}
              >
                Keep Role
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (deletingRole) {
                    handleDeleteRole(deletingRole)
                  }
                }}
                leftIcon={<Trash2 className="h-3.5 w-3.5" />}
              >
                {deletingRole.status === 'published' ? 'Delete Published Role' : 'Delete Draft Role'}
              </Button>
            </DialogFooter>
          </>
        )}
      </Dialog>

      {/* 6. MANAGER REJECTION / RETURN FOR REVISION MODAL */}
      {managerRejectingRole && (
        <Dialog
          open={isManagerRejectDialogOpen}
          onOpenChange={setIsManagerRejectDialogOpen}
          className="max-w-md"
        >
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                <span>Return for Revision: {managerRejectingRole.title}</span>
              </DialogTitle>
              <DialogDescription>
                Return this target role configuration to the assigned domain expert for revision.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground font-mono">{managerRejectingRole.code}</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    v{managerRejectingRole.version}
                  </Badge>
                </div>
                <div className="text-muted-foreground text-xs font-medium">
                  {managerRejectingRole.title}
                </div>
                <div className="text-[11px] text-muted-foreground pt-1.5 border-t border-destructive/10 flex items-center justify-between">
                  <span>Assigned Domain Expert:</span>
                  <span className="font-semibold text-foreground">
                    {managerRejectingRole.assignedExpertName || 'Domain Expert'}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Revision Notes &amp; Feedback <span className="text-destructive">*</span>
                </label>
                <textarea
                  rows={3}
                  value={managerRejectionReason}
                  onChange={(e) => setManagerRejectionReason(e.target.value)}
                  placeholder="Specify clear revision feedback for the domain expert (e.g. required skill competencies are incomplete, benchmark thresholds need adjustment)..."
                  className="w-full text-xs p-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsManagerRejectDialogOpen(false)
                  setManagerRejectingRole(null)
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={!managerRejectionReason.trim()}
                onClick={handleConfirmManagerRejection}
                leftIcon={<XCircle className="h-4 w-4" />}
                className="font-semibold shadow-2xs"
              >
                Confirm Return
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}

      <QuickConfigImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        title="Import Target Role Suite"
        entityName="Target Roles"
        description="Select an industry role benchmark suite or upload custom target roles to configure career pathways for your organization."
        presets={ROLE_PRESETS}
        onImport={handleImportRoles}
        sampleJsonPlaceholder={`[\n  {\n    "code": "ROLE-AI-01",\n    "title": "AI Knowledge Architect",\n    "department": "Machine Learning & Cognitive Architecture",\n    "description": "Designs enterprise knowledge graph reasoning engines and neuro-symbolic pathways."\n  }\n]`}
      />

      {/* Target-Role Knowledge Graph View Modal (REQ-018-F01) */}
      <TargetRoleGraphModal
        open={Boolean(graphRole)}
        onOpenChange={(open) => !open && setGraphRole(null)}
        roleId={graphRole?.id || null}
        organizationId={activeComp?.id || 'default-org'}
        roleTitle={graphRole?.title}
        levels={graphRole?.levels}
        role={graphRole}
        skillTargets={graphRole?.skillTargets}
      />
    </WorkspaceLayout>
  )
}
