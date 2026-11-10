import * as React from 'react'
import {
  AlertTriangle,
  Building2,
  Briefcase,
  CheckCircle2,
  Edit3,
  Eye,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { Combobox, type ComboboxOption } from '../../../shared/components/ui/Combobox'
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
import { Input } from '../../../shared/components/ui/Input'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { Pagination } from '../../../shared/components/ui/Pagination'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { useToast } from '../../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import {
  getActiveCompany,
  resolveWorkspaceOrgId,
} from '../../../shared/stores/companyStore'
import {
  createDepartment,
  deleteDepartment,
  generateDepartmentId,
  loadDepartments,
  saveDepartments,
  updateDepartment,
  type DepartmentRecord,
} from '../../../shared/stores/departmentStore'
import {
  fetchDepartments,
  createDepartmentApi,
  updateDepartmentApi,
  deleteDepartmentApi,
  unlinkJobPositionFromDepartment,
  type DepartmentDto,
} from '../../../shared/api/departmentApi'
import {
  fetchJobPositions,
  type JobPositionDto,
} from '../../../shared/api/jobPositionApi'
import {
  getAvailableJobPositions,
  type JobPosition,
} from '../../manager/data/ldManagerMockData'

function generateDepartmentCode(existingDepts: DepartmentRecord[]): string {
  const existingCodes = new Set(existingDepts.map((d) => d.code.toUpperCase()))
  for (let i = 1; i <= 99; i++) {
    const candidate = `DPT-${String(i).padStart(2, '0')}`
    if (!existingCodes.has(candidate)) {
      return candidate
    }
  }
  return `DPT-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
}

export function DepartmentsManagementPage() {
  const { toast } = useToast()
  const session = React.useContext(WorkspaceSessionContext)
  const activeCompany = getActiveCompany()
  const orgId = resolveWorkspaceOrgId(session?.identity?.organizationId || activeCompany?.id)

  const [departments, setDepartments] = React.useState<DepartmentRecord[]>(() => loadDepartments(orgId))
  const [availableJobPositions, setAvailableJobPositions] = React.useState<JobPosition[]>([])
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'active' | 'inactive'>('ALL')
  const [currentPage, setCurrentPage] = React.useState(1)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const pageSize = 10

  // Create / Edit modal state
  const [isFormModalOpen, setIsFormModalOpen] = React.useState(false)
  const [editingDept, setEditingDept] = React.useState<DepartmentRecord | null>(null)
  const [formName, setFormName] = React.useState('')
  const [formCode, setFormCode] = React.useState('')
  const [formDescription, setFormDescription] = React.useState('')
  const [selectedJobPositions, setSelectedJobPositions] = React.useState<string[]>([])
  const [tempJobPositionToAdd, setTempJobPositionToAdd] = React.useState('')

  // Delete / Deactivate modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false)
  const [deptToDelete, setDeptToDelete] = React.useState<DepartmentRecord | null>(null)

  // View Details modal state
  const [isDetailsModalOpen, setIsDetailsModalOpen] = React.useState(false)
  const [selectedDeptForDetails, setSelectedDeptForDetails] = React.useState<DepartmentRecord | null>(null)

  const jobPositionOptions: ComboboxOption[] = React.useMemo(() => {
    return availableJobPositions
      .filter((jp) => !selectedJobPositions.includes(jp.code))
      .map((jp) => ({
        value: jp.code,
        label: `${jp.code} — ${jp.name}`,
        description: jp.description,
      }))
  }, [availableJobPositions, selectedJobPositions])

  // Fetch live departments from Neo4j merged with local state
  const fetchLiveDepartments = React.useCallback(async () => {
    try {
      const data = await fetchDepartments(orgId)
      if (Array.isArray(data)) {
        const seen = new Set<string>()
        const uniqueData = data.filter((d: DepartmentDto) => {
          const key = (d.code || d.id || '').toUpperCase()
          if (!key || seen.has(key)) return false
          seen.add(key)
          return true
        })
        const mapped: DepartmentRecord[] = uniqueData.map((d: DepartmentDto) => ({
          id: d.id,
          code: d.code,
          name: d.name,
          description: d.description || '',
          headOfDepartment: d.headOfDepartment || '',
          headEmail: d.headEmail || '',
          status: String(d.status || 'ACTIVE').toLowerCase() === 'inactive' ? 'inactive' : 'active',
          linkedJobPositions: d.jobPositionCodes || [],
          organizationId: d.organizationId || orgId,
          createdAt: d.createdAt || '2026-11-04',
          updatedAt: d.updatedAt,
        }))

        // Merge live data with any locally created departments for this org
        const localDepts = loadDepartments(orgId)
        const liveIds = new Set(mapped.map((m) => m.id))
        const liveCodes = new Set(mapped.map((m) => m.code.toUpperCase()))
        const localOnly = localDepts.filter(
          (loc) => !liveIds.has(loc.id) && !liveCodes.has(loc.code.toUpperCase())
        )
        for (const loc of localOnly) {
          createDepartmentApi(orgId, {
            id: loc.id,
            code: loc.code,
            name: loc.name,
            description: loc.description,
            headOfDepartment: loc.headOfDepartment,
            headEmail: loc.headEmail,
            status: loc.status === 'inactive' ? 'INACTIVE' : 'ACTIVE',
            linkedJobPositions: loc.linkedJobPositions,
          }).catch(() => {})
        }
        const merged = [...mapped, ...localOnly]
        const mergedSeen = new Set<string>()
        const dedupedMerged = merged.filter((d) => {
          const key = (d.code || d.id || '').toUpperCase()
          if (!key || mergedSeen.has(key)) return false
          mergedSeen.add(key)
          return true
        })

        setDepartments(dedupedMerged)
        saveDepartments(dedupedMerged, orgId, false)
        return
      }
    } catch {
      // Offline fallback: load from departmentStore
    }
    setDepartments(loadDepartments(orgId))
  }, [orgId])

  // Load available job positions for selection and linking (merging localStorage & live Neo4j)
  const loadJobPositions = React.useCallback(async () => {
    const map = new Map<string, JobPosition>()

    // Priority 1: Check localStorage directly for user-created job positions from L&D manager
    try {
      if (typeof localStorage !== 'undefined') {
        const isDemo = orgId === 'e0000000-0000-0000-0000-000000000001'
        const keys = [
          'adaptlearn_jobPositions_v2_' + orgId,
          'adaptlearn_job_positions_v2_' + orgId,
          ...(isDemo
            ? [
                'adaptlearn_jobPositions_v2_comp-technova',
                'adaptlearn_job_positions_v2_comp-technova',
                'adaptlearn_jobPositions_v2_e0000000-0000-0000-0000-000000000001',
                'adaptlearn_job_positions_v2_e0000000-0000-0000-0000-000000000001',
                'adaptlearn_jobPositions_v2_',
                'adaptlearn_job_positions_v2_',
              ]
            : []),
        ]
        for (const k of keys) {
          const raw = localStorage.getItem(k)
          if (raw) {
            try {
              const arr = JSON.parse(raw)
              if (Array.isArray(arr)) {
                for (const item of arr) {
                  if (item.code && !map.has(item.code)) {
                    map.set(item.code, {
                      code: item.code,
                      name: item.name || item.code,
                      description: item.description || 'Industry job position competency domain',
                      jobZone: item.jobZone || 4,
                      profiles: ['DEV'],
                      assignedExpertIds: Array.isArray(item.assignedExperts)
                        ? item.assignedExperts.map((ae: any) => ae.id || ae)
                        : [],
                    })
                  }
                }
              }
            } catch {}
          }
        }
      }
    } catch {}

    // Priority 2: Standard catalog positions
    const local = getAvailableJobPositions(orgId)
    for (const loc of local) {
      if (!map.has(loc.code)) {
        map.set(loc.code, { ...loc })
      }
    }

    // Priority 3: Live database positions from Neo4j
    try {
      const livePositions = await fetchJobPositions(orgId)
      if (Array.isArray(livePositions) && livePositions.length > 0) {
        for (const jp of livePositions as JobPositionDto[]) {
          const existing = map.get(jp.code)
          map.set(jp.code, {
            code: jp.code,
            name: jp.name,
            description: existing?.description || 'Industry job position competency domain',
            jobZone: jp.jobZone || existing?.jobZone || 4,
            profiles: existing?.profiles || ['DEV'],
            assignedExpertIds: existing?.assignedExpertIds || [],
          })
        }
      }
    } catch {}

    setAvailableJobPositions(Array.from(map.values()))
  }, [orgId])

  React.useEffect(() => {
    fetchLiveDepartments()
    loadJobPositions()
  }, [fetchLiveDepartments, loadJobPositions])

  const reloadData = React.useCallback(() => {
    fetchLiveDepartments()
    loadJobPositions()
  }, [fetchLiveDepartments, loadJobPositions])

  React.useEffect(() => {
    let timeoutId: any = null
    const handleStorage = (e: StorageEvent) => {
      if (e.key && (e.key.startsWith('adaptlearn_departments_') || e.key === 'adaptlearn_departments_v1')) {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          reloadData()
        }, 500)
      }
    }
    window.addEventListener('departments_updated', reloadData)
    window.addEventListener('companies_updated', reloadData)
    window.addEventListener('active_company_changed', reloadData)
    window.addEventListener('adaptlearn_job_positions_updated', reloadData)
    window.addEventListener('storage', handleStorage)
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('departments_updated', reloadData)
      window.removeEventListener('companies_updated', reloadData)
      window.removeEventListener('active_company_changed', reloadData)
      window.removeEventListener('adaptlearn_job_positions_updated', reloadData)
      window.removeEventListener('storage', handleStorage)
    }
  }, [reloadData])

  // Filter departments by search, status, and current organization
  const filteredDepartments = React.useMemo(() => {
    const seen = new Set<string>()
    return departments.filter((d) => {
      if (d.organizationId && orgId && d.organizationId !== orgId) {
        return false
      }

      const key = (d.code || d.id || '').toUpperCase()
      if (key && seen.has(key)) {
        return false
      }
      if (key) {
        seen.add(key)
      }

      const matchesSearch =
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.linkedJobPositions.some((jp) => jp.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'active' && d.status === 'active') ||
        (statusFilter === 'inactive' && d.status === 'inactive')

      return matchesSearch && matchesStatus
    })
  }, [departments, orgId, searchQuery, statusFilter])

  const sortedDepartments = React.useMemo(() => {
    return [...filteredDepartments].sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime()
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime()
      return timeB - timeA
    })
  }, [filteredDepartments])

  const totalPages = Math.max(1, Math.ceil(sortedDepartments.length / pageSize))
  const paginatedDepartments = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedDepartments.slice(start, start + pageSize)
  }, [sortedDepartments, currentPage, pageSize])

  // KPIs
  const orgDepartments = React.useMemo(() => {
    return departments.filter((d) => !d.organizationId || !orgId || d.organizationId === orgId)
  }, [departments, orgId])
  const totalDepts = orgDepartments.length
  const activeCount = orgDepartments.filter((d) => d.status === 'active').length
  const inactiveCount = orgDepartments.filter((d) => d.status === 'inactive').length
  const totalConnectedJobPositions = new Set(orgDepartments.flatMap((d) => d.linkedJobPositions)).size

  // Handlers
  const handleOpenCreate = () => {
    loadJobPositions()
    setEditingDept(null)
    setFormName('')
    const autoCode = generateDepartmentCode(departments)
    setFormCode(autoCode)
    setFormDescription('')
    setSelectedJobPositions([])
    setTempJobPositionToAdd('')
    setIsFormModalOpen(true)
  }

  const handleOpenEdit = (dept: DepartmentRecord) => {
    loadJobPositions()
    setEditingDept(dept)
    setFormName(dept.name)
    setFormCode(dept.code)
    setFormDescription(dept.description)
    setSelectedJobPositions([...dept.linkedJobPositions])
    setTempJobPositionToAdd('')
    setIsFormModalOpen(true)
  }

  const handleAddJobPosition = () => {
    if (!tempJobPositionToAdd) return
    if (!selectedJobPositions.includes(tempJobPositionToAdd)) {
      setSelectedJobPositions((prev) => [...prev, tempJobPositionToAdd])
    }
    setTempJobPositionToAdd('')
  }

  const handleRemoveJobPosition = (code: string) => {
    setSelectedJobPositions((prev) => prev.filter((c) => c !== code))
  }

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formCode.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Department name and unique code are required.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    const codeClean = formCode.trim().toUpperCase()

    if (editingDept) {
      // Explicitly unlink any job positions removed by the admin
      const previousCodes = editingDept.linkedJobPositions || []
      const removedCodes = previousCodes.filter((c) => !selectedJobPositions.includes(c))
      for (const code of removedCodes) {
        await unlinkJobPositionFromDepartment(orgId, editingDept.id, code).catch(() => {})
        if (codeClean !== editingDept.id) {
          await unlinkJobPositionFromDepartment(orgId, codeClean, code).catch(() => {})
        }
      }

      try {
        await updateDepartmentApi(orgId, editingDept.id, {
          id: editingDept.id,
          code: codeClean,
          name: formName.trim(),
          description: formDescription.trim(),
          headOfDepartment: editingDept.headOfDepartment || '',
          headEmail: editingDept.headEmail || '',
          status: editingDept.status.toUpperCase(),
          linkedJobPositions: selectedJobPositions,
        })
      } catch (err: unknown) {
        console.warn('Neo4j department update error, updating local store:', err)
      }

      updateDepartment(
        editingDept.id,
        {
          name: formName.trim(),
          code: codeClean,
          description: formDescription.trim(),
          headOfDepartment: editingDept.headOfDepartment || '',
          headEmail: editingDept.headEmail || '',
          linkedJobPositions: selectedJobPositions,
        },
        orgId
      )

      window.dispatchEvent(new Event('departments_updated'))
      window.dispatchEvent(
        new CustomEvent('adaptlearn_job_positions_updated', {
          detail: { organizationId: orgId },
        })
      )

      setDepartments((prev) =>
        prev.map((d) =>
          d.id === editingDept.id || d.code === editingDept.code
            ? {
                ...d,
                name: formName.trim(),
                code: codeClean,
                description: formDescription.trim(),
                linkedJobPositions: selectedJobPositions,
                updatedAt: new Date().toISOString(),
              }
            : d
        )
      )

      toast({
        title: 'Department Updated',
        description: `Successfully modified ${formName} in the organization catalog.`,
        variant: 'success',
      })
    } else {
      const newId = generateDepartmentId()
      const newDeptRecord = createDepartment(
        {
          id: newId,
          name: formName.trim(),
          code: codeClean,
          description: formDescription.trim(),
          headOfDepartment: '',
          headEmail: '',
          status: 'active',
          linkedJobPositions: selectedJobPositions,
        },
        orgId,
        false
      )

      // Optimistically update React state immediately
      setDepartments((prev) => [
        newDeptRecord,
        ...prev.filter((d) => d.id !== newDeptRecord.id && d.code !== newDeptRecord.code),
      ])
      setCurrentPage(1)
      setSearchQuery('')
      setStatusFilter('ALL')

      try {
        await createDepartmentApi(orgId, {
          id: newDeptRecord.id,
          code: codeClean,
          name: formName.trim(),
          description: formDescription.trim(),
          headOfDepartment: '',
          headEmail: '',
          status: 'ACTIVE',
          linkedJobPositions: selectedJobPositions,
        })
      } catch (err: unknown) {
        console.warn('Neo4j department create error, saved in local store:', err)
      }


      toast({
        title: 'Department Created',
        description: `Created ${formName} (${codeClean}) successfully.`,
        variant: 'success',
      })
    }

    setIsFormModalOpen(false)
    setEditingDept(null)
    setIsSubmitting(false)
    await fetchLiveDepartments()
  }

  // Delete Department with full cascade & member unassignment
  const handleConfirmDelete = async () => {
    if (!deptToDelete) return
    const targetDept = deptToDelete
    setIsSubmitting(true)

    try {
      await deleteDepartmentApi(orgId, targetDept.id)
    } catch (err: unknown) {
      console.warn('Delete department error:', err)
    }

    deleteDepartment(targetDept.id, orgId)
    setDepartments((prev) =>
      prev.filter((d) => d.id !== targetDept.id && d.code !== targetDept.id && d.code !== targetDept.code)
    )
    toast({
      title: 'Department Removed',
      description: `${targetDept.name} has been removed from the directory.`,
      variant: 'destructive',
    })

    // Clean up local target role metadata & member assignment caches referencing this department
    try {
      if (typeof localStorage !== 'undefined') {
        const deptKeys = [targetDept.id, targetDept.code, targetDept.name]
          .filter(Boolean)
          .map((s) => s.toLowerCase().trim())
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (!key) continue
          if (key.startsWith('alg_employee_assignment_')) {
            try {
              const val = JSON.parse(localStorage.getItem(key) || '{}')
              const valDeptId = (val.departmentId || '').toLowerCase().trim()
              const valDeptName = (val.departmentName || '').toLowerCase().trim()
              if (deptKeys.includes(valDeptId) || deptKeys.includes(valDeptName)) {
                keysToRemove.push(key)
              }
            } catch {}
          } else if (key.startsWith('adaptlearn_target_role_meta_')) {
            try {
              const val = JSON.parse(localStorage.getItem(key) || '{}')
              const valDeptId = (val.departmentId || '').toLowerCase().trim()
              const valDept = (val.department || '').toLowerCase().trim()
              if (deptKeys.includes(valDeptId) || deptKeys.includes(valDept)) {
                keysToRemove.push(key)
              }
            } catch {}
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k))
      }
    } catch {}

    setIsSubmitting(false)
    setIsDeleteModalOpen(false)
    setDeptToDelete(null)
    window.dispatchEvent(new Event('departments_updated'))
    window.dispatchEvent(new Event('alg_roles_updated'))
    await fetchLiveDepartments()
  }

  return (
    <WorkspaceLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <PageHeader
          title="Departments"
          description="Organize company departments, assign leadership, and track team competency coverage across your business units."
          actions={
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={handleOpenCreate}
              className="font-semibold shadow-2xs"
            >
              Create Department
            </Button>
          }
        />

        {/* 3 KPI StatCards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            variant="gradient"
            icon={<Building2 className="h-4 w-4 text-primary" />}
            title="Total Departments"
            value={`${totalDepts} Departments`}
            valueClassName="text-primary"
            description="Company business departments"
          />

          <StatCard
            variant="gradient"
            icon={<CheckCircle2 className="h-4 w-4 text-success" />}
            title="Active Departments"
            value={`${activeCount} Active`}
            valueClassName="text-success"
            description="Active operational units"
          />

          <StatCard
            variant="gradient"
            icon={<Briefcase className="h-4 w-4 text-warning" />}
            title="Connected Job Positions"
            value={`${totalConnectedJobPositions} Positions`}
            valueClassName="text-warning"
            description="Linked industry job positions"
          />
        </div>

        {/* DEPARTMENTS DIRECTORY TABLE CARD (10 Items per page) */}
        <Card className="border border-border shadow-xs overflow-hidden">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Department Directory
                </CardTitle>
                <CardDescription>
                  View and manage company departments and their associated job positions.
                </CardDescription>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="flex items-center gap-2.5 flex-wrap py-0.5">
                <div className="relative w-56">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search departments..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-background border border-border text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs transition-colors"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1.5 shadow-2xs">
                  <span className="text-[11px] text-muted-foreground font-medium">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value as 'ALL' | 'active' | 'inactive')
                      setCurrentPage(1)
                    }}
                    aria-label="Filter by Status"
                    className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer font-medium"
                  >
                    <option value="ALL">All ({totalDepts})</option>
                    <option value="active">Active ({activeCount})</option>
                    <option value="inactive">Inactive ({inactiveCount})</option>
                  </select>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {orgDepartments.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground space-y-3">
                <Building2 className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="text-base font-semibold text-foreground">No departments created yet</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Add your first department to start structuring teams and assigning managers.
                </p>
                <div className="pt-2">
                  <Button variant="primary" size="sm" onClick={handleOpenCreate} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Department
                  </Button>
                </div>
              </div>
            ) : filteredDepartments.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground space-y-2">
                <Building2 className="h-8 w-8 mx-auto text-muted-foreground/40" />
                <p className="text-sm font-medium">No departments match your search criteria</p>
                <p className="text-xs text-muted-foreground/80">Try adjusting your keyword filter or status dropdown.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[11px] font-semibold">
                      <th className="py-2.5 px-3">CODE</th>
                      <th className="py-2.5 px-3">DEPARTMENT &amp; SCOPE</th>
                      <th className="py-2.5 px-3">JOB POSITION</th>
                      <th className="py-2.5 px-3">STATUS</th>
                      <th className="py-2.5 px-3 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedDepartments.map((dept) => {
                      return (
                        <tr key={dept.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-foreground whitespace-nowrap">
                            {dept.code}
                          </td>
                          <td className="py-3 px-3 max-w-xs">
                            <div className="font-semibold text-foreground text-sm leading-snug">{dept.name}</div>
                            <div className="text-muted-foreground text-xs line-clamp-1 max-w-md mt-0.5" title={dept.description}>
                              {dept.description || 'No description provided'}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-foreground text-xs">
                              {dept.linkedJobPositions?.length || 0}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {dept.status === 'active' ? (
                              <Badge variant="success">ACTIVE</Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">INACTIVE</Badge>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View Details */}
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  setSelectedDeptForDetails(dept)
                                  setIsDetailsModalOpen(true)
                                }}
                                title="View Details & Scope"
                                aria-label="View Details & Scope"
                              >
                                <Eye className="h-4 w-4 text-primary" />
                              </Button>

                              {/* Edit Department */}
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleOpenEdit(dept)}
                                title="Edit Department"
                                aria-label="Edit Department"
                              >
                                <Edit3 className="h-4 w-4 text-foreground" />
                              </Button>

                              {/* Delete Department */}
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  setDeptToDelete(dept)
                                  setIsDeleteModalOpen(true)
                                }}
                                title="Delete Department"
                                aria-label="Delete Department"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
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

        {/* Pagination Controls (10 items per page) */}
        {filteredDepartments.length > pageSize && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            itemLabel="departments"
          />
        )}
      </div>

      {/* CREATE / EDIT DEPARTMENT MODAL */}
      <Dialog
        open={isFormModalOpen}
        onOpenChange={setIsFormModalOpen}
        className="max-w-4xl w-full max-h-[90vh] flex flex-col p-6 sm:p-8 overflow-hidden"
      >
        <DialogHeader className="shrink-0 mb-4">
          <div className="flex items-center justify-between pr-4">
            <DialogTitle className="text-section font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary shrink-0" />
              <span>{editingDept ? (formName || editingDept.name) : 'Create New Department'}</span>
            </DialogTitle>
            <Badge
              variant={editingDept ? 'outline' : 'primary'}
              className="font-bold text-xs"
            >
              {editingDept ? 'EDIT DEPARTMENT' : 'NEW DEPARTMENT'}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Define department details and connect relevant industry job positions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSaveForm} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto pr-1.5 space-y-4 text-xs min-h-0">
            {/* Card 1: Department Identification */}
            <div className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Department Identification &amp; Scope
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-foreground block mb-1">
                    Department Code <span className="text-destructive">*</span>
                  </label>
                  <Input
                    required
                    maxLength={15}
                    placeholder="e.g. ENG-SWE"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    className="font-mono text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    Unique code used to identify this department across your organization.
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-foreground block mb-1">
                    Department Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    required
                    maxLength={80}
                    placeholder="e.g. Software Engineering"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    Official name of the department.
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-foreground block mb-1">
                  Department Description &amp; Responsibilities
                </label>
                <textarea
                  rows={2}
                  maxLength={300}
                  placeholder="Outline core systems, business domain focus, and engineering deliverables..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full text-xs rounded-lg border border-border bg-background p-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs resize-none"
                />
              </div>
            </div>

            {/* Card 2: Industry Job Position Alignment */}
            <div className="p-4 rounded-xl border border-border bg-card space-y-3.5 shadow-2xs">
              {/* Header with Orange Icon, Title, and Subtitle */}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Briefcase className="h-4 w-4 text-primary" />
                  Connected Job Positions Alignment ({selectedJobPositions.length})
                </span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  Connect industry job positions to define the scope and competencies of this department
                </span>
              </div>

              {/* Input Selection Row with Combobox and + Add Button */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-foreground block">
                  Select Job Position to Connect
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Combobox
                      size="sm"
                      clearable={true}
                      options={jobPositionOptions}
                      value={tempJobPositionToAdd}
                      onChange={(val) => {
                        setTempJobPositionToAdd(val)
                      }}
                      placeholder="Select job position to connect..."
                      searchPlaceholder="Search by job position code or title..."
                      emptyMessage="No job positions available"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={!tempJobPositionToAdd}
                    onClick={handleAddJobPosition}
                    className="font-semibold shadow-2xs whitespace-nowrap px-3 text-xs shrink-0"
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                  >
                    Add Job Position
                  </Button>
                </div>
              </div>

              {/* Configured Table (Matching Picture 2 Configured Table layout) */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Briefcase className="h-3.5 w-3.5 text-primary" />
                    Connected Job Positions ({selectedJobPositions.length})
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Mapped industry benchmark standards
                  </span>
                </div>

                {selectedJobPositions.length > 0 ? (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                        <tr>
                          <th className="py-2.5 px-3">CODE</th>
                          <th className="py-2.5 px-3">JOB POSITION CODE &amp; NAME</th>
                          <th className="py-2.5 px-3 text-right">ACTION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {selectedJobPositions.map((code) => {
                          const jp = availableJobPositions.find((o) => o.code === code)
                          return (
                            <tr key={code} className="hover:bg-muted/20 transition-colors">
                              <td className="py-2.5 px-3 font-mono font-bold text-primary whitespace-nowrap">
                                <Badge variant="secondary" className="font-mono text-[11px] px-2 py-0.5">
                                  {code}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-3 max-w-md">
                                <div className="font-semibold text-foreground text-xs">
                                  <span className="font-mono text-primary font-bold mr-1.5">{code}</span>
                                  {jp?.name || code}
                                </div>
                                <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5" title={jp?.description}>
                                  {jp?.description || 'Standard industry competency profile'}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                  onClick={() => handleRemoveJobPosition(code)}
                                  title="Remove connection"
                                  aria-label="Remove connection"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg border border-dashed border-border text-center text-muted-foreground space-y-1">
                    <Briefcase className="h-5 w-5 mx-auto text-muted-foreground/60" />
                    <p className="font-semibold text-foreground text-xs">No Job Positions Connected Yet</p>
                    <p className="text-[11px]">
                      Select and add recognized industry job positions from the dropdown above to align competencies with this department.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 pt-4 border-t border-border mt-4 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => setIsFormModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              {editingDept ? 'Save Changes' : 'Create Department'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* REDESIGNED & ENLARGED VIEW DETAILS MODAL (UI-UX Pro Max Standard) */}
      <Dialog
        open={isDetailsModalOpen}
        onOpenChange={setIsDetailsModalOpen}
        ariaLabel="Department details"
        className="max-w-3xl w-full max-h-[90vh] p-8 overflow-hidden flex flex-col"
      >
        <DialogHeader className="shrink-0 mb-4 border-b border-border pb-4">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-secondary font-bold text-primary text-2xl border border-primary/20 shadow-xs" aria-hidden="true">
              {(selectedDeptForDetails?.code || 'DP').slice(0, 3)}
            </span>
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-section font-bold text-foreground">
                  {selectedDeptForDetails?.name || 'Department Details'}
                </DialogTitle>
                {selectedDeptForDetails?.code && (
                  <Badge variant="secondary" className="font-mono text-xs">
                    {selectedDeptForDetails.code}
                  </Badge>
                )}
                {selectedDeptForDetails && (
                  <Badge variant={selectedDeptForDetails.status === 'active' ? 'success' : 'outline'}>
                    {(selectedDeptForDetails.status || 'ACTIVE').toUpperCase()}
                  </Badge>
                )}
              </div>
              <p className="text-body-sm text-muted-foreground">
                {selectedDeptForDetails?.description || 'Department scope, responsibilities, and connected competencies.'}
              </p>
            </div>
          </div>
          <DialogDescription className="sr-only">
            Department governance details and connected industry job positions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto px-1 flex-1 min-h-0 text-body-sm">
          {/* Connected Industry Job Positions */}

          {/* Card 2: Connected Industry Job Positions */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
                <Briefcase className="h-4 w-4 text-primary" />
                Connected Job Positions Alignment ({selectedDeptForDetails?.linkedJobPositions.length || 0})
              </div>
              <Badge variant="secondary" className="font-mono text-xs">
                {selectedDeptForDetails?.linkedJobPositions.length || 0} Linked
              </Badge>
            </div>

            {selectedDeptForDetails && selectedDeptForDetails.linkedJobPositions.length > 0 ? (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                    <tr>
                      <th className="py-2 px-3">CODE</th>
                      <th className="py-2 px-3">JOB POSITION TITLE &amp; SCOPE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedDeptForDetails.linkedJobPositions.map((jpCode) => {
                      const match = availableJobPositions.find((o) => o.code === jpCode)
                      return (
                        <tr key={jpCode} className="hover:bg-muted/20 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-primary whitespace-nowrap">
                            <Badge variant="secondary" className="font-mono text-[11px] px-2 py-0.5">
                              {jpCode}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 max-w-md">
                            <div className="font-semibold text-foreground text-xs">
                              {match?.name || jpCode}
                            </div>
                            <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                              {match?.description || 'Standard industry competency profile'}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs italic">
                No job positions currently connected to this department.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 pt-4 border-t border-border mt-4 flex items-center justify-between gap-2">
          <Button variant="outline" onClick={() => setIsDetailsModalOpen(false)}>
            Close
          </Button>
          {selectedDeptForDetails && (
            <Button
              variant="primary"
              leftIcon={<Edit3 className="h-4 w-4" />}
              onClick={() => {
                const dept = selectedDeptForDetails
                setIsDetailsModalOpen(false)
                if (dept) handleOpenEdit(dept)
              }}
            >
              Edit Department
            </Button>
          )}
        </DialogFooter>
      </Dialog>

      {/* CONFIRM DELETE MODAL */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            Delete Department
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Are you sure you want to delete <strong className="text-foreground">{deptToDelete?.name}</strong>?
            Associated target roles and levels will be removed, and all assigned workforce members will return to having no department assigned. Linked job positions will be preserved. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            onClick={() => setIsDeleteModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            isLoading={isSubmitting}
            onClick={handleConfirmDelete}
          >
            Delete Department
          </Button>
        </DialogFooter>
      </Dialog>
    </WorkspaceLayout>
  )
}
