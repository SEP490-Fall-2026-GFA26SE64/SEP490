import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Building,
  CheckCircle2,
  Edit2,
  ExternalLink,
  PauseCircle,
  PlayCircle,
  Plus,
  Save,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { Badge } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { Card, CardContent, CardHeader } from '../../shared/components/ui/Card'
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../shared/components/ui/Dialog'
import { Input } from '../../shared/components/ui/Input'
import { PageHeader } from '../../shared/components/ui/PageHeader'
import { Pagination } from '../../shared/components/ui/Pagination'
import { StatCard } from '../../shared/components/ui/StatCard'
import { useToast } from '../../shared/hooks/useToast'
import { WorkspaceLayout } from '../../shared/layouts/WorkspaceLayout'
import {
  loadCompanies,
  setActiveCompanyId,
  type CompanyRecord,
} from '../../shared/stores/companyStore'
import {
  setWorkspaceSuspension,
  updateOrganizationDetails,
} from './platformAdminStore'

export function PlatformOrganizationsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [companies, setCompanies] = React.useState<CompanyRecord[]>(loadCompanies)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL')
  const [currentPage, setCurrentPage] = React.useState(1)
  const pageSize = 8

  // Suspend modal state
  const [selectedCompForSuspend, setSelectedCompForSuspend] = React.useState<CompanyRecord | null>(null)
  const [suspendReason, setSuspendReason] = React.useState('Subscription payment review / Administrative hold')
  const [isSuspendModalOpen, setIsSuspendModalOpen] = React.useState(false)

  // Edit details modal state
  const [selectedCompForEdit, setSelectedCompForEdit] = React.useState<CompanyRecord | null>(null)
  const [editName, setEditName] = React.useState('')
  const [editOwnerEmail, setEditOwnerEmail] = React.useState('')
  const [editMaxUsers, setEditMaxUsers] = React.useState<number>(50)
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false)

  const reloadData = React.useCallback(() => {
    setCompanies(loadCompanies())
  }, [])

  React.useEffect(() => {
    window.addEventListener('companies_updated', reloadData)
    return () => window.removeEventListener('companies_updated', reloadData)
  }, [reloadData])

  // Filter logic
  const filtered = companies.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase())

    if (!matchesSearch) return false

    if (statusFilter === 'ACTIVE') return !c.isSuspended
    if (statusFilter === 'SUSPENDED') return !!c.isSuspended
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // KPIs
  const totalOrgs = companies.length
  const activeOrgs = companies.filter((c) => !c.isSuspended).length
  const suspendedOrgs = companies.filter((c) => c.isSuspended).length
  const totalAllocatedSeats = companies.reduce((sum, c) => sum + (c.maxUsers || 20), 0)

  const handleOpenSuspend = (comp: CompanyRecord) => {
    setSelectedCompForSuspend(comp)
    setSuspendReason('Administrative audit / Pending subscription verification')
    setIsSuspendModalOpen(true)
  }

  const handleConfirmSuspend = () => {
    if (!selectedCompForSuspend) return
    const willSuspend = !selectedCompForSuspend.isSuspended
    setWorkspaceSuspension(selectedCompForSuspend.id, willSuspend, suspendReason)
    setIsSuspendModalOpen(false)
    reloadData()
    toast({
      title: willSuspend ? 'Workspace Suspended' : 'Workspace Reactivated',
      description: `${selectedCompForSuspend.name} workspace status has been updated.`,
      variant: willSuspend ? 'warning' : 'success',
    })
  }

  const handleOpenEdit = (comp: CompanyRecord) => {
    setSelectedCompForEdit(comp)
    setEditName(comp.name)
    setEditOwnerEmail(comp.ownerEmail)
    setEditMaxUsers(comp.maxUsers || 20)
    setIsEditModalOpen(true)
  }

  const handleConfirmEdit = () => {
    if (!selectedCompForEdit) return
    updateOrganizationDetails(selectedCompForEdit.id, {
      name: editName.trim(),
      ownerEmail: editOwnerEmail.trim(),
      maxUsers: Number(editMaxUsers),
    })
    setIsEditModalOpen(false)
    reloadData()
    toast({
      title: 'Organization Updated',
      description: 'Workspace configuration updated successfully.',
      variant: 'success',
    })
  }

  const handleInspectWorkspace = (comp: CompanyRecord) => {
    setActiveCompanyId(comp.id)
    localStorage.setItem('active_actor', 'admin')
    toast({
      title: `Switched to ${comp.name}`,
      description: 'Navigating to workspace system administration console.',
      variant: 'info',
    })
    navigate('/admin/dashboard')
  }

  return (
    <WorkspaceLayout>
      <div className="space-y-6 pb-16">
        <PageHeader
          title="Platform Organizations Management"
          description="Global administrative oversight across all multi-tenant organization workspaces, subscription allocations, and operational lifecycles."
          actions={
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/guest/register')}
              className="flex items-center gap-1.5"
            >
              <Plus size={15} />
              <span>Register New Organization</span>
            </Button>
          }
        />

        {/* Global KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Registered Organizations"
            value={totalOrgs}
            icon={<Building size={18} className="text-primary" />}
            description="Tenant databases provisioned"
          />
          <StatCard
            title="Active Workspaces"
            value={activeOrgs}
            icon={<ShieldCheck size={18} className="text-success" />}
            description="Operational & accessible"
          />
          <StatCard
            title="Suspended Workspaces"
            value={suspendedOrgs}
            icon={<ShieldAlert size={18} className="text-destructive" />}
            description="Administrative / payment hold"
          />
          <StatCard
            title="Total Subscribed Seats"
            value={totalAllocatedSeats}
            icon={<Users size={18} className="text-primary" />}
            description="Employee seats across platform"
          />
        </div>

        {/* Filters & Search Bar */}
        <Card className="shadow-xs border-border bg-card">
          <CardHeader className="pb-3 border-b border-border/70">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search size={15} className="absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  className="pl-9 text-xs h-9"
                  placeholder="Search organizations, admins, domains..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                />
              </div>

              {/* Status Tabs */}
              <div className="inline-flex items-center rounded-lg border border-border bg-muted/60 p-1 text-xs w-full sm:w-auto">
                {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setStatusFilter(s)
                      setCurrentPage(1)
                    }}
                    className={`flex-1 sm:flex-none px-3 py-1 rounded-md font-bold transition-all ${
                      statusFilter === s
                        ? 'bg-card text-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {s === 'ALL' ? 'All Organizations' : s === 'ACTIVE' ? 'Active' : 'Suspended'}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {paginated.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Building size={32} className="mx-auto text-muted-foreground/50" />
                <h4 className="text-sm font-bold text-foreground">No organizations found</h4>
                <p className="text-xs text-muted-foreground">Try adjusting your search criteria or status filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground border-b border-border font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Organization & Tenant ID</th>
                      <th className="py-3 px-4">Subscription Plan</th>
                      <th className="py-3 px-4">Seats Allocated</th>
                      <th className="py-3 px-4">Designated Admin</th>
                      <th className="py-3 px-4">Workspace Status</th>
                      <th className="py-3 px-4">Created Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginated.map((comp) => {
                      const userCount = comp.users?.length || 1
                      const maxSeats = comp.maxUsers || 20
                      const isSuspended = !!comp.isSuspended

                      return (
                        <tr key={comp.id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-foreground flex items-center gap-2">
                              <span>{comp.name}</span>
                              <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                {comp.id}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-muted-foreground">
                              {comp.id.replace('comp-', '')}.adaptlearn.io
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                comp.packageTier === 'Enterprise'
                                  ? 'warning'
                                  : comp.packageTier === 'Growth'
                                  ? 'primary'
                                  : 'secondary'
                              }
                              className="text-[11px] font-bold"
                            >
                              {comp.packageTier || 'Starter'}
                            </Badge>
                          </td>

                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 font-medium text-foreground">
                                <span>{userCount}</span>
                                <span className="text-muted-foreground">/ {maxSeats} seats</span>
                              </div>
                              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${
                                    userCount / maxSeats > 0.85 ? 'bg-warning' : 'bg-primary'
                                  }`}
                                  style={{ width: `${Math.min(100, (userCount / maxSeats) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <p className="font-medium text-foreground">{comp.users?.[0]?.name || 'Admin'}</p>
                            <p className="text-[11px] font-mono text-muted-foreground">{comp.ownerEmail}</p>
                          </td>

                          <td className="py-3 px-4">
                            {isSuspended ? (
                              <Badge variant="destructive" className="text-[10px] py-0.5">
                                <AlertTriangle size={11} className="mr-1" /> Suspended
                              </Badge>
                            ) : (
                              <Badge variant="success" className="text-[10px] py-0.5">
                                <CheckCircle2 size={11} className="mr-1" /> Active
                              </Badge>
                            )}
                          </td>

                          <td className="py-3 px-4 font-mono text-muted-foreground text-[11px]">
                            {comp.createdAt || '2026-01-15'}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleInspectWorkspace(comp)}
                                title="Inspect Workspace"
                                className="h-7 px-2 text-xs"
                              >
                                <ExternalLink size={13} className="text-primary mr-1" />
                                <span>Inspect</span>
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEdit(comp)}
                                title="Edit Organization"
                                className="h-7 w-7 p-0"
                              >
                                <Edit2 size={13} />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenSuspend(comp)}
                                title={isSuspended ? 'Reactivate Workspace' : 'Suspend Workspace'}
                                className={`h-7 w-7 p-0 ${
                                  isSuspended ? 'text-success hover:bg-success/10' : 'text-destructive hover:bg-destructive/10'
                                }`}
                              >
                                {isSuspended ? <PlayCircle size={14} /> : <PauseCircle size={14} />}
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

          {totalPages > 1 && (
            <div className="p-3 border-t border-border flex justify-end">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </Card>

        {/* Suspend / Reactivate Confirmation Dialog */}
        <Dialog open={isSuspendModalOpen} onOpenChange={setIsSuspendModalOpen} className="max-w-lg">
          <DialogHeader>
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                {selectedCompForSuspend?.isSuspended ? (
                  <PlayCircle className="h-5 w-5 text-success shrink-0" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                )}
                <span>
                  {selectedCompForSuspend?.isSuspended
                    ? `Reactivate Workspace: ${selectedCompForSuspend?.name}`
                    : `Suspend Workspace: ${selectedCompForSuspend?.name}`}
                </span>
              </DialogTitle>
              <Badge
                variant={selectedCompForSuspend?.isSuspended ? 'success' : 'destructive'}
                className="text-[10px] font-bold uppercase"
              >
                {selectedCompForSuspend?.isSuspended ? 'REACTIVATION' : 'SUSPENSION'}
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              {selectedCompForSuspend?.isSuspended
                ? 'Reactivating will restore tenant access for all registered employees and managers immediately.'
                : 'Suspending will restrict all workspace logins and API queries for employees until reactivated.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Top metadata panel */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border">
              <div>
                <span className="text-muted-foreground block text-[11px] font-medium">Tenant ID</span>
                <strong className="font-mono text-foreground font-bold text-xs truncate block">
                  {selectedCompForSuspend?.id}
                </strong>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px] font-medium">Domain / Slug</span>
                <strong className="font-mono text-primary font-bold text-xs truncate block">
                  {selectedCompForSuspend?.id?.toLowerCase() || 'workspace'}.adaptlearn.io
                </strong>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px] font-medium">Current Status</span>
                <Badge
                  variant={selectedCompForSuspend?.isSuspended ? 'destructive' : 'success'}
                  className="text-[10px] mt-0.5"
                >
                  {selectedCompForSuspend?.isSuspended ? 'SUSPENDED' : 'ACTIVE'}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px] font-medium">Allocated Seats</span>
                <span className="text-foreground font-semibold text-xs">
                  {selectedCompForSuspend?.users?.length || 12} / {selectedCompForSuspend?.maxUsers || 50} Members
                </span>
              </div>
            </div>

            {!selectedCompForSuspend?.isSuspended && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Suspension Reason / Audit Note <span className="text-destructive">*</span>
                </label>
                <Input
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="e.g., Subscription payment past due or policy violation"
                  className="text-xs"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border mt-4 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setIsSuspendModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={selectedCompForSuspend?.isSuspended ? 'primary' : 'destructive'}
              size="sm"
              onClick={handleConfirmSuspend}
            >
              {selectedCompForSuspend?.isSuspended ? (
                <>
                  <PlayCircle size={13} className="mr-1.5" />
                  Confirm Reactivation
                </>
              ) : (
                <>
                  <PauseCircle size={13} className="mr-1.5" />
                  Confirm Suspension
                </>
              )}
            </Button>
          </div>
        </Dialog>

        {/* Edit Details Dialog */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen} className="max-w-lg">
          <DialogHeader>
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <Building className="h-5 w-5 text-primary shrink-0" />
                <span>Edit Organization: {editName || 'Details'}</span>
              </DialogTitle>
              <Badge variant="outline" className="text-[10px] font-bold">
                TENANT CONFIG
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Update organization legal name, designated contact, or seat entitlements.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Top metadata panel */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border">
              <div>
                <span className="text-muted-foreground block text-[11px] font-medium">Tenant ID</span>
                <strong className="font-mono text-foreground font-bold text-xs truncate block">
                  {selectedCompForEdit?.id}
                </strong>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px] font-medium">Tenant Domain</span>
                <strong className="font-mono text-primary font-bold text-xs truncate block">
                  {selectedCompForEdit?.id?.toLowerCase() || 'workspace'}.adaptlearn.io
                </strong>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground block text-[11px] font-medium">Created On</span>
                <span className="text-foreground font-semibold text-xs font-mono">
                  {selectedCompForEdit?.createdAt || '2026-01-15'}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground block">Organization Legal Name</label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground block">Designated Owner / Admin Email</label>
                <Input value={editOwnerEmail} onChange={(e) => setEditOwnerEmail(e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground block">Employee Seat Entitlement Limit</label>
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  value={editMaxUsers}
                  onChange={(e) => setEditMaxUsers(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border mt-4 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleConfirmEdit}>
              <Save size={13} className="mr-1.5" />
              Save Changes
            </Button>
          </div>
        </Dialog>
      </div>
    </WorkspaceLayout>
  )
}
