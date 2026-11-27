import { useResettableState } from '../../../shared/hooks/useResettableState'
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query'
import { Briefcase,Building2,Eye,FileSpreadsheet,Mail,Pencil,Plus,Search,ShieldCheck,Target,Trash2,User,UserCheck,Users,UserX } from 'lucide-react'
import { useEffect,useMemo,useState } from 'react'
import { fetchDepartments,type DepartmentDto } from '../../../shared/api/departmentApi'
import { fetchJobPositions,type JobPositionDto } from '../../../shared/api/jobPositionApi'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import { Card,CardContent,CardDescription,CardHeader,CardTitle } from '../../../shared/components/ui/Card'
import { Combobox,type ComboboxOption } from '../../../shared/components/ui/Combobox'
import { Dialog,DialogDescription,DialogFooter,DialogHeader,DialogTitle } from '../../../shared/components/ui/Dialog'
import { Input } from '../../../shared/components/ui/Input'
import { Pagination } from '../../../shared/components/ui/Pagination'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { useTranslation } from "../../../shared/i18n/LanguageContext"
import { getActiveCompany,resolveWorkspaceOrgId } from '../../../shared/stores/companyStore'
import { loadDepartments,type DepartmentRecord } from '../../../shared/stores/departmentStore'
import {
getAvailableJobPositions,
type JobPosition,
type TargetRoleModel,
} from '../../manager/data/ldManagerMockData'
import {
encodeJobPositionWithTargetRole,getIdentity,getMembers,getPendingActivations,getReferences,getSummary,request,updateMemberProfile,
type Identity,type Member,type PendingActivation,type Reference
} from '../../subscription/subscriptionApi'
import { Failure,Loading } from "../../subscription/SubscriptionFeedback"
import { useCopy } from "../../subscription/SubscriptionFeedback.helpers"
import { AdminPageLayout } from '../AdminPageLayout'
import { UserImportDialog } from './import/UserImportDialog'
import {
buildOrganizationTargetRoles,
fetchOrganizationTargetRoles,
jobPositionsForDepartment,
readTargetRoleMeta,
resolveDepartment,
resolveJobPosition,
targetRolesForEmployee,
toDeterministicUuid,
type DepartmentItem,
} from './userAssignmentOptions'
import { resolveEmployeeTargetRoleAssignment } from './UserManagementPage.helpers'

const ROLES = ['EMPLOYEE', 'DOMAIN_EXPERT', 'LD_MANAGER', 'ORGANIZATION_ADMINISTRATOR'] as const
type Copy = ReturnType<typeof useCopy>

function roleName(role: string, c: Copy) {
  const labels: Record<string, [string, string]> = {
    EMPLOYEE: ['Employee', 'Nhân viên'], DOMAIN_EXPERT: ['Expert', 'Chuyên gia'],
    LD_MANAGER: ['L&D Manager', 'Quản lý L&D'], ORGANIZATION_ADMINISTRATOR: ['Administrator', 'Quản trị viên'],
  }
  return labels[role] ? c(...labels[role]) : role
}

function statusName(status: string, c: Copy) {
  const labels: Record<string, [string, string]> = {
    ACTIVE: ['Active', 'Đang hoạt động'], INACTIVE: ['Inactive', 'Đã vô hiệu hóa'], ACCOUNT_DISABLED: ['Account disabled', 'Tài khoản bị khóa'],
    PENDING: ['Awaiting activation', 'Chờ kích hoạt'], EXPIRED: ['Activation expired', 'Kích hoạt hết hạn'],
  }
  return labels[status] ? c(...labels[status]) : status
}

interface DirectoryRow {
  id: string
  fullName: string | null
  email: string
  roles: string[]
  status: string
  departmentName: string | null
  departmentCode: string | null
  departmentLeadership?: string | null
  jobPositionName: string | null
  jobPositionCode: string | null
  targetRoleId: string | null
  targetRoleCode: string | null
  targetRoleName: string | null
  targetRoleLevel: string | null
  member: Member | null
  invitation: PendingActivation | null
}

export function UserManagementPage() {
  const c = useCopy()
  const identity = useQuery({ queryKey: ['workspace-identity'], queryFn: getIdentity, staleTime: 0 })
  if (identity.isPending) return <Loading fullscreen />
  if (identity.isError) return <Failure error={identity.error} />
  if (!identity.data?.accountId || !identity.data.organizationId || identity.data.stage !== 'COMPLETE' ||
    !identity.data.roles.includes('ORGANIZATION_ADMINISTRATOR')) {
    return <Failure error={new Error(c('System Administrator authentication is required.', 'Cần xác thực Quản trị hệ thống.'))} />
  }
  return <UserDirectory identity={identity.data} organization={identity.data.organizationId} principal={identity.data.accountId} />
}

