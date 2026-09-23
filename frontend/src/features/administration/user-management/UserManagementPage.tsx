import * as React from 'react'
import {
  AlertTriangle,
  Briefcase,
  Edit2,
  GraduationCap,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
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
import { StatCard } from '../../../shared/components/ui/StatCard'
import { useToast } from '../../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'

export type SystemRole = 'Employee' | 'Line Manager' | 'L&D Manager' | 'Admin'
export type UserStatus = 'active' | 'pending' | 'inactive'

export interface UserRecord {
  id: string
  name: string
  email: string
  role: SystemRole
  department: string
  status: UserStatus
  lineManager?: string
  targetRole?: string
  lastActive: string
  avatar: string
}

const INITIAL_USERS: UserRecord[] = [
  {
    id: 'USR-101',
    name: 'Alex Chen',
    email: 'alex.chen@adaptlearn.internal',
    role: 'Employee',
    department: 'Machine Learning & Cognitive Architecture',
    status: 'active',
    lineManager: 'David Miller',
    targetRole: 'AI Knowledge Architect',
    lastActive: '10 mins ago',
    avatar: 'AC',
  },
  {
    id: 'USR-102',
    name: 'David Miller',
    email: 'david.miller@adaptlearn.internal',
    role: 'Line Manager',
    department: 'Machine Learning & Cognitive Architecture',
    status: 'active',
    lastActive: '5 mins ago',
    avatar: 'DM',
  },
  {
    id: 'USR-103',
    name: 'Sarah Connor',
    email: 'sarah.connor@adaptlearn.internal',
    role: 'L&D Manager',
    department: 'Enterprise Talent Development',
    status: 'active',
    lastActive: '1 hour ago',
    avatar: 'SC',
  },
  {
    id: 'USR-104',
    name: 'Elena Rostova',
    email: 'elena.rostova@adaptlearn.internal',
    role: 'Admin',
    department: 'Corporate Ontology & Governance',
    status: 'active',
    lastActive: 'Just now',
    avatar: 'ER',
  },
  {
    id: 'USR-105',
    name: 'Marcus Vance',
    email: 'marcus.vance@adaptlearn.internal',
    role: 'Employee',
    department: 'Backend Engineering',
    status: 'active',
    lineManager: 'David Miller',
    targetRole: 'Machine Learning Engineer',
    lastActive: 'Yesterday',
    avatar: 'MV',
  },
  {
    id: 'USR-106',
    name: 'Chloe Bennett',
    email: 'chloe.bennett@adaptlearn.internal',
    role: 'Employee',
    department: 'Data & Analytics',
    status: 'pending',
    lineManager: 'David Miller',
    targetRole: 'Not Assigned',
    lastActive: '3 days ago',
    avatar: 'CB',
  },
  {
    id: 'USR-107',
    name: 'James Wilson',
    email: 'james.wilson@adaptlearn.internal',
    role: 'Line Manager',
    department: 'Cloud Infrastructure & SRE',
    status: 'active',
    lastActive: '2 days ago',
    avatar: 'JW',
  },
  {
    id: 'USR-108',
    name: 'Rebecca Torres',
    email: 'rebecca.torres@adaptlearn.internal',
    role: 'Admin',
    department: 'Security & Infrastructure',
    status: 'inactive',
    lastActive: '2 weeks ago',
    avatar: 'RT',
  },
]

const DEPARTMENTS = [
  'All Departments',
  'Machine Learning & Cognitive Architecture',
  'Enterprise Talent Development',
  'Corporate Ontology & Governance',
  'Backend Engineering',
  'Data & Analytics',
  'Cloud Infrastructure & SRE',
  'Security & Infrastructure',
]

export function UserManagementPage() {
  const { toast } = useToast()
  const [users, setUsers] = React.useState<UserRecord[]>(INITIAL_USERS)

  // Filters
  const [searchQuery, setSearchQuery] = React.useState('')
  const [roleFilter, setRoleFilter] = React.useState<'All' | SystemRole>('All')
  const [statusFilter, setStatusFilter] = React.useState<'All' | UserStatus>('All')
  const [deptFilter, setDeptFilter] = React.useState('All Departments')

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = React.useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false)
  const [selectedUser, setSelectedUser] = React.useState<UserRecord | null>(null)
  const [isEditing, setIsEditing] = React.useState(false)

  // Form State
  const [formName, setFormName] = React.useState('')
  const [formEmail, setFormEmail] = React.useState('')
  const [formRole, setFormRole] = React.useState<SystemRole>('Employee')
  const [formDept, setFormDept] = React.useState(DEPARTMENTS[1])
  const [formStatus, setFormStatus] = React.useState<UserStatus>('active')
  const [formLineManager, setFormLineManager] = React.useState('David Miller')
  const [formTargetRole, setFormTargetRole] = React.useState('AI Knowledge Architect')

  const openCreateModal = () => {
    setIsEditing(false)
    setSelectedUser(null)
    setFormName('')
    setFormEmail('')
    setFormRole('Employee')
    setFormDept(DEPARTMENTS[1])
    setFormStatus('active')
    setFormLineManager('David Miller')
    setFormTargetRole('AI Knowledge Architect')
    setIsFormModalOpen(true)
  }

  const openEditModal = (user: UserRecord) => {
    setIsEditing(true)
    setSelectedUser(user)
    setFormName(user.name)
    setFormEmail(user.email)
    setFormRole(user.role)
    setFormDept(user.department)
    setFormStatus(user.status)
    setFormLineManager(user.lineManager || 'David Miller')
    setFormTargetRole(user.targetRole || 'Not Assigned')
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
      // Update
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id
            ? {
                ...u,
                name: formName,
                email: formEmail,
                role: formRole,
                department: formDept,
                status: formStatus,
                lineManager: formRole === 'Employee' ? formLineManager : undefined,
                targetRole: formRole === 'Employee' ? formTargetRole : undefined,
              }
            : u
        )
      )
      toast({
        title: 'User Updated',
        description: `Successfully updated user account for ${formName}.`,
        variant: 'success',
      })
    } else {
      // Create
      const initials = formName
        .split(' ')
        .map((p) => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
      const newUser: UserRecord = {
        id: `USR-${Math.floor(100 + Math.random() * 900)}`,
        name: formName,
        email: formEmail,
        role: formRole,
        department: formDept,
        status: formStatus,
        lineManager: formRole === 'Employee' ? formLineManager : undefined,
        targetRole: formRole === 'Employee' ? formTargetRole : undefined,
        lastActive: 'Never',
        avatar: initials || 'U',
      }
      setUsers([newUser, ...users])
      toast({
        title: 'User Created',
        description: `New user ${formName} added as ${formRole}.`,
        variant: 'success',
      })
    }

    setIsFormModalOpen(false)
  }

  const handleDeleteUser = () => {
    if (!selectedUser) return
    setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id))
    toast({
      title: 'User Removed',
      description: `Account for ${selectedUser.name} has been deactivated and removed.`,
      variant: 'info',
    })
    setIsDeleteModalOpen(false)
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

  // KPI calculations
  const totalCount = users.length
  const employeeCount = users.filter((u) => u.role === 'Employee').length
  const lineManagerCount = users.filter((u) => u.role === 'Line Manager').length
  const ldAndAdminCount = users.filter((u) => u.role === 'L&D Manager' || u.role === 'Admin').length

  const getRoleBadge = (role: SystemRole) => {
    switch (role) {
      case 'Employee':
        return (
          <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5 font-semibold">
            <GraduationCap size={12} className="mr-1 inline" /> Employee
          </Badge>
        )
      case 'Line Manager':
        return (
          <Badge variant="outline" className="text-warning border-warning/40 bg-warning/5 font-semibold">
            <Users size={12} className="mr-1 inline" /> Line Manager
          </Badge>
        )
      case 'L&D Manager':
        return (
          <Badge variant="outline" className="text-secondary-foreground border-border bg-secondary font-semibold">
            <Briefcase size={12} className="mr-1 inline" /> L&D Manager
          </Badge>
        )
      case 'Admin':
        return (
          <Badge variant="primary" className="font-semibold">
            <ShieldCheck size={12} className="mr-1 inline" /> Administrator
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
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            variant="gradient"
            icon={<Users className="h-4 w-4" />}
            title="Total Users"
            value={`${totalCount} Accounts`}
            description="Directory of provisioned identities"
          />
          <StatCard
            variant="default"
            icon={<GraduationCap className="h-4 w-4 text-primary" />}
            title="Employees"
            value={`${employeeCount} Users`}
            description="Assigned personalized pathways"
          />
          <StatCard
            variant="default"
            icon={<Users className="h-4 w-4 text-warning" />}
            title="Line Managers"
            value={`${lineManagerCount} Leads`}
            description="Supervising team competency goals"
          />
          <StatCard
            variant="default"
            icon={<ShieldCheck className="h-4 w-4 text-secondary-foreground" />}
            title="L&D & Administrators"
            value={`${ldAndAdminCount} Accounts`}
            description="Governing taxonomy & analytics"
          />
        </div>

        {/* Filter and Action Toolbar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-card border border-border p-3.5 rounded-xl shadow-2xs">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name, email, ID, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9 bg-background"
            />
          </div>

          {/* Filters Group */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'All' | SystemRole)}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="All">All Roles</option>
              <option value="Employee">Employees</option>
              <option value="Line Manager">Line Managers</option>
              <option value="L&D Manager">L&D Managers</option>
              <option value="Admin">Administrators</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'All' | UserStatus)}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="All">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* Department Filter */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 max-w-[170px] truncate"
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Add User Button */}
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus size={14} />}
              onClick={openCreateModal}
              className="font-semibold shadow-2xs whitespace-nowrap"
            >
              Add User
            </Button>
          </div>
        </div>

        {/* User Directory Table */}
        <Card className="border border-border bg-card shadow-xs overflow-hidden">
          <CardHeader className="py-3.5 px-5 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-foreground">
              Organization User Directory ({filteredUsers.length} records)
            </CardTitle>
            <span className="text-xs text-muted-foreground font-mono">
              Identity Management & RBAC
            </span>
          </CardHeader>

          <CardContent className="p-0">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-[30%]">User Identity</th>
                  <th className="py-3 px-4 w-[20%]">Role &amp; Status</th>
                  <th className="py-3 px-4 w-[25%]">Department &amp; Supervision</th>
                  <th className="py-3 px-4 w-[12%]">Last Active</th>
                  <th className="py-3 px-4 w-[13%] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-muted-foreground text-xs">
                      No user accounts found matching your query.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/20 transition-colors group">
                      {/* 1. User Identity */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                            {user.avatar}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-foreground flex items-center gap-1.5 truncate">
                              <span>{user.name}</span>
                              <span className="text-[10px] font-mono text-muted-foreground font-normal">
                                ({user.id})
                              </span>
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono truncate">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Role & Status */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {getRoleBadge(user.role)}
                          {getStatusBadge(user.status)}
                        </div>
                      </td>

                      {/* 3. Department & Supervision */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5 min-w-0">
                          <div className="text-foreground font-medium truncate" title={user.department}>
                            {user.department}
                          </div>
                          {user.role === 'Employee' && (
                            <div className="text-[10px] text-muted-foreground truncate">
                              <span>Mgr: <strong className="text-foreground/80">{user.lineManager || 'None'}</strong></span>
                              {user.targetRole && (
                                <>
                                  <span className="mx-1">&bull;</span>
                                  <span>Target: <strong className="text-foreground/80">{user.targetRole}</strong></span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 4. Last Active */}
                      <td className="py-3.5 px-4 font-mono text-muted-foreground text-[11px]">
                        {user.lastActive}
                      </td>

                      {/* 5. Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2.5 font-semibold hover:border-primary/40"
                            leftIcon={<Edit2 size={12} />}
                            onClick={() => openEditModal(user)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setSelectedUser(user)
                              setIsDeleteModalOpen(true)
                            }}
                            title="Deactivate / Delete User"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
                  <DialogTitle>{isEditing ? 'Edit User Account' : 'Create New User'}</DialogTitle>
                  <DialogDescription>
                    {isEditing
                      ? `Update account details, system actor role, and permissions for ${selectedUser?.name}.`
                      : 'Provision a new identity with appropriate access permissions across the platform.'}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleSaveUser} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="user-full-name" className="font-bold text-foreground block mb-1">Full Name *</label>
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
                  <label htmlFor="user-enterprise-email" className="font-bold text-foreground block mb-1">Enterprise Email *</label>
                  <Input
                    id="user-enterprise-email"
                    type="email"
                    required
                    placeholder="e.g. jordan.parker@adaptlearn.internal"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="user-system-actor-role" className="font-bold text-foreground block mb-1">System Actor Role *</label>
                  <select
                    id="user-system-actor-role"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as SystemRole)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="Employee">Employee (Learner)</option>
                    <option value="Line Manager">Line Manager (Team Lead)</option>
                    <option value="L&D Manager">L&D Manager (Enterprise)</option>
                    <option value="Admin">Administrator (Governance)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="user-account-status" className="font-bold text-foreground block mb-1">Account Status</label>
                  <select
                    id="user-account-status"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as UserStatus)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending Onboarding</option>
                    <option value="inactive">Inactive / Suspended</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="user-department-unit" className="font-bold text-foreground block mb-1">Department / Organizational Unit</label>
                <select
                  id="user-department-unit"
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

              {formRole === 'Employee' && (
                <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Employee Supervision & Learning Target
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="user-assigned-line-manager" className="font-semibold text-foreground block mb-1">Assigned Line Manager</label>
                      <Input
                        id="user-assigned-line-manager"
                        type="text"
                        placeholder="e.g. David Miller"
                        value={formLineManager}
                        onChange={(e) => setFormLineManager(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label htmlFor="user-initial-target-role" className="font-semibold text-foreground block mb-1">Initial Target Role</label>
                      <Input
                        id="user-initial-target-role"
                        type="text"
                        placeholder="e.g. AI Knowledge Architect"
                        value={formTargetRole}
                        onChange={(e) => setFormTargetRole(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
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
                  {isEditing ? 'Save Changes' : 'Create User Account'}
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
                <DialogTitle>Deactivate User Account</DialogTitle>
              </div>
              <DialogDescription>
                Are you sure you want to deactivate and remove{' '}
                <strong className="text-foreground">{selectedUser?.name}</strong> ({selectedUser?.email})?
                Their access across all platforms will be immediately revoked.
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
                onClick={handleDeleteUser}
              >
                Yes, Deactivate Account
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      </div>
    </WorkspaceLayout>
  )
}
