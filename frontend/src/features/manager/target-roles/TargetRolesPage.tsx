import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  Briefcase,
  Check,
  CheckCircle2,
  Copy,
  Edit3,
  Eye,
  Plus,
  Search,
  Sliders,
  Trash2,
  Upload,
  Users,
} from 'lucide-react'
import * as React from 'react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { ConfirmationModal } from '../../../shared/components/ui/ConfirmationModal'
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
  INITIAL_COMPETENCIES,
  INITIAL_MICRO_SKILLS,
  type SkillTargetConfig,
  type TargetRoleModel,
} from '../data/ldManagerMockData'

const ROLE_PRESETS: ImportPreset[] = [
  {
    id: 'preset-ai-engineer-suite',
    name: 'Cognitive Architecture & AI Suite (2 Roles)',
    description: 'Target profiles for AI Knowledge Architect and Senior ML Engineer with baseline thresholds.',
    badge: 'Enterprise Suite',
    itemCount: 2,
    previewSnippet: JSON.stringify(
      [
        { code: 'ROLE-AI-01', title: 'AI Knowledge Architect', department: 'Cognitive Architecture' },
        { code: 'ROLE-ML-02', title: 'Senior Machine Learning Systems Engineer', department: 'Backend Systems' },
      ],
      null,
      2
    ),
    payload: [
      {
        id: `role-${Date.now()}-1`,
        stableId: `role-uuid-ai-01`,
        code: 'ROLE-AI-01',
        title: 'AI Knowledge Architect',
        department: 'Machine Learning & Cognitive Architecture',
        description: 'Designs enterprise knowledge graph reasoning engines and neuro-symbolic pathways.',
        version: '1.0',
        status: 'published' as const,
        competencyIds: [INITIAL_COMPETENCIES[0]?.id || 'comp-1'],
        skillTargets: [
          {
            skillId: INITIAL_MICRO_SKILLS[0]?.id || 'skill-1',
            skillCode: INITIAL_MICRO_SKILLS[0]?.code || 'SKILL-01',
            skillName: INITIAL_MICRO_SKILLS[0]?.name || 'Attention Mechanisms',
            threshold: 85,
            weight: 2.0,
            mandatory: true,
          },
        ],
        activeEnrollments: 4,
        updatedAt: new Date().toISOString().slice(0, 10),
        provenanceRef: 'Enterprise Talent Taxonomy 2026',
      },
      {
        id: `role-${Date.now()}-2`,
        stableId: `role-uuid-ml-02`,
        code: 'ROLE-ML-02',
        title: 'Senior Machine Learning Systems Engineer',
        department: 'Backend Engineering',
        description: 'Engineers distributed GPU inference serving and low-latency pipeline orchestration.',
        version: '1.0',
        status: 'published' as const,
        competencyIds: [INITIAL_COMPETENCIES[1]?.id || 'comp-2'],
        skillTargets: [
          {
            skillId: INITIAL_MICRO_SKILLS[1]?.id || 'skill-2',
            skillCode: INITIAL_MICRO_SKILLS[1]?.code || 'SKILL-02',
            skillName: INITIAL_MICRO_SKILLS[1]?.name || 'KV Cache Quantization',
            threshold: 80,
            weight: 1.5,
            mandatory: true,
          },
        ],
        activeEnrollments: 3,
        updatedAt: new Date().toISOString().slice(0, 10),
        provenanceRef: 'Enterprise Talent Taxonomy 2026',
      },
    ],
  },
]

