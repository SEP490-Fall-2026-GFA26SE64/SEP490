import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  Briefcase,
  Check,
  CheckCircle2,
  CornerDownRight,
  Edit3,
  Eye,
  Plus,
  Search,
  Send,
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
  CAREER_FAMILIES,
  ELIGIBLE_EXPERTS,
  JOB_DOMAINS,
  sortTargetRolesWithDraftsBelowPublished,
  type TargetRoleModel,
} from '../data/ldManagerMockData'
import { Combobox, type ComboboxOption } from '../../../shared/components/ui/Combobox'

const TRACK_OPTIONS: ComboboxOption[] = [
  { value: 'PROFESSIONAL', label: 'PROFESSIONAL (IC Technical Specialist)', description: 'Engineering, architecture & deep technical crafts' },
  { value: 'MANAGEMENT', label: 'MANAGEMENT (Engineering Leadership)', description: 'Team leadership, delivery & technical coordination' },
]

const DOMAIN_OPTIONS: ComboboxOption[] = JOB_DOMAINS.map((dom) => ({
  value: dom.code,
  label: `${dom.name} (${dom.code})`,
  description: `Domain code: ${dom.code}`,
}))

const getFamilyOptions = (selectedDomain?: string): ComboboxOption[] => {
  return CAREER_FAMILIES.map((fam) => ({
    value: fam.code,
    label: `${fam.name} (${fam.domain})`,
    description: `Career family: ${fam.code}`,
    disabled: selectedDomain ? fam.domain !== selectedDomain : false,
  }))
}

const EXPERT_OPTIONS: ComboboxOption[] = ELIGIBLE_EXPERTS.map((exp) => ({
  value: exp.id,
  label: `${exp.name}`,
  description: exp.title,
}))



const ROLE_PRESETS: ImportPreset[] = []

