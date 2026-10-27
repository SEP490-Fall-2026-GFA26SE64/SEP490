import {
  AlertCircle,
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  CornerDownRight,
  Eye,
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
  ONTOLOGY_LEVELS,
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
import { TargetRoleGraphModal } from '../../manager/target-roles/components/TargetRoleGraphModal'

export type ExpertRoleStatus = 'published' | 'approved' | 'draft' | 'feedback' | 'rejected'

export const getExpertEffectiveStatus = (role: TargetRoleModel): ExpertRoleStatus => {
  if (role.status === 'published') return 'published'
  if (role.status === 'submitted') return 'approved'
  if (role.status === 'sent') return 'draft'
  if (role.status === 'rejected') {
    return role.rejectionReason?.startsWith('[EXPERT]:') ? 'rejected' : 'feedback'
  }
  return 'draft'
}

export function ExpertAssignedRolesPage() {
  const { toast } = useToast()

  // Company state
  const activeCompany = getActiveCompany()
  const orgId = activeCompany?.id || 'comp-technova'
  const [realMicroSkills, setRealMicroSkills] = React.useState<MicroSkillModel[]>([])

  const fetchSkills = React.useCallback(async () => {
    try {
      const list = await fetchMicroSkills(orgId)
      if (list && list.length > 0) {
        const mapped: MicroSkillModel[] = list.map((s) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          description: s.description || '',
          status: 'ACTIVE',
          macroCompetencyCode: s.macroCompetencyCode || 'KNOWLEDGE',
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        }))
        setRealMicroSkills(mapped)
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
  const [selectedExpertId] = React.useState<string>(() => {
    return localStorage.getItem('expert_active_id') || ELIGIBLE_EXPERTS[0].id
  })

  const [roles, setRoles] = React.useState<TargetRoleModel[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  const activeExpert = ELIGIBLE_EXPERTS.find((e) => e.id === selectedExpertId) || ELIGIBLE_EXPERTS[0]

  const fetchAssignedRoles = React.useCallback(async () => {
    try {
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
        const mapped: TargetRoleModel[] = (data as Record<string, unknown>[]).map((r) => ({
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
          competencyIds: Array.isArray(r.competencyIds) && (r.competencyIds as string[]).length > 0
            ? (r.competencyIds as string[])
            : ((activeCompany?.targetRoles || []).find((tr) => tr.id === String(r.id || '') || tr.code === String(r.code || ''))?.competencyIds || []),
          skillTargets: Array.isArray(r.skillTargets) ? (r.skillTargets as TargetRoleModel['skillTargets']) : [],
          activeEnrollments: 0,
          createdAt: String(r.createdAt || r.updatedAt || new Date().toISOString()),
          updatedAt: String(r.updatedAt || r.createdAt || new Date().toISOString()),
        }))
        setRoles(mapped)
      } else {
        const fallbackRoles = activeCompany?.targetRoles || []
        setRoles(fallbackRoles)
      }
    } catch {
      const fallbackRoles = activeCompany?.targetRoles || []
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
  const feedbackCount = assignedRoles.filter((r) => getExpertEffectiveStatus(r) === 'feedback').length
  const rejectedCount = assignedRoles.filter((r) => getExpertEffectiveStatus(r) === 'rejected').length
  const totalSkillTargets = assignedRoles.reduce((sum, r) => sum + r.skillTargets.length, 0)

  // Target Role Details Modal State (Read-only view of role architecture)
  const [viewingDetailsRole, setViewingDetailsRole] = React.useState<TargetRoleModel | null>(null)
  const [graphRole, setGraphRole] = React.useState<TargetRoleModel | null>(null)

  // Rejection Dialog State
  const [rejectingRole, setRejectingRole] = React.useState<TargetRoleModel | null>(null)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = React.useState(false)
  const [rejectionReason, setRejectionReason] = React.useState('')

  const handleOpenRejectDialog = (role: TargetRoleModel) => {
    setRejectingRole(role)
    setRejectionReason(role.rejectionReason || '')
    setIsRejectDialogOpen(true)
  }

  const handleConfirmRejection = async () => {
    if (!rejectingRole || !rejectionReason.trim()) return

    const fullRejectionReason = `[EXPERT]: ${rejectionReason.trim()}`
    const updatedRole: TargetRoleModel = {
      ...rejectingRole,
      status: 'rejected',
      rejectionReason: fullRejectionReason,
      updatedAt: new Date().toISOString(),
    }

    try {
      await fetch(`/api/v1/organizations/${orgId}/target-roles/${rejectingRole.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': 'DOMAIN_EXPERT',
          'X-User-Id': selectedExpertId,
        },
        body: JSON.stringify({
          name: rejectingRole.title,
          domainCode: rejectingRole.domainCode,
          familyCode: rejectingRole.familyCode,
          track: rejectingRole.track,
          seniority: rejectingRole.seniority,
          responsibilities: rejectingRole.responsibilities,
          assignedExpertId: rejectingRole.assignedExpertId,
          description: rejectingRole.description,
          status: 'REJECTED',
          version: rejectingRole.version,
          skillTargets: rejectingRole.skillTargets,
          rejectionReason: fullRejectionReason,
        }),
      })
      await fetchAssignedRoles()
    } catch {
      saveAndSetRoles((prev) => prev.map((r) => (r.id === updatedRole.id ? updatedRole : r)))
    }

    if (authoringRole?.id === updatedRole.id) {
      setAuthoringRole(updatedRole)
      setIsAuthoringModalOpen(false)
    }

    setIsRejectDialogOpen(false)
    setRejectingRole(null)

    toast({
      title: 'Target Role Proposal Rejected',
      description: `${updatedRole.title} (v${updatedRole.version}) proposal rejected and returned to L&D Manager with feedback.`,
      variant: 'warning',
    })
  }

  // Micro-Skill Authoring Modal State
  const [authoringRole, setAuthoringRole] = React.useState<TargetRoleModel | null>(null)
  const [isAuthoringModalOpen, setIsAuthoringModalOpen] = React.useState(false)
  const [configuredSkillSearch, setConfiguredSkillSearch] = React.useState('')

  // Skill target form state
  const [newSkillId, setNewSkillId] = React.useState('')
  const [newThreshold, setNewThreshold] = React.useState(80)

  const availableSkills = React.useMemo(() => {
    if (!authoringRole) return []
    return companyMicroSkills.filter((s) => !authoringRole.skillTargets.some((st) => st.skillId === s.id))
  }, [authoringRole, companyMicroSkills])

  const skillOptions: ComboboxOption[] = React.useMemo(() => {
    return availableSkills.map((skill) => ({
      value: skill.id,
      label: `${skill.code} — ${skill.name}`,
      description: skill.description || undefined,
    }))
  }, [availableSkills])

  const handleOpenAuthoring = (role: TargetRoleModel) => {
    setAuthoringRole(role)
    const available = companyMicroSkills.filter((s) => !role.skillTargets.some((st) => st.skillId === s.id))
    if (available.length > 0) {
      setNewSkillId(available[0].id)
    } else {
      setNewSkillId('')
    }
    setNewThreshold(80)
    setConfiguredSkillSearch('')
    setIsAuthoringModalOpen(true)
  }

  // Add micro-skill target
  const handleAddSkillTarget = async () => {
    if (!authoringRole || !newSkillId) return

    const skillObj = companyMicroSkills.find((s) => s.id === newSkillId)
    if (!skillObj) return

    if (authoringRole.skillTargets.some((st) => st.skillId === newSkillId)) {
      toast({
        title: 'Duplicate Skill',
        description: 'This micro-skill is already assigned to this target role.',
        variant: 'destructive',
      })
      return
    }

    const newTarget: SkillTargetConfig = {
      skillId: skillObj.id,
      skillCode: skillObj.code,
      skillName: skillObj.name,
      threshold: Number(newThreshold) || 80,
    }

    const updatedRole: TargetRoleModel = {
      ...authoringRole,
      skillTargets: [...authoringRole.skillTargets, newTarget],
      updatedAt: new Date().toISOString(),
    }

    setAuthoringRole(updatedRole)
    saveAndSetRoles((prev) => prev.map((r) => (r.id === updatedRole.id ? updatedRole : r)))

    // Reset skill selector
    const remaining = companyMicroSkills.filter(
      (s) => s.id !== newSkillId && !updatedRole.skillTargets.some((st) => st.skillId === s.id)
    )
    setNewSkillId(remaining.length > 0 ? remaining[0].id : '')

    // Persist immediately to database so reload preserves authored micro-skills
    try {
      await fetch(`/api/v1/organizations/${orgId}/target-roles/${authoringRole.id}`, {
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
          status: updatedRole.status === 'published' ? 'ACTIVE' : updatedRole.status === 'rejected' ? 'REJECTED' : (updatedRole.status === 'submitted' || updatedRole.status === 'sent') ? 'SUBMITTED' : 'DRAFT',
          skillTargets: updatedRole.skillTargets,
        }),
      })
    } catch (e) {
      console.error('Failed to auto-persist skill target:', e)
    }

    toast({
      title: 'Micro-skill Target Added',
      description: `Mapped ${skillObj.name} (${newThreshold}%) to ${updatedRole.title}.`,
      variant: 'success',
    })
  }

  // Remove micro-skill target
  const handleRemoveSkillTarget = async (skillId: string) => {
    if (!authoringRole) return

    const updatedRole: TargetRoleModel = {
      ...authoringRole,
      skillTargets: authoringRole.skillTargets.filter((st) => st.skillId !== skillId),
      updatedAt: new Date().toISOString(),
    }

    setAuthoringRole(updatedRole)
    saveAndSetRoles((prev) => prev.map((r) => (r.id === updatedRole.id ? updatedRole : r)))

    // Persist immediately to database so reload preserves removal
    try {
      await fetch(`/api/v1/organizations/${orgId}/target-roles/${authoringRole.id}`, {
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
          status: updatedRole.status === 'published' ? 'ACTIVE' : updatedRole.status === 'rejected' ? 'REJECTED' : (updatedRole.status === 'submitted' || updatedRole.status === 'sent') ? 'SUBMITTED' : 'DRAFT',
          skillTargets: updatedRole.skillTargets,
        }),
      })
    } catch (e) {
      console.error('Failed to auto-persist skill target removal:', e)
    }

    toast({
      title: 'Micro-skill Removed',
      description: 'The micro-skill benchmark threshold has been detached from this draft role.',
      variant: 'info',
    })
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
          rejectionReason: '',
        }),
      })
      await fetchAssignedRoles()
    } catch {
      saveAndSetRoles((prev) => prev.map((r) => (r.id === updatedRole.id ? updatedRole : r)))
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

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
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
            description="Benchmark thresholds defined"
          />

          <StatCard
            variant="gradient"
            icon={<XCircle className="h-4 w-4 text-destructive" />}
            title="Rejected Roles"
            value={rejectedCount.toString()}
            valueClassName="text-destructive"
            description="Returned to L&D with feedback"
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
                    <option value="feedback">Feedback ({feedbackCount})</option>
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
                        <th className="py-2.5 px-3 whitespace-nowrap">Proficiency Levels (J • M • S)</th>
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
                            <td className="py-3 px-3 whitespace-nowrap">
                              <div className="text-xs font-medium text-foreground flex items-center gap-1.5">
                                <span>J ({role.levelThresholds?.J ?? 60}%)</span>
                                <span className="text-muted-foreground">·</span>
                                <span>M ({role.levelThresholds?.M ?? 75}%)</span>
                                <span className="text-muted-foreground">·</span>
                                <span>S ({role.levelThresholds?.S ?? 90}%)</span>
                              </div>
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
                              {isApproved && (
                                <Badge variant="success" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold dark:text-emerald-400">
                                  APPROVED
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

                                {/* Configure Micro-skills (when in draft or feedback) */}
                                {(isDraft || isFeedback) && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-foreground hover:border-primary hover:text-primary"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleOpenAuthoring(role)
                                    }}
                                    title={isFeedback ? "Revise Micro-skills Based on Manager Feedback" : "Configure Micro-skills"}
                                    aria-label={isFeedback ? "Revise Micro-skills Based on Manager Feedback" : "Configure Micro-skills"}
                                  >
                                    <Sliders className="h-4 w-4" />
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
        <Dialog open={isAuthoringModalOpen} onOpenChange={setIsAuthoringModalOpen} className="max-w-3xl min-h-[580px] max-h-[92vh] flex flex-col p-6 overflow-hidden transition-all duration-200">
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
                    authoringEffStatus === 'published' || isAuthoringApproved
                      ? 'success'
                      : isAuthoringFeedback
                      ? 'outline'
                      : isAuthoringRejected
                      ? 'destructive'
                      : 'warning'
                  }
                  className={
                    isAuthoringApproved
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold dark:text-emerald-400'
                      : isAuthoringFeedback
                      ? 'bg-amber-500/15 !text-black border-amber-500/30 font-bold dark:!text-black'
                      : 'font-bold'
                  }
                >
                  v{authoringRole.version} {authoringEffStatus.toUpperCase()}
                </Badge>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {/* Revision Feedback Banner when in feedback state */}
              {isAuthoringFeedback && cleanAuthoringRejectionReason && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-black flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-black mt-0.5 shrink-0" />
                  <div className="space-y-0.5 text-xs text-black">
                    <span className="font-semibold block text-black">L&amp;D Manager Revision Feedback</span>
                    <p className="text-[11px] leading-relaxed text-black">
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
                  <div className="p-2 rounded bg-card border border-border col-span-2">
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
                  <div className="p-2 rounded bg-card border border-border">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Proficiency Benchmark Levels</span>
                    <div className="text-[11px] font-medium text-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span>J ({authoringRole.levelThresholds?.J ?? 60}%)</span>
                      <span className="text-muted-foreground">·</span>
                      <span>M ({authoringRole.levelThresholds?.M ?? 75}%)</span>
                      <span className="text-muted-foreground">·</span>
                      <span>S ({authoringRole.levelThresholds?.S ?? 90}%)</span>
                    </div>
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

              {/* Form to Add New Micro-Skill Target */}
              {authoringRole.status !== 'published' && authoringRole.status !== 'submitted' && (
                <div className="p-3.5 rounded-lg border border-border bg-card space-y-3 relative z-20">
                  <div className="font-semibold text-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Plus className="h-4 w-4 text-primary" />
                      Add Micro-skill Target
                    </span>
                    <span className="text-[10px] text-muted-foreground font-normal">
                      Select from verified organization micro-skills
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                    <div className="sm:col-span-8">
                      <label className="text-[11px] font-semibold text-foreground block mb-1">
                        Micro-skill <span className="text-destructive">*</span>
                      </label>
                      <Combobox
                        size="sm"
                        clearable={false}
                        options={skillOptions}
                        value={newSkillId}
                        onChange={(val) => setNewSkillId(val)}
                        placeholder="Search & select micro-skill..."
                        searchPlaceholder="Search by skill code or title..."
                        emptyMessage="All micro-skills are already assigned"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-semibold text-foreground block mb-1">
                        Threshold (%)
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

                    <div className="sm:col-span-2">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={!newSkillId}
                        onClick={handleAddSkillTarget}
                        className="w-full font-semibold shadow-2xs"
                      >
                        + Assign
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Table of Assigned Micro-Skill Targets */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-primary" />
                    Configured Micro-skills ({authoringRole.skillTargets.length})
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Threshold Required
                  </span>
                </div>

                {authoringRole.skillTargets.length > 2 && (
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

                {authoringRole.skillTargets.length === 0 ? (
                  <div className="p-6 rounded-lg border border-dashed border-border text-center text-muted-foreground space-y-1">
                    <AlertCircle className="h-5 w-5 mx-auto text-warning" />
                    <p className="font-semibold text-foreground">No Micro-skills Configured Yet</p>
                    <p className="text-[11px]">
                      Add the required micro-skills above to specify competencies needed for this role.
                    </p>
                  </div>
                ) : (() => {
                  const filteredTargets = authoringRole.skillTargets.filter(
                    (st) =>
                      !configuredSkillSearch.trim() ||
                      st.skillCode.toLowerCase().includes(configuredSkillSearch.toLowerCase()) ||
                      st.skillName.toLowerCase().includes(configuredSkillSearch.toLowerCase())
                  )

                  if (filteredTargets.length === 0) {
                    return (
                      <div className="p-4 rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground">
                        No configured targets match &ldquo;{configuredSkillSearch}&rdquo;.
                      </div>
                    )
                  }

                  return (
                    <div className="rounded-lg border border-border overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                          <tr>
                            <th className="py-2.5 px-3">Skill Code &amp; Name</th>
                            <th className="py-2.5 px-3 text-center">Required Threshold</th>
                            {authoringRole.status !== 'published' && (
                              <th className="py-2.5 px-3 text-right">Action</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredTargets.map((st) => (
                            <tr key={st.skillId} className="hover:bg-muted/20">
                              <td className="py-2.5 px-3">
                                <span className="font-mono font-bold text-foreground mr-1.5">{st.skillCode}</span>
                                <span className="text-muted-foreground">{st.skillName}</span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-primary">
                                {st.threshold}%
                              </td>
                              {authoringRole.status !== 'published' && (
                                <td className="py-2.5 px-3 text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                    onClick={() => handleRemoveSkillTarget(st.skillId)}
                                    title="Detach Micro-skill"
                                    aria-label="Detach Micro-skill"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                })()}
              </div>
            </div>

            <DialogFooter className="shrink-0 flex items-center justify-between sm:justify-between w-full pt-3 border-t border-border mt-2">
              <Button variant="outline" size="sm" onClick={() => setIsAuthoringModalOpen(false)}>
                Close
              </Button>
              {!isAuthoringApproved && authoringRole.status !== 'published' && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 border-destructive/30"
                    leftIcon={<XCircle className="h-4 w-4 text-destructive" />}
                    onClick={() => {
                      setIsAuthoringModalOpen(false)
                      handleOpenRejectDialog(authoringRole)
                    }}
                  >
                    Reject Proposal
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={authoringRole.skillTargets.length === 0}
                    onClick={() => handleSubmitConfigurationToManager(authoringRole)}
                    className="font-semibold shadow-2xs"
                    leftIcon={<Send className="h-4 w-4" />}
                  >
                    {isAuthoringFeedback ? 'Re-submit to L&D Manager' : 'Submit to L&D Manager'}
                  </Button>
                </div>
              )}
            </DialogFooter>
        </Dialog>
        )
      })()}

      {/* REJECT CONFIRMATION DIALOG */}
      {rejectingRole && (
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen} className="max-w-md">
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                <span>Reject Role Proposal: {rejectingRole.title}</span>
              </DialogTitle>
              <DialogDescription>
                If the role scope or details proposed by the L&amp;D Manager do not match domain requirements, return this proposal for adjustment.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground font-mono">{rejectingRole.code}</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    v{rejectingRole.version}
                  </Badge>
                </div>
                <div className="text-muted-foreground text-xs font-medium">
                  {rejectingRole.title}
                </div>
                <div className="text-[11px] text-muted-foreground pt-1.5 border-t border-destructive/10 flex items-center justify-between">
                  <span>Assigned Domain Expert:</span>
                  <span className="font-semibold text-foreground">{activeExpert.name}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Reason for Rejecting Proposal <span className="text-destructive">*</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why the proposed fields or scope need revision (e.g. incorrect seniority, misaligned occupation, invalid responsibilities, or out-of-scope taxonomy)..."
                  className="w-full text-xs p-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={!rejectionReason.trim()}
                onClick={handleConfirmRejection}
                leftIcon={<XCircle className="h-4 w-4" />}
                className="font-semibold shadow-2xs"
              >
                Confirm Rejection
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}

      {/* TARGET ROLE DETAILS MODAL (Read-Only Architectural Metadata for Domain Expert) */}
      {viewingDetailsRole && (
        <Dialog
          open={Boolean(viewingDetailsRole)}
          onOpenChange={(open) => !open && setViewingDetailsRole(null)}
          className="max-w-2xl"
        >
          <div className="space-y-4">
            <DialogHeader>
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

                  {/* Proficiency Benchmark Levels */}
                  <div className="p-3 rounded-lg border border-border bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-foreground">
                        Proficiency Benchmark Levels
                      </span>
                      <span className="text-[10px] text-muted-foreground">Standard Mastery Targets</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {ONTOLOGY_LEVELS.map((lvl) => {
                        const targetThreshold = viewingDetailsRole.levelThresholds?.[lvl.code] ?? Math.round(lvl.threshold * 100)
                        return (
                          <div key={lvl.code} className="p-2 rounded-md bg-muted/30 border border-border/80">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-foreground text-xs">{lvl.name} ({lvl.code})</span>
                              <Badge variant="primary" className="text-[9px] py-0 px-1 font-mono">
                                {targetThreshold}% Target
                              </Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                              {lvl.context}
                            </p>
                          </div>
                        )
                      })}
                    </div>
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

            {/* Target Micro-skill Benchmark Thresholds */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-primary" />
                Configured Micro-skills ({viewingDetailsRole.skillTargets.length})
              </span>
              {viewingDetailsRole.skillTargets.length === 0 ? (
                <div className="p-3 rounded-lg border border-dashed border-border text-center text-muted-foreground text-xs">
                  No micro-skill proficiency thresholds configured yet.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                      <tr>
                        <th className="py-2 px-3">Skill Code &amp; Name</th>
                        <th className="py-2 px-3 text-center">Required Threshold</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {viewingDetailsRole.skillTargets.map((st) => {
                        const skill = companyMicroSkills.find((s) => s.id === st.skillId || s.code === st.skillCode)
                        const code = st.skillCode || skill?.code || 'SKILL'
                        const name = st.skillName || skill?.name || ''
                        return (
                          <tr key={st.skillId || st.skillCode} className="hover:bg-muted/20">
                            <td className="py-2 px-3">
                              <span className="font-mono font-bold text-foreground mr-1">{code}</span>
                              <span className="text-muted-foreground">{name}</span>
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
              )}
            </div>

            <DialogFooter className="pt-2 flex items-center justify-end gap-2 w-full">
              <Button variant="outline" size="sm" onClick={() => setViewingDetailsRole(null)}>
                Close
              </Button>
              {viewingDetailsRole.status === 'draft' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 border-destructive/30"
                  onClick={() => {
                    const r = viewingDetailsRole
                    setViewingDetailsRole(null)
                    handleOpenRejectDialog(r)
                  }}
                  leftIcon={<XCircle className="h-3.5 w-3.5 text-destructive" />}
                >
                  Reject Proposal
                </Button>
              )}
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
          </div>
        </Dialog>
      )}

      {/* Target-Role Knowledge Graph View Modal (REQ-018-F01) */}
      <TargetRoleGraphModal
        open={Boolean(graphRole)}
        onOpenChange={(open: boolean) => !open && setGraphRole(null)}
        roleId={graphRole?.id || null}
        organizationId={orgId}
        roleTitle={graphRole?.title}
      />
    </WorkspaceLayout>
  )
}