export function TargetRolesPage() {
  const { toast } = useToast()

  // Master roles state
  const [roles, setRoles] = React.useState<TargetRoleModel[]>(() => getActiveCompany()?.targetRoles ?? [])
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'draft' | 'published' | 'archived'>('all')

  // Synchronize state when active company scope changes
  React.useEffect(() => {
    const handleSync = () => {
      const active = getActiveCompany()
      setRoles(active?.targetRoles ?? [])
    }
    window.addEventListener('active_company_changed', handleSync)
    return () => {
      window.removeEventListener('active_company_changed', handleSync)
    }
  }, [])

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

  const activeComp = getActiveCompany()
  const companyCompetencies = activeComp?.competencies || []
  const companyMicroSkills = activeComp?.microSkills || []

  // Modals state
  const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = React.useState(false)
  const [isMappingsModalOpen, setIsMappingsModalOpen] = React.useState(false)
  const [isSkillTargetsModalOpen, setIsSkillTargetsModalOpen] = React.useState(false)
  const [isPublishModalOpen, setIsPublishModalOpen] = React.useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false)
  const [selectedRole, setSelectedRole] = React.useState<TargetRoleModel | null>(null)
  const [viewingDetailsRole, setViewingDetailsRole] = React.useState<TargetRoleModel | null>(null)
  const [deletingDraftRole, setDeletingDraftRole] = React.useState<TargetRoleModel | null>(null)

  const handleImportRoles = (data: any) => {
    const list = Array.isArray(data) ? data : data.roles || []
    const normalized: TargetRoleModel[] = list.map((item: any, idx: number) => ({
      id: item.id || `role-${Date.now()}-${idx}`,
      stableId: item.stableId || `role-uuid-${Date.now()}-${idx}`,
      code: (item.code || `ROLE-IMP-${idx + 1}`).trim().toUpperCase(),
      title: (item.title || 'Untitled Target Role').trim(),
      department: (item.department || 'Machine Learning & Cognitive Architecture').trim(),
      description: (item.description || 'Target career role definition').trim(),
      version: item.version || '1.0',
      status: (item.status === 'draft' || item.status === 'archived') ? item.status : 'published',
      competencyIds: Array.isArray(item.competencyIds) ? item.competencyIds : [],
      skillTargets: Array.isArray(item.skillTargets) ? item.skillTargets : [],
      activeEnrollments: Number(item.activeEnrollments) || 0,
      updatedAt: item.updatedAt || new Date().toISOString().slice(0, 10),
      provenanceRef: item.provenanceRef || 'Enterprise Talent Taxonomy 2026',
    }))
    saveAndSetRoles((prev) => [...normalized, ...prev])
  }

  // Form states for creating/editing role
  const [roleForm, setRoleForm] = React.useState({
    code: '',
    title: '',
    department: 'Machine Learning & Cognitive Architecture',
    description: '',
    provenanceRef: '',
  })

  // State for new skill target addition in modal
  const [newSkillTarget, setNewSkillTarget] = React.useState<{
    skillId: string
    threshold: number
    weight: number
    mandatory: boolean
  }>({
    skillId: INITIAL_MICRO_SKILLS[0]?.id || '',
    threshold: 80,
    weight: 1.0,
    mandatory: true,
  })

  // Filtered roles
  const filteredRoles = roles.filter((r) => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.department.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  // Aggregate stats
  const totalRoles = roles.length
  const publishedRoles = roles.filter((r) => r.status === 'published').length
  const draftRoles = roles.filter((r) => r.status === 'draft').length
  const activeLearners = roles.reduce((acc, r) => acc + r.activeEnrollments, 0)

  // Handlers
  const handleOpenCreateRole = () => {
    setRoleForm({
      code: `ROLE-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      title: '',
      department: 'Machine Learning & Cognitive Architecture',
      description: '',
      provenanceRef: 'Corporate Job Architecture Level 5',
    })
    setIsCreateRoleModalOpen(true)
  }

  const handleCreateRoleSubmit = () => {
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
        description: `Role Code ${roleForm.code} already exists in the ontology catalog.`,
        variant: 'destructive',
      })
      return
    }

    const newRole: TargetRoleModel = {
      id: `role-${Date.now()}`,
      stableId: `role-uuid-${Date.now()}`,
      code: roleForm.code.trim().toUpperCase(),
      title: roleForm.title.trim(),
      department: roleForm.department,
      description: roleForm.description || 'Enterprise role profile awaiting competency mappings.',
      version: '1.0',
      status: 'draft',
      competencyIds: [],
      skillTargets: [],
      activeEnrollments: 0,
      updatedAt: new Date().toISOString().slice(0, 10),
      provenanceRef: roleForm.provenanceRef || 'Internal L&D Job Specification 2026',
    }

    saveAndSetRoles([newRole, ...roles])
    setIsCreateRoleModalOpen(false)
    toast({
      title: 'Target Role Draft Created',
      description: `Draft role ${newRole.code} - ${newRole.title} initialized. Complete required mappings before publication.`,
      variant: 'success',
    })
  }

  // Create Successor Draft (v+1)
  const handleCreateSuccessorDraft = (publishedRole: TargetRoleModel) => {
    const currentVersionNum = parseFloat(publishedRole.version) || 1.0
    const successorVersion = (currentVersionNum + 0.1).toFixed(1)

    // Check if a draft already exists for this role code
    const existingDraft = roles.find(
      (r) => r.stableId === publishedRole.stableId && r.status === 'draft',
    )
    if (existingDraft) {
      toast({
        title: 'Successor Draft Exists',
        description: `Draft ${existingDraft.version} is already open for ${publishedRole.title}. Please edit or publish the existing draft.`,
        variant: 'warning',
      })
      return
    }

    const successorRole: TargetRoleModel = {
      ...publishedRole,
      id: `role-${Date.now()}`,
      version: successorVersion,
      status: 'draft',
      activeEnrollments: 0, // Fresh draft has no historical assignments attached
      updatedAt: new Date().toISOString().slice(0, 10),
      description: `Successor draft of ${publishedRole.title} (${publishedRole.version}). Historical learner assignments remain anchored to ${publishedRole.version}.`,
    }

    saveAndSetRoles([successorRole, ...roles])
    toast({
      title: 'Successor Draft Initialized',
      description: `Created ${successorRole.title} (v${successorRole.version} Draft). Historical assignments to v${publishedRole.version} are protected.`,
      variant: 'success',
    })
  }

  // Delete Draft Role
  const handleDeleteDraft = (role: TargetRoleModel) => {
    saveAndSetRoles((prev) => prev.filter((r) => r.id !== role.id))
    toast({
      title: 'Draft Role Deleted',
      description: `Draft profile for ${role.title} (v${role.version}) has been discarded.`,
      variant: 'info',
    })
  }

  // Open skill targets modal with first unassigned skill
  const handleOpenSkillTargets = (role: TargetRoleModel) => {
    setSelectedRole(role)
    const firstUnassigned = companyMicroSkills.find(
      (ms) => !role.skillTargets.some((st) => st.skillId === ms.id),
    )
    setNewSkillTarget({
      skillId: firstUnassigned ? firstUnassigned.id : companyMicroSkills[0]?.id || '',
      threshold: 80,
      weight: 1.0,
      mandatory: true,
    })
    setIsSkillTargetsModalOpen(true)
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
        return { ...r, competencyIds: updatedCompIds, updatedAt: new Date().toISOString().slice(0, 10) }
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

  // Add Skill Target
  const handleAddSkillTarget = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId)
    if (!role) return

    // Validation: Reject duplicates
    if (role.skillTargets.some((st) => st.skillId === newSkillTarget.skillId)) {
      toast({
        title: 'Duplicate Target Rejected',
        description: 'This micro-skill is already assigned as a target for this role.',
        variant: 'destructive',
      })
      return
    }

    // Validation: Positive weight
    if (newSkillTarget.weight <= 0) {
      toast({
        title: 'Invalid Weight',
        description: 'Importance weight must be a positive number greater than 0 (e.g. 1.0, 1.5).',
        variant: 'destructive',
      })
      return
    }

    // Validation: Threshold between 1 and 100
    if (newSkillTarget.threshold < 1 || newSkillTarget.threshold > 100) {
      toast({
        title: 'Invalid Threshold',
        description: 'Target mastery threshold must be between 1% and 100%.',
        variant: 'destructive',
      })
      return
    }

    const microSkill = companyMicroSkills.find((ms) => ms.id === newSkillTarget.skillId)
    if (!microSkill) return

    const newTarget: SkillTargetConfig = {
      skillId: microSkill.id,
      skillCode: microSkill.code,
      skillName: microSkill.name,
      threshold: newSkillTarget.threshold,
      weight: newSkillTarget.weight,
      mandatory: newSkillTarget.mandatory,
    }

    const updatedRoles = roles.map((r) => {
      if (r.id !== roleId) return r
      return {
        ...r,
        skillTargets: [...r.skillTargets, newTarget],
        updatedAt: new Date().toISOString().slice(0, 10),
      }
    })

    saveAndSetRoles(updatedRoles)
    if (selectedRole && selectedRole.id === roleId) {
      setSelectedRole({
        ...selectedRole,
        skillTargets: [...selectedRole.skillTargets, newTarget],
      })
    }

    toast({
      title: 'Skill Target Added',
      description: `Mapped ${microSkill.code} with ${newTarget.threshold}% threshold and ${newTarget.weight}x weight.`,
      variant: 'success',
    })
  }

  // Remove Skill Target
  const handleRemoveSkillTarget = (roleId: string, skillId: string) => {
    const updatedRoles = roles.map((r) => {
      if (r.id !== roleId) return r
      return {
        ...r,
        skillTargets: r.skillTargets.filter((st) => st.skillId !== skillId),
        updatedAt: new Date().toISOString().slice(0, 10),
      }
    })
    saveAndSetRoles(updatedRoles)
    if (selectedRole && selectedRole.id === roleId) {
      setSelectedRole({
        ...selectedRole,
        skillTargets: selectedRole.skillTargets.filter((st) => st.skillId !== skillId),
      })
    }
  }

  // Publish validation check
  const getPublishValidation = (role: TargetRoleModel) => {
    const hasTitle = Boolean(role.title.trim())
    const hasCode = Boolean(role.code.trim())
    const hasCompetencies = role.competencyIds.length > 0
    const hasSkillTargets = role.skillTargets.length > 0
    const validThresholds = role.skillTargets.every((st) => st.threshold > 0 && st.threshold <= 100)
    const validWeights = role.skillTargets.every((st) => st.weight > 0)

    const canPublish =
      hasTitle && hasCode && hasCompetencies && hasSkillTargets && validThresholds && validWeights

    return {
      canPublish,
      hasTitle,
      hasCode,
      hasCompetencies,
      hasSkillTargets,
      validThresholds,
      validWeights,
    }
  }

  // Execute Publication
  const handleExecutePublish = (role: TargetRoleModel) => {
    const validation = getPublishValidation(role)
    if (!validation.canPublish) {
      toast({
        title: 'Publication Blocked',
        description: 'Complete all required competency links and micro-skill targets before publication.',
        variant: 'destructive',
      })
      return
    }

    saveAndSetRoles((prev) =>
      prev.map((r) => (r.id === role.id ? { ...r, status: 'published', updatedAt: new Date().toISOString().slice(0, 10) } : r)),
    )
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
        {/* Top Actions */}
        <div className="flex items-center justify-end gap-2 pb-1 border-b border-border/60">
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

        {/* Aggregate KPI StatCards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            title="Draft Profiles"
            value={draftRoles.toString()}
            valueClassName="text-warning"
            description="Pending mapping verification"
          />

          <StatCard
            variant="gradient"
            icon={<Users className="h-4 w-4 text-primary" />}
            title="Active Role Assignments"
            value={activeLearners.toString()}
            valueClassName="text-primary"
            description="Employees pursuing target goals"
          />
        </div>

        {/* Roles Table and Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  Target Role Version Catalog
                </CardTitle>
                <CardDescription>
                  Draft and published role definitions with mapped competencies and micro-skill thresholds.
                </CardDescription>
              </div>

              {/* Search and Status Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[200px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search roles or codes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center gap-1 bg-background border border-border rounded-md px-2 py-1">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredRoles.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                <p className="text-sm font-semibold">No target roles found.</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setStatusFilter('all')}>
                  Reset Filter
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[11px] font-semibold">
                      <th className="py-2.5 px-3">Role Code</th>
                      <th className="py-2.5 px-3">Title & Version</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3 text-center">Competencies</th>
                      <th className="py-2.5 px-3 text-center">Skill Targets</th>
                      <th className="py-2.5 px-3 text-center">Enrollments</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredRoles.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-muted-foreground text-xs">
                          No target roles registered yet for this company. Click "+ New Target Role" or import a role matrix to begin.
                        </td>
                      </tr>
                    ) : (
                      filteredRoles.map((role) => {
                      const isDraft = role.status === 'draft'
                      const isPublished = role.status === 'published'

                      return (
                        <tr key={role.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-foreground">
                            {role.code}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-foreground">{role.title}</div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <Badge variant="secondary" className="font-mono text-[10px] py-0 px-1">
                                v{role.version}
                              </Badge>
                              <span>Updated {role.updatedAt}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-muted-foreground">{role.department}</td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRole(role)
                                setIsMappingsModalOpen(true)
                              }}
                              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline cursor-pointer"
                            >
                              <BookOpen className="h-3 w-3" />
                              {role.competencyIds.length} linked
                            </button>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRole(role)
                                setIsSkillTargetsModalOpen(true)
                              }}
                              className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-primary hover:underline cursor-pointer"
                            >
                              <Sliders className="h-3 w-3 text-primary" />
                              {role.skillTargets.length} targets
                            </button>
                          </td>
                          <td className="py-3 px-3 text-center font-mono">
                            <span className="font-semibold text-foreground">{role.activeEnrollments}</span>
                          </td>
                          <td className="py-3 px-3">
                            <Badge
                              variant={
                                isPublished ? 'success' : isDraft ? 'warning' : 'outline'
                              }
                            >
                              {role.status.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {!isDraft && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => setViewingDetailsRole(role)}
                                  title="View Details"
                                  aria-label="View Details"
                                >
                                  <Eye className="h-4 w-4 text-primary" />
                                </Button>
                              )}
                              {isDraft ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleOpenSkillTargets(role)}
                                    title="Edit Draft"
                                    aria-label="Edit Draft"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => setDeletingDraftRole(role)}
                                    title="Delete Draft"
                                    aria-label="Delete Draft"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleCreateSuccessorDraft(role)}
                                  title="Create Draft"
                                  aria-label="Create Draft"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    }))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 1. CREATE TARGET ROLE MODAL */}
      <Dialog open={isCreateRoleModalOpen} onOpenChange={setIsCreateRoleModalOpen}>
        <div className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Create Target Role (Draft)
            </DialogTitle>
            <DialogDescription>
              Initialize a unique role code and title as a draft. Required competency mappings must be configured
              before publication.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Unique Role Code <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. ROLE-AI-ARCH"
                  value={roleForm.code}
                  onChange={(e) => setRoleForm({ ...roleForm, code: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Role Title <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. AI Knowledge Architect"
                  value={roleForm.title}
                  onChange={(e) => setRoleForm({ ...roleForm, title: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Target Department</label>
              <select
                value={roleForm.department}
                onChange={(e) => setRoleForm({ ...roleForm, department: e.target.value })}
                className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="Machine Learning & Cognitive Architecture">ML & Cognitive Architecture</option>
                <option value="Platform Engineering">Platform Engineering</option>
                <option value="Data Analytics & BI">Data Analytics & BI</option>
                <option value="Enterprise AI Governance">Enterprise AI Governance</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Profile Description</label>
              <textarea
                rows={2}
                placeholder="Enterprise scope, expected responsibilities, and architectural domain..."
                value={roleForm.description}
                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Provenance Citation</label>
              <input
                type="text"
                placeholder="e.g. Corporate Job Architecture Level 6 / Tech Spec 2026"
                value={roleForm.provenanceRef}
                onChange={(e) => setRoleForm({ ...roleForm, provenanceRef: e.target.value })}
                className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="p-2.5 rounded bg-muted/40 border border-border text-[11px] text-muted-foreground flex items-center gap-2">
              <Check className="h-4 w-4 text-primary shrink-0" />
              <span>Role will be created as version 1.0 (Draft). Historical assignments remain untouched.</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsCreateRoleModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateRoleSubmit}>
              Create Draft Role
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* 2. MAINTAIN ROLE-COMPETENCY MAPPINGS MODAL */}
      {selectedRole && (
        <Dialog open={isMappingsModalOpen} onOpenChange={setIsMappingsModalOpen}>
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Maintain Role–Competency Mappings
              </DialogTitle>
              <DialogDescription>
                Link or unlink active competencies to {selectedRole.title} ({selectedRole.code} v{selectedRole.version}).
                Missing or archived competencies are rejected.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="font-semibold text-foreground">Available Competencies Catalog</div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {companyCompetencies.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-xs border border-dashed rounded-lg">
                    No competencies registered for this company yet. Define competencies in Competency Ontology first.
                  </div>
                ) : (
                  companyCompetencies.map((comp) => {
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
                          : 'border-border bg-card'
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
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{comp.definition}</p>
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
                }))}
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

      {/* 3. SET ROLE SKILL TARGETS MODAL */}
      {selectedRole && (
        <Dialog open={isSkillTargetsModalOpen} onOpenChange={setIsSkillTargetsModalOpen} className="max-w-3xl">
          <div className="space-y-4">
            <DialogHeader>
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <DialogTitle className="flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-primary shrink-0" />
                  <span>Edit Target Role: {selectedRole.title}</span>
                </DialogTitle>
                <Badge variant={selectedRole.status === 'draft' ? 'warning' : 'success'}>
                  v{selectedRole.version} {selectedRole.status.toUpperCase()}
                </Badge>
              </div>
              <DialogDescription>
                Refine role attributes, micro-skill thresholds, and importance weights. Publish once requirements are satisfied.
              </DialogDescription>
            </DialogHeader>

            {(() => {
              const alreadyAssignedTarget = selectedRole.skillTargets.find(
                (st) => st.skillId === newSkillTarget.skillId,
              )
              const isAlreadyAssigned = Boolean(alreadyAssignedTarget)

              return (
                <div className="space-y-4 text-xs">
                  {/* Basic role metadata editing for draft */}
                  {selectedRole.status === 'draft' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg border border-border bg-card">
                      <div>
                        <label className="text-[11px] font-semibold text-foreground block mb-1">Role Title</label>
                        <input
                          type="text"
                          value={selectedRole.title}
                          onChange={(e) => {
                            const newTitle = e.target.value
                            setSelectedRole({ ...selectedRole, title: newTitle })
                            saveAndSetRoles((prev) => prev.map((r) => (r.id === selectedRole.id ? { ...r, title: newTitle } : r)))
                          }}
                          className="w-full px-2.5 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-foreground block mb-1">Department</label>
                        <input
                          type="text"
                          value={selectedRole.department}
                          onChange={(e) => {
                            const newDept = e.target.value
                            setSelectedRole({ ...selectedRole, department: newDept })
                            saveAndSetRoles((prev) => prev.map((r) => (r.id === selectedRole.id ? { ...r, department: newDept } : r)))
                          }}
                          className="w-full px-2.5 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  )}

                  {/* Form to add a new skill target */}
                  {selectedRole.status === 'draft' ? (
                    <div className="p-3.5 rounded-lg border border-border bg-muted/30 space-y-3">
                      <div className="font-semibold text-foreground flex items-center justify-between">
                        <span>Add Unique Micro-skill Target</span>
                        <Badge variant="secondary" className="text-[10px]">
                          Draft Mode Active
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                        <div className="sm:col-span-2">
                          <label className="text-[11px] text-muted-foreground block mb-1">Micro-skill</label>
                          <select
                            value={newSkillTarget.skillId}
                            onChange={(e) => setNewSkillTarget({ ...newSkillTarget, skillId: e.target.value })}
                            className={`w-full px-2.5 py-1.5 rounded-md bg-background border text-xs focus:outline-none focus:ring-1 ${
                              isAlreadyAssigned
                                ? 'border-warning/70 text-warning focus:ring-warning'
                                : 'border-border text-foreground focus:ring-primary'
                            }`}
                          >
                            {companyMicroSkills.length === 0 ? (
                              <option value="" disabled>No micro-skills defined yet</option>
                            ) : (
                              companyMicroSkills.map((ms) => {
                                const isAssigned = selectedRole.skillTargets.some((st) => st.skillId === ms.id)
                                return (
                                  <option key={ms.id} value={ms.id}>
                                    {ms.code} - {ms.name} {isAssigned ? '✓ (Already Assigned)' : ''}
                                  </option>
                                )
                              })
                            )}
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] text-muted-foreground block mb-1">Threshold (%)</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            disabled={isAlreadyAssigned}
                            value={newSkillTarget.threshold}
                            onChange={(e) =>
                              setNewSkillTarget({ ...newSkillTarget, threshold: parseInt(e.target.value) || 0 })
                            }
                            className="w-full px-2.5 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] text-muted-foreground block mb-1">Weight (&gt;0)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            disabled={isAlreadyAssigned}
                            value={newSkillTarget.weight}
                            onChange={(e) =>
                              setNewSkillTarget({ ...newSkillTarget, weight: parseFloat(e.target.value) || 1.0 })
                            }
                            className="w-full px-2.5 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                          />
                        </div>
                      </div>

                      {/* Explicit UI Feedback when micro-skill is already assigned */}
                      {isAlreadyAssigned && (
                        <div className="p-2.5 rounded-lg bg-warning/10 border border-warning/30 flex items-center justify-between gap-2 text-warning animate-in fade-in-50">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span className="text-xs">
                              <strong>{alreadyAssignedTarget?.skillCode}</strong> is already assigned in this role matrix (
                              {alreadyAssignedTarget?.threshold}% threshold, {alreadyAssignedTarget?.weight}x weight). Duplicate targets are rejected.
                            </span>
                          </div>
                          <Badge variant="warning" className="text-[10px] uppercase font-bold shrink-0">
                            ALREADY ASSIGNED
                          </Badge>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={isAlreadyAssigned}
                            checked={newSkillTarget.mandatory}
                            onChange={(e) => setNewSkillTarget({ ...newSkillTarget, mandatory: e.target.checked })}
                            className="rounded border-border text-primary focus:ring-primary disabled:opacity-50"
                          />
                          <span className="font-semibold text-foreground">Mandatory Prerequisite Target</span>
                        </label>

                        <Button
                          variant={isAlreadyAssigned ? 'outline' : 'primary'}
                          size="sm"
                          disabled={isAlreadyAssigned}
                          leftIcon={isAlreadyAssigned ? <Check className="h-3.5 w-3.5 text-warning" /> : <Plus className="h-3.5 w-3.5" />}
                          onClick={() => handleAddSkillTarget(selectedRole.id)}
                        >
                          {isAlreadyAssigned ? 'Already Assigned' : 'Assign Target'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded bg-muted/40 border border-border text-xs text-muted-foreground">
                      Published role version is locked to maintain historical learning records. Create a successor draft
                      to modify targets.
                    </div>
                  )}

              {/* Current assigned targets table */}
              <div>
                <div className="font-semibold text-foreground mb-2 flex items-center justify-between">
                  <span>Assigned Skill Targets ({selectedRole.skillTargets.length})</span>
                  <span className="text-[11px] text-muted-foreground">Threshold &amp; Weight Configured</span>
                </div>

                {selectedRole.skillTargets.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
                    No skill targets configured yet. Add micro-skills above.
                  </div>
                ) : (
                  <div className="overflow-x-auto border rounded-lg border-border">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[10px] font-semibold">
                          <th className="py-2 px-3">Skill Code &amp; Name</th>
                          <th className="py-2 px-3 text-center">Threshold</th>
                          <th className="py-2 px-3 text-center">Weight</th>
                          <th className="py-2 px-3 text-center">Mandatory</th>
                          {selectedRole.status === 'draft' && <th className="py-2 px-3 text-right">Action</th>}
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
                            <td className="py-2.5 px-3 text-center font-mono font-semibold">
                              {st.weight}x
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {st.mandatory ? (
                                <Badge variant="destructive" className="text-[9px] py-0 px-1 font-bold">
                                  REQUIRED
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[9px] py-0 px-1">
                                  OPTIONAL
                                </Badge>
                              )}
                            </td>
                            {selectedRole.status === 'draft' && (
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSkillTarget(selectedRole.id, st.skillId)}
                                  className="text-destructive hover:text-destructive/80 p-1 cursor-pointer"
                                  title="Remove target"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )
        })()}

            <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
              <Button variant="outline" size="sm" onClick={() => setIsSkillTargetsModalOpen(false)}>
                Save Draft
              </Button>
              {selectedRole.status === 'draft' && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  onClick={() => {
                    setIsSkillTargetsModalOpen(false)
                    setIsPublishModalOpen(true)
                  }}
                >
                  Publish Role
                </Button>
              )}
            </DialogFooter>
          </div>
        </Dialog>
      )}

      {/* 4. PUBLICATION READINESS VERIFICATION MODAL */}
      {selectedRole && (
        <Dialog open={isPublishModalOpen} onOpenChange={setIsPublishModalOpen}>
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Publish Target Role: {selectedRole.title} (v{selectedRole.version})
              </DialogTitle>
              <DialogDescription>
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
                      <span className="text-muted-foreground">Linked Competencies (&ge; 1 required)</span>
                      {validation.hasCompetencies ? (
                        <span className="text-success font-semibold flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" /> {selectedRole.competencyIds.length} Linked
                        </span>
                      ) : (
                        <span className="text-destructive font-semibold">0 Competencies</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Micro-skill Targets configured</span>
                      {validation.hasSkillTargets ? (
                        <span className="text-success font-semibold flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" /> {selectedRole.skillTargets.length} Configured
                        </span>
                      ) : (
                        <span className="text-destructive font-semibold">0 Targets</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Positive Weights &amp; Thresholds (1–100%)</span>
                      {validation.validThresholds && validation.validWeights ? (
                        <span className="text-success font-semibold flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" /> Compliant
                        </span>
                      ) : (
                        <span className="text-destructive font-semibold">Invalid Threshold/Weight</span>
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
          className="max-w-2xl"
        >
          <div className="space-y-4">
            <DialogHeader>
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <DialogTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary shrink-0" />
                  <span>Target Role Details: {viewingDetailsRole.title}</span>
                </DialogTitle>
                <Badge
                  variant={
                    viewingDetailsRole.status === 'published'
                      ? 'success'
                      : viewingDetailsRole.status === 'draft'
                        ? 'warning'
                        : 'outline'
                  }
                  className="font-bold text-xs"
                >
                  {viewingDetailsRole.status.toUpperCase()}
                </Badge>
              </div>
              <DialogDescription>
                Comprehensive role architecture, ontology requirements, and active enterprise enrollments.
              </DialogDescription>
            </DialogHeader>

            {/* Meta Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Role Code</span>
                <span className="font-mono font-bold text-foreground mt-0.5 block">{viewingDetailsRole.code}</span>
              </div>
              <div className="p-3 rounded-lg border border-border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Version</span>
                <span className="font-mono font-bold text-foreground mt-0.5 block">v{viewingDetailsRole.version}</span>
              </div>
              <div className="p-3 rounded-lg border border-border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Department</span>
                <span className="font-semibold text-foreground mt-0.5 truncate block">{viewingDetailsRole.department}</span>
              </div>
              <div className="p-3 rounded-lg border border-border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Active Learners</span>
                <span className="font-mono font-bold text-primary mt-0.5 block">{viewingDetailsRole.activeEnrollments} enrolled</span>
              </div>
            </div>

            {/* Description & Citation */}
            <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
                  Role Objective &amp; Scope
                </span>
                <p className="text-foreground leading-relaxed">
                  {viewingDetailsRole.description || 'Defines standardized competency requirements for this enterprise role track.'}
                </p>
              </div>
              <div className="pt-2 border-t border-border flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Authority Citation:</span>
                <span className="font-mono font-medium text-foreground">{viewingDetailsRole.provenanceRef}</span>
              </div>
            </div>

            {/* Linked Competencies */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                Mapped Knowledge Competencies ({viewingDetailsRole.competencyIds.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {viewingDetailsRole.competencyIds.map((cid) => {
                  const comp = companyCompetencies.find((c) => c.id === cid)
                  return (
                    <span
                      key={cid}
                      className="px-2.5 py-1 rounded-md bg-secondary text-primary font-medium border border-primary/20"
                    >
                      {comp ? `${comp.code}: ${comp.name}` : cid}
                    </span>
                  )
                })}
              </div>
            </div>

            {/* Required Micro-Skill Targets Table */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-primary" />
                Target Micro-skill Benchmark Thresholds ({viewingDetailsRole.skillTargets.length})
              </span>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                    <tr>
                      <th className="py-2 px-3">Skill Code &amp; Name</th>
                      <th className="py-2 px-3 text-center">Required Threshold</th>
                      <th className="py-2 px-3 text-center">Weight</th>
                      <th className="py-2 px-3 text-right">Requirement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {viewingDetailsRole.skillTargets.map((st) => {
                      const skill = companyMicroSkills.find((s) => s.id === st.skillId)
                      return (
                        <tr key={st.skillId} className="hover:bg-muted/20">
                          <td className="py-2 px-3">
                            <span className="font-mono font-bold text-foreground mr-1">{skill?.code}</span>
                            <span className="text-muted-foreground">{skill?.name}</span>
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-primary">
                            {st.threshold}%
                          </td>
                          <td className="py-2 px-3 text-center font-mono">
                            {st.weight}x
                          </td>
                          <td className="py-2 px-3 text-right">
                            <Badge variant={st.mandatory ? 'destructive' : 'secondary'} className="text-[10px]">
                              {st.mandatory ? 'Mandatory' : 'Elective'}
                            </Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" onClick={() => setViewingDetailsRole(null)}>
                Close
              </Button>
              {viewingDetailsRole.status === 'draft' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const r = viewingDetailsRole
                    setViewingDetailsRole(null)
                    handleOpenSkillTargets(r)
                  }}
                  leftIcon={<Sliders className="h-3 w-3" />}
                >
                  Edit Skill Targets
                </Button>
              )}
            </DialogFooter>
          </div>
        </Dialog>
      )}

      {/* 5. CONFIRMATION PROMPT TO DISCARD DRAFT */}
      <ConfirmationModal
        open={Boolean(deletingDraftRole)}
        onOpenChange={(open) => !open && setDeletingDraftRole(null)}
        title="Discard Draft Target Role?"
        description={
          deletingDraftRole ? (
            <div className="space-y-2 text-xs">
              <p>
                Are you sure you want to discard the draft version for{' '}
                <strong className="text-foreground font-semibold">
                  {deletingDraftRole.title} (v{deletingDraftRole.version})
                </strong>
                ?
              </p>
              <p className="text-muted-foreground">
                All uncommitted micro-skill benchmark thresholds and configuration changes for this draft will be permanently removed.
              </p>
            </div>
          ) : null
        }
        confirmText="Delete Draft"
        cancelText="Keep Draft"
        variant="destructive"
        onConfirm={() => {
          if (deletingDraftRole) {
            handleDeleteDraft(deletingDraftRole)
            setDeletingDraftRole(null)
          }
        }}
      />

      <QuickConfigImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        title="Import Target Role Suite"
        entityName="Target Roles"
        description="Select an industry role benchmark suite or upload custom target roles to configure career pathways for your organization."
        presets={ROLE_PRESETS}
        onImport={handleImportRoles}
        sampleJsonPlaceholder={`[\n  {\n    "code": "ROLE-AI-01",\n    "title": "AI Knowledge Architect",\n    "department": "Machine Learning & Cognitive Architecture",\n    "description": "Designs enterprise knowledge graph reasoning engines and neuro-symbolic pathways.",\n    "provenanceRef": "Enterprise Talent Taxonomy 2026"\n  }\n]`}
      />
    </WorkspaceLayout>
  )
}
