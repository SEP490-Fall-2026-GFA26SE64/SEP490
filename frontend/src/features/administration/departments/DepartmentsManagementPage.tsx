import * as React from 'react'
import {
  AlertTriangle,
  Building2,
  Edit2,
  FolderTree,
  Plus,
  Save,
  Search,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../shared/components/ui/Dialog'
import { Input } from '../../../shared/components/ui/Input'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { Pagination } from '../../../shared/components/ui/Pagination'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { useToast } from '../../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import {
  getActiveCompany,
  type CompanyRecord,
  type CompanyUser,
} from '../../../shared/stores/companyStore'
import {
  createDepartment,
  deleteDepartment,
  loadDepartments,
  reassignEmployeeDepartment,
  updateDepartment,
  type DepartmentRecord,
} from '../../../shared/stores/departmentStore'

export function DepartmentsManagementPage() {
  const { toast } = useToast()

  const [departments, setDepartments] = React.useState<DepartmentRecord[]>(loadDepartments)
  const [activeCompany, setActiveCompany] = React.useState<CompanyRecord>(getActiveCompany)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [currentPage, setCurrentPage] = React.useState(1)
  const pageSize = 6

  // Create / Edit modal state
  const [isFormModalOpen, setIsFormModalOpen] = React.useState(false)
  const [editingDept, setEditingDept] = React.useState<DepartmentRecord | null>(null)
  const [formName, setFormName] = React.useState('')
  const [formCode, setFormCode] = React.useState('')
  const [formDescription, setFormDescription] = React.useState('')
  const [formHeadName, setFormHeadName] = React.useState('')
  const [formHeadEmail, setFormHeadEmail] = React.useState('')
  const [formHeadcount, setFormHeadcount] = React.useState(15)
  const [formOccupations, setFormOccupations] = React.useState('15-1252.00 (Software Developers)')

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false)
  const [deptToDelete, setDeptToDelete] = React.useState<DepartmentRecord | null>(null)

  // Member Roster / Reassign modal state
  const [isRosterModalOpen, setIsRosterModalOpen] = React.useState(false)
  const [selectedDeptForRoster, setSelectedDeptForRoster] = React.useState<DepartmentRecord | null>(null)
  const [reassigningUser, setReassigningUser] = React.useState<CompanyUser | null>(null)
  const [targetDeptName, setTargetDeptName] = React.useState('')
  const [isAssignUserOpen, setIsAssignUserOpen] = React.useState(false)
  const [assignSearchQuery, setAssignSearchQuery] = React.useState('')

  const reloadData = React.useCallback(() => {
    setDepartments(loadDepartments())
    setActiveCompany(getActiveCompany())
  }, [])

  React.useEffect(() => {
    window.addEventListener('departments_updated', reloadData)
    window.addEventListener('companies_updated', reloadData)
    window.addEventListener('active_company_changed', reloadData)
    return () => {
      window.removeEventListener('departments_updated', reloadData)
      window.removeEventListener('companies_updated', reloadData)
      window.removeEventListener('active_company_changed', reloadData)
    }
  }, [reloadData])

  // Filter departments by search
  const filtered = departments.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.headOfDepartment.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // KPIs
  const totalDepts = departments.length
  const totalAssignedMembers = activeCompany.users.length
  const departmentsWithLeads = departments.filter((d) => !!d.headOfDepartment).length

  // Handlers
  const handleOpenCreate = () => {
    setEditingDept(null)
    setFormName('')
    setFormCode('')
    setFormDescription('')
    setFormHeadName('')
    setFormHeadEmail('')
    setFormHeadcount(15)
    setFormOccupations('15-1252.00 (Software Developers)')
    setIsFormModalOpen(true)
  }

  const handleOpenEdit = (dept: DepartmentRecord) => {
    setEditingDept(dept)
    setFormName(dept.name)
    setFormCode(dept.code)
    setFormDescription(dept.description)
    setFormHeadName(dept.headOfDepartment)
    setFormHeadEmail(dept.headEmail)
    setFormHeadcount(dept.targetHeadcount)
    setFormOccupations(dept.linkedOccupations.join(', '))
    setIsFormModalOpen(true)
  }

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formCode.trim()) {
      toast({ title: 'Validation Error', description: 'Name and Code are required.', variant: 'destructive' })
      return
    }

    const linkedOccupations = formOccupations
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    if (editingDept) {
      updateDepartment(editingDept.id, {
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        description: formDescription.trim(),
        headOfDepartment: formHeadName.trim(),
        headEmail: formHeadEmail.trim(),
        targetHeadcount: Number(formHeadcount),
        linkedOccupations,
      })
      toast({ title: 'Department Updated', description: `${formName} configuration saved.`, variant: 'success' })
    } else {
      createDepartment({
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        description: formDescription.trim(),
        headOfDepartment: formHeadName.trim(),
        headEmail: formHeadEmail.trim(),
        targetHeadcount: Number(formHeadcount),
        linkedOccupations,
      })
      toast({ title: 'Department Created', description: `${formName} has been established.`, variant: 'success' })
    }

    setIsFormModalOpen(false)
    reloadData()
  }

  const handleOpenDelete = (dept: DepartmentRecord) => {
    setDeptToDelete(dept)
    setIsDeleteModalOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!deptToDelete) return
    deleteDepartment(deptToDelete.id)
    setIsDeleteModalOpen(false)
    reloadData()
    toast({
      title: 'Department Deleted',
      description: `Removed department ${deptToDelete.name}.`,
      variant: 'warning',
    })
  }

  const handleOpenRoster = (dept: DepartmentRecord) => {
    setSelectedDeptForRoster(dept)
    setReassigningUser(null)
    setTargetDeptName('')
    setIsAssignUserOpen(false)
    setAssignSearchQuery('')
    setIsRosterModalOpen(true)
  }

  const handleExecuteReassignment = () => {
    if (!reassigningUser || !targetDeptName) return
    reassignEmployeeDepartment(reassigningUser.email, targetDeptName)
    reloadData()
    setReassigningUser(null)
    setTargetDeptName('')
    toast({
      title: 'Employee Reassigned',
      description: `${reassigningUser.name} reassigned to ${targetDeptName}.`,
      variant: 'success',
    })
  }

  const handleAssignUserToDept = (user: CompanyUser) => {
    if (!selectedDeptForRoster) return
    reassignEmployeeDepartment(user.email, selectedDeptForRoster.name)
    reloadData()
    toast({
      title: 'Employee Assigned',
      description: `${user.name} assigned to ${selectedDeptForRoster.name}.`,
      variant: 'success',
    })
  }

  const handleRemoveUserFromDept = (user: CompanyUser) => {
    if (!selectedDeptForRoster) return
    reassignEmployeeDepartment(user.email, 'Unassigned')
    reloadData()
    toast({
      title: 'Employee Removed',
      description: `${user.name} unassigned from ${selectedDeptForRoster.name}.`,
      variant: 'default',
    })
  }

  // Get members of currently selected department in roster modal
  const departmentMembers = React.useMemo(() => {
    if (!selectedDeptForRoster) return []
    return activeCompany.users.filter(
      (u) => u.department?.toLowerCase() === selectedDeptForRoster.name.toLowerCase()
    )
  }, [selectedDeptForRoster, activeCompany.users])

  // Candidate users available for assignment into selected department
  const candidateUsersToAssign = React.useMemo(() => {
    if (!selectedDeptForRoster) return []
    const currentDeptName = selectedDeptForRoster.name.toLowerCase()
    return activeCompany.users
      .filter((u) => (u.department || '').toLowerCase() !== currentDeptName)
      .filter((u) => {
        if (!assignSearchQuery.trim()) return true
        const q = assignSearchQuery.toLowerCase()
        return (
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.department || '').toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q)
        )
      })
  }, [selectedDeptForRoster, activeCompany.users, assignSearchQuery])

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        <PageHeader
          title="Organization Department Management"
          description="Structure internal business units, assign department leadership, align O*NET occupations, and manage employee department assignments."
          actions={
            <Button variant="primary" size="sm" onClick={handleOpenCreate} className="flex items-center gap-1.5">
              <Plus size={15} />
              <span>Create Department</span>
            </Button>
          }
        />

        {/* Global KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Total Departments"
            value={totalDepts}
            icon={<FolderTree size={18} className="text-primary" />}
            description="Active organizational divisions"
          />
          <StatCard
            title="Assigned Members"
            value={`${totalAssignedMembers} Employees`}
            icon={<Users size={18} className="text-success" />}
            description="Across all functional departments"
          />
          <StatCard
            title="Leadership Assigned"
            value={`${departmentsWithLeads} / ${totalDepts}`}
            icon={<UserCheck size={18} className="text-primary" />}
            description="Divisions with designated leads"
          />
        </div>

        {/* Department Directory Table Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Department Directory
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Structure internal business units, assign department leadership, align O*NET occupations, and manage workforce capacity ({totalDepts} units in {activeCompany.name}).
                </CardDescription>
              </div>

              {/* Search and Filters */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative min-w-[240px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by name, code, or lead..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                  />
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {paginated.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <FolderTree size={32} className="mx-auto text-muted-foreground/50" />
                <h4 className="text-sm font-bold text-foreground">No departments match your search</h4>
                <p className="text-xs text-muted-foreground">Try adjusting search parameters or create a new department.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[11px] font-semibold">
                      <th className="py-2.5 px-3">Department & Code</th>
                      <th className="py-2.5 px-3">Leadership Contact</th>
                      <th className="py-2.5 px-3 text-center">Headcount Allocation</th>
                      <th className="py-2.5 px-3">Roster</th>
                      <th className="py-2.5 px-3">Linked Occupations</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginated.map((dept) => {
                      const deptMembers = activeCompany.users.filter(
                        (u) => u.department?.toLowerCase() === dept.name.toLowerCase()
                      )
                      const memberCount = deptMembers.length

                      return (
                        <tr key={dept.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground text-sm">{dept.name}</span>
                              <Badge variant="secondary" className="font-mono text-[10px] py-0 font-bold">
                                {dept.code}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground text-[11px] mt-0.5 line-clamp-1 max-w-sm">
                              {dept.description}
                            </p>
                          </td>

                          <td className="py-3 px-3">
                            <p className="font-medium text-foreground">{dept.headOfDepartment || 'Unassigned'}</p>
                            <p className="text-[11px] font-mono text-muted-foreground">{dept.headEmail || '—'}</p>
                          </td>

                          <td className="py-3 px-3 text-center">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 font-medium text-foreground">
                                <span>{memberCount} active</span>
                                <span className="text-muted-foreground">/ {dept.targetHeadcount} cap</span>
                              </div>
                              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${
                                    memberCount >= dept.targetHeadcount ? 'bg-warning' : 'bg-primary'
                                  }`}
                                  style={{
                                    width: `${Math.min(100, (memberCount / dept.targetHeadcount) * 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Dedicated Roster Column */}
                          <td className="py-3 px-3">
                            {deptMembers.length > 0 ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => handleOpenRoster(dept)}
                                  className="flex items-center gap-1.5 text-left hover:opacity-85 transition-opacity cursor-pointer group"
                                  title={`View Roster (${memberCount} members)`}
                                >
                                  <div className="h-6 w-6 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                                    {deptMembers[0].name.slice(0, 2).toUpperCase()}
                                  </div>
                                  <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                                    {deptMembers[0].name}
                                  </span>
                                </button>

                                {deptMembers.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenRoster(dept)}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-secondary text-primary font-semibold text-[10px] border border-primary/20 cursor-pointer hover:bg-secondary-hover transition-colors"
                                    title={`+${deptMembers.length - 1} more: ${deptMembers
                                      .slice(1)
                                      .map((u) => u.name)
                                      .join(', ')}`}
                                  >
                                    +{deptMembers.length - 1}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenRoster(dept)}
                                className="text-[11px] text-muted-foreground italic hover:text-foreground hover:underline cursor-pointer"
                                title="Open Roster (0 members)"
                              >
                                Unassigned
                              </button>
                            )}
                          </td>

                          {/* Linked Occupations: 1 then +N */}
                          <td className="py-3 px-3">
                            {dept.linkedOccupations.length > 0 ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge
                                  variant="outline"
                                  className="text-[10px] py-0 truncate max-w-[190px]"
                                  title={dept.linkedOccupations[0]}
                                >
                                  {dept.linkedOccupations[0]}
                                </Badge>
                                {dept.linkedOccupations.length > 1 && (
                                  <span
                                    className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-secondary text-primary font-semibold text-[10px] border border-primary/20 cursor-default"
                                    title={`+${dept.linkedOccupations.length - 1} more: ${dept.linkedOccupations
                                      .slice(1)
                                      .join(', ')}`}
                                  >
                                    +{dept.linkedOccupations.length - 1}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground italic">None</span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEdit(dept)}
                                title="Edit Department"
                                aria-label="Edit Department"
                                className="h-8 w-8 p-0"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleOpenDelete(dept)}
                                title="Delete Department"
                                aria-label="Delete Department"
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
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

          {filtered.length > 0 && (
            <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                Showing {(currentPage - 1) * pageSize + 1}–
                {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} departments
              </span>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </Card>

        {/* Create / Edit Department Modal */}
        <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen} className="max-w-lg">
          <form onSubmit={handleSaveForm}>
            <DialogHeader>
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                  <FolderTree className="h-5 w-5 text-primary shrink-0" />
                  <span>{editingDept ? `Edit Department: ${editingDept.name}` : 'Create New Department'}</span>
                </DialogTitle>
                <Badge variant="primary" className="text-[10px] font-bold uppercase">
                  ORGANIZATION UNIT
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Define functional scope, leadership accountability, and target workforce capacity.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Top metadata panel */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border">
                <div>
                  <span className="text-muted-foreground block text-[11px] font-medium">Department Code</span>
                  <strong className="font-mono text-foreground font-bold text-xs">{formCode || 'AUTO'}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px] font-medium">Target Headcount</span>
                  <strong className="font-mono text-primary font-bold text-xs">{formHeadcount} Members</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground block text-[11px] font-medium">Department Name</span>
                  <span className="text-foreground font-semibold text-xs">{formName || 'Enter name below'}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1">
                    <label className="font-semibold text-foreground block">Department Name *</label>
                    <Input
                      placeholder="e.g., Cloud Infrastructure & SRE"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground block">Code *</label>
                    <Input
                      placeholder="CLOUD-SRE"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground block">Mission & Scope Description</label>
                  <Input
                    placeholder="Overview of departmental mission and scope..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground block">Department Lead Name</label>
                    <Input
                      placeholder="e.g., Marcus Vance"
                      value={formHeadName}
                      onChange={(e) => setFormHeadName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground block">Lead Work Email</label>
                    <Input
                      type="email"
                      placeholder="marcus@adaptlearn.internal"
                      value={formHeadEmail}
                      onChange={(e) => setFormHeadEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground block">Target Headcount Cap</label>
                    <Input
                      type="number"
                      min={1}
                      max={200}
                      value={formHeadcount}
                      onChange={(e) => setFormHeadcount(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground block">Linked O*NET Occupations</label>
                    <Input
                      placeholder="15-1252.00 (Software Developers)"
                      value={formOccupations}
                      onChange={(e) => setFormOccupations(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border mt-4 shrink-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsFormModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                <Save size={13} className="mr-1.5" />
                {editingDept ? 'Save Changes' : 'Create Department'}
              </Button>
            </div>
          </form>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen} className="max-w-md">
          <DialogHeader>
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                <span>Delete Department: {deptToDelete?.name}</span>
              </DialogTitle>
              <Badge variant="destructive" className="text-[10px] font-bold uppercase">
                DANGER ACTION
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Deleting this department will unassign current members. They can be reassigned to other departments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border">
              <div>
                <span className="text-muted-foreground block text-[11px] font-medium">Department Code</span>
                <strong className="font-mono text-foreground font-bold text-xs">{deptToDelete?.code}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px] font-medium">Assigned Members</span>
                <strong className="font-mono text-destructive font-bold text-xs">
                  {deptToDelete ? activeCompany.users.filter((u) => u.department === deptToDelete.name).length : 0} Members
                </strong>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground block text-[11px] font-medium">Department Lead</span>
                <span className="text-foreground font-semibold text-xs">{deptToDelete?.headOfDepartment || 'Unassigned'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border mt-4 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleConfirmDelete}>
              <Trash2 size={13} className="mr-1.5" />
              Confirm Deletion
            </Button>
          </div>
        </Dialog>

        {/* Department Member Roster & Reassign Modal */}
        <Dialog open={isRosterModalOpen} onOpenChange={setIsRosterModalOpen} className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <Users className="h-5 w-5 text-primary shrink-0" />
                <span>Department Roster: {selectedDeptForRoster?.name}</span>
              </DialogTitle>
              <Badge variant="success" className="text-[10px] font-bold">
                {departmentMembers.length} ACTIVE MEMBERS
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Review assigned team members, assign employees directly to this roster, or reassign members to other departments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Top department overview box */}
            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px] font-medium">Code</span>
                <strong className="font-mono text-foreground font-bold text-xs">{selectedDeptForRoster?.code}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px] font-medium">Department Lead</span>
                <span className="text-foreground font-semibold text-xs">{selectedDeptForRoster?.headOfDepartment || 'Unassigned'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px] font-medium">Capacity Quota</span>
                <span className="text-primary font-bold text-xs">{departmentMembers.length} / {selectedDeptForRoster?.targetHeadcount || 30} Seats</span>
              </div>
            </div>

            {/* Inline Assign Member Picker Drawer */}
            {isAssignUserOpen && (
              <div className="p-3.5 rounded-xl border border-primary/30 bg-secondary/40 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-primary" />
                    <span className="font-bold text-foreground">
                      Assign Employee to {selectedDeptForRoster?.name}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {candidateUsersToAssign.length} available user{candidateUsersToAssign.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-8 text-xs h-8 bg-background"
                    placeholder="Search available employees by name, email, or department..."
                    value={assignSearchQuery}
                    onChange={(e) => setAssignSearchQuery(e.target.value)}
                  />
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-border border border-border rounded-lg bg-background">
                  {candidateUsersToAssign.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No matching unassigned or available employees found.
                    </div>
                  ) : (
                    candidateUsersToAssign.slice(0, 15).map((u) => (
                      <div key={u.id} className="p-2.5 flex items-center justify-between gap-2.5 hover:bg-muted/30">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-6 w-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px] shrink-0">
                            {u.avatar || u.name[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate text-xs">{u.name}</p>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground truncate">
                              <span className="font-mono">{u.email}</span>
                              <span>•</span>
                              <span>{u.department || 'Unassigned'}</span>
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleAssignUserToDept(u)}
                          className="h-6 text-[11px] px-2.5 shrink-0"
                        >
                          Assign
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {reassigningUser ? (
              <div className="p-3.5 rounded-xl border border-primary/30 bg-secondary/60 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">
                    Reassign {reassigningUser.name} ({reassigningUser.email})
                  </span>
                  <button
                    type="button"
                    onClick={() => setReassigningUser(null)}
                    className="text-muted-foreground hover:text-foreground text-[11px]"
                  >
                    Cancel
                  </button>
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Select New Department</label>
                  <select
                    className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    value={targetDeptName}
                    onChange={(e) => setTargetDeptName(e.target.value)}
                  >
                    <option value="">-- Choose destination department --</option>
                    {departments
                      .filter((d) => d.name !== selectedDeptForRoster?.name)
                      .map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setReassigningUser(null)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!targetDeptName}
                    onClick={handleExecuteReassignment}
                  >
                    Confirm Reassignment
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Assigned Team Members ({departmentMembers.length})
              </label>

              {departmentMembers.length === 0 ? (
                <div className="py-8 text-center space-y-1.5 border border-dashed border-border rounded-xl">
                  <Users size={24} className="mx-auto text-muted-foreground/60" />
                  <p className="text-xs font-semibold text-foreground">No employees currently assigned</p>
                  <p className="text-[11px] text-muted-foreground">
                    You can assign employees from the User Management console.
                  </p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto divide-y divide-border border border-border rounded-xl">
                  {departmentMembers.map((member) => (
                    <div key={member.id} className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-muted/30">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                          {member.avatar || member.name[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-foreground truncate">{member.name}</p>
                          <p className="text-[11px] font-mono text-muted-foreground truncate">{member.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="text-[10px] font-medium">
                          {member.role}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReassigningUser(member)
                            setTargetDeptName('')
                          }}
                          className="text-xs h-7 text-primary hover:bg-primary/10"
                        >
                          Reassign
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveUserFromDept(member)}
                          className="text-xs h-7 text-destructive hover:bg-destructive/10"
                          title="Remove from Department"
                        >
                          <UserMinus size={13} className="mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border mt-4 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setIsRosterModalOpen(false)}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAssignUserOpen((v) => !v)}
              className="flex items-center gap-1.5 font-semibold shadow-2xs"
            >
              <UserPlus size={14} />
              <span>{isAssignUserOpen ? 'Hide Assignment Drawer' : 'Assign Member'}</span>
            </Button>
          </div>
        </Dialog>
      </div>
    </WorkspaceLayout>
  )
}
