import {
  AlertCircle,
  AlertTriangle,
  Award,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Clock,
  CornerDownRight,
  Layers,
  Lock,
  Plus,
  Search,
  Sliders,
  Sparkles,
  Trash2,
  UserCheck,
  XCircle,
} from 'lucide-react'
import * as React from 'react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../shared/components/ui/Dialog'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { useToast } from '../../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { getActiveCompany, updateActiveCompany } from '../../../shared/stores/companyStore'
import {
  CAREER_FAMILIES,
  ELIGIBLE_EXPERTS,
  INITIAL_MICRO_SKILLS,
  JOB_DOMAINS,
  sortTargetRolesWithDraftsBelowPublished,
  type SkillTargetConfig,
  type TargetRoleModel,
} from '../../manager/data/ldManagerMockData'
import { Combobox, type ComboboxOption } from '../../../shared/components/ui/Combobox'

const EXPERT_PERSONA_OPTIONS: ComboboxOption[] = ELIGIBLE_EXPERTS.map((exp) => ({
  value: exp.id,
  label: exp.name,
  description: exp.title,
}))

export function ExpertAssignedRolesPage() {
  const { toast } = useToast()

  // Company state
  const activeCompany = getActiveCompany()
  const orgId = activeCompany?.id || 'comp-technova'
  const companyMicroSkills = activeCompany?.microSkills?.length ? activeCompany.microSkills : INITIAL_MICRO_SKILLS

  // Active Expert identity switcher (to demonstrate data isolation in demo/manual testing)
  const [selectedExpertId, setSelectedExpertId] = React.useState<string>(() => {
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
        const mapped: TargetRoleModel[] = data.map((r: any) => ({
          id: r.id,
          stableId: r.code,
          code: r.code,
          title: r.name,
          domainCode: r.domainCode,
          familyCode: r.familyCode,
          track: r.track,
          assignedExpertId: r.assignedExpertId,
          assignedExpertName: ELIGIBLE_EXPERTS.find((e) => e.id === r.assignedExpertId)?.name || r.assignedExpertId || '',
          department: JOB_DOMAINS.find((d) => d.code === r.domainCode)?.name || r.domainCode || 'Information Technology',
          description: r.description || '',
          version: r.version || '1.0',
          status: (r.status?.toLowerCase() === 'active' ? 'published' : r.status?.toLowerCase()) || 'draft',
          competencyIds: [],
          skillTargets: Array.isArray(r.skillTargets) ? r.skillTargets : [],
          activeEnrollments: 0,
          updatedAt: r.updatedAt ? r.updatedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
        }))
        setRoles(mapped)
      } else {
        setRoles([])
      }
    } catch {
      setRoles([])
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

  // Persist chosen expert
  const handleSelectExpert = (expertId: string) => {
    setSelectedExpertId(expertId)
    localStorage.setItem('expert_active_id', expertId)
    toast({
      title: 'Expert Persona Switched',
      description: `Now viewing workspace as ${ELIGIBLE_EXPERTS.find((e) => e.id === expertId)?.name}. Target roles are strictly isolated to this expert.`,
      variant: 'info',
    })
  }

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

  // Filter roles: STRICT ISOLATION by assignedExpertId, sorted with drafts below published
  const assignedRoles = React.useMemo(() => {
    const expertRoles = roles.filter((r) => r.assignedExpertId === selectedExpertId)
    return sortTargetRolesWithDraftsBelowPublished(expertRoles)
  }, [roles, selectedExpertId])

  // Filters & Search
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusTab, setStatusTab] = React.useState<'all' | 'draft' | 'published' | 'rejected'>('all')

  const filteredRoles = React.useMemo(() => {
    return assignedRoles.filter((role) => {
      const matchesSearch =
        role.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        role.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (role.department && role.department.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesStatus =
        statusTab === 'all'
          ? true
          : statusTab === 'draft'
          ? (role.status === 'draft' || role.status === 'sent')
          : role.status === statusTab

      return matchesSearch && matchesStatus
    })
  }, [assignedRoles, searchQuery, statusTab])

  // Aggregate Metrics: Expert sees dispatched and draft roles under Drafts
  const draftCount = assignedRoles.filter((r) => r.status === 'draft' || r.status === 'sent').length
  const publishedCount = assignedRoles.filter((r) => r.status === 'published').length
  const rejectedCount = assignedRoles.filter((r) => r.status === 'rejected').length
  const totalSkillTargets = assignedRoles.reduce((sum, r) => sum + r.skillTargets.length, 0)

  // Rejection Dialog State
  const [rejectingRole, setRejectingRole] = React.useState<TargetRoleModel | null>(null)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = React.useState(false)

  const handleOpenRejectDialog = (role: TargetRoleModel) => {
    setRejectingRole(role)
    setIsRejectDialogOpen(true)
  }

  const handleConfirmRejection = async () => {
    if (!rejectingRole) return

    const updatedRole: TargetRoleModel = {
      ...rejectingRole,
      status: 'rejected',
      updatedAt: new Date().toISOString().slice(0, 10),
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
          assignedExpertId: rejectingRole.assignedExpertId,
          description: rejectingRole.description,
          status: 'REJECTED',
          version: rejectingRole.version,
          skillTargets: rejectingRole.skillTargets,
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
      title: 'Target Role Rejected',
      description: `${updatedRole.title} (v${updatedRole.version}) has been rejected and returned to the L&D Manager.`,
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
      description: skill.observableOutcome || undefined,
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
      updatedAt: new Date().toISOString().slice(0, 10),
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
          assignedExpertId: updatedRole.assignedExpertId,
          description: updatedRole.description,
          version: updatedRole.version,
          status: updatedRole.status === 'published' ? 'ACTIVE' : updatedRole.status === 'rejected' ? 'REJECTED' : 'DRAFT',
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
      updatedAt: new Date().toISOString().slice(0, 10),
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
          assignedExpertId: updatedRole.assignedExpertId,
          description: updatedRole.description,
          version: updatedRole.version,
          status: updatedRole.status === 'published' ? 'ACTIVE' : updatedRole.status === 'rejected' ? 'REJECTED' : 'DRAFT',
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

  // Publish Role from Expert portal once skill requirements are satisfied
  const handlePublishFromExpert = async () => {
    if (!authoringRole) return

    if (authoringRole.skillTargets.length === 0) {
      toast({
        title: 'Micro-skills Required',
        description: 'You must configure at least one micro-skill target before publishing.',
        variant: 'destructive',
      })
      return
    }

    const updatedRole: TargetRoleModel = {
      ...authoringRole,
      status: 'published',
      updatedAt: new Date().toISOString().slice(0, 10),
    }

    try {
      await fetch(`/api/v1/organizations/${orgId}/target-roles/${authoringRole.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': 'DOMAIN_EXPERT',
          'X-User-Id': selectedExpertId,
        },
        body: JSON.stringify({
          name: authoringRole.title,
          domainCode: authoringRole.domainCode,
          familyCode: authoringRole.familyCode,
          track: authoringRole.track,
          assignedExpertId: authoringRole.assignedExpertId,
          description: authoringRole.description,
          status: 'ACTIVE',
          version: authoringRole.version,
          skillTargets: authoringRole.skillTargets,
        }),
      })
      await fetchAssignedRoles()
    } catch {
      saveAndSetRoles((prev) => prev.map((r) => (r.id === updatedRole.id ? updatedRole : r)))
    }

    setAuthoringRole(updatedRole)
    setIsAuthoringModalOpen(false)

    toast({
      title: 'Target Role Published',
      description: `${updatedRole.title} (${updatedRole.code} v${updatedRole.version}) is now active in the enterprise knowledge graph!`,
      variant: 'success',
    })
  }

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        {/* Page Header */}
        <PageHeader
          title="Target Roles"
          description="Review target roles assigned to your domain expertise by L&D Managers, configure required micro-skill proficiency thresholds, and publish or reject target roles."
          actions={
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
                Viewing as:
              </span>
              <Combobox
                size="sm"
                clearable={false}
                options={EXPERT_PERSONA_OPTIONS}
                value={selectedExpertId}
                onChange={(val) => val && handleSelectExpert(val)}
                className="w-56"
                placeholder="Switch persona..."
                searchPlaceholder="Search expert..."
              />
            </div>
          }
        />

        {/* Expert Isolation Notice Banner */}
        <div className="p-3.5 rounded-lg border border-primary/25 bg-secondary/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <UserCheck className="h-5 w-5 text-primary shrink-0" />
            <div>
              <span className="font-semibold text-foreground">
                Domain Expert Workspace:{' '}
                <span className="text-primary font-bold">{activeExpert.name}</span>
              </span>
              <p className="text-muted-foreground text-[11px] mt-0.5">
                Strict data isolation is enforced. You are viewing roles assigned exclusively to your profile. Other domain experts cannot view or modify these assignments.
              </p>
            </div>
          </div>
          <Badge variant="primary" className="shrink-0 self-start sm:self-auto font-mono text-[10px]">
            {activeExpert.id}
          </Badge>
        </div>

        {/* Aggregate KPI StatCards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            variant="gradient"
            icon={<Clock className="h-4 w-4 text-warning" />}
            title="Draft Roles"
            value={draftCount.toString()}
            valueClassName="text-warning"
            description="Awaiting expert review & skills"
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
            title="Configured Skill Targets"
            value={totalSkillTargets.toString()}
            valueClassName="text-primary"
            description="Benchmark thresholds defined"
          />

          <StatCard
            variant="gradient"
            icon={<Award className="h-4 w-4 text-primary" />}
            title="Assigned Domain Focus"
            value={activeExpert.title.split(' ')[0] || 'Technical'}
            valueClassName="text-primary"
            description={activeExpert.title}
          />
        </div>

        {/* Target Roles Catalog Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  Target Roles Catalog
                </CardTitle>
                <CardDescription>
                  Configure micro-skill prerequisites, proficiency thresholds (1–100%), and weighting.
                </CardDescription>
              </div>

              {/* Status and Search Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search target roles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary w-48 sm:w-56"
                  />
                </div>

                <div className="inline-flex rounded-md border border-border bg-muted/40 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setStatusTab('all')}
                    className={`px-2.5 py-1 rounded font-medium transition-all ${
                      statusTab === 'all'
                        ? 'bg-card text-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    All ({assignedRoles.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusTab('draft')}
                    className={`px-2.5 py-1 rounded font-medium transition-all ${
                      statusTab === 'draft'
                        ? 'bg-card text-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Drafts ({draftCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusTab('published')}
                    className={`px-2.5 py-1 rounded font-medium transition-all ${
                      statusTab === 'published'
                        ? 'bg-card text-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Published ({publishedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusTab('rejected')}
                    className={`px-2.5 py-1 rounded font-medium transition-all ${
                      statusTab === 'rejected'
                        ? 'bg-card text-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Rejected ({rejectedCount})
                  </button>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 text-center text-muted-foreground space-y-3 px-4">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto" />
                <p className="text-sm font-medium">Loading assigned target roles from database...</p>
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground space-y-3 px-4">
                <div className="h-12 w-12 rounded-full bg-muted/50 border border-border flex items-center justify-center mx-auto text-muted-foreground">
                  <Lock className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">
                    No Target Roles Assigned
                  </p>
                  <p className="text-xs max-w-md mx-auto mt-1">
                    There are no target roles assigned to <strong className="text-foreground">{activeExpert.name}</strong> matching your criteria. Target roles must be assigned to your profile by an L&D Manager.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/30 border-b border-border text-[11px] uppercase font-bold text-muted-foreground tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Role Code</th>
                      <th className="py-3 px-4">Role Title &amp; Version</th>
                      <th className="py-3 px-3">Domain &amp; Family</th>
                      <th className="py-3 px-3">Track</th>
                      <th className="py-3 px-3 text-center">Linked Competencies</th>
                      <th className="py-3 px-3 text-center">Skill Targets</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 text-right">Expert Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredRoles.map((role) => {
                      const isDraft = role.status === 'draft'
                      const isSent = role.status === 'sent'
                      const isRejected = role.status === 'rejected'
                      const isPublished = role.status === 'published'

                      // Identify successor role placed under a published role
                      const predecessorPublished = assignedRoles.find(
                        (r) => r.stableId === role.stableId && r.status === 'published' && r.id !== role.id
                      )
                      const isSuccessor = !isPublished && Boolean(predecessorPublished)

                      const domainObj = JOB_DOMAINS.find((d) => d.code === role.domainCode)
                      const familyObj = CAREER_FAMILIES.find((f) => f.code === role.familyCode)

                      return (
                        <tr
                          key={role.id}
                          className={`hover:bg-muted/20 transition-colors ${
                            isSuccessor ? 'bg-muted/10 border-l-2 border-l-primary/60' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-foreground">
                            {isSuccessor ? (
                              <div className="flex items-center gap-1.5 pl-2" title={`Successor draft positioned below v${predecessorPublished?.version}`}>
                                <CornerDownRight className="h-3.5 w-3.5 text-primary shrink-0" />
                                <span>{role.code}</span>
                              </div>
                            ) : (
                              role.code
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              <span>{role.title}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground">
                                v{role.version}
                              </span>
                              {isSuccessor && (
                                <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono text-primary border-primary/30">
                                  under v{predecessorPublished?.version}
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground line-clamp-1 max-w-xs mt-0.5">
                              {role.description}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-medium text-foreground">
                              {domainObj ? domainObj.code : role.department || 'ICT'}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {familyObj ? familyObj.name : role.familyCode || 'General'}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant={role.track === 'MANAGEMENT' ? 'secondary' : 'outline'} className="text-[10px]">
                              {role.track || 'PROFESSIONAL'}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-flex items-center gap-1 font-semibold text-muted-foreground">
                              <BookOpen className="h-3 w-3" />
                              {role.competencyIds.length} linked
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {role.skillTargets.length > 0 ? (
                              <Badge variant="success" className="text-[10px] font-mono">
                                {role.skillTargets.length} configured
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[10px] font-mono animate-pulse">
                                0 configured
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {isPublished && <Badge variant="success">PUBLISHED</Badge>}
                            {(isSent || isDraft) && <Badge variant="warning">DRAFT</Badge>}
                            {isRejected && <Badge variant="destructive">REJECTED</Badge>}
                            {role.status === 'archived' && <Badge variant="outline">ARCHIVED</Badge>}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {(isSent || isDraft) ? (
                                <>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    className="h-8 w-8 p-0 shadow-2xs"
                                    onClick={() => handleOpenAuthoring(role)}
                                    title="Configure Micro-skills"
                                    aria-label="Configure Micro-skills"
                                  >
                                    <Sliders className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:border-destructive hover:text-destructive"
                                    onClick={() => handleOpenRejectDialog(role)}
                                    title="Reject Role with Feedback"
                                    aria-label="Reject Role with Feedback"
                                  >
                                    <XCircle className="h-4 w-4 text-destructive" />
                                  </Button>
                                </>
                              ) : isRejected ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleOpenAuthoring(role)}
                                  title="View / Revise Skill Targets"
                                  aria-label="View / Revise Skill Targets"
                                >
                                  <Sliders className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleOpenAuthoring(role)}
                                  title="View Skill Targets"
                                  aria-label="View Skill Targets"
                                >
                                  <BookOpen className="h-4 w-4 text-primary" />
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
            )}
          </CardContent>
        </Card>
      </div>

      {/* MICRO-SKILL AUTHORING MODAL (EXCLUSIVE TO DOMAIN EXPERT) */}
      {authoringRole && (
        <Dialog open={isAuthoringModalOpen} onOpenChange={setIsAuthoringModalOpen} className="max-w-3xl">
          <div className="space-y-4">
            <DialogHeader>
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <DialogTitle className="flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-primary shrink-0" />
                  <span>
                    Micro-skill Authoring: {authoringRole.title}
                  </span>
                </DialogTitle>
                <Badge variant={authoringRole.status === 'published' ? 'success' : authoringRole.status === 'rejected' ? 'destructive' : 'warning'}>
                  v{authoringRole.version} {(authoringRole.status === 'sent' || authoringRole.status === 'draft') ? 'DRAFT' : authoringRole.status.toUpperCase()}
                </Badge>
              </div>
              <DialogDescription>
                As the assigned Domain Expert, author the required micro-skill proficiency thresholds and weights for this target role.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              {/* Expert Scope Information Callout */}
              <div className="p-3 rounded-lg border border-primary/20 bg-secondary/40 flex items-start gap-2.5">
                <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold text-foreground">
                    Domain Expert Authority Active
                  </span>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    L&amp;D Managers define macro career titles, while Domain Experts configure technical micro-skill targets. Once configured with &ge; 1 micro-skill, you may publish this target role directly into the enterprise knowledge graph, or reject it if prerequisites are mismatched.
                  </p>
                </div>
              </div>

              {/* Form to Add New Micro-Skill Target */}
              {authoringRole.status !== 'published' && (
                <div className="p-3.5 rounded-lg border border-border bg-card space-y-3">
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
                    Configured Micro-skill Targets ({authoringRole.skillTargets.length})
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
                    <p className="font-semibold text-foreground">No Micro-skill Targets Configured Yet</p>
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
                                    title="Detach Skill Target"
                                    aria-label="Detach Skill Target"
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

            <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsAuthoringModalOpen(false)}>
                Close
              </Button>
              {authoringRole.status !== 'published' && (
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
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={authoringRole.skillTargets.length === 0}
                    onClick={handlePublishFromExpert}
                    className="font-semibold shadow-2xs"
                    leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  >
                    Publish
                  </Button>
                </div>
              )}
            </DialogFooter>
          </div>
        </Dialog>
      )}

      {/* REJECT CONFIRMATION DIALOG */}
      {rejectingRole && (
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen} className="max-w-md">
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                <span>Reject Target Role: {rejectingRole.title}</span>
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to reject this target role? The role status will become REJECTED and returned to the L&amp;D Manager for adjustment.
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
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
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
    </WorkspaceLayout>
  )
}