export function TargetRolesPage() {
  const { toast } = useToast()

  // Master roles state
  const [roles, setRoles] = React.useState<TargetRoleModel[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<
    'all' | 'published' | 'draft' | 'sent' | 'rejected' | 'archived'
  >('all')

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
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false)
  const [selectedRole, setSelectedRole] = React.useState<TargetRoleModel | null>(null)
  const [viewingDetailsRole, setViewingDetailsRole] = React.useState<TargetRoleModel | null>(null)
  const [deletingRole, setDeletingRole] = React.useState<TargetRoleModel | null>(null)
  const [compSearchQuery, setCompSearchQuery] = React.useState('')

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
      status: (item.status === 'draft' || item.status === 'archived' || item.status === 'sent' || item.status === 'rejected') ? item.status : 'published',
      competencyIds: Array.isArray(item.competencyIds) ? item.competencyIds : [],
      skillTargets: Array.isArray(item.skillTargets) ? item.skillTargets : [],
      activeEnrollments: Number(item.activeEnrollments) || 0,
      updatedAt: item.updatedAt || new Date().toISOString().slice(0, 10),
    }))
    saveAndSetRoles((prev) => [...normalized, ...prev])
  }

  // Form states for creating role
  const [roleForm, setRoleForm] = React.useState({
    code: '',
    title: '',
    domainCode: 'ICT' as 'ICT' | 'DATA' | 'AI',
    familyCode: 'JAVA_BACKEND',
    track: 'PROFESSIONAL' as 'PROFESSIONAL' | 'MANAGEMENT',
    assignedExpertId: 'expert-chen',
    description: '',
  })

  // Form states for editing role (L&D Manager view/edit scope)
  const [editRoleForm, setEditRoleForm] = React.useState({
    title: '',
    domainCode: 'ICT' as 'ICT' | 'DATA' | 'AI',
    familyCode: 'JAVA_BACKEND',
    track: 'PROFESSIONAL' as 'PROFESSIONAL' | 'MANAGEMENT',
    assignedExpertId: '',
    description: '',
  })

  // Filtered and sorted roles: Drafts always immediately below their previous published version
  const filteredRoles = React.useMemo(() => {
    const sorted = sortTargetRolesWithDraftsBelowPublished(roles)
    return sorted.filter((r) => {
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter
      const matchesSearch =
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.department && r.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.domainCode && r.domainCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.familyCode && r.familyCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.assignedExpertName && r.assignedExpertName.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchesStatus && matchesSearch
    })
  }, [roles, statusFilter, searchQuery])

  // Aggregate stats
  const totalRoles = roles.length
  const publishedRoles = roles.filter((r) => r.status === 'published').length
  const draftRoles = roles.filter((r) => r.status === 'draft').length
  const sentRoles = roles.filter((r) => r.status === 'sent').length
  const rejectedRoles = roles.filter((r) => r.status === 'rejected').length
  const activeLearners = roles.reduce((acc, r) => acc + r.activeEnrollments, 0)

  // Dispatch draft to Domain Expert for micro-skill configuration
  const handleSendToExpert = async (role: TargetRoleModel) => {
    const expert = ELIGIBLE_EXPERTS.find((e) => e.id === role.assignedExpertId)
    const expertName = role.assignedExpertName || expert?.name || 'Assigned Expert'

    const updatedRole: TargetRoleModel = {
      ...role,
      status: 'sent',
      updatedAt: new Date().toISOString().slice(0, 10),
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
          status: 'SENT',
          version: role.version,
          skillTargets: role.skillTargets,
        }),
      })
      await fetchRoles()
    } catch {
      saveAndSetRoles((prev) => prev.map((r) => (r.id === role.id ? updatedRole : r)))
    }

    if (selectedRole?.id === role.id) {
      setSelectedRole(updatedRole)
    }
    toast({
      title: 'Target Role Sent to Expert',
      description: `${role.title} (v${role.version}) has been dispatched to ${expertName} for micro-skill authoring and threshold configuration.`,
      variant: 'success',
    })
  }

  // Handlers
  const handleOpenCreateRole = () => {
    setRoleForm({
      code: `ROLE-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      title: '',
      domainCode: 'ICT',
      familyCode: 'JAVA_BACKEND',
      track: 'PROFESSIONAL',
      assignedExpertId: 'expert-chen',
      description: '',
    })
    setIsCreateRoleModalOpen(true)
  }

  const handleCreateRoleSubmit = async () => {
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

    const orgId = activeComp?.id || 'default-org'
    let generatedId = `role-${Date.now()}`

    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/target-roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': 'LD_MANAGER',
        },
        body: JSON.stringify({
          code: roleForm.code.trim().toUpperCase(),
          name: roleForm.title.trim(),
          domainCode: roleForm.domainCode,
          familyCode: roleForm.familyCode,
          track: roleForm.track,
          assignedExpertId: roleForm.assignedExpertId,
          description: roleForm.description,
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
          title: 'Target Role Draft Created',
          description: `Draft role ${roleForm.code.trim().toUpperCase()} - ${roleForm.title.trim()} initialized and saved to database.`,
          variant: 'success',
        })
        return
      }
    } catch {
      // Backend unavailable fallback
    }

    const assignedExpert = ELIGIBLE_EXPERTS.find((e) => e.id === roleForm.assignedExpertId)
    const domainObj = JOB_DOMAINS.find((d) => d.code === roleForm.domainCode)

    const newRole: TargetRoleModel = {
      id: generatedId,
      stableId: `role-uuid-${Date.now()}`,
      code: roleForm.code.trim().toUpperCase(),
      title: roleForm.title.trim(),
      domainCode: roleForm.domainCode,
      familyCode: roleForm.familyCode,
      track: roleForm.track,
      assignedExpertId: roleForm.assignedExpertId,
      assignedExpertName: assignedExpert ? assignedExpert.name : '',
      department: domainObj ? domainObj.name : 'Information & Communication Technology',
      description: roleForm.description || 'Enterprise role profile awaiting competency mappings.',
      version: '1.0',
      status: 'draft',
      competencyIds: [],
      skillTargets: [],
      activeEnrollments: 0,
      updatedAt: new Date().toISOString().slice(0, 10),
    }

    saveAndSetRoles([newRole, ...roles])
    setIsCreateRoleModalOpen(false)
    toast({
      title: 'Target Role Draft Created',
      description: `Draft role ${newRole.code} - ${newRole.title} initialized. Assigned to ${newRole.assignedExpertName || 'Domain Expert'} for micro-skill linking.`,
      variant: 'success',
    })
  }


  // Create Successor Draft (v+1)
  const handleCreateSuccessorDraft = async (publishedRole: TargetRoleModel) => {
    const currentVersionNum = parseFloat(publishedRole.version) || 1.0
    const successorVersion = (currentVersionNum + 0.1).toFixed(1)

    // Check if a draft or in-flight successor already exists for this role
    const existingDraft = roles.find(
      (r) =>
        (r.stableId === publishedRole.stableId || r.code === publishedRole.code) &&
        (r.status === 'draft' || r.status === 'sent' || r.status === 'rejected'),
    )
    if (existingDraft) {
      toast({
        title: 'Successor Draft Exists',
        description: `Successor version ${existingDraft.version} (${existingDraft.status.toUpperCase()}) is already open for ${publishedRole.title}. Please review or finalize the open version.`,
        variant: 'warning',
      })
      return
    }

    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/target-roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': 'LD_MANAGER',
        },
        body: JSON.stringify({
          code: publishedRole.code,
          name: publishedRole.title,
          domainCode: publishedRole.domainCode || 'ICT',
          familyCode: publishedRole.familyCode || 'JAVA_BACKEND',
          track: publishedRole.track || 'PROFESSIONAL',
          assignedExpertId: publishedRole.assignedExpertId || '',
          description: `Successor draft of ${publishedRole.title} (${publishedRole.version}). Historical learner assignments remain anchored to ${publishedRole.version}.`,
          version: successorVersion,
          status: 'DRAFT',
          skillTargets: publishedRole.skillTargets || [],
        }),
      })

      if (res.ok) {
        await fetchRoles()
        toast({
          title: 'Successor Draft Initialized',
          description: `Created ${publishedRole.title} (v${successorVersion} Draft). Saved to database.`,
          variant: 'success',
        })
        return
      } else {
        const errorData = await res.json().catch(() => ({}))
        toast({
          title: 'Failed to Create Successor Draft',
          description: errorData.message || errorData.error || 'Server rejected successor draft creation.',
          variant: 'destructive',
        })
        return
      }
    } catch (e: any) {
      toast({
        title: 'Network Error',
        description: e?.message || 'Could not communicate with server.',
        variant: 'destructive',
      })
      return
    }
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
    setSelectedRole(role)
    setEditRoleForm({
      title: role.title,
      domainCode: (role.domainCode || 'ICT') as 'ICT' | 'DATA' | 'AI',
      familyCode: role.familyCode || 'JAVA_BACKEND',
      track: (role.track || 'PROFESSIONAL') as 'PROFESSIONAL' | 'MANAGEMENT',
      assignedExpertId: role.assignedExpertId || '',
      description: role.description || '',
    })
    setIsSkillTargetsModalOpen(true)
  }

  // Save updated role attributes (L&D Manager scope)
  const handleSaveEditRole = async () => {
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
    const domainObj = JOB_DOMAINS.find((d) => d.code === editRoleForm.domainCode)

    const orgId = activeComp?.id || 'comp-technova'
    try {
      await fetch(`/api/v1/organizations/${orgId}/target-roles/${selectedRole.id}`, {
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
          assignedExpertId: editRoleForm.assignedExpertId,
          description: editRoleForm.description,
          status: selectedRole.status === 'published' ? 'ACTIVE' : selectedRole.status === 'sent' ? 'SENT' : selectedRole.status === 'rejected' ? 'REJECTED' : 'DRAFT',
          version: selectedRole.version,
          skillTargets: selectedRole.skillTargets,
        }),
      })
      await fetchRoles()
    } catch {
      // Local fallback
    }

    const updatedRole: TargetRoleModel = {
      ...selectedRole,
      title: editRoleForm.title.trim(),
      domainCode: editRoleForm.domainCode,
      familyCode: editRoleForm.familyCode,
      track: editRoleForm.track,
      assignedExpertId: editRoleForm.assignedExpertId,
      assignedExpertName: assignedExpert ? assignedExpert.name : '',
      department: domainObj ? domainObj.name : selectedRole.department,
      description: editRoleForm.description,
      updatedAt: new Date().toISOString().slice(0, 10),
    }

    saveAndSetRoles((prev) => prev.map((r) => (r.id === selectedRole.id ? updatedRole : r)))
    setSelectedRole(updatedRole)
    setIsSkillTargetsModalOpen(false)
    toast({
      title: 'Target Role Updated',
      description: `Saved changes to ${updatedRole.code} - ${updatedRole.title}.`,
      variant: 'success',
    })
  }

  // Open skill targets modal with first unassigned skill (deprecated helper alias)
  const handleOpenSkillTargets = (role: TargetRoleModel) => {
    handleOpenEditRole(role)
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
        prev.map((r) => (r.id === role.id ? { ...r, status: 'published', updatedAt: new Date().toISOString().slice(0, 10) } : r)),
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
            title="In-Flight Profiles"
            value={(draftRoles + sentRoles + rejectedRoles).toString()}
            valueClassName="text-warning"
            description={`${draftRoles} drafts · ${sentRoles} sent · ${rejectedRoles} rejected`}
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
                    <option value="all">All Statuses ({totalRoles})</option>
                    <option value="published">Published ({publishedRoles})</option>
                    <option value="sent">Sent ({sentRoles})</option>
                    <option value="draft">Drafts ({draftRoles})</option>
                    <option value="rejected">Rejected ({rejectedRoles})</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
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
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[11px] font-semibold">
                      <th className="py-2.5 px-3">Role Code</th>
                      <th className="py-2.5 px-3">Title &amp; Version</th>
                      <th className="py-2.5 px-3">Domain &amp; Family</th>
                      <th className="py-2.5 px-3">Track</th>
                      <th className="py-2.5 px-3">Assigned Expert</th>
                      <th className="py-2.5 px-3 text-center">Competencies</th>
                      <th className="py-2.5 px-3 text-center">Skill Targets</th>
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
                      filteredRoles.map((role) => {
                      const isDraft = role.status === 'draft'
                      const isSent = role.status === 'sent'
                      const isRejected = role.status === 'rejected'
                      const isPublished = role.status === 'published'

                      // Identify if role is a successor placed below a published version
                      const predecessorPublished = roles.find(
                        (r) => r.stableId === role.stableId && r.status === 'published' && r.id !== role.id
                      )
                      const isSuccessor = !isPublished && Boolean(predecessorPublished)

                      const expert = ELIGIBLE_EXPERTS.find((e) => e.id === role.assignedExpertId)
                      const domain = JOB_DOMAINS.find((d) => d.code === role.domainCode)

                      return (
                        <tr
                          key={role.id}
                          className={`hover:bg-muted/20 transition-colors ${
                            isSuccessor ? 'bg-muted/10 border-l-2 border-l-primary/60' : ''
                          }`}
                        >
                          <td className="py-3 px-3 font-mono font-bold text-foreground">
                            {isSuccessor ? (
                              <div className="flex items-center gap-1.5 pl-2" title={`Successor draft positioned below v${predecessorPublished?.version}`}>
                                <CornerDownRight className="h-3.5 w-3.5 text-primary shrink-0" />
                                <span>{role.code}</span>
                              </div>
                            ) : (
                              role.code
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              <span>{role.title}</span>
                              {isSuccessor && (
                                <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono text-primary border-primary/30">
                                  under v{predecessorPublished?.version}
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <Badge variant="secondary" className="font-mono text-[10px] py-0 px-1">
                                v{role.version}
                              </Badge>
                              <span>Updated {role.updatedAt}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-xs font-semibold text-foreground">{domain ? domain.name : role.domainCode || role.department || 'ICT'}</div>
                            <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{role.familyCode || 'GENERAL'}</div>
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant={role.track === 'MANAGEMENT' ? 'secondary' : 'outline'} className="text-[10px] font-semibold">
                              {role.track || 'PROFESSIONAL'}
                            </Badge>
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
                                handleOpenEditRole(role)
                              }}
                              className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-primary hover:underline cursor-pointer"
                            >
                              <Sliders className="h-3 w-3 text-primary" />
                              {role.skillTargets.length} targets
                            </button>
                          </td>
                          <td className="py-3 px-3">
                            {isPublished && <Badge variant="success">PUBLISHED</Badge>}
                            {isSent && (
                              <Badge variant="primary" className="bg-sky-500/10 text-sky-600 border-sky-500/20 font-bold dark:text-sky-400">
                                SENT
                              </Badge>
                            )}
                            {isRejected && <Badge variant="destructive">REJECTED</Badge>}
                            {isDraft && <Badge variant="warning">DRAFT</Badge>}
                            {role.status === 'archived' && <Badge variant="outline">ARCHIVED</Badge>}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View Details */}
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

                              {/* Send or Re-send to Expert */}
                              {(isDraft || isRejected) && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  className="h-8 w-8 p-0 shadow-2xs"
                                  onClick={() => handleSendToExpert(role)}
                                  title={isRejected ? "Re-send to Assigned Expert" : "Send to Assigned Expert"}
                                  aria-label={isRejected ? "Re-send to Assigned Expert" : "Send to Assigned Expert"}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              )}

                              {/* Edit Role (Draft, Sent, or Rejected) */}
                              {!isPublished && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleOpenEditRole(role)}
                                  title="Edit Role Details"
                                  aria-label="Edit Role Details"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                              )}

                              {/* Create Successor Draft (Published only) */}
                              {isPublished && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleCreateSuccessorDraft(role)}
                                  title="Create Successor Draft"
                                  aria-label="Create Successor Draft"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              )}

                              {/* Delete Role */}
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => setDeletingRole(role)}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Track <span className="text-muted-foreground text-[10px] font-normal">(Technical vs Leadership)</span>
                </label>
                <Combobox
                  size="sm"
                  clearable={false}
                  options={TRACK_OPTIONS}
                  value={roleForm.track}
                  onChange={(val) => val && setRoleForm({ ...roleForm, track: val as 'PROFESSIONAL' | 'MANAGEMENT' })}
                  placeholder="Select track..."
                  searchPlaceholder="Search track..."
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Job Domain <span className="text-destructive">*</span>
                </label>
                <Combobox
                  size="sm"
                  clearable={false}
                  options={DOMAIN_OPTIONS}
                  value={roleForm.domainCode}
                  onChange={(val) => {
                    if (!val) return
                    const newDomain = val as 'ICT' | 'DATA' | 'AI'
                    const compatibleFamily = CAREER_FAMILIES.find((f) => f.domain === newDomain)
                    setRoleForm({
                      ...roleForm,
                      domainCode: newDomain,
                      familyCode: compatibleFamily ? compatibleFamily.code : roleForm.familyCode,
                    })
                  }}
                  placeholder="Select domain..."
                  searchPlaceholder="Search job domain..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Career Family <span className="text-destructive">*</span>
                </label>
                <Combobox
                  size="sm"
                  clearable={false}
                  options={getFamilyOptions(roleForm.domainCode)}
                  value={roleForm.familyCode}
                  onChange={(val) => val && setRoleForm({ ...roleForm, familyCode: val })}
                  placeholder="Select family..."
                  searchPlaceholder="Search career family..."
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Assigned Domain Expert <span className="text-destructive">*</span>
                </label>
                <Combobox
                  size="sm"
                  clearable={false}
                  options={EXPERT_OPTIONS}
                  value={roleForm.assignedExpertId}
                  onChange={(val) => val && setRoleForm({ ...roleForm, assignedExpertId: val })}
                  placeholder="Select domain expert..."
                  searchPlaceholder="Search eligible expert..."
                />
              </div>
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

            <div className="p-3 rounded-lg bg-secondary border border-border/80 text-[11.5px] text-foreground space-y-1">
              <div className="font-semibold text-primary flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-primary" />
                L&amp;D Manager Role Creation Scope
              </div>
              <p className="text-muted-foreground leading-relaxed">
                You are creating the target role outline in <strong>DRAFT</strong> status. Per governance rules, newly created roles have no competency links attached at creation. Domain Experts will link micro-skills and maintain proficiency thresholds in Sprint 3 (REQ-015).
              </p>
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
                    No competencies registered for this company yet. Define competencies in Competency Ontology first.
                  </div>
                ) : (() => {
                  const filtered = companyCompetencies.filter(
                    (c) =>
                      !compSearchQuery.trim() ||
                      c.code.toLowerCase().includes(compSearchQuery.toLowerCase()) ||
                      c.name.toLowerCase().includes(compSearchQuery.toLowerCase()) ||
                      c.definition.toLowerCase().includes(compSearchQuery.toLowerCase())
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
                Refine role attributes and governance metadata. Domain Experts configure micro-skill benchmark thresholds.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              {/* Role Metadata & Governance Configuration */}
              <div className="p-3.5 rounded-lg border border-border bg-card space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-foreground block mb-1">
                      Role Code <span className="text-[10px] text-muted-foreground font-normal">(System Identifier)</span>
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
                      value={editRoleForm.title}
                      onChange={(e) => setEditRoleForm({ ...editRoleForm, title: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-foreground block mb-1">
                      Track <span className="text-muted-foreground text-[10px] font-normal">(Technical vs Leadership)</span>
                    </label>
                    <Combobox
                      size="sm"
                      clearable={false}
                      options={TRACK_OPTIONS}
                      value={editRoleForm.track}
                      onChange={(val) => val && setEditRoleForm({ ...editRoleForm, track: val as 'PROFESSIONAL' | 'MANAGEMENT' })}
                      placeholder="Select track..."
                      searchPlaceholder="Search track..."
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-foreground block mb-1">
                      Job Domain <span className="text-destructive">*</span>
                    </label>
                    <Combobox
                      size="sm"
                      clearable={false}
                      options={DOMAIN_OPTIONS}
                      value={editRoleForm.domainCode}
                      onChange={(val) => {
                        if (!val) return
                        const newDomain = val as 'ICT' | 'DATA' | 'AI'
                        const compatibleFamily = CAREER_FAMILIES.find((f) => f.domain === newDomain)
                        setEditRoleForm({
                          ...editRoleForm,
                          domainCode: newDomain,
                          familyCode: compatibleFamily ? compatibleFamily.code : editRoleForm.familyCode,
                        })
                      }}
                      placeholder="Select domain..."
                      searchPlaceholder="Search job domain..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-foreground block mb-1">
                      Career Family <span className="text-destructive">*</span>
                    </label>
                    <Combobox
                      size="sm"
                      clearable={false}
                      options={getFamilyOptions(editRoleForm.domainCode)}
                      value={editRoleForm.familyCode}
                      onChange={(val) => val && setEditRoleForm({ ...editRoleForm, familyCode: val })}
                      placeholder="Select family..."
                      searchPlaceholder="Search career family..."
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-foreground block mb-1">
                      Assigned Domain Expert <span className="text-destructive">*</span>
                    </label>
                    <Combobox
                      size="sm"
                      clearable={false}
                      options={EXPERT_OPTIONS}
                      value={editRoleForm.assignedExpertId}
                      onChange={(val) => val && setEditRoleForm({ ...editRoleForm, assignedExpertId: val })}
                      placeholder="Select assigned expert..."
                      searchPlaceholder="Search eligible expert..."
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-foreground block mb-1">Profile Description</label>
                  <textarea
                    rows={2}
                    value={editRoleForm.description}
                    onChange={(e) => setEditRoleForm({ ...editRoleForm, description: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Domain Expert Governance & Isolation Scope Card */}
              <div className="p-3.5 rounded-lg border border-border bg-secondary/60 space-y-1.5">
                <div className="font-semibold text-primary flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" /> Domain Expert Scope &amp; Micro-Skill Governance
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-background">
                    Restricted Linking
                  </Badge>
                </div>
                <p className="text-muted-foreground text-[11.5px] leading-relaxed">
                  L&amp;D Managers manage taxonomy, track alignment, and role governance. Domain Experts are exclusively responsible for linking micro-skills and configuring mastery benchmark thresholds. Only the assigned expert (<strong>{ELIGIBLE_EXPERTS.find((e) => e.id === editRoleForm.assignedExpertId)?.name || 'Assigned Expert'}</strong>) has visibility to modify this role in the Expert Portal.
                </p>
              </div>

              {/* Current assigned targets table (Read-only for L&D Manager) */}
              <div>
                <div className="font-semibold text-foreground mb-2 flex items-center justify-between">
                  <span>Assigned Micro-Skills Matrix ({selectedRole.skillTargets.length})</span>
                  <span className="text-[11px] text-muted-foreground">Configured by Domain Expert</span>
                </div>

                {selectedRole.skillTargets.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg bg-card/40 text-xs">
                    No micro-skills linked yet. Awaiting mapping by the assigned Domain Expert in Sprint 3.
                  </div>
                ) : (
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
                )}
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
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
                {selectedRole.status === 'draft' ? 'Delete Draft Role' : 'Delete Role'}
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsSkillTargetsModalOpen(false)}>
                  Cancel
                </Button>
                {selectedRole.status !== 'published' && (
                  <>
                    <Button variant="outline" size="sm" onClick={handleSaveEditRole}>
                      Save Changes
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Send className="h-4 w-4" />}
                      onClick={async () => {
                        await handleSaveEditRole()
                        handleSendToExpert({ ...selectedRole, ...editRoleForm, status: 'sent' })
                      }}
                    >
                      {selectedRole.status === 'rejected' ? 'Save & Re-send to Expert' : 'Save & Send to Expert'}
                    </Button>
                  </>
                )}
              </div>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Role Code</span>
                <span className="font-mono font-bold text-foreground mt-0.5 block">{viewingDetailsRole.code}</span>
              </div>
              <div className="p-3 rounded-lg border border-border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Track</span>
                <Badge variant={viewingDetailsRole.track === 'MANAGEMENT' ? 'secondary' : 'outline'} className="text-[10px] font-semibold mt-1">
                  {viewingDetailsRole.track || 'PROFESSIONAL'}
                </Badge>
              </div>
              <div className="p-3 rounded-lg border border-border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Version</span>
                <span className="font-mono font-bold text-foreground mt-0.5 block">v{viewingDetailsRole.version}</span>
              </div>
              <div className="p-3 rounded-lg border border-border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Job Domain</span>
                <span className="font-semibold text-foreground mt-0.5 truncate block">
                  {JOB_DOMAINS.find((d) => d.code === viewingDetailsRole.domainCode)?.name || viewingDetailsRole.domainCode || viewingDetailsRole.department || 'ICT'}
                </span>
              </div>
              <div className="p-3 rounded-lg border border-border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Career Family</span>
                <span className="font-mono font-semibold text-foreground mt-0.5 truncate block">
                  {viewingDetailsRole.familyCode || 'GENERAL'}
                </span>
              </div>
              <div className="p-3 rounded-lg border border-border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Assigned Domain Expert</span>
                <span className="font-semibold text-primary mt-0.5 truncate block">
                  {viewingDetailsRole.assignedExpertName || ELIGIBLE_EXPERTS.find((e) => e.id === viewingDetailsRole.assignedExpertId)?.name || 'Unassigned'}
                </span>
              </div>
            </div>


            {/* Description */}
            <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
                  Role Objective &amp; Scope
                </span>
                <p className="text-foreground leading-relaxed">
                  {viewingDetailsRole.description || 'Defines standardized competency requirements for this enterprise role track.'}
                </p>
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
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <DialogFooter className="pt-2 flex items-center justify-between sm:justify-between w-full">
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
              </div>
            </DialogFooter>
          </div>
        </Dialog>
      )}

      {/* 5. CONFIRMATION PROMPT TO DELETE TARGET ROLE (DRAFT OR PUBLISHED) */}
      <ConfirmationModal
        open={Boolean(deletingRole)}
        onOpenChange={(open) => !open && setDeletingRole(null)}
        title={deletingRole?.status === 'published' ? 'Delete Published Target Role?' : 'Discard Draft Target Role?'}
        description={
          deletingRole ? (
            <div className="space-y-2 text-xs">
              <p>
                Are you sure you want to {deletingRole.status === 'published' ? 'permanently delete the published role' : 'discard the draft version for'}{' '}
                <strong className="text-foreground font-semibold">
                  {deletingRole.title} ({deletingRole.code} v{deletingRole.version})
                </strong>
                ?
              </p>
              {deletingRole.status === 'published' ? (
                <div className="p-2.5 rounded bg-destructive/10 border border-destructive/20 text-destructive text-[11px] leading-relaxed">
                  <strong>Warning:</strong> This role is currently published and active. Deleting it will detach all micro-skill targets and remove it from active employee career pathways.
                </div>
              ) : (
                <p className="text-muted-foreground">
                  All uncommitted micro-skill benchmark thresholds and configuration changes for this draft will be permanently removed.
                </p>
              )}
            </div>
          ) : null
        }
        confirmText={deletingRole?.status === 'published' ? 'Delete Published Role' : 'Delete Draft'}
        cancelText="Keep Role"
        variant="destructive"
        onConfirm={() => {
          if (deletingRole) {
            handleDeleteRole(deletingRole)
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
        sampleJsonPlaceholder={`[\n  {\n    "code": "ROLE-AI-01",\n    "title": "AI Knowledge Architect",\n    "department": "Machine Learning & Cognitive Architecture",\n    "description": "Designs enterprise knowledge graph reasoning engines and neuro-symbolic pathways."\n  }\n]`}
      />
    </WorkspaceLayout>
  )
}
