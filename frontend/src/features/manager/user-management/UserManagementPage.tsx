import * as React from 'react'
import {
  AlertTriangle,
  Briefcase,
  Edit2,
  GraduationCap,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Users,
} from 'lucide-react'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/Card'
import { PageHeader } from '../../../shared/components/ui/PageHeader'
import { Pagination } from '../../../shared/components/ui/Pagination'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../shared/components/ui/Dialog'
import { Input } from '../../../shared/components/ui/Input'
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
  type CompanyRecord,
  type CompanyUser,
  type CompanyUserRole,
  type UserStatus,
} from '../../../shared/stores/companyStore'

const DEPARTMENTS = [
  'All Departments',
  'Machine Learning & Cognitive Architecture',
  'Enterprise Talent Development',
  'Backend Engineering',
  'Data & Analytics',
  'Cloud Infrastructure & SRE',
  'Security & Infrastructure',
  'Product & UX Strategy',
]

const USER_PRESETS: ImportPreset[] = [
  {
    id: 'preset-core-team',
    name: 'Cognitive Engineering Core (5 Users)',
    description: '1 Expert, 1 L&D Manager, and 3 Employees.',
    badge: 'Popular',
    itemCount: 5,
    previewSnippet: JSON.stringify(
      [
        { name: 'Dr. Aris Thorne', email: 'aris.thorne@internal', role: 'Expert' },
        { name: 'Morgan Vance', email: 'morgan.vance@internal', role: 'Employee' },
        { name: 'Tanya Reed', email: 'tanya.reed@internal', role: 'Employee' },
        { name: 'Patricia Gomez', email: 'patricia.g@internal', role: 'L&D Manager', department: 'Enterprise Talent Development' },
      ],
      null,
      2
    ),
    payload: [
      {
        name: 'Dr. Aris Thorne',
        email: 'aris.thorne@internal',
        role: 'Expert' as CompanyUserRole,
      },
      {
        name: 'Morgan Vance',
        email: 'morgan.vance@internal',
        role: 'Employee' as CompanyUserRole,
      },
      {
        name: 'Tanya Reed',
        email: 'tanya.reed@internal',
        role: 'Employee' as CompanyUserRole,
      },
      {
        name: 'Kai Takahashi',
        email: 'kai.t@internal',
        role: 'Employee' as CompanyUserRole,
      },
      {
        name: 'Patricia Gomez',
        email: 'patricia.g@internal',
        role: 'L&D Manager' as CompanyUserRole,
        department: 'Enterprise Talent Development',
      },
    ],
  },
  {
    id: 'preset-cross-functional',
    name: 'Cross-Functional Agile Pod (3 Users)',
    description: '1 Expert and 2 Employees.',
    badge: 'Lean Pod',
    itemCount: 3,
    previewSnippet: JSON.stringify(
      [
        { name: 'Siddharth Rao', email: 'siddharth@internal', role: 'Expert' },
        { name: 'Liam O\'Connor', email: 'liam@internal', role: 'Employee' },
        { name: 'Zoe Martinez', email: 'zoe@internal', role: 'Employee' },
      ],
      null,
      2
    ),
    payload: [
      {
        name: 'Siddharth Rao',
        email: 'siddharth@internal',
        role: 'Expert' as CompanyUserRole,
      },
      {
        name: 'Liam O\'Connor',
        email: 'liam@internal',
        role: 'Employee' as CompanyUserRole,
      },
      {
        name: 'Zoe Martinez',
        email: 'zoe@internal',
        role: 'Employee' as CompanyUserRole,
      },
    ],
  },
]