function UserDirectory({ identity, organization, principal }: { identity: Identity; organization: string; principal: string }) {
  const c = useCopy()
  const { language } = useTranslation()
  const cache = useQueryClient()
  const base = `/api/v1/organizations/${organization}/subscription`
  const summary = useQuery({ queryKey: ['subscription-summary', principal, organization], queryFn: () => getSummary(organization), refetchInterval: 5000 })
  const members = useQuery({ queryKey: ['subscription-members', principal, organization], queryFn: () => getMembers(organization) })
  const invitations = useQuery({ queryKey: ['member-activations', principal, organization], queryFn: () => getPendingActivations(organization), refetchInterval: 10000 })
  const references = useQuery({ queryKey: ['member-references', principal, organization], queryFn: () => getReferences(organization) })
  const liveDeptsQuery = useQuery({
    queryKey: ['live-departments', organization],
    queryFn: () => fetchDepartments(organization).catch(() => []),
  })
  const liveJobPositionsQuery = useQuery({
    queryKey: ['live-job-positions', organization],
    queryFn: () => fetchJobPositions(organization).catch(() => []),
  })

  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [form, setForm] = useState<{ member: Member | null } | null>(null)
  const [detail, setDetail] = useState<DirectoryRow | null>(null)
  const [confirm, setConfirm] = useState<Member | null>(null)
  const [notice, setNotice] = useState<'membership' | 'invited' | 'saved' | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const suspended = summary.data?.workspaceStatus === 'SUSPENDED'
  const editable = summary.isSuccess && !suspended && summary.data.subscriptionStatus === 'ACTIVE'
  const canReduce = summary.isSuccess && !suspended

  const refresh = async () => {
    await Promise.all([
      cache.invalidateQueries({ queryKey: ['subscription-members', principal, organization] }),
      cache.invalidateQueries({ queryKey: ['member-activations', principal, organization] }),
      cache.invalidateQueries({ queryKey: ['subscription-summary', principal, organization] }),
      cache.invalidateQueries({ queryKey: ['workspace-identity'] }),
      cache.invalidateQueries({ queryKey: ['live-departments', organization] }),
      cache.invalidateQueries({ queryKey: ['live-job-positions', organization] }),
    ])
  }

  const toggle = useMutation({
    mutationFn: (member: Member) => request(`${base}/members/${member.membershipId}`, 'PUT', {
      active: !member.active,
      roles: member.roles,
      revision: member.revision,
    }),
    onSuccess: async () => { await refresh(); setConfirm(null); setNotice('membership') },
  })

  const resend = useMutation({
    mutationFn: (invitation: PendingActivation) => request(`${base}/activations`, 'POST', {
      fullName: invitation.fullName,
      email: invitation.email,
      roles: invitation.roles,
      departmentId: invitation.departmentId,
      jobPositionReferenceId: invitation.jobPositionReferenceId,
    }),
    onSuccess: async () => { await refresh(); setNotice('invited') },
  })

  const storedDepartments = useMemo(() => loadDepartments(organization), [organization])
  const [localDepts, setLocalDepts] = useResettableState<DepartmentRecord[]>(storedDepartments, [organization])

  const refetchLiveDepts = liveDeptsQuery.refetch

  useEffect(() => {
    const handleUpdated = () => {
      setLocalDepts(loadDepartments(organization))
      refetchLiveDepts()
    }
    window.addEventListener('departments_updated', handleUpdated)
    return () => window.removeEventListener('departments_updated', handleUpdated)
  }, [organization, refetchLiveDepts, setLocalDepts])
  const localAllJobPositions = getAvailableJobPositions(organization, true)

  const allJobPositions = useMemo(() => {
    const localByCode = new Map(localAllJobPositions.map((jp) => [jp.code, jp]))
    const map = new Map<string, JobPosition>()
    for (const jp of localAllJobPositions) {
      if (jp.status !== 'inactive') {
        map.set(jp.code, jp)
      }
    }
    const live = (liveJobPositionsQuery.data || []) as JobPositionDto[]
    for (const jp of live) {
      const code = jp.code || jp.id || ''
      if (code) {
        const localMatch = localByCode.get(code)
        const existing = map.get(code)
        const liveStatus = String((jp as any).status || '').toLowerCase()
        const localStatus = String(localMatch?.status || existing?.status || '').toLowerCase()
        const statusStr =
          liveStatus === 'inactive' || localStatus === 'inactive'
            ? 'inactive'
            : liveStatus || localStatus || 'active'
        if (statusStr === 'inactive') {
          map.delete(code)
          continue
        }
        map.set(code, {
          code,
          name: jp.name || localMatch?.name || existing?.name || code,
          description: (jp as any).description || localMatch?.description || existing?.description || 'Industry job position competency domain',
          profiles: localMatch?.profiles || existing?.profiles || ['DEV'],
          assignedExpertIds: localMatch?.assignedExpertIds || existing?.assignedExpertIds || [],
          status: 'active',
        })
      }
    }
    return Array.from(map.values()).filter((jp) => jp.status !== 'inactive')
  }, [localAllJobPositions, liveJobPositionsQuery.data])

  const allDepartments: DepartmentItem[] = useMemo(() => {
    const list: DepartmentItem[] = []
    const seen = new Set<string>()

    const liveDepts = (liveDeptsQuery.data || []) as DepartmentDto[]
    for (const ld of liveDepts) {
      if (!seen.has(ld.id) && !seen.has(ld.code)) {
        seen.add(ld.id)
        seen.add(ld.code)
        const localMatch = localDepts.find((d) => d.id === ld.id || d.code === ld.code)
        const mergedLinked = Array.from(new Set([...(ld.jobPositionCodes || []), ...(localMatch?.linkedJobPositions || [])]))
        list.push({
          id: ld.id,
          code: ld.code,
          name: ld.name,
          description: ld.description || 'Enterprise organizational business unit',
          linkedJobPositions: mergedLinked,
          uuid: toDeterministicUuid(ld.id),
          uuidCode: toDeterministicUuid(ld.code),
        })
      }
    }

    const resolvedOrgId = resolveWorkspaceOrgId(organization)
    for (const ld of localDepts) {
      if (
        ld.organizationId &&
        resolveWorkspaceOrgId(ld.organizationId) !== resolvedOrgId &&
        ld.organizationId !== organization
      ) {
        continue
      }
      if (!seen.has(ld.id) && !seen.has(ld.code)) {
        seen.add(ld.id)
        seen.add(ld.code)
        list.push({
          id: ld.id,
          code: ld.code,
          name: ld.name,
          description: ld.description || 'Enterprise organizational business unit',
          linkedJobPositions: ld.linkedJobPositions || [],
          uuid: toDeterministicUuid(ld.id),
          uuidCode: toDeterministicUuid(ld.code),
        })
      }
    }

    for (const ref of (references.data || [])) {
      if (ref.departmentId && !seen.has(ref.departmentId)) {
        const match = list.find(d =>
          d.uuid === ref.departmentId ||
          d.uuidCode === ref.departmentId ||
          d.id === ref.departmentId ||
          d.code === ref.departmentId ||
          d.name.toLowerCase() === (ref.departmentName || '').toLowerCase()
        )
        if (match) {
          seen.add(ref.departmentId)
          continue
        }
        seen.add(ref.departmentId)
        const cleanName = ref.departmentName?.startsWith('Department ')
          ? (list[0]?.name || 'Engineering')
          : (ref.departmentName || 'Business Unit')
        const cleanCode = cleanName.includes('Security') ? 'ENG-SEC'
          : cleanName.includes('Software') ? 'ENG-SWE'
          : cleanName.includes('Cognitive') ? 'ENG-DATA'
          : (ref.departmentId.startsWith('dept-') ? ref.departmentId.replace('dept-', '').toUpperCase() : 'DPT-' + ref.departmentId.slice(0, 4).toUpperCase())
        list.push({
          id: ref.departmentId,
          code: cleanCode,
          name: cleanName,
          description: 'Enterprise organizational business unit',
          linkedJobPositions: [],
          uuid: toDeterministicUuid(ref.departmentId),
          uuidCode: toDeterministicUuid(cleanCode),
        })
      }
    }
    return list
  }, [liveDeptsQuery.data, localDepts, references.data, organization])

  const rows: DirectoryRow[] = useMemo(() => {
    const list: DirectoryRow[] = []

    for (const member of (members.data ?? [])) {
      const resolvedDept = resolveDepartment(member.departmentId, member.departmentName, allDepartments)
      const resolvedJob = resolveJobPosition(member.jobPositionReferenceId, member.jobPositionName, allJobPositions)
      const resolvedAssignment = resolveEmployeeTargetRoleAssignment(member, member.email)
      list.push({
        id: member.membershipId,
        fullName: member.fullName,
        email: member.email,
        roles: member.roles,
        status: !member.accountActive ? 'ACCOUNT_DISABLED' : member.active ? 'ACTIVE' : 'INACTIVE',
        departmentName: resolvedDept?.name || (member.departmentName?.startsWith('Department ') ? (allDepartments[0]?.name || 'Engineering') : member.departmentName),
        departmentCode: resolvedDept?.code || null,
        jobPositionName: resolvedJob?.jobPositionName || (member.jobPositionName?.startsWith('Job Position ') ? '15-1252.00 - Software Developers' : member.jobPositionName),
        jobPositionCode: resolvedJob?.code || null,
        targetRoleId: resolvedAssignment?.roleId || null,
        targetRoleCode: resolvedAssignment?.roleCode || null,
        targetRoleName: resolvedAssignment?.roleTitle || null,
        targetRoleLevel: resolvedAssignment?.level || null,
        member,
        invitation: null,
      })
    }

    for (const invitation of (invitations.data ?? [])) {
      const resolvedDept = resolveDepartment(invitation.departmentId, invitation.departmentName, allDepartments)
      const resolvedJob = resolveJobPosition(invitation.jobPositionReferenceId, invitation.jobPositionName, allJobPositions)
      const resolvedAssignment = resolveEmployeeTargetRoleAssignment(
        {
          email: invitation.email,
          targetRoleId: invitation.targetRoleId,
          targetRoleCode: invitation.targetRoleCode,
          targetRoleName: invitation.targetRoleName,
          targetRoleLevel: invitation.targetRoleLevel,
          departmentId: invitation.departmentId,
          departmentName: invitation.departmentName,
          jobPositionName: invitation.jobPositionName,
        },
        invitation.email,
      )
      list.push({
        id: invitation.activationId,
        fullName: invitation.fullName,
        email: invitation.email,
        roles: invitation.roles,
        status: invitation.state,
        departmentName: resolvedDept?.name || invitation.departmentName,
        departmentCode: resolvedDept?.code || null,
        jobPositionName: resolvedJob?.jobPositionName || invitation.jobPositionName,
        jobPositionCode: resolvedJob?.code || null,
        targetRoleId: resolvedAssignment?.roleId || null,
        targetRoleCode: resolvedAssignment?.roleCode || null,
        targetRoleName: resolvedAssignment?.roleTitle || null,
        targetRoleLevel: resolvedAssignment?.level || null,
        member: null,
        invitation,
      })
    }

    return list
  }, [members.data, invitations.data, allDepartments, allJobPositions])

  const needle = search.trim().toLocaleLowerCase()
  const filtered = rows.filter(row => (!needle || `${row.fullName ?? ''} ${row.email}`.toLocaleLowerCase().includes(needle)) &&
    (!role || row.roles.includes(role)) && (!status || row.status === status))
  const totalPages = Math.max(1, Math.ceil(filtered.length / 10))
  const currentPage = Math.min(page, totalPages)
  const visible = filtered.slice((currentPage - 1) * 10, currentPage * 10)
  const adminCount = (members.data ?? []).filter(member => member.active && member.accountActive && member.roles.includes('ORGANIZATION_ADMINISTRATOR')).length
  const lastAdmin = (member: Member) => member.active && member.accountActive && member.roles.includes('ORGANIZATION_ADMINISTRATOR') && adminCount <= 1
  const incomplete = summary.isPending || members.isPending || invitations.isPending
  const failure = summary.error ?? members.error ?? invitations.error
  const isCapReached = Boolean(
    summary.isSuccess &&
    summary.data?.admissionLimit !== undefined &&
    summary.data.admissionLimit > 0 &&
    (summary.data?.usedSeats ?? 0) >= summary.data.admissionLimit
  )

  return (
    <AdminPageLayout
      identity={identity}
      organizationName={summary.data?.organizationName}
      title={c('User Accounts', 'Tài khoản người dùng')}
      description={c('Manage your organization members, assignments and account activation.', 'Quản lý thành viên tổ chức, phân công và kích hoạt tài khoản.')}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            disabled={!editable || isCapReached}
            leftIcon={<FileSpreadsheet size={16} aria-hidden="true" />}
            onClick={() => { setNotice(null); setImportOpen(true) }}
            title={isCapReached ? c('Seat limit reached. Upgrade subscription to add more users.', 'Đã đạt giới hạn ghế thành viên. Nâng cấp gói để thêm người dùng.') : undefined}
          >
            {c('Import Excel', 'Nhập Excel')}
          </Button>
          <Button
            disabled={!editable || isCapReached}
            leftIcon={<Plus size={16} aria-hidden="true" />}
            onClick={() => { setNotice(null); setForm({ member: null }) }}
            title={isCapReached ? c('Seat limit reached. Upgrade subscription to add more users.', 'Đã đạt giới hạn ghế thành viên. Nâng cấp gói để thêm người dùng.') : undefined}
          >
            {c('Create User', 'Tạo người dùng')}
          </Button>
        </div>
      }
    >
      {summary.isSuccess && !editable && (
        <div role="status" className="rounded-lg border border-warning/40 bg-card p-4">
          {suspended
            ? c('Workspace suspended. User changes are unavailable.', 'Không gian bị tạm ngưng. Không thể thay đổi người dùng.')
            : c('Subscription expired: view members or deactivate memberships to reduce seats. Renew before creating, editing or reactivating users.', 'Gói đã hết hạn: chỉ xem hoặc vô hiệu hóa membership để giảm ghế. Gia hạn trước khi tạo, sửa hoặc kích hoạt lại.')}
        </div>
      )}
      {summary.isSuccess && editable && isCapReached && (
        <div role="status" className="rounded-lg border border-warning/40 bg-card p-4 text-body-sm text-foreground">
          {c(
            `Seat limit reached (${summary.data?.usedSeats ?? 0}/${summary.data?.admissionLimit ?? 0}). Upgrade subscription before creating new users.`,
            `Đã đạt giới hạn ghế (${summary.data?.usedSeats ?? 0}/${summary.data?.admissionLimit ?? 0}). Vui lòng nâng cấp gói đăng ký trước khi tạo người dùng mới.`
          )}
        </div>
      )}
      {notice && (
        <p role="status" className="rounded-lg border border-success/30 bg-card p-3">
          {notice === 'membership' ? c('Membership updated.', 'Đã cập nhật vai trò thành viên.') :
            notice === 'saved' ? c('User details saved.', 'Đã lưu thông tin người dùng.') :
              c('Activation invitation dispatched. The user can activate their account using the link in their email.', 'Lời mời kích hoạt đã được gửi. Người dùng có thể kích hoạt tài khoản qua liên kết trong email.')}
        </p>
      )}
      {resend.isError && <Failure error={resend.error} />}
      {incomplete ? <Loading /> : failure ? <Failure error={failure} retry={() => void refresh()} /> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              variant="gradient"
              icon={<Users className="h-4 w-4 text-primary" />}
              title={c('Total Members', 'Tổng thành viên')}
              value={`${members.data?.length ?? 0} ${c('Members', 'Thành viên')}`}
              valueClassName="text-primary"
              description={c('Enrolled workspace users', 'Thành viên trong không gian')}
            />
            <StatCard
              variant="gradient"
              icon={<UserCheck className="h-4 w-4 text-success" />}
              title={c('Active Members', 'Thành viên hoạt động')}
              value={`${(members.data ?? []).filter(member => member.active && member.accountActive).length} ${c('Active', 'Hoạt động')}`}
              valueClassName="text-success"
              description={c('Verified active accounts', 'Tài khoản hoạt động chính thức')}
            />
            <StatCard
              variant="gradient"
              icon={<Mail className="h-4 w-4 text-warning" />}
              title={c('Awaiting Activation', 'Chờ kích hoạt')}
              value={`${invitations.data?.length ?? 0} ${c('Pending', 'Chờ duyệt')}`}
              valueClassName="text-warning"
              description={c('Pending email invitations', 'Lời mời đang chờ kích hoạt')}
            />
            <StatCard
              variant="gradient"
              icon={<ShieldCheck className="h-4 w-4 text-primary" />}
              title={c('Seat Usage', 'Sử dụng ghế')}
              value={`${summary.data?.usedSeats ?? 0} / ${summary.data?.admissionLimit ?? 0} ${c('Seats', 'Ghế')}`}
              valueClassName="text-primary"
              description={c('Allocated subscription capacity', 'Dung lượng gói thành viên')}
            />
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="flex items-center gap-2">
                      <Users size={18} className="text-primary" aria-hidden="true" />
                      {c('User directory', 'Danh sách người dùng')}
                    </CardTitle>
                    <Badge variant="outline">{filtered.length} {c('users', 'người dùng')}</Badge>
                  </div>
                  <CardDescription>
                    {c('People, roles and workspace access in one place.', 'Quản lý thành viên, vai trò và quyền truy cập tập trung.')}
                  </CardDescription>
                </div>

                {/* Search & Filter Toolbar */}
                <div className="flex items-center gap-2.5 flex-wrap py-0.5">
                  <div className="relative w-56">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      aria-label={c('Search users', 'Tìm người dùng')}
                      placeholder={c('Search name or email…', 'Tìm tên hoặc email…')}
                      value={search}
                      onChange={event => { setSearch(event.target.value); setPage(1) }}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-background border border-border text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs transition-colors"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1.5 shadow-2xs">
                    <span className="text-[11px] text-muted-foreground font-medium">{c('Role:', 'Vai trò:')}</span>
                    <select
                      aria-label={c('Filter by role', 'Lọc theo vai trò')}
                      className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer font-medium"
                      value={role}
                      onChange={event => { setRole(event.target.value); setPage(1) }}
                    >
                      <option value="">{c('All roles', 'Tất cả vai trò')}</option>
                      {ROLES.map(value => <option key={value} value={value}>{roleName(value, c)}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1.5 shadow-2xs">
                    <span className="text-[11px] text-muted-foreground font-medium">{c('Status:', 'Trạng thái:')}</span>
                    <select
                      aria-label={c('Filter by status', 'Lọc theo trạng thái')}
                      className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer font-medium"
                      value={status}
                      onChange={event => { setStatus(event.target.value); setPage(1) }}
                    >
                      <option value="">{c('All statuses', 'Tất cả trạng thái')}</option>
                      {['ACTIVE', 'INACTIVE', 'PENDING', 'EXPIRED', 'ACCOUNT_DISABLED'].map(value => (
                        <option key={value} value={value}>{statusName(value, c)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto" role="region" aria-label={c('User directory table', 'Bảng danh sách người dùng')} tabIndex={0}>
                <table className="w-full min-w-[720px] text-left text-body-sm">
                  <thead className="border-y border-border bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="p-4">{c('User', 'Người dùng')}</th>
                      <th className="p-4">{c('Roles', 'Vai trò')}</th>
                      <th className="p-4">{c('Department / job position', 'Phòng ban / vị trí công việc')}</th>
                      <th className="p-4">{c('Status', 'Trạng thái')}</th>
                      <th className="p-4 text-right">{c('Actions', 'Thao tác')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {visible.map(row => (
                      <tr key={row.id} className="hover:bg-muted/20">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary font-semibold text-primary" aria-hidden="true">
                              {(row.fullName || row.email).slice(0, 1).toUpperCase()}
                            </span>
                            <div>
                              <p className="font-semibold text-foreground">{row.fullName ?? c('Name not recorded', 'Chưa ghi nhận tên')}</p>
                              <p className="mt-0.5 text-caption text-muted-foreground">{row.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex max-w-48 flex-wrap gap-1">
                            {row.roles.map(value => <Badge key={value} variant="secondary">{roleName(value, c)}</Badge>)}
                          </div>
                        </td>
                        <td className="p-4">
                          {row.departmentName ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {row.departmentCode && (
                                  <Badge variant="secondary" className="font-mono text-[11px] px-1.5 py-0">
                                    {row.departmentCode}
                                  </Badge>
                                )}
                                <span className="font-medium text-foreground text-xs">
                                  {row.departmentName}
                                </span>
                              </div>
                              {row.jobPositionName && (
                                <p className="text-caption text-muted-foreground line-clamp-1">
                                  {row.jobPositionName}
                                </p>
                              )}
                              {row.roles.includes('EMPLOYEE') && row.targetRoleName && (
                                <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                                  <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary text-[11px] px-1.5 py-0 font-medium">
                                    {row.targetRoleName}{row.targetRoleLevel ? ` · ${row.targetRoleLevel}` : ''}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          ) : null}
                        </td>
                        <td className="p-4">
                          <Badge variant={row.status === 'ACTIVE' ? 'success' : row.status === 'PENDING' ? 'warning' : 'outline'}>
                            {statusName(row.status, c)}
                          </Badge>
                          {row.invitation && (
                            <p className="mt-2 text-caption text-muted-foreground">
                              {row.invitation.deliveryStatus === 'SENT' ? c('Invitation sent', 'Đã gửi lời mời') :
                                row.invitation.deliveryStatus === 'FAILED' ? c('Delivery failed', 'Gửi thư thất bại') :
                                  row.invitation.deliveryStatus === 'NOT_REQUESTED' ? c('Delivery pending', 'Chờ gửi thư') :
                                    c('Queued for delivery', 'Đang chờ gửi')}
                            </p>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={c('View', 'Xem')}
                              title={c('View user details', 'Xem chi tiết người dùng')}
                              onClick={() => setDetail(row)}
                            >
                              <Eye size={17} aria-hidden="true" />
                            </Button>
                            {row.member && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={c('Edit', 'Sửa')}
                                  title={c('Edit user', 'Sửa người dùng')}
                                  disabled={!editable}
                                  onClick={() => setForm({ member: row.member })}
                                >
                                  <Pencil size={17} aria-hidden="true" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={row.member.active ? c('Deactivate', 'Vô hiệu hóa') : c('Reactivate', 'Kích hoạt lại')}
                                  disabled={toggle.isPending || !canReduce || lastAdmin(row.member) ||
                                    (!row.member.active && (!editable || !row.member.accountActive))}
                                  title={lastAdmin(row.member) ? c('The last active Administrator must remain.', 'Phải giữ Quản trị viên hoạt động cuối cùng.') : undefined}
                                  onClick={() => { toggle.reset(); setConfirm(row.member) }}
                                >
                                  {row.member.active ? <UserX size={17} className="text-destructive" aria-hidden="true" /> : <UserCheck size={17} className="text-success" aria-hidden="true" />}
                                </Button>
                              </>
                            )}
                            {row.invitation && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={!editable || resend.isPending}
                                onClick={() => { if (row.invitation) resend.mutate(row.invitation) }}
                              >
                                {c('Resend', 'Gửi lại')}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {visible.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-10 text-center text-muted-foreground">
                          {c('No users match these filters.', 'Không có người dùng phù hợp với bộ lọc.')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filtered.length}
                pageSize={10}
                onPageChange={setPage}
                itemLabel={c('users', 'người dùng')}
                locale={language}
              />
            </CardContent>
          </Card>
        </>
      )}

      {importOpen && (
        <UserImportDialog
          open
          onClose={() => setImportOpen(false)}
          organization={organization}
          organizationName={summary.data?.organizationName}
          language={language === 'vi' ? 'vi' : 'en'}
          c={c}
          departments={allDepartments}
          jobPositions={allJobPositions}
          references={references.data ?? []}
          existingEmails={[...(members.data ?? []).map(m => m.email), ...(invitations.data ?? []).map(i => i.email)]}
          enabled={editable && !isCapReached}
          onImported={async (created) => {
            await refresh()
            if (created > 0) setNotice('invited')
          }}
        />
      )}

      {form && (
        <UserForm
          key={form.member?.membershipId ?? 'new'}
          member={form.member}
          allDepartments={allDepartments}
          jobPositions={allJobPositions}
          references={references.data ?? []}
          referenceError={references.error}
          referenceLoading={references.isPending}
          organization={organization}
          enabled={editable}
          isCapReached={isCapReached}
          close={() => setForm(null)}
          saved={async (invited) => {
            await refresh()
            setForm(null)
            setNotice(invited ? 'invited' : 'saved')
          }}
        />
      )}

      {/* Redesigned User Details Modal (UI-UX Pro Max Standard) */}
      <Dialog
        open={detail !== null}
        onOpenChange={open => { if (!open) setDetail(null) }}
        ariaLabel={c('User details', 'Chi tiết người dùng')}
        className="max-w-3xl w-full max-h-[90vh] p-8 overflow-hidden flex flex-col"
      >
        <DialogHeader className="shrink-0 mb-4 border-b border-border pb-4">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-secondary font-bold text-primary text-2xl border border-primary/20 shadow-xs" aria-hidden="true">
              {(detail?.fullName || detail?.email || 'U').slice(0, 1).toUpperCase()}
            </span>
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-section font-bold text-foreground">
                  {detail?.fullName ?? c('Name not recorded', 'Chưa ghi nhận tên')}
                </DialogTitle>
                {detail && (
                  <Badge variant={detail.status === 'ACTIVE' ? 'success' : detail.status === 'PENDING' ? 'warning' : 'outline'}>
                    {statusName(detail.status, c)}
                  </Badge>
                )}
              </div>
              <p className="text-body-sm text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground/80" />
                {detail?.email}
              </p>
            </div>
          </div>
          <DialogDescription className="sr-only">
            {c('Stored organization membership information.', 'Thông tin membership đã lưu.')}
          </DialogDescription>
        </DialogHeader>

        {detail && (
          <div className="space-y-4 overflow-y-auto px-1 flex-1 min-h-0 text-body-sm">
            {/* Card 1: Role & Identity */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
                <User className="h-4 w-4 text-primary" />
                {c('Role & Security Permissions', 'Vai trò & Quyền bảo mật')}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <span className="text-caption text-muted-foreground block">{c('Organization Role', 'Vai trò tổ chức')}</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {detail.roles.map(r => (
                      <Badge key={r} variant="primary" className="font-medium">
                        {roleName(r, c)}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-caption text-muted-foreground block">{c('Account Status', 'Trạng thái tài khoản')}</span>
                  <span className="mt-1 font-semibold text-foreground text-xs block">
                    {statusName(detail.status, c)}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Department Alignment */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
                  <Building2 className="h-4 w-4 text-primary" />
                  {c('Department & Organizational Unit', 'Phòng ban & Đơn vị kinh doanh')}
                </div>
                {detail.departmentCode && (
                  <Badge variant="secondary" className="font-mono text-xs">
                    {detail.departmentCode}
                  </Badge>
                )}
              </div>
              <div>
                <span className="text-caption text-muted-foreground block">{c('Department Name & Scope', 'Tên phòng ban & Phạm vi')}</span>
                <span className="mt-1 font-semibold text-foreground text-xs block">
                  {detail.departmentName ?? ''}
                </span>
              </div>
            </div>

            {/* Card 3: Job Position Alignment */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
                  <Briefcase className="h-4 w-4 text-primary" />
                  {c('Assigned Job Position', 'Vị trí công việc đã phân công')}
                </div>
                {detail.jobPositionCode && (
                  <Badge variant="secondary" className="font-mono text-xs">
                    {detail.jobPositionCode}
                  </Badge>
                )}
              </div>
              <div>
                <span className="text-caption text-muted-foreground block">{c('Job Position Title & Domain', 'Chức danh & Miền năng lực')}</span>
                <span className="mt-1 font-semibold text-foreground text-xs block">
                  {detail.jobPositionName ?? ''}
                </span>
              </div>
            </div>

            {/* Card 4: Assigned Current Role & Level (for Employees) */}
            {detail.roles.some(r => r.toUpperCase() === 'EMPLOYEE') && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
                    <Target className="h-4 w-4 text-primary" />
                    {c('Assigned Current Role & Level', 'Vai trò & Cấp độ hiện tại')}
                  </div>
                  {detail.targetRoleCode && (
                    <Badge variant="secondary" className="font-mono text-xs">
                      {detail.targetRoleCode}
                    </Badge>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <span className="text-caption text-muted-foreground block">{c('Current Role Title', 'Chức danh vai trò hiện tại')}</span>
                    <span className="mt-1 font-semibold text-foreground text-xs block">
                      {detail.targetRoleName || c('Not assigned yet', 'Chưa phân công')}
                    </span>
                  </div>
                  <div>
                    <span className="text-caption text-muted-foreground block">{c('Assigned Level', 'Cấp độ khởi điểm')}</span>
                    <div className="mt-1">
                      {detail.targetRoleLevel ? (
                        <Badge variant="outline" className="border-primary/40 text-primary font-semibold text-xs">
                          {detail.targetRoleLevel}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">{c('Not assigned', 'Chưa gán')}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Card 4: Invitation & Expiration Details (if applicable) */}
            {detail.invitation && (
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  {c('Activation Link Expiry', 'Thời hạn liên kết kích hoạt')}
                </div>
                <p className="text-caption text-muted-foreground">
                  {c('Activation expiry (Vietnam time):', 'Hạn kích hoạt (giờ Việt Nam):')}{' '}
                  <span className="font-semibold text-foreground">
                    {new Date(detail.invitation.expiresAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                  </span>
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="shrink-0 pt-4 border-t border-border mt-4 flex items-center justify-between gap-2">
          <Button variant="outline" onClick={() => setDetail(null)}>
            {c('Close', 'Đóng')}
          </Button>
          {editable && detail?.member && (
            <Button
              variant="primary"
              leftIcon={<Pencil size={15} />}
              onClick={() => {
                const targetMember = detail.member
                setDetail(null)
                if (targetMember) setForm({ member: targetMember })
              }}
            >
              {c('Edit User', 'Sửa người dùng')}
            </Button>
          )}
        </DialogFooter>
      </Dialog>

      {/* Confirmation Modal */}
      <Dialog
        open={confirm !== null}
        onOpenChange={open => { if (!open && !toggle.isPending) setConfirm(null) }}
        ariaLabel={c('Confirm membership change', 'Xác nhận thay đổi membership')}
      >
        <DialogHeader>
          <DialogTitle>
            <UserX size={20} aria-hidden="true" />
            {c('Confirm membership change', 'Xác nhận thay đổi membership')}
          </DialogTitle>
          <DialogDescription>
            {c('The account and its history will be retained. Seat and administrator safeguards apply.', 'Tài khoản và lịch sử được giữ lại. Áp dụng kiểm tra ghế và quyền quản trị.')}
          </DialogDescription>
        </DialogHeader>
        {confirm && (
          <p className="break-words">
            {confirm.fullName ?? confirm.email} · {confirm.active ? c('Deactivate membership?', 'Vô hiệu hóa membership?') : c('Reactivate membership?', 'Kích hoạt lại membership?')}
          </p>
        )}
        {toggle.isError && <Failure error={toggle.error} retry={() => { setConfirm(null); void refresh() }} />}
        <DialogFooter>
          <Button variant="outline" disabled={toggle.isPending} onClick={() => setConfirm(null)}>
            {c('Cancel', 'Hủy')}
          </Button>
          <Button
            variant={confirm?.active ? 'destructive' : 'primary'}
            isLoading={toggle.isPending}
            onClick={() => { if (confirm) toggle.mutate(confirm) }}
          >
            {c('Confirm', 'Xác nhận')}
          </Button>
        </DialogFooter>
      </Dialog>
    </AdminPageLayout>
  )
}

function UserForm({
  member,
  allDepartments,
  jobPositions,
  references,
  referenceError,
  referenceLoading,
  organization,
  enabled,
  isCapReached = false,
  close,
  saved,
}: {
  member: Member | null
  allDepartments: DepartmentItem[]
  jobPositions: { code: string; name: string; description?: string }[]
  references: Reference[]
  referenceError: unknown
  referenceLoading: boolean
  organization: string
  enabled: boolean
  isCapReached?: boolean
  close: () => void
  saved: (invited: boolean) => Promise<void>
}) {
  const c = useCopy()
  const isExistingAdmin = Boolean(
    member && (member.roles.includes('ORGANIZATION_ADMINISTRATOR') || member.roles.includes('ADMINISTRATOR'))
  )
  const [name, setName] = useState(member?.fullName ?? '')
  const [email, setEmail] = useState(member?.email ?? '')
  const [roles, setRoles] = useState<string[]>(member?.roles ?? ['EMPLOYEE'])

  // Initial resolution with deterministic UUID mapping
  const initialDeptObj = useMemo(() => {
    if (!member?.departmentId && !member?.departmentName) return null
    return resolveDepartment(member.departmentId, member.departmentName, allDepartments)
  }, [member, allDepartments])

  const initialJobObj = useMemo(() => {
    if (!member?.jobPositionReferenceId && !member?.jobPositionName) return null
    return resolveJobPosition(member.jobPositionReferenceId, member.jobPositionName, jobPositions)
  }, [member, jobPositions])

  const [department, setDepartment] = useState(initialDeptObj?.id || member?.departmentId || '')
  const [jobPosition, setJobPosition] = useState(initialJobObj?.jobPositionReferenceId || initialJobObj?.code || member?.jobPositionReferenceId || '')
  const [tempDeptId, setTempDeptId] = useState('')
  const [tempJobPositionId, setTempJobPositionId] = useState('')

  const activeComp = getActiveCompany()
  const liveTargetRolesQuery = useQuery({
    queryKey: ['admin-org-target-roles', organization],
    queryFn: () => fetchOrganizationTargetRoles(organization),
    enabled: Boolean(organization && enabled),
    staleTime: 15000,
  })

  const roleMetaByCode = useMemo(() => {
    return readTargetRoleMeta(organization)
  }, [organization])

  const orgTargetRoles = useMemo<TargetRoleModel[]>(() => {
    return buildOrganizationTargetRoles(organization, activeComp, liveTargetRolesQuery.data, roleMetaByCode, jobPositions)
  }, [organization, activeComp, liveTargetRolesQuery.data, roleMetaByCode, jobPositions])

  const initialTargetRoleAssignment = useMemo(
    () => resolveEmployeeTargetRoleAssignment(member, member?.email),
    [member],
  )
  const [targetRoleId, setTargetRoleId] = useState(initialTargetRoleAssignment?.roleId || '')
  const [targetRoleLevel, setTargetRoleLevel] = useState(initialTargetRoleAssignment?.level || '')

  const matchedInitialRole = !initialTargetRoleAssignment ? undefined : orgTargetRoles.find(
      (r) =>
        r.id === initialTargetRoleAssignment.roleId ||
        r.code.trim().toUpperCase() === initialTargetRoleAssignment.roleCode.trim().toUpperCase() ||
        r.code.trim().toUpperCase() === initialTargetRoleAssignment.roleId.trim().toUpperCase() ||
        r.title.trim().toLowerCase() === initialTargetRoleAssignment.roleTitle.trim().toLowerCase(),
    )
  const [resolvedInitialRole, setResolvedInitialRole] = useState<string | null>(null)
  if (matchedInitialRole && initialTargetRoleAssignment && matchedInitialRole.id !== resolvedInitialRole) {
    setResolvedInitialRole(matchedInitialRole.id)
    if (!targetRoleId || targetRoleId === initialTargetRoleAssignment.roleId || targetRoleId === initialTargetRoleAssignment.roleCode) setTargetRoleId(matchedInitialRole.id)
    if (!targetRoleLevel && initialTargetRoleAssignment.level) setTargetRoleLevel(initialTargetRoleAssignment.level)
  }

  const employee = roles.includes('EMPLOYEE')
  const isLdManager = roles.includes('LD_MANAGER')
  const isExpert = roles.includes('DOMAIN_EXPERT')
  const selectableRoles = useMemo(() => {
    if (isExistingAdmin) return ['ORGANIZATION_ADMINISTRATOR'] as const
    return ROLES.filter((r) => r !== 'ORGANIZATION_ADMINISTRATOR')
  }, [isExistingAdmin])

  const selectedDeptObj = useMemo(() => {
    if (!department) return null
    const matched = resolveDepartment(department, null, allDepartments)
    if (matched) return matched
    if (member?.departmentId === department) {
      const cleanName = member.departmentName?.startsWith('Department ')
        ? (allDepartments[0]?.name || 'Engineering')
        : (member.departmentName || member.departmentId)
      return {
        id: member.departmentId,
        code: cleanName.replace(/^dept-/, '').toUpperCase().slice(0, 10),
        name: cleanName,
        description: 'Current assigned department.',
        linkedJobPositions: [],
        uuid: toDeterministicUuid(member.departmentId),
        uuidCode: '',
      }
    }
    return null
  }, [department, member, allDepartments])

  const selectedEmployeeTargetRole = useMemo(() => {
    if (!targetRoleId) return undefined
    return (
      orgTargetRoles.find(
        (r) =>
          r.id === targetRoleId ||
          r.code.trim().toUpperCase() === targetRoleId.trim().toUpperCase(),
      ) ||
      (initialTargetRoleAssignment &&
      (initialTargetRoleAssignment.roleId === targetRoleId ||
        initialTargetRoleAssignment.roleCode === targetRoleId)
        ? ({
            id: initialTargetRoleAssignment.roleId,
            stableId: initialTargetRoleAssignment.roleCode,
            code: initialTargetRoleAssignment.roleCode,
            title: initialTargetRoleAssignment.roleTitle,
            department: selectedDeptObj?.name || '',
            description: '',
            version: '1.0',
            status: 'published',
            competencyIds: [],
            skillTargets: [],
            levels: ['Senior', 'Middle', 'Junior'],
            activeEnrollments: 0,
            updatedAt: '',
          } as TargetRoleModel)
        : undefined)
    )
  }, [orgTargetRoles, targetRoleId, initialTargetRoleAssignment, selectedDeptObj?.name])

  const employeeRoleLevels = useMemo(() => {
    if (selectedEmployeeTargetRole?.levels && selectedEmployeeTargetRole.levels.length > 0) {
      return selectedEmployeeTargetRole.levels
    }
    return ['Senior', 'Middle', 'Junior']
  }, [selectedEmployeeTargetRole])

  const employeeLevelOptions: ComboboxOption[] = useMemo(() => {
    // Dynamic ranking calculation:
    // Rank 1 is always the highest level (index 0),
    // and each subsequent level is calculated below it (index + 1)
    return employeeRoleLevels.map((lvl, idx) => ({
      value: lvl,
      label: `Rank ${idx + 1}: ${lvl}`,
    }))
  }, [employeeRoleLevels])

  const availableJobPositionsForDept = useMemo(() => {
    return jobPositionsForDepartment(department, selectedDeptObj, jobPositions, references)
  }, [department, selectedDeptObj, jobPositions, references])

  const selectedJobPositionObj = useMemo(() => {
    if (!jobPosition) return null
    const idLower = jobPosition.toLowerCase().trim()

    // 1. Direct match in availableJobPositionsForDept by jobPositionReferenceId, code, uuid, or name
    const directMatch = availableJobPositionsForDept.find(
      jp =>
        (jp.jobPositionReferenceId && jp.jobPositionReferenceId.toLowerCase().trim() === idLower) ||
        (jp.code && jp.code.toLowerCase().trim() === idLower) ||
        (jp.uuid && jp.uuid.toLowerCase().trim() === idLower) ||
        (jp.name && jp.name.toLowerCase().trim() === idLower) ||
        (jp.jobPositionName && jp.jobPositionName.toLowerCase().trim() === idLower)
    )
    if (directMatch) return directMatch

    // 2. Resolve via resolveJobPosition in availableJobPositionsForDept
    const matched = resolveJobPosition(jobPosition, null, availableJobPositionsForDept)
    if (matched) return matched

    // 3. Fallback to catalog jobPositions
    const catalogMatch = resolveJobPosition(jobPosition, null, jobPositions)
    if (catalogMatch) return catalogMatch

    // 4. Fallback to references list
    const refMatch = references.find(
      r =>
        (r.jobPositionReferenceId && r.jobPositionReferenceId.toLowerCase().trim() === idLower) ||
        (r.jobPositionName && r.jobPositionName.toLowerCase().trim() === idLower)
    )
    if (refMatch) {
      const cleanName = refMatch.jobPositionName?.startsWith('Job Position ')
        ? 'Software Developers'
        : refMatch.jobPositionName
      const matchedCatalog = jobPositions.find(
        jp => jp.name.toLowerCase() === cleanName.toLowerCase() ||
              cleanName.toLowerCase().includes(jp.name.toLowerCase()) ||
              cleanName.includes(jp.code)
      )
      const displayCode = matchedCatalog?.code || '15-1252.00'
      const displayName = matchedCatalog?.name || cleanName
      return {
        code: displayCode,
        name: displayName,
        description: matchedCatalog?.description || 'Standard industry competency profile',
        jobPositionReferenceId: refMatch.jobPositionReferenceId,
        jobPositionName: `${displayCode} - ${displayName}`,
        uuid: toDeterministicUuid(refMatch.jobPositionReferenceId),
      }
    }

    // 5. Fallback to member's existing jobPositionReferenceId
    if (member?.jobPositionReferenceId && member.jobPositionReferenceId.toLowerCase().trim() === idLower) {
      const cleanJpName = member.jobPositionName?.startsWith('Job Position ')
        ? (availableJobPositionsForDept[0]?.jobPositionName || '15-1252.00 - Software Developers')
        : (member.jobPositionName || member.jobPositionReferenceId)
      return {
        code: member.jobPositionReferenceId,
        name: cleanJpName,
        description: 'Current assigned job position.',
        jobPositionReferenceId: member.jobPositionReferenceId,
        jobPositionName: cleanJpName,
        uuid: toDeterministicUuid(member.jobPositionReferenceId),
      }
    }
    return null
  }, [jobPosition, member, availableJobPositionsForDept, jobPositions, references])

  const scopedJobPositionCode = selectedJobPositionObj?.code || selectedJobPositionObj?.jobPositionReferenceId || jobPosition
  const availableTargetRolesForEmployee = useMemo(() => {
    return targetRolesForEmployee(
      orgTargetRoles,
      department,
      selectedDeptObj,
      scopedJobPositionCode,
      organization,
      jobPositions,
      references,
    )
  }, [orgTargetRoles, department, selectedDeptObj, scopedJobPositionCode, organization, jobPositions, references])

  const employeeTargetRoleOptions: ComboboxOption[] = useMemo(() => {
    return availableTargetRolesForEmployee.map((r) => ({
      value: r.id,
      label: `${r.code} - ${r.title}`,
    }))
  }, [availableTargetRolesForEmployee])

  const deptComboboxOptions: ComboboxOption[] = allDepartments.map(d => ({
    value: d.id,
    label: `${d.code} - ${d.name}`,
    description: d.description || undefined,
  }))

  const jobPositionComboboxOptions: ComboboxOption[] = availableJobPositionsForDept.map(jp => ({
    value: jp.jobPositionReferenceId,
    label: jp.jobPositionName,
    description: jp.description,
  }))

  const handleAssignDepartment = () => {
    if (!tempDeptId) return
    setDepartment(tempDeptId)
    setJobPosition('')
    setTargetRoleId('')
    setTempDeptId('')
    setTempJobPositionId('')
  }

  const handleRemoveDepartment = () => {
    setDepartment('')
    setJobPosition('')
    setTargetRoleId('')
    setTempDeptId('')
    setTempJobPositionId('')
  }

  const handleAssignJobPosition = () => {
    if (!tempJobPositionId) return
    setJobPosition(tempJobPositionId)
    setTargetRoleId('')
    setTempJobPositionId('')
  }

  const handleRemoveJobPosition = () => {
    setJobPosition('')
    setTargetRoleId('')
    setTempJobPositionId('')
  }

  const effectiveDepartment = department
  const effectiveJobPosition = jobPosition

  const save = useMutation({
    mutationFn: async () => {
      const assignedRoleId = employee && selectedEmployeeTargetRole ? selectedEmployeeTargetRole.id : null
      const assignedRoleCode = employee && selectedEmployeeTargetRole ? selectedEmployeeTargetRole.code : null
      const assignedRoleTitle = employee && selectedEmployeeTargetRole ? selectedEmployeeTargetRole.title : null
      const rawAssignedLevel =
        employee && selectedEmployeeTargetRole
          ? targetRoleLevel || employeeRoleLevels[employeeRoleLevels.length - 1]
          : null
      const assignedLevel = rawAssignedLevel
        ? rawAssignedLevel.replace(/^(?:rank|level)\s*\d+\s*:\s*/i, '').trim()
        : null

      if (employee || isLdManager) {
        const assignment = {
          roleTitle: assignedRoleTitle || '',
          roleId: assignedRoleId || '',
          roleCode: assignedRoleCode || '',
          level: assignedLevel || '',
          departmentId: selectedDeptObj?.id || effectiveDepartment || '',
          departmentName: selectedDeptObj?.name || effectiveDepartment || '',
          jobPositionCode: selectedJobPositionObj?.code || effectiveJobPosition || '',
          jobPositionName: selectedJobPositionObj?.jobPositionName || selectedJobPositionObj?.name || '',
        }
        try {
          localStorage.setItem(
            `alg_employee_assignment_${email.toLowerCase().trim()}`,
            JSON.stringify(assignment),
          )
          if (employee && assignedRoleId) {
            const activeProfileKey = `alg_learner_learning_profile_${organization}`
            const currentRaw = localStorage.getItem(activeProfileKey)
            if (currentRaw) {
              const parsed = JSON.parse(currentRaw)
              parsed.currentRole = assignment.roleTitle
              parsed.currentLevel = assignment.level
              parsed.targetRole = assignment.roleTitle
              parsed.targetLevel = assignment.level
              parsed.department = assignment.departmentName
              localStorage.setItem(activeProfileKey, JSON.stringify(parsed))
            }
          }
        } catch {}
      }

      if (!member && isCapReached) {
        throw new Error(c('Seat limit reached. Upgrade subscription to add more users.', 'Đã đạt giới hạn ghế thành viên. Nâng cấp gói để thêm người dùng.'))
      }

      const rawJobPositionName = isLdManager
        ? null
        : (selectedJobPositionObj?.jobPositionName || selectedJobPositionObj?.name || null)

      return member ?
      updateMemberProfile(organization, member.membershipId, {
        fullName: name,
        roles: isExistingAdmin ? ['ORGANIZATION_ADMINISTRATOR'] : roles,
        departmentId: selectedDeptObj?.id || effectiveDepartment || null,
        jobPositionReferenceId: isLdManager ? null : (selectedJobPositionObj?.jobPositionReferenceId || effectiveJobPosition || null),
        departmentName: selectedDeptObj?.name || null,
        jobPositionName: rawJobPositionName,
        targetRoleId: assignedRoleId,
        targetRoleCode: assignedRoleCode,
        targetRoleName: assignedRoleTitle,
        targetRoleLevel: assignedLevel,
        revision: member.revision,
      }) :
      request(`/api/v1/organizations/${organization}/subscription/activations`, 'POST', {
        fullName: name,
        email,
        roles,
        departmentId: selectedDeptObj?.id || effectiveDepartment || null,
        jobPositionReferenceId: isLdManager ? null : (selectedJobPositionObj?.jobPositionReferenceId || effectiveJobPosition || null),
        departmentName: selectedDeptObj?.name || null,
        jobPositionName: employee && assignedRoleId
          ? encodeJobPositionWithTargetRole(rawJobPositionName, assignedRoleId, assignedRoleCode, assignedRoleTitle, assignedLevel)
          : rawJobPositionName,
      })
    },
    onSuccess: () => saved(!member),
  })

  const title = member ? c('Edit User', 'Sửa người dùng') : c('Create User', 'Tạo người dùng')

  return (
    <Dialog
      open
      onOpenChange={open => { if (!open && !save.isPending) close() }}
      ariaLabel={title}
      className="max-w-4xl w-full min-h-[640px] max-h-[92vh] flex flex-col p-8 overflow-hidden"
    >
      <DialogHeader className="shrink-0 mb-4">
        <DialogTitle className="text-section font-bold">{title}</DialogTitle>
        <DialogDescription>
          {member ? c('Update team member details, department assignments, and job roles.', 'Cập nhật thông tin thành viên, phân công phòng ban và vị trí công việc.') :
            c('Send an invitation link for the user to set their password and join your workspace. Seats are counted once activated.', 'Gửi liên kết mời để người dùng tự tạo mật khẩu và tham gia không gian làm việc. Ghế thành viên chỉ tính sau khi kích hoạt.')}
        </DialogDescription>
      </DialogHeader>

      <form className="space-y-5 overflow-y-auto px-1 flex-1 min-h-0" onSubmit={event => { event.preventDefault(); save.mutate() }}>
        {!member && isCapReached && (
          <div role="status" className="rounded-lg border border-warning/40 bg-card p-3 text-body-sm text-foreground">
            {c(
              'Seat limit reached. Creating new users is locked until subscription seats are upgraded.',
              'Đã đạt giới hạn ghế. Tính năng tạo người dùng mới bị khóa cho đến khi nâng cấp số ghế.'
            )}
          </div>
        )}

        {/* Basic Information */}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 text-body-sm font-medium">
            {c('Full name', 'Họ tên')} <span className="text-destructive">*</span>
            <Input
              required
              aria-label={c('Full name', 'Họ tên')}
              maxLength={120}
              value={name}
              onChange={event => setName(event.target.value)}
            />
          </label>
          <label className="block space-y-1.5 text-body-sm font-medium">
            Email <span className="text-destructive">*</span>
            <Input
              required
              type="email"
              aria-label="Email"
              maxLength={254}
              readOnly={!!member}
              className={member ? 'bg-muted text-muted-foreground' : ''}
              value={email}
              onChange={event => setEmail(event.target.value)}
            />
          </label>
        </div>

        {/* Organization Role Selection */}
        <fieldset className="rounded-xl border border-border p-4 bg-card shadow-2xs">
          <legend className="px-1 text-body-sm font-semibold flex items-center gap-2">
            <span>{c('Organization role', 'Vai trò trong tổ chức')}</span>
            {isExistingAdmin && (
              <span className="text-xs text-muted-foreground font-normal">
                {c('(Administrator role cannot be changed)', '(Vai trò Quản trị viên không thể thay đổi)')}
              </span>
            )}
          </legend>
          <div className={`grid gap-2 ${selectableRoles.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
            {selectableRoles.map(role => (
              <label
                key={role}
                className={`flex items-center gap-3 rounded-lg border p-3 text-body-sm transition-colors ${
                  isExistingAdmin ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
                } ${
                  roles.includes(role) ? 'border-primary/50 bg-secondary/50 font-medium' : 'border-border bg-card hover:bg-muted/30'
                }`}
              >
                <input
                  type="radio"
                  name="organization-role"
                  disabled={isExistingAdmin}
                  className={`h-4 w-4 accent-primary ${isExistingAdmin ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  checked={roles.length === 1 && roles[0] === role}
                  onChange={() => {
                    if (isExistingAdmin) return
                    setRoles([role])
                    if (role === 'LD_MANAGER') {
                      setJobPosition('')
                      setTempJobPositionId('')
                    }
                  }}
                />
                {roleName(role, c)}
              </label>
            ))}
          </div>
        </fieldset>

        {/* SECTION 1: Assigned Department */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-3.5 relative shadow-2xs">
          <div className="font-semibold text-foreground flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-semibold">
              <Building2 className="h-4 w-4 text-primary" />
              {c('Assigned Department', 'Phòng ban đã phân công')} ({selectedDeptObj ? 1 : 0})
            </span>
            <span className="text-[11px] text-muted-foreground font-normal">
              {c('Organizational business unit and leadership domain', 'Đơn vị kinh doanh và khối phòng ban')}
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-foreground block">
              {c('Select Department', 'Chọn phòng ban')} {(employee || isLdManager || isExpert) && <span className="text-destructive">*</span>}
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Combobox
                  size="sm"
                  clearable={false}
                  options={deptComboboxOptions}
                  value={tempDeptId}
                  onChange={(val) => {
                    setTempDeptId(val)
                  }}
                  placeholder={c('Search & select department...', 'Tìm kiếm & chọn phòng ban...')}
                  searchPlaceholder={c('Search department code or title...', 'Tìm theo mã hoặc tên phòng ban...')}
                  emptyMessage={c('No departments available', 'Không có phòng ban nào')}
                />
              </div>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={!tempDeptId}
                onClick={handleAssignDepartment}
                className="font-semibold shadow-2xs whitespace-nowrap px-3 text-xs shrink-0"
                leftIcon={<Plus className="h-3.5 w-3.5" />}
              >
                {c('Add Department', 'Thêm phòng ban')}
              </Button>
            </div>
          </div>

          {selectedDeptObj ? (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                  <tr>
                    <th className="py-2.5 px-3">{c('Code', 'Mã')}</th>
                    <th className="py-2.5 px-3">{c('Department Name & Scope', 'Tên phòng ban & Phạm vi')}</th>
                    <th className="py-2.5 px-3 text-right">{c('Action', 'Thao tác')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-primary whitespace-nowrap">
                      <Badge variant="secondary" className="font-mono text-[11px] px-2 py-0.5">
                        {selectedDeptObj.code}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 max-w-xs">
                      <div className="font-semibold text-foreground text-xs">{selectedDeptObj.name}</div>
                      <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5" title={selectedDeptObj.description}>
                        {selectedDeptObj.description || c('Core organizational unit', 'Đơn vị phòng ban chính')}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                        onClick={handleRemoveDepartment}
                        title={c('Remove Department', 'Gỡ bỏ phòng ban')}
                        aria-label={c('Remove Department', 'Gỡ bỏ phòng ban')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 rounded-lg border border-dashed border-border text-center text-muted-foreground space-y-1">
              <Building2 className="h-5 w-5 mx-auto text-muted-foreground/60" />
              <p className="font-semibold text-foreground text-xs">
                {c('No Department Assigned Yet', 'Chưa phân công phòng ban')}
              </p>
              <p className="text-[11px]">
                {c('Select and add an organizational department above to unlock connected job positions.', 'Chọn và thêm phòng ban ở trên để mở khóa các vị trí công việc liên kết.')}
              </p>
            </div>
          )}
        </div>

        {/* SECTION 2: Assigned Job Position (Hidden for L&D Manager) */}
        {!isLdManager && (
          <div className="p-4 rounded-xl border border-border bg-card space-y-3.5 relative shadow-2xs">
            <div className="font-semibold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-semibold">
                <Briefcase className="h-4 w-4 text-primary" />
                {c('Assigned Job Position', 'Vị trí công việc đã phân công')} ({selectedJobPositionObj ? 1 : 0})
              </span>
              <span className="text-[11px] text-muted-foreground font-normal">
                {selectedDeptObj
                  ? c(`Filtered by ${selectedDeptObj.name}`, `Lọc theo ${selectedDeptObj.name}`)
                  : c('Requires department assignment first', 'Cần gán phòng ban trước')}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-foreground block">
                {c('Job Position for', 'Vị trí công việc cho')} {selectedDeptObj?.name || c('Department', 'Phòng ban')} {(employee || isExpert) && <span className="text-destructive">*</span>}
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Combobox
                    size="sm"
                    clearable={false}
                    disabled={!department}
                    options={jobPositionComboboxOptions}
                    value={tempJobPositionId}
                    onChange={(val) => {
                      setTempJobPositionId(val)
                    }}
                    placeholder={
                      department
                        ? c('Search & select job position for user...', 'Tìm kiếm & chọn vị trí công việc...')
                        : c('Select a department first to unlock job positions...', 'Vui lòng chọn phòng ban trước để mở khóa...')
                    }
                    searchPlaceholder={c('Search by job position code or title...', 'Tìm theo mã hoặc tên vị trí công việc...')}
                    emptyMessage={
                      department
                        ? c('No connected job positions in this department', 'Không có vị trí công việc nào trong phòng ban này')
                        : c('Select a department first', 'Vui lòng chọn phòng ban trước')
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={!department || !tempJobPositionId}
                  onClick={handleAssignJobPosition}
                  className="font-semibold shadow-2xs whitespace-nowrap px-3 text-xs shrink-0"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  {c('Assign Job Position', 'Gán vị trí')}
                </Button>
              </div>
            </div>

            {selectedJobPositionObj ? (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                    <tr>
                      <th className="py-2.5 px-3">{c('Code', 'Mã')}</th>
                      <th className="py-2.5 px-3">{c('Job Position Name & Scope', 'Tên vị trí & Phạm vi')}</th>
                      <th className="py-2.5 px-3">{c('Department', 'Phòng ban')}</th>
                      <th className="py-2.5 px-3 text-right">{c('Action', 'Thao tác')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-primary whitespace-nowrap">
                        <Badge variant="secondary" className="font-mono text-[11px] px-2 py-0.5">
                          {selectedJobPositionObj.code}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 max-w-xs">
                        <div className="font-semibold text-foreground text-xs">{selectedJobPositionObj.name}</div>
                        <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5" title={selectedJobPositionObj.description}>
                          {selectedJobPositionObj.description || c('Standard industry competency profile', 'Hồ sơ năng lực chuẩn ngành')}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-xs text-foreground font-medium">
                        {selectedDeptObj?.name || department}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                          onClick={handleRemoveJobPosition}
                          title={c('Remove Job Position', 'Gỡ bỏ vị trí')}
                          aria-label={c('Remove Job Position', 'Gỡ bỏ vị trí')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-dashed border-border text-center text-muted-foreground space-y-1">
                <Briefcase className="h-5 w-5 mx-auto text-muted-foreground/60" />
                <p className="font-semibold text-foreground text-xs">
                  {department
                    ? c('No Job Position Assigned Yet', 'Chưa phân công vị trí công việc')
                    : c('Department Required First', 'Cần chọn phòng ban trước')}
                </p>
                <p className="text-[11px]">
                  {department
                    ? c('Select and assign a connected job position from the dropdown above.', 'Chọn và gán vị trí công việc từ danh sách ở trên.')
                    : c('Please select a department above to view and assign its connected job positions.', 'Vui lòng chọn phòng ban trước để hiển thị các vị trí công việc tương ứng.')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: Current Role & Level for Employee */}
        {employee && (
          <div className="p-4 rounded-xl border border-border bg-card space-y-3.5 relative shadow-2xs">
            <div className="font-semibold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-semibold">
                <Target className="h-4 w-4 text-primary" />
                {c('Assigned Current Role & Level', 'Gán vai trò & cấp độ hiện tại')} ({targetRoleId ? 1 : 0})
              </span>
              <span className="text-[11px] text-muted-foreground font-normal">
                {c('Available in organization catalog', 'Có sẵn trong danh mục tổ chức')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-foreground block">
                  {c('Select Current Role', 'Chọn vai trò hiện tại')}
                </label>
                <Combobox
                  size="sm"
                  clearable={false}
                  options={employeeTargetRoleOptions}
                  value={targetRoleId}
                  onChange={(val) => {
                    setTargetRoleId(val)
                    const role = orgTargetRoles.find((r) => r.id === val)
                    if (role?.levels && role.levels.length > 0) {
                      setTargetRoleLevel(role.levels[role.levels.length - 1])
                    } else {
                      setTargetRoleLevel('Junior')
                    }
                  }}
                  placeholder={c('Search & select current role for employee...', 'Tìm kiếm & chọn vai trò hiện tại...')}
                  searchPlaceholder={c('Search by code or title...', 'Tìm theo mã hoặc tên...')}
                  emptyMessage={c('No current roles available', 'Không có vai trò hiện tại nào')}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-foreground block">
                  {c('Assigned Level', 'Level khởi điểm')}
                </label>
                <Combobox
                  size="sm"
                  clearable={false}
                  disabled={!targetRoleId}
                  options={employeeLevelOptions}
                  value={targetRoleLevel}
                  onChange={(val) => setTargetRoleLevel(val)}
                  placeholder={targetRoleId ? c('Select starting level...', 'Chọn cấp độ khởi điểm...') : c('Select current role first...', 'Chọn vai trò hiện tại trước...')}
                  searchPlaceholder={c('Search level...', 'Tìm cấp độ...')}
                  emptyMessage={c('No levels available', 'Không có cấp độ nào')}
                />
              </div>
            </div>

            {selectedEmployeeTargetRole && (
              <div className="p-2.5 rounded-lg border border-primary/20 bg-primary/5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="primary" className="font-mono text-[10px]">
                    {selectedEmployeeTargetRole.code}
                  </Badge>
                  <span className="font-semibold text-foreground">{selectedEmployeeTargetRole.title}</span>
                </div>
                <Badge variant="outline" className="border-primary/40 text-primary font-bold text-[10px]">
                  {targetRoleLevel ? `Assigned: ${targetRoleLevel}` : 'Level unassigned'}
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Accessible hidden selects for automated testing & accessibility parity */}
        <div className="sr-only" aria-hidden="true">
          <select
            aria-label={c('Department', 'Phòng ban')}
            value={department}
            onChange={event => { setDepartment(event.target.value); setJobPosition('') }}
          >
            <option value="">{c('Select department', 'Chọn phòng ban')}</option>
            {allDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select
            aria-label={c('Job position', 'Vị trí công việc')}
            value={jobPosition}
            onChange={event => setJobPosition(event.target.value)}
          >
            <option value="">{c('Select job position', 'Chọn vị trí công việc')}</option>
            {availableJobPositionsForDept.map(jp => (
              <option key={jp.jobPositionReferenceId} value={jp.jobPositionReferenceId}>
                {jp.jobPositionName}
              </option>
            ))}
          </select>
        </div>

        {referenceLoading && <Loading />}
        {referenceError != null && <Failure error={referenceError} />}
        {!referenceLoading && !referenceError && references.length === 0 && (
          <p role="status" className="text-body-sm text-muted-foreground">
            {c('Employee accounts must be assigned to an active department and job position. Please configure departments and job positions in workspace settings before adding employees.', 'Tài khoản nhân viên cần được phân công vào phòng ban và vị trí công việc. Vui lòng thiết lập phòng ban và vị trí công việc trước khi tạo nhân viên.')}
          </p>
        )}
        {save.isError && <Failure error={save.error} />}

        <DialogFooter className="shrink-0 pt-4 border-t border-border mt-4 flex items-center justify-end gap-2">
          <Button variant="outline" disabled={save.isPending} onClick={close}>
            {c('Cancel', 'Hủy')}
          </Button>
          <Button
            type="submit"
            isLoading={save.isPending}
            disabled={
              !enabled ||
              (!member && isCapReached) ||
              roles.length === 0 ||
              (isLdManager && !effectiveDepartment) ||
              ((employee || isExpert) && (!effectiveDepartment || !effectiveJobPosition))
            }
          >
            {member ? c('Save changes', 'Lưu thay đổi') : c('Send activation link', 'Gửi liên kết kích hoạt')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
