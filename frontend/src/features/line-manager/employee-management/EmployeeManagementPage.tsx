import * as React from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Clock,
  Edit2,
  FileText,
  History,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  Trash2,
  Unlock,
  Users,
} from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../shared/components/ui/Dialog'
import { Input } from '../../../shared/components/ui/Input'
import { Progress } from '../../../shared/components/ui/Progress'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { useEmployeeLearningState } from '../../../shared/hooks/useEmployeeLearningState'
import { useToast } from '../../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import {
  AVAILABLE_TARGET_ROLES,
  INITIAL_MANAGED_EMPLOYEES,
  type AssignmentAuditEntry,
  type ManagedEmployee,
} from '../data/lineManagerData'

export function EmployeeManagementPage() {
  const { toast } = useToast()
  const {
    profile: globalEmployeeProfile,
    isLearningLocked,
    assignInitialTargetRole,
    replaceTargetRole,
    reviseAssignmentDeadline,
    removeTargetRole: removeGlobalTargetRole,
    toggleDiagnosticLock,
  } = useEmployeeLearningState()

  // Local state of team members (syncing Alex Chen with global learning state)
  const [employees, setEmployees] = React.useState<ManagedEmployee[]>(() => {
    return INITIAL_MANAGED_EMPLOYEES.map((emp) => {
      if (emp.id === 'emp-101') {
        return {
          ...emp,
          targetRole: globalEmployeeProfile.targetRole,
          targetRoleVersion: globalEmployeeProfile.targetRoleVersion || 'v2.4 (Latest - Published 2026-06)',
          deadline: globalEmployeeProfile.deadline || '2026-12-31',
          benchmarkScore: globalEmployeeProfile.targetReadinessScore,
          diagnosticStatus: !globalEmployeeProfile.targetRole
            ? 'unassigned'
            : globalEmployeeProfile.diagnosticCompleted
            ? 'completed'
            : 'pending',
          diagnosticScore: globalEmployeeProfile.diagnosticScore,
        }
      }
      return emp
    })
  })

  // Keep Alex Chen synced when global profile changes
  React.useEffect(() => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id === 'emp-101') {
          return {
            ...emp,
            targetRole: globalEmployeeProfile.targetRole,
            targetRoleVersion: globalEmployeeProfile.targetRoleVersion || 'v2.4 (Latest - Published 2026-06)',
            deadline: globalEmployeeProfile.deadline || '2026-12-31',
            benchmarkScore: globalEmployeeProfile.targetReadinessScore,
            diagnosticStatus: !globalEmployeeProfile.targetRole
              ? 'unassigned'
              : globalEmployeeProfile.diagnosticCompleted
              ? 'completed'
              : 'pending',
            diagnosticScore: globalEmployeeProfile.diagnosticScore,
          }
        }
        return emp
      })
    )
  }, [globalEmployeeProfile])

  // Filters and search
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'pending' | 'completed' | 'unassigned'>('all')

  // Modals
  const [selectedEmployee, setSelectedEmployee] = React.useState<ManagedEmployee | null>(null)
  const [isInitialAssignModalOpen, setIsInitialAssignModalOpen] = React.useState(false) // UC-04
  const [isReplaceModalOpen, setIsReplaceModalOpen] = React.useState(false) // UC-05
  const [isReviseDeadlineModalOpen, setIsReviseDeadlineModalOpen] = React.useState(false) // UC-06
  const [isAuditModalOpen, setIsAuditModalOpen] = React.useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false)

  // Form state: UC-04 (Assign Initial Role)
  const [assignRoleTitle, setAssignRoleTitle] = React.useState(AVAILABLE_TARGET_ROLES[0].title)
  const [assignRoleVersion, setAssignRoleVersion] = React.useState(AVAILABLE_TARGET_ROLES[0].publishedVersions[0])
  const [assignDeadline, setAssignDeadline] = React.useState('2026-12-31')
  const [assignBenchmark, setAssignBenchmark] = React.useState(85)
  const [assignNotes, setAssignNotes] = React.useState('')

  // Update available versions when role changes in UC-04
  React.useEffect(() => {
    const matched = AVAILABLE_TARGET_ROLES.find((r) => r.title === assignRoleTitle)
    if (matched && matched.publishedVersions.length > 0) {
      setAssignRoleVersion(matched.publishedVersions[0])
    }
  }, [assignRoleTitle])

  // Form state: UC-05 (Replace Target Role)
  const [replaceRoleTitle, setReplaceRoleTitle] = React.useState(AVAILABLE_TARGET_ROLES[1].title)
  const [replaceDeadline, setReplaceDeadline] = React.useState('2027-03-31')

  // Form state: UC-06 (Revise Assignment Deadline)
  const [reviseNewDeadline, setReviseNewDeadline] = React.useState('2027-01-31')

  // Helper to open UC-04 Modal
  const openInitialAssignModal = (emp: ManagedEmployee) => {
    setSelectedEmployee(emp)
    setAssignRoleTitle(AVAILABLE_TARGET_ROLES[0].title)
    setAssignRoleVersion(AVAILABLE_TARGET_ROLES[0].publishedVersions[0])
    setAssignDeadline('2026-12-31')
    setAssignBenchmark(85)
    setAssignNotes('')
    setIsInitialAssignModalOpen(true)
  }

  // Helper to open UC-05 Modal
  const openReplaceModal = (emp: ManagedEmployee) => {
    setSelectedEmployee(emp)
    // Find a role other than the current one for convenient replacement
    const differentRole = AVAILABLE_TARGET_ROLES.find((r) => r.title !== emp.targetRole) || AVAILABLE_TARGET_ROLES[0]
    setReplaceRoleTitle(differentRole.title)
    setReplaceDeadline('2027-03-31')
    setIsReplaceModalOpen(true)
  }

  // Helper to open UC-06 Modal
  const openReviseDeadlineModal = (emp: ManagedEmployee) => {
    setSelectedEmployee(emp)
    setReviseNewDeadline(emp.deadline || '2027-01-31')
    setIsReviseDeadlineModalOpen(true)
  }

  // Helper to open Audit Modal
  const openAuditModal = (emp: ManagedEmployee) => {
    setSelectedEmployee(emp)
    setIsAuditModalOpen(true)
  }

  // Handle UC-04 Submission
  const handleSaveInitialAssignment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEmployee) return

    const nowFormatted = new Date().toLocaleString([], {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })

    const auditEntry: AssignmentAuditEntry = {
      id: `aud-${Date.now()}`,
      action: 'initial_assignment',
      actionLabel: 'Initial Target Role Assigned (UC-04)',
      timestamp: nowFormatted,
      performedBy: 'David Miller (Line Manager)',
      details: `Assigned ${assignRoleTitle} (${assignRoleVersion}) with deadline ${assignDeadline}.`,
      newValue: `${assignRoleTitle} (${assignRoleVersion})`,
      reason: assignNotes || 'Initial development roadmap assignment.',
    }

    if (selectedEmployee.id === 'emp-101') {
      assignInitialTargetRole(assignRoleTitle, assignRoleVersion, assignDeadline, assignBenchmark, assignNotes)
    }

    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id === selectedEmployee.id) {
          return {
            ...emp,
            targetRole: assignRoleTitle,
            targetRoleVersion: assignRoleVersion,
            deadline: assignDeadline,
            benchmarkScore: assignBenchmark,
            diagnosticStatus: 'pending', // Locks pathway
            notes: assignNotes,
            assignedDate: new Date().toISOString().split('T')[0],
            assignmentStatus: 'active',
            auditTrail: [auditEntry, ...emp.auditTrail],
          }
        }
        return emp
      })
    )

    toast({
      title: 'Target Role Assigned (UC-04)',
      description: `Assigned "${assignRoleTitle} (${assignRoleVersion})" to ${selectedEmployee.name}. Pathway locked pending diagnostic quiz.`,
      variant: 'success',
    })

    setIsInitialAssignModalOpen(false)
  }

  // Handle UC-05 Submission
  const handleSaveReplacement = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEmployee) return

    const nowFormatted = new Date().toLocaleString([], {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })

    const previousRoleStr = `${selectedEmployee.targetRole} (${selectedEmployee.targetRoleVersion || 'v1.0'})`
    const matchedRole = AVAILABLE_TARGET_ROLES.find((r) => r.title === replaceRoleTitle)
    const newVersion = matchedRole?.publishedVersions[0] || 'v1.0'
    const newRoleStr = `${replaceRoleTitle} (${newVersion})`
    const benchmarkVal = matchedRole?.recommendedBenchmark || 85
    const auditReason = 'Target role replaced by Line Manager.'

    const auditEntry: AssignmentAuditEntry = {
      id: `aud-${Date.now()}`,
      action: 'role_replaced',
      actionLabel: 'Target Role Replaced (UC-05)',
      timestamp: nowFormatted,
      performedBy: 'David Miller (Line Manager)',
      previousValue: previousRoleStr,
      newValue: newRoleStr,
      reason: auditReason,
      details: `Superseded ${previousRoleStr} with ${newRoleStr}. Retained verified competency evidence; diagnostic coverage recheck initiated.`,
    }

    if (selectedEmployee.id === 'emp-101') {
      replaceTargetRole(replaceRoleTitle, newVersion, replaceDeadline, benchmarkVal, auditReason)
    }

    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id === selectedEmployee.id) {
          return {
            ...emp,
            targetRole: replaceRoleTitle,
            targetRoleVersion: newVersion,
            deadline: replaceDeadline,
            benchmarkScore: benchmarkVal,
            diagnosticStatus: 'pending', // Rechecked & relocked
            assignmentStatus: 'active',
            assignedDate: new Date().toISOString().split('T')[0],
            auditTrail: [auditEntry, ...emp.auditTrail],
          }
        }
        return emp
      })
    )

    toast({
      title: 'Target Role Replaced',
      description: `Superseded role for ${selectedEmployee.name} to "${newRoleStr}". Diagnostic recheck scheduled.`,
      variant: 'success',
    })

    setIsReplaceModalOpen(false)
  }

  // Handle UC-06 Submission
  const handleSaveDeadlineRevision = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEmployee) return

    const nowFormatted = new Date().toLocaleString([], {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })

    const previousDeadline = selectedEmployee.deadline || 'None'
    const auditReason = 'Deadline revised by Line Manager.'

    const auditEntry: AssignmentAuditEntry = {
      id: `aud-${Date.now()}`,
      action: 'deadline_revised',
      actionLabel: 'Assignment Deadline Revised (UC-06)',
      timestamp: nowFormatted,
      performedBy: 'David Miller (Line Manager)',
      previousValue: previousDeadline,
      newValue: reviseNewDeadline,
      reason: auditReason,
      details: `Changed deadline from ${previousDeadline} to ${reviseNewDeadline}. Target role version retained.`,
    }

    if (selectedEmployee.id === 'emp-101') {
      reviseAssignmentDeadline(reviseNewDeadline, auditReason)
    }

    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id === selectedEmployee.id) {
          return {
            ...emp,
            deadline: reviseNewDeadline,
            auditTrail: [auditEntry, ...emp.auditTrail],
          }
        }
        return emp
      })
    )

    toast({
      title: 'Deadline Revised',
      description: `Updated deadline for ${selectedEmployee.name} to ${reviseNewDeadline}.`,
      variant: 'success',
    })

    setIsReviseDeadlineModalOpen(false)
  }

  // Handle Target Role Deletion / Unassign
  const handleDeleteTargetRole = () => {
    if (!selectedEmployee) return

    if (selectedEmployee.id === 'emp-101') {
      removeGlobalTargetRole()
    }

    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id === selectedEmployee.id) {
          return {
            ...emp,
            targetRole: null,
            targetRoleVersion: null,
            deadline: null,
            diagnosticStatus: 'unassigned',
            diagnosticScore: null,
            assignedDate: null,
            assignmentStatus: 'unassigned',
          }
        }
        return emp
      })
    )

    toast({
      title: 'Target Role Removed',
      description: `Unassigned target role from ${selectedEmployee.name}.`,
      variant: 'info',
    })

    setIsDeleteModalOpen(false)
  }

  // Calculate deadline remaining / overdue
  const getDeadlineInfo = (deadlineStr: string | null) => {
    if (!deadlineStr) return null
    const target = new Date(deadlineStr)
    const now = new Date()
    const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays < 0) {
      return {
        text: `Overdue by ${Math.abs(diffDays)}d`,
        variant: 'destructive' as const,
      }
    }
    if (diffDays <= 30) {
      return {
        text: `${diffDays}d left`,
        variant: 'warning' as const,
      }
    }
    return {
      text: `${diffDays}d left`,
      variant: 'secondary' as const,
    }
  }

  // Filtered employees
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.currentRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.targetRole && emp.targetRole.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || emp.diagnosticStatus === statusFilter
    return matchesSearch && matchesStatus
  })

  // KPI calculations
  const totalEmployees = employees.length
  const assignedCount = employees.filter((e) => e.targetRole !== null).length
  const lockedCount = employees.filter((e) => e.diagnosticStatus === 'pending').length
  const unlockedCount = employees.filter((e) => e.diagnosticStatus === 'completed').length

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        {/* Page Title & Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/70 pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Target size={22} />
              </span>
              Team Development & Target Role Supervision
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Manage enterprise target role assignments, version alignments, deadlines, and diagnostic coverage across direct reports.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted text-muted-foreground border border-border">
              <Users size={14} className="text-primary" />
              Line Manager: <strong className="text-foreground">David Miller</strong>
            </span>
          </div>
        </div>

        {/* KPI Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            variant="gradient"
            icon={<Users className="h-4 w-4" />}
            title="Team Size"
            value={`${totalEmployees} Engineers`}
            description="Direct reports under supervision"
          />
          <StatCard
            variant="default"
            icon={<Target className="h-4 w-4" />}
            title="Target Roles Assigned"
            value={`${assignedCount} / ${totalEmployees}`}
            description={`${Math.round((assignedCount / totalEmployees) * 100)}% coverage across team`}
          />
          <StatCard
            variant="default"
            icon={<Lock className="h-4 w-4 text-warning" />}
            title="Diagnostic Pending (Locked)"
            value={`${lockedCount} Members`}
            description="Pathway locked pending quiz completion"
          />
          <StatCard
            variant="default"
            icon={<Unlock className="h-4 w-4 text-success" />}
            title="Pathway Active (Unlocked)"
            value={`${unlockedCount} Members`}
            description="Diagnostic validated & progressing"
          />
        </div>

        {/* Business Rule Notice Banner */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
              <Sparkles size={16} />
            </div>
            <div>
              <strong className="text-foreground font-semibold">
                Adaptive Pathway Diagnostic Lock & Evidence Ledger Policy
              </strong>
              <p className="text-muted-foreground mt-0.5">
                Assigning an initial target role (UC-04) or replacing a role (UC-05) immediately locks the employee's Interactive Roadmap & Timeline until baseline diagnostic assessment is completed. Historical competency evidence is permanently retained.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={toggleDiagnosticLock}
            className="shrink-0 text-xs font-semibold hover:border-primary/40"
            leftIcon={<RefreshCw size={13} />}
          >
            {isLearningLocked ? 'Simulate Diagnostic Pass (Unlock Alex)' : 'Simulate Diagnostic Lock (Alex)'}
          </Button>
        </div>

        {/* Action & Filter Toolbar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card border border-border p-3.5 rounded-xl shadow-2xs">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search team member by name, current role, or target role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9 bg-background"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs text-muted-foreground font-semibold mr-1 shrink-0">Status:</span>
            {(
              [
                { key: 'all', label: 'All' },
                { key: 'pending', label: 'Diagnostic Pending (Locked)' },
                { key: 'completed', label: 'Pathway Active (Unlocked)' },
                { key: 'unassigned', label: 'Role Unassigned' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  statusFilter === tab.key
                    ? 'bg-primary text-white shadow-2xs'
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Supervised Team Members Table */}
        <Card className="border border-border bg-card shadow-xs overflow-hidden">
          <CardHeader className="py-3.5 px-5 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-bold text-foreground">
                Supervised Team Members ({filteredEmployees.length})
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-[28%]">Team Member</th>
                  <th className="py-3 px-4 w-[28%]">Target Role &amp; Milestone</th>
                  <th className="py-3 px-4 w-[24%]">Learning State &amp; Readiness</th>
                  <th className="py-3 px-4 w-[20%] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-muted-foreground text-xs">
                      No team members match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => {
                    const deadlineInfo = getDeadlineInfo(emp.deadline)
                    return (
                      <tr
                        key={emp.id}
                        className="hover:bg-muted/20 transition-colors group"
                      >
                        {/* 1. Team Member (Avatar, Name, Current Role, Email) */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                              {emp.avatar}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-foreground flex items-center gap-1.5 truncate">
                                <span>{emp.name}</span>
                                {emp.id === 'emp-101' && (
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-bold border-primary/40 text-primary shrink-0">
                                    You
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                                <span className="font-medium text-foreground/80">{emp.currentRole}</span>
                                <span className="mx-1">&bull;</span>
                                <span className="font-mono text-[10px]">{emp.email}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Target Role, Version & Milestone Deadline */}
                        <td className="py-3.5 px-4">
                          {emp.targetRole ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <Target size={13} className="text-primary shrink-0" />
                                <span className="font-bold text-foreground text-xs truncate">{emp.targetRole}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                                {emp.targetRoleVersion && (
                                  <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono border border-border/80 text-[10px]">
                                    {emp.targetRoleVersion.split(' ')[0]}
                                  </span>
                                )}
                                {emp.deadline && (
                                  <span className="font-mono text-[11px] text-foreground/80">
                                    Due {emp.deadline}
                                  </span>
                                )}
                                {deadlineInfo && (
                                  <Badge
                                    variant={deadlineInfo.variant}
                                    className="text-[9px] px-1.5 py-0 font-bold"
                                  >
                                    <Clock size={9} className="mr-0.5" />
                                    {deadlineInfo.text}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground font-normal text-xs">
                              Unassigned
                            </Badge>
                          )}
                        </td>

                        {/* 3. Learning State & Readiness Progress */}
                        <td className="py-3.5 px-4">
                          {emp.targetRole ? (
                            <div className="space-y-1.5 max-w-[210px]">
                              <div className="flex items-center justify-between">
                                {emp.diagnosticStatus === 'pending' ? (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs bg-secondary border border-primary/25 shadow-2xs">
                                    <span className="flex h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                                    <Lock size={11} className="text-primary shrink-0" />
                                    <span className="font-bold text-foreground">Locked</span>
                                    <span className="text-[10.5px] font-medium text-muted-foreground">(Diagnostic)</span>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs bg-success/10 border border-success/30 shadow-2xs">
                                    <span className="flex h-1.5 w-1.5 rounded-full bg-success shrink-0" />
                                    <Unlock size={11} className="text-success shrink-0" />
                                    <span className="font-bold text-foreground">Unlocked</span>
                                    <span className="text-[10.5px] font-semibold text-success font-mono">({emp.diagnosticScore ?? 88}%)</span>
                                  </div>
                                )}
                                <span className="text-[10px] font-mono font-bold text-foreground">
                                  {emp.currentReadiness}% <span className="text-muted-foreground font-normal">/ {emp.benchmarkScore}%</span>
                                </span>
                              </div>
                              <Progress
                                value={emp.currentReadiness}
                                variant={emp.currentReadiness >= emp.benchmarkScore ? 'success' : 'primary'}
                                className="h-1.5"
                              />
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs font-medium">
                              No Role Assigned
                            </span>
                          )}
                        </td>

                        {/* 4. Actions (Compact & Accessible) */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!emp.targetRole ? (
                              <Button
                                variant="primary"
                                size="sm"
                                className="h-7 text-xs px-2.5 font-semibold shadow-2xs"
                                leftIcon={<Plus size={12} />}
                                onClick={() => openInitialAssignModal(emp)}
                              >
                                Assign Role
                              </Button>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[11px] px-2 font-semibold hover:border-primary/40 text-foreground"
                                  onClick={() => openReplaceModal(emp)}
                                  title="Replace target role"
                                >
                                  Replace
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[11px] px-2 font-semibold hover:border-primary/40 text-foreground"
                                  onClick={() => openReviseDeadlineModal(emp)}
                                  title="Revise assignment due date"
                                >
                                  Deadline
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground shrink-0"
                                  onClick={() => openAuditModal(emp)}
                                  title="View audit trail"
                                >
                                  <History size={13} />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 shrink-0"
                                  onClick={() => {
                                    setSelectedEmployee(emp)
                                    setIsDeleteModalOpen(true)
                                  }}
                                  title="Unassign Target Role"
                                >
                                  <Trash2 size={13} />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* ========================================================================= */}
        {/* UC-04 MODAL: ASSIGN INITIAL TARGET ROLE                                   */}
        {/* ========================================================================= */}
        <Dialog open={isInitialAssignModalOpen} onOpenChange={setIsInitialAssignModalOpen}>
          <div className="space-y-5">
            <DialogHeader>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Target size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <DialogTitle>Assign Initial Target Role</DialogTitle>
                    <Badge variant="primary" className="text-[10px] font-bold">UC-04</Badge>
                  </div>
                  <DialogDescription>
                    Select a published role version and valid deadline to create the first active assignment for{' '}
                    <strong className="text-foreground">{selectedEmployee?.name}</strong>.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleSaveInitialAssignment} className="space-y-4 text-xs">
              {/* Target Role Selector */}
              <div>
                <label htmlFor="uc04-role-select" className="font-bold text-foreground block mb-1.5">
                  Published Target Role from Enterprise Taxonomy
                </label>
                <select
                  id="uc04-role-select"
                  value={assignRoleTitle}
                  onChange={(e) => setAssignRoleTitle(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {AVAILABLE_TARGET_ROLES.map((role) => (
                    <option key={role.id} value={role.title}>
                      {role.title} ({role.level} &bull; {role.department})
                    </option>
                  ))}
                </select>
              </div>

              {/* Published Version Selector */}
              {(() => {
                const matched = AVAILABLE_TARGET_ROLES.find((r) => r.title === assignRoleTitle)
                const versions = matched?.publishedVersions || ['v1.0']
                return (
                  <div>
                    <label htmlFor="uc04-version-select" className="font-bold text-foreground block mb-1.5">
                      Published Role Version
                    </label>
                    <select
                      id="uc04-version-select"
                      value={assignRoleVersion}
                      onChange={(e) => setAssignRoleVersion(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {versions.map((ver) => (
                        <option key={ver} value={ver}>
                          {ver}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              })()}

              {/* Valid Deadline Date Picker */}
              <div>
                <label htmlFor="uc04-deadline" className="font-bold text-foreground block mb-1.5">
                  Assignment Target Deadline
                </label>
                <input
                  id="uc04-deadline"
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={assignDeadline}
                  onChange={(e) => setAssignDeadline(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  Must be a future date establishing the milestone target.
                </span>
              </div>

              {/* Benchmark Score Slider */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="uc04-benchmark" className="font-bold text-foreground">Target Readiness Benchmark</label>
                  <span className="font-mono font-bold text-primary">{assignBenchmark}%</span>
                </div>
                <input
                  id="uc04-benchmark"
                  type="range"
                  min="60"
                  max="95"
                  step="5"
                  value={assignBenchmark}
                  onChange={(e) => setAssignBenchmark(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              {/* Manager Coaching Notes */}
              <div>
                <label htmlFor="uc04-notes" className="font-bold text-foreground block mb-1">
                  Coaching Notes & Development Objective
                </label>
                <textarea
                  id="uc04-notes"
                  rows={2}
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  placeholder="Provide context or specific areas of focus for the direct report..."
                  className="w-full rounded-lg border border-border bg-background p-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Policy Banner */}
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 flex items-start gap-2.5">
                <Lock size={16} className="text-warning shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed text-muted-foreground">
                  <strong className="text-foreground block font-semibold">Automatic Pathway Lockdown</strong>
                  Upon creating the initial active assignment, the employee's Interactive Roadmap & Timeline are locked until they complete their baseline diagnostic quiz in the assessment portal.
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsInitialAssignModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Create Active Assignment
                </Button>
              </DialogFooter>
            </form>
          </div>
        </Dialog>

        {/* ========================================================================= */}
        {/* UC-05 MODAL: REPLACE TARGET ROLE                                          */}
        {/* ========================================================================= */}
        <Dialog open={isReplaceModalOpen} onOpenChange={setIsReplaceModalOpen}>
          <div className="space-y-5">
            <DialogHeader>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-warning/10 text-warning">
                  <Edit2 size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <DialogTitle>Replace Target Role</DialogTitle>
                    <Badge variant="warning" className="text-[10px] font-bold">UC-05</Badge>
                  </div>
                  <DialogDescription>
                    Close active assignment, supersede pathway, retain evidence, and recheck diagnostic coverage for{' '}
                    <strong className="text-foreground">{selectedEmployee?.name}</strong>.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleSaveReplacement} className="space-y-4 text-xs">
              {/* Active Role Being Superseded */}
              <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Active Assignment Being Closed & Superseded
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-xs">
                    {selectedEmployee?.targetRole}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {selectedEmployee?.targetRoleVersion || 'v1.0'}
                  </Badge>
                </div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <Calendar size={11} /> Current deadline: <span className="font-mono">{selectedEmployee?.deadline || 'None'}</span>
                </div>
              </div>

              {/* New Target Role Selector */}
              <div>
                <label htmlFor="uc05-new-role" className="font-bold text-foreground block mb-1.5">
                  Select New Target Role
                </label>
                <select
                  id="uc05-new-role"
                  value={replaceRoleTitle}
                  onChange={(e) => setReplaceRoleTitle(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {AVAILABLE_TARGET_ROLES.map((role) => (
                    <option key={role.id} value={role.title}>
                      {role.title} ({role.level} &bull; {role.department})
                    </option>
                  ))}
                </select>
              </div>

              {/* New Deadline Date */}
              <div>
                <label htmlFor="uc05-new-deadline" className="font-bold text-foreground block mb-1.5">
                  New Target Deadline
                </label>
                <input
                  id="uc05-new-deadline"
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={replaceDeadline}
                  onChange={(e) => setReplaceDeadline(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsReplaceModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                >
                  Replace Target Role
                </Button>
              </DialogFooter>
            </form>
          </div>
        </Dialog>

        {/* ========================================================================= */}
        {/* UC-06 MODAL: REVISE ASSIGNMENT DEADLINE                                   */}
        {/* ========================================================================= */}
        <Dialog open={isReviseDeadlineModalOpen} onOpenChange={setIsReviseDeadlineModalOpen}>
          <div className="space-y-5">
            <DialogHeader>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Calendar size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <DialogTitle>Revise Assignment Deadline</DialogTitle>
                    <Badge variant="outline" className="text-[10px] font-bold border-primary text-primary">UC-06</Badge>
                  </div>
                  <DialogDescription>
                    Change the target completion date for{' '}
                    <strong className="text-foreground">{selectedEmployee?.name}</strong> while retaining the target-role version.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleSaveDeadlineRevision} className="space-y-4 text-xs">
              {/* Retained Role & Version (Read-Only) */}
              <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Target Role (Retained Version)
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    Version Retained
                  </Badge>
                </div>
                <div className="font-bold text-foreground text-xs flex items-center gap-2">
                  <span>{selectedEmployee?.targetRole}</span>
                  <span className="text-muted-foreground font-mono font-normal">
                    ({selectedEmployee?.targetRoleVersion || 'v1.0'})
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Clock size={11} /> Current Assigned Deadline:{' '}
                  <span className="font-mono font-bold text-foreground">
                    {selectedEmployee?.deadline || 'None'}
                  </span>
                </div>
              </div>

              {/* New Deadline Date Picker */}
              <div>
                <label htmlFor="uc06-new-deadline" className="font-bold text-foreground block mb-1.5">
                  New Target Deadline Date
                </label>
                <input
                  id="uc06-new-deadline"
                  type="date"
                  required
                  value={reviseNewDeadline}
                  onChange={(e) => setReviseNewDeadline(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsReviseDeadlineModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                >
                  Save Revised Deadline
                </Button>
              </DialogFooter>
            </form>
          </div>
        </Dialog>

        {/* ========================================================================= */}
        {/* AUDIT TRAIL MODAL                                                         */}
        {/* ========================================================================= */}
        <Dialog open={isAuditModalOpen} onOpenChange={setIsAuditModalOpen}>
          <div className="space-y-4">
            <DialogHeader>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <History size={20} />
                </div>
                <div>
                  <DialogTitle>Assignment Audit Trail & Governance Log</DialogTitle>
                  <DialogDescription>
                    Chronological history of target role assignments, replacements, and deadline revisions for{' '}
                    <strong className="text-foreground">{selectedEmployee?.name}</strong>.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {(!selectedEmployee?.auditTrail || selectedEmployee.auditTrail.length === 0) ? (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  No governance audit records recorded for this team member.
                </div>
              ) : (
                selectedEmployee.auditTrail.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {entry.action === 'initial_assignment' && (
                          <Badge variant="primary" className="text-[10px]">UC-04 Initial Assignment</Badge>
                        )}
                        {entry.action === 'role_replaced' && (
                          <Badge variant="warning" className="text-[10px]">UC-05 Role Replaced</Badge>
                        )}
                        {entry.action === 'deadline_revised' && (
                          <Badge variant="secondary" className="text-[10px]">UC-06 Deadline Revised</Badge>
                        )}
                        <span className="font-bold text-foreground text-xs">{entry.actionLabel}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {entry.timestamp}
                      </span>
                    </div>

                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                      {entry.details}
                    </p>

                    {/* Diff Pill if applicable */}
                    {(entry.previousValue || entry.newValue) && (
                      <div className="flex items-center gap-2 text-[10px] font-mono pt-1">
                        {entry.previousValue && (
                          <span className="px-2 py-0.5 rounded bg-destructive/10 text-destructive line-through">
                            {entry.previousValue}
                          </span>
                        )}
                        {entry.previousValue && entry.newValue && (
                          <ArrowRight size={10} className="text-muted-foreground" />
                        )}
                        {entry.newValue && (
                          <span className="px-2 py-0.5 rounded bg-success/10 text-success font-semibold">
                            {entry.newValue}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Manager Justification Reason Box */}
                    {entry.reason && (
                      <div className="p-2 rounded bg-background border border-border/80 text-[11px] text-foreground flex items-start gap-2">
                        <FileText size={12} className="text-primary shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-muted-foreground block text-[10px] uppercase tracking-wider">
                            Manager Rationale / Reason:
                          </strong>
                          <span className="italic">"{entry.reason}"</span>
                        </div>
                      </div>
                    )}

                    <div className="text-[10px] text-muted-foreground flex items-center justify-between pt-1 border-t border-border/40">
                      <span>Logged By: <strong className="text-foreground">{entry.performedBy}</strong></span>
                      <span className="font-mono text-[9px] text-muted-foreground/80">ID: {entry.id}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAuditModalOpen(false)}
              >
                Close Audit Log
              </Button>
            </DialogFooter>
          </div>
        </Dialog>

        {/* ========================================================================= */}
        {/* REMOVE TARGET ROLE CONFIRMATION MODAL                                     */}
        {/* ========================================================================= */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <div className="space-y-4">
            <DialogHeader>
              <div className="flex items-center gap-2.5 text-destructive">
                <AlertTriangle size={22} />
                <DialogTitle>Unassign Target Role</DialogTitle>
              </div>
              <DialogDescription>
                Are you sure you want to unassign the target role from{' '}
                <strong className="text-foreground">{selectedEmployee?.name}</strong>? Their active
                pathway calibration and target benchmarks will be cleared.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Keep Role
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteTargetRole}
              >
                Yes, Unassign Role
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      </div>
    </WorkspaceLayout>
  )
}