export function UserManagementPage() {
  const { toast } = useToast()

  // Subscribe to active company
  const [activeCompany, setActiveCompanyState] = React.useState<CompanyRecord>(getActiveCompany)

  const reloadCompany = () => {
    setActiveCompanyState(getActiveCompany())
  }

  React.useEffect(() => {
    const handleUpdate = () => reloadCompany()
    window.addEventListener('active_company_changed', handleUpdate)
    window.addEventListener('companies_updated', handleUpdate)
    return () => {
      window.removeEventListener('active_company_changed', handleUpdate)
      window.removeEventListener('companies_updated', handleUpdate)
    }
  }, [])

  const users = activeCompany.users

  // Filters
  const [searchQuery, setSearchQuery] = React.useState('')
  const [roleFilter, setRoleFilter] = React.useState<'All' | CompanyUserRole>('All')
  const [statusFilter, setStatusFilter] = React.useState<'All' | UserStatus>('All')
  const [deptFilter, setDeptFilter] = React.useState('All Departments')

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = React.useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false)
  const [selectedUser, setSelectedUser] = React.useState<CompanyUser | null>(null)
  const [isEditing, setIsEditing] = React.useState(false)

  // Form State
  const [formName, setFormName] = React.useState('')
  const [formEmail, setFormEmail] = React.useState('')
  const [formRole, setFormRole] = React.useState<CompanyUserRole>('Employee')
  const [formDept, setFormDept] = React.useState(DEPARTMENTS[1])
  const [formStatus, setFormStatus] = React.useState<UserStatus>('active')

  const openCreateModal = () => {
    // Check user limit
    if (users.length >= activeCompany.maxUsers) {
      toast({
        title: 'Package Seat Limit Reached',
        description: `Your ${activeCompany.packageTier} package includes ${activeCompany.maxUsers} seats. All seats are currently assigned. Upgrade your plan to invite more team members.`,
        variant: 'destructive',
      })
      return
    }

    setIsEditing(false)
    setSelectedUser(null)
    setFormName('')
    setFormEmail('')
    setFormRole('Employee')
    setFormDept(DEPARTMENTS[1])
    setFormStatus('active')
    setIsFormModalOpen(true)
  }

  const openEditModal = (user: CompanyUser) => {
    setIsEditing(true)
    setSelectedUser(user)
    setFormName(user.name)
    setFormEmail(user.email)
    setFormRole(user.role)
    setFormDept(user.department || DEPARTMENTS[1])
    setFormStatus(user.status)
    setIsFormModalOpen(true)
  }

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formEmail.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name and email are required fields.',
        variant: 'destructive',
      })
      return
    }

    if (isEditing && selectedUser) {
      // Update user
      updateActiveCompany((comp) => ({
        ...comp,
        users: comp.users.map((u) =>
          u.id === selectedUser.id
            ? {
                ...u,
                name: formName.trim(),
                email: formEmail.trim(),
                role: formRole,
                department: formRole === 'L&D Manager' ? formDept : (u.department || 'General'),
                status: formStatus,
                targetRole: formRole === 'Employee' ? u.targetRole : undefined,
              }
            : u
        ),
      }))

      toast({
        title: 'User Profile Updated',
        description: `Successfully saved changes for ${formName}.`,
        variant: 'success',
      })
    } else {
      // Check seat limit
      if (users.length >= activeCompany.maxUsers) {
        toast({
          title: 'Package Seat Limit Exceeded',
          description: `Cannot add user. Reached capacity of ${activeCompany.maxUsers} seats.`,
          variant: 'destructive',
        })
        return
      }

      const initials = formName
        .split(' ')
        .map((p) => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U'

      const newUser: CompanyUser = {
        id: `USR-${Math.floor(100 + Math.random() * 900)}`,
        name: formName.trim(),
        email: formEmail.trim(),
        role: formRole,
        department: formRole === 'L&D Manager' ? formDept : 'General',
        status: formStatus,
        targetRole: undefined,
        lastActive: 'Never',
        avatar: initials,
      }

      updateActiveCompany((comp) => ({
        ...comp,
        users: [newUser, ...comp.users],
      }))

      toast({
        title: 'User Added to Organization',
        description: `${formName} has been provisioned with the "${formRole}" role.`,
        variant: 'success',
      })
    }

    setIsFormModalOpen(false)
    reloadCompany()
  }

  const isUserSelfOrOwner = (user: CompanyUser | null | undefined): boolean => {
    if (!user) return false
    const currentEmail = (localStorage.getItem('auth_user') || '').toLowerCase().trim()
    const ownerEmail = (activeCompany.ownerEmail || '').toLowerCase().trim()
    const userEmail = (user.email || '').toLowerCase().trim()
    return userEmail === currentEmail || (ownerEmail !== '' && userEmail === ownerEmail)
  }

  const handleDeleteUser = () => {
    if (!selectedUser) return
    if (isUserSelfOrOwner(selectedUser)) {
      toast({
        title: 'Action Prohibited',
        description: 'You cannot delete the primary L&D Manager or your own active account.',
        variant: 'destructive',
      })
      setIsDeleteModalOpen(false)
      return
    }

    updateActiveCompany((comp) => ({
      ...comp,
      users: comp.users.filter((u) => u.id !== selectedUser.id),
    }))
    toast({
      title: 'User Deactivated & Removed',
      description: `Account for ${selectedUser.name} was removed from ${activeCompany.name}.`,
      variant: 'info',
    })
    setIsDeleteModalOpen(false)
    reloadCompany()
  }

  const handleBulkImportUsers = (data: unknown) => {
    const importList = Array.isArray(data)
      ? data
      : (typeof data === 'object' && data !== null && 'users' in data && Array.isArray((data as Record<string, unknown>).users))
      ? ((data as Record<string, unknown>).users as unknown[])
      : []
    if (!Array.isArray(importList) || importList.length === 0) {
      toast({
        title: 'Import Failed',
        description: 'No valid user records found in the imported file.',
        variant: 'destructive',
      })
      return
    }

    const availableSeats = activeCompany.maxUsers - users.length
    if (availableSeats <= 0) {
      toast({
        title: 'No Seats Available',
        description: `Your ${activeCompany.packageTier} package seat limit (${activeCompany.maxUsers}) is full.`,
        variant: 'destructive',
      })
      return
    }

    const toAdd = importList.slice(0, availableSeats).map((itemRecord: unknown, idx: number) => {
      const item = (typeof itemRecord === 'object' && itemRecord !== null ? itemRecord : {}) as Record<string, unknown>
      const name = String(item.name || `Team Member ${idx + 1}`)
      const initials = name
        .split(' ')
        .map((p: string) => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

      const userRole: CompanyUserRole =
        item.role === 'Expert'
          ? 'Expert'
          : item.role === 'L&D Manager'
          ? 'L&D Manager'
          : 'Employee'

      const user: CompanyUser = {
        id: `USR-${Math.floor(300 + idx * 10 + Math.random() * 9)}`,
        name,
        email: String(item.email || `user${idx + 1}@${activeCompany.name.toLowerCase().replace(/\s+/g, '')}.internal`),
        role: userRole,
        department: String(item.department || DEPARTMENTS[1]),
        status: 'active',
        targetRole: userRole === 'Employee' ? String(item.targetRole || 'AI Knowledge Architect') : undefined,
        lastActive: 'Just imported',
        avatar: initials || 'TM',
      }
      return user
    })

    updateActiveCompany((comp) => ({
      ...comp,
      users: [...toAdd, ...comp.users],
    }))

    reloadCompany()

    if (importList.length > availableSeats) {
      toast({
        title: 'Partial Import (Seat Limit Reached)',
        description: `Imported ${toAdd.length} users. ${importList.length - toAdd.length} users skipped due to the ${activeCompany.maxUsers} seat limit.`,
        variant: 'warning',
      })
    } else {
      toast({
        title: 'Bulk Import Completed',
        description: `Added ${toAdd.length} users to ${activeCompany.name}.`,
        variant: 'success',
      })
    }
  }

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.department.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === 'All' || u.role === roleFilter
    const matchesStatus = statusFilter === 'All' || u.status === statusFilter
    const matchesDept = deptFilter === 'All Departments' || u.department === deptFilter
    return matchesSearch && matchesRole && matchesStatus && matchesDept
  })

  // Pagination
  const [currentPage, setCurrentPage] = React.useState(1)
  const pageSize = 10
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // KPI calculations
  const totalCount = users.length
  const employeeCount = users.filter((u) => u.role === 'Employee').length
  const expertCount = users.filter((u) => u.role === 'Expert').length
  const ldCount = users.filter((u) => u.role === 'L&D Manager').length
  const seatsRemaining = Math.max(0, activeCompany.maxUsers - totalCount)
  const isNearCapacity = totalCount >= activeCompany.maxUsers

  const getRoleBadge = (role: CompanyUserRole) => {
    switch (role) {
      case 'Employee':
        return (
          <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5 font-semibold">
            <GraduationCap size={12} className="mr-1 inline" /> Employee
          </Badge>
        )
      case 'Expert':
        return (
          <Badge variant="outline" className="text-success border-success/40 bg-success/5 font-semibold">
            <Sparkles size={12} className="mr-1 inline text-success" /> Expert
          </Badge>
        )
      case 'L&D Manager':
        return (
          <Badge variant="primary" className="font-semibold">
            <Briefcase size={12} className="mr-1 inline" /> L&D Manager
          </Badge>
        )
    }
  }

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>
      case 'pending':
        return <Badge variant="warning">Pending</Badge>
      case 'inactive':
        return <Badge variant="destructive">Inactive</Badge>
    }
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
                className="font-semibold bg-secondary text-primary border border-primary/20 hover:bg-secondary/80 shadow-2xs"
              >
                Import
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={openCreateModal}
                disabled={isNearCapacity}
                className="font-semibold shadow-2xs whitespace-nowrap"
              >
                Create
              </Button>
            </div>
          }
        />

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            variant="gradient"
            icon={<Users className="h-4 w-4 text-primary" />}
            title="Total Seats Provisioned"
            value={`${totalCount} / ${activeCompany.maxUsers} Seats`}
            valueClassName="text-primary"
            description={`${seatsRemaining} seats available to assign`}
          />
          <StatCard
            variant="gradient"
            icon={<GraduationCap className="h-4 w-4 text-primary" />}
            title="Employees"
            value={`${employeeCount} Users`}
            valueClassName="text-primary"
            description="Assigned personalized pathways"
          />
          <StatCard
            variant="gradient"
            icon={<Sparkles className="h-4 w-4 text-success" />}
            title="Experts"
            value={`${expertCount} Experts`}
            valueClassName="text-success"
            description="Authoring ontology & modules"
          />
          <StatCard
            variant="gradient"
            icon={<Briefcase className="h-4 w-4 text-primary" />}
            title="L&D Managers"
            value={`${ldCount} Managers`}
            valueClassName="text-primary"
            description="Company administrators"
          />
        </div>

        {/* User Directory Table Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  User Accounts
                </CardTitle>
                <CardDescription>
                  Provisioned accounts, assigned organizational roles, and target career trajectories ({totalCount} / {activeCompany.maxUsers} seats).
                </CardDescription>
              </div>

              {/* Search and Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[200px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by name, email, or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as 'All' | CompanyUserRole)}
                  className="text-xs bg-background border border-border rounded-md px-2 py-1.5 text-foreground focus:outline-none cursor-pointer"
                >
                  <option value="All">All Roles</option>
                  <option value="Employee">Employees</option>
                  <option value="Expert">Experts</option>
                  <option value="L&D Manager">L&D Managers</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'All' | UserStatus)}
                  className="text-xs bg-background border border-border rounded-md px-2 py-1.5 text-foreground focus:outline-none cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
                </select>

                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="text-xs bg-background border border-border rounded-md px-2 py-1.5 text-foreground focus:outline-none cursor-pointer max-w-[150px] truncate"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[11px] font-semibold">
                    <th className="py-2.5 px-3">User Identity</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Department &amp; Learning Target</th>
                    <th className="py-2.5 px-3">Last Active</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-muted-foreground text-xs">
                        No users found matching your search.
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                        {/* 1. Identity */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-[10px] shrink-0 shadow-2xs">
                              {user.avatar}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-foreground flex items-center gap-1.5 truncate">
                                <span>{user.name}</span>
                                <span className="text-[10px] font-mono text-muted-foreground font-normal">
                                  ({user.id})
                                </span>
                                {isUserSelfOrOwner(user) && (
                                  <Badge variant="secondary" className="text-[9px] font-bold px-1.5 py-0 text-primary border border-primary/20">
                                    You (Owner)
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground font-mono truncate">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Role */}
                        <td className="py-3 px-3">
                          {getRoleBadge(user.role)}
                        </td>

                        {/* 3. Status */}
                        <td className="py-3 px-3">
                          {getStatusBadge(user.status)}
                        </td>

                        {/* 4. Department & Target */}
                        <td className="py-3 px-3">
                          <div className="space-y-0.5 min-w-0">
                            <div className="text-foreground font-medium truncate" title={user.department}>
                              {user.department || 'General'}
                            </div>
                            {user.role === 'Employee' && (
                              <div className="text-[10px] text-muted-foreground truncate">
                                {user.targetRole ? (
                                  <span>Target: <strong className="text-foreground/80">{user.targetRole}</strong></span>
                                ) : (
                                  <span className="italic text-muted-foreground/70">No target role assigned</span>
                                )}
                              </div>
                            )}
                            {user.role === 'Expert' && (
                              <div className="text-[10px] text-success font-semibold truncate">
                                Ontology &amp; Assessment Author
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 4. Last Active */}
                        <td className="py-3 px-3 font-mono text-muted-foreground text-[11px]">
                          {user.lastActive}
                        </td>

                        {/* 5. Actions */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => openEditModal(user)}
                              title="Edit User Account"
                              aria-label="Edit User Account"
                            >
                              <Edit2 size={14} />
                            </Button>
                            {isUserSelfOrOwner(user) ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground/30 cursor-not-allowed border-dashed bg-muted/10 opacity-50"
                                disabled
                                title="Primary L&D Manager / your account cannot be deleted"
                                aria-label="Cannot Delete Owner"
                              >
                                <Trash2 size={14} />
                              </Button>
                            ) : (
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  setSelectedUser(user)
                                  setIsDeleteModalOpen(true)
                                }}
                                title="Deactivate / Delete User"
                                aria-label="Deactivate / Delete User"
                              >
                                <Trash2 size={14} />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filteredUsers.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredUsers.length / pageSize) || 1}
                totalItems={filteredUsers.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                itemLabel="users"
              />
            )}
          </CardContent>
        </Card>

        {/* CREATE / EDIT USER MODAL */}
        <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
          <div className="space-y-4">
            <DialogHeader>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Users size={20} />
                </div>
                <div>
                  <DialogTitle>{isEditing ? 'Edit User Details' : 'Create User'}</DialogTitle>
                  <DialogDescription>
                    {isEditing
                      ? `Update profile and permissions for ${selectedUser?.name}.`
                      : `Create a new user within ${activeCompany.name} (${activeCompany.maxUsers - totalCount} seats remaining).`}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleSaveUser} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="user-full-name" className="font-bold text-foreground block mb-1">
                    Full Name *
                  </label>
                  <Input
                    id="user-full-name"
                    type="text"
                    required
                    placeholder="e.g. Jordan Parker"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="user-enterprise-email" className="font-bold text-foreground block mb-1">
                    Company Email *
                  </label>
                  <Input
                    id="user-enterprise-email"
                    type="email"
                    required
                    placeholder="e.g. jordan@company.internal"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="user-company-role" className="font-bold text-foreground block mb-1">
                    Company Role *
                  </label>
                  <select
                    id="user-company-role"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as CompanyUserRole)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="Employee">Employee</option>
                    <option value="Expert">Expert</option>
                    <option value="L&D Manager">L&D Manager</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="user-status-select" className="font-bold text-foreground block mb-1">
                    Account Status
                  </label>
                  <select
                    id="user-status-select"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as UserStatus)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending Onboarding</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {formRole === 'L&D Manager' && (
                <div>
                  <label htmlFor="user-department-select" className="font-bold text-foreground block mb-1">
                    Department / Organizational Unit
                  </label>
                  <select
                    id="user-department-select"
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {DEPARTMENTS.filter((d) => d !== 'All Departments').map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFormModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  {isEditing ? 'Save Changes' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </Dialog>

        {/* DELETE CONFIRMATION MODAL */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <div className="space-y-4">
            <DialogHeader>
              <div className="flex items-center gap-2.5 text-destructive">
                <AlertTriangle size={22} />
                <DialogTitle>Deactivate User Seat</DialogTitle>
              </div>
              <DialogDescription>
                {selectedUser && isUserSelfOrOwner(selectedUser) ? (
                  <span className="text-destructive font-medium">
                    This account is the primary L&D Manager / your active organization account and cannot be deleted.
                  </span>
                ) : (
                  <>
                    Are you sure you want to remove <strong className="text-foreground">{selectedUser?.name}</strong>?
                    Their seat will be released and returned to your available package pool.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={selectedUser ? isUserSelfOrOwner(selectedUser) : false}
                onClick={handleDeleteUser}
              >
                Remove User
              </Button>
            </DialogFooter>
          </div>
        </Dialog>

        {/* BULK IMPORT ROSTER MODAL */}
        <QuickConfigImportModal
          open={isImportModalOpen}
          onOpenChange={setIsImportModalOpen}
          title="Bulk Import Organization Users"
          entityName="Users"
          description={`Quickly provision employee and expert seats for ${activeCompany.name} up to your ${activeCompany.maxUsers} limit.`}
          presets={USER_PRESETS}
          onImport={handleBulkImportUsers}
          sampleJsonPlaceholder={`[\n  {\n    "name": "Jordan Parker",\n    "email": "jordan@company.com",\n    "role": "Expert"\n  },\n  {\n    "name": "Alex Chen",\n    "email": "alex@company.com",\n    "role": "Employee"\n  },\n  {\n    "name": "Sarah Connor",\n    "email": "sarah@company.com",\n    "role": "L&D Manager",\n    "department": "Enterprise Talent Development"\n  }\n]`}
        />
      </div>
    </WorkspaceLayout>
  )
}
