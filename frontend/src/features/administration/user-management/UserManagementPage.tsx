import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Users, Mail, UserCheck, UserX, Eye, Pencil } from 'lucide-react'
import { AdminPageLayout } from '../AdminPageLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../shared/components/ui/Card'
import { Button } from '../../../shared/components/ui/Button'
import { Input } from '../../../shared/components/ui/Input'
import { Badge } from '../../../shared/components/ui/Badge'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { Pagination } from '../../../shared/components/ui/Pagination'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../shared/components/ui/Dialog'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { getIdentity, getMembers, getPendingActivations, getReferences, getSummary, request, updateMemberProfile,
  type Identity, type Member, type PendingActivation, type Reference } from '../../subscription/subscriptionApi'
import { Failure, Loading, useCopy } from '../../subscription/SubscriptionFeedback'

const ROLES = ['EMPLOYEE', 'DOMAIN_EXPERT', 'LD_MANAGER', 'ORGANIZATION_ADMINISTRATOR'] as const
const selectClass = 'h-10 w-full rounded-md border border-border bg-card px-3 text-body-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
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
  id: string; fullName: string | null; email: string; roles: string[]; status: string
  departmentName: string | null; occupationName: string | null; member: Member | null; invitation: PendingActivation | null
}

export function UserManagementPage() {
  const c = useCopy()
  const identity = useQuery({ queryKey: ['workspace-identity'], queryFn: getIdentity, staleTime: 0 })
  if (identity.isPending) return <Loading />
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
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [form, setForm] = useState<{ member: Member | null } | null>(null)
  const [detail, setDetail] = useState<DirectoryRow | null>(null)
  const [confirm, setConfirm] = useState<Member | null>(null)
  const [notice, setNotice] = useState<'membership' | 'invited' | 'saved' | null>(null)
  const suspended = summary.data?.workspaceStatus === 'SUSPENDED'
  const editable = summary.isSuccess && !suspended && summary.data.subscriptionStatus === 'ACTIVE'
  const canReduce = summary.isSuccess && !suspended
  const refresh = async () => {
    await Promise.all([
      cache.invalidateQueries({ queryKey: ['subscription-members', principal, organization] }),
      cache.invalidateQueries({ queryKey: ['member-activations', principal, organization] }),
      cache.invalidateQueries({ queryKey: ['subscription-summary', principal, organization] }),
      cache.invalidateQueries({ queryKey: ['workspace-identity'] }),
    ])
  }
  const toggle = useMutation({ mutationFn: (member: Member) => request(`${base}/members/${member.membershipId}`, 'PUT',
    { active: !member.active, roles: member.roles, revision: member.revision }),
  onSuccess: async () => { await refresh(); setConfirm(null); setNotice('membership') } })
  const resend = useMutation({ mutationFn: (invitation: PendingActivation) => request(`${base}/activations`, 'POST',
    { fullName: invitation.fullName, email: invitation.email, roles: invitation.roles,
      departmentId: invitation.departmentId, occupationReferenceId: invitation.occupationReferenceId }),
  onSuccess: async () => { await refresh(); setNotice('invited') } })
  const rows: DirectoryRow[] = [
    ...(members.data ?? []).map(member => ({ id: member.membershipId, fullName: member.fullName, email: member.email,
      roles: member.roles, status: !member.accountActive ? 'ACCOUNT_DISABLED' : member.active ? 'ACTIVE' : 'INACTIVE',
      departmentName: member.departmentName, occupationName: member.occupationName, member, invitation: null })),
    ...(invitations.data ?? []).map(invitation => ({ id: invitation.activationId, fullName: invitation.fullName,
      email: invitation.email, roles: invitation.roles, status: invitation.state, departmentName: invitation.departmentName,
      occupationName: invitation.occupationName, member: null, invitation })),
  ]
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

  return <AdminPageLayout identity={identity} organizationName={summary.data?.organizationName}
    title={c('User Accounts', 'Tài khoản người dùng')}
    description={c('Manage your organization members, assignments and account activation.', 'Quản lý thành viên tổ chức, phân công và kích hoạt tài khoản.')}
    actions={<Button disabled={!editable} leftIcon={<Plus size={16} aria-hidden="true" />} onClick={() => { setNotice(null); setForm({ member: null }) }}>
      {c('Create User', 'Tạo người dùng')}
    </Button>}>
    {summary.isSuccess && !editable && <div role="status" className="rounded-lg border border-warning/40 bg-card p-4">
      {suspended ? c('Workspace suspended. User changes are unavailable.', 'Không gian bị tạm ngưng. Không thể thay đổi người dùng.') :
        c('Subscription expired: view members or deactivate memberships to reduce seats. Renew before creating, editing or reactivating users.', 'Gói đã hết hạn: chỉ xem hoặc vô hiệu hóa membership để giảm ghế. Gia hạn trước khi tạo, sửa hoặc kích hoạt lại.')}
    </div>}
    {notice && <p role="status" className="rounded-lg border border-success/30 bg-card p-3">
      {notice === 'membership' ? c('Membership updated.', 'Đã cập nhật membership.') :
        notice === 'saved' ? c('User details saved.', 'Đã lưu thông tin người dùng.') :
          c('Activation email queued. Inbox delivery is not yet confirmed.', 'Đã xếp hàng email kích hoạt. Chưa xác nhận thư đến hộp thư.')}
    </p>}
    {resend.isError && <Failure error={resend.error} />}
    {incomplete ? <Loading /> : failure ? <Failure error={failure} retry={() => void refresh()} /> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title={c('Members', 'Thành viên')} value={members.data?.length ?? 0} icon={<Users size={16} />} />
        <StatCard title={c('Active memberships', 'Thành viên hoạt động')} value={(members.data ?? []).filter(member => member.active && member.accountActive).length} icon={<UserCheck size={18} className="text-success" aria-hidden="true" />} />
        <StatCard title={c('Awaiting activation', 'Chờ kích hoạt')} value={invitations.data?.length ?? 0} icon={<Mail size={16} />} />
        <StatCard title={c('Employee seats used / admission limit', 'Ghế Nhân viên đang dùng / giới hạn')} value={`${summary.data?.usedSeats ?? 0} / ${summary.data?.admissionLimit ?? 0}`}
          description={c('Invitations do not reserve an Employee seat.', 'Lời mời chưa chiếm ghế Nhân viên.')} />
      </div>
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2"><Users size={18} className="text-primary" aria-hidden="true" />{c('User directory', 'Danh sách người dùng')}</CardTitle>
              <CardDescription>{c('People, roles and workspace access in one place.', 'Quản lý thành viên, vai trò và quyền truy cập tập trung.')}</CardDescription>
            </div>
            <Badge variant="outline">{filtered.length} {c('users', 'người dùng')}</Badge>
          </div>
          <div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-3 md:grid-cols-[minmax(200px,1fr)_180px_200px]">
            <Input aria-label={c('Search users', 'Tìm người dùng')} placeholder={c('Search name or email…', 'Tìm tên hoặc email…')}
              leftIcon={<Search size={16} aria-hidden="true" />} value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} />
            <select aria-label={c('Filter by role', 'Lọc theo vai trò')} className={selectClass} value={role} onChange={event => { setRole(event.target.value); setPage(1) }}>
              <option value="">{c('All roles', 'Tất cả vai trò')}</option>{ROLES.map(value => <option key={value} value={value}>{roleName(value, c)}</option>)}
            </select>
            <select aria-label={c('Filter by status', 'Lọc theo trạng thái')} className={selectClass} value={status} onChange={event => { setStatus(event.target.value); setPage(1) }}>
              <option value="">{c('All statuses', 'Tất cả trạng thái')}</option>
              {['ACTIVE', 'INACTIVE', 'PENDING', 'EXPIRED', 'ACCOUNT_DISABLED'].map(value => <option key={value} value={value}>{statusName(value, c)}</option>)}
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto" role="region" aria-label={c('User directory table', 'Bảng danh sách người dùng')} tabIndex={0}>
            <table className="w-full min-w-[720px] text-left text-body-sm">
              <thead className="border-y border-border bg-muted/50 text-muted-foreground"><tr>
                <th className="p-4">{c('User', 'Người dùng')}</th><th className="p-4">{c('Roles', 'Vai trò')}</th>
                <th className="p-4">{c('Department / occupation', 'Phòng ban / nghề nghiệp')}</th>
                <th className="p-4">{c('Status', 'Trạng thái')}</th><th className="p-4 text-right">{c('Actions', 'Thao tác')}</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {visible.map(row => <tr key={row.id} className="hover:bg-muted/20">
                  <td className="p-4"><div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary font-semibold text-primary" aria-hidden="true">{(row.fullName || row.email).slice(0, 1).toUpperCase()}</span>
                    <div><p className="font-semibold">{row.fullName ?? c('Name not recorded', 'Chưa ghi nhận tên')}</p><p className="mt-1 text-caption text-muted-foreground">{row.email}</p></div>
                  </div></td>
                  <td className="p-4"><div className="flex max-w-48 flex-wrap gap-1">{row.roles.map(value => <Badge key={value} variant="secondary">{roleName(value, c)}</Badge>)}</div></td>
                  <td className="p-4"><p>{row.departmentName ?? c('Not assigned', 'Chưa phân công')}</p><p className="mt-1 text-caption text-muted-foreground">{row.occupationName ?? '—'}</p></td>
                  <td className="p-4"><Badge variant={row.status === 'ACTIVE' ? 'success' : row.status === 'PENDING' ? 'warning' : 'outline'}>{statusName(row.status, c)}</Badge>
                    {row.invitation && <p className="mt-2 text-caption text-muted-foreground">{row.invitation.deliveryStatus === 'SENT' ? c('SMTP accepted', 'SMTP đã tiếp nhận') :
                      row.invitation.deliveryStatus === 'FAILED' ? c('Delivery failed', 'Gửi thư thất bại') :
                        row.invitation.deliveryStatus === 'NOT_REQUESTED' ? c('Delivery not scheduled', 'Chưa lên lịch gửi thư') : c('Delivery queued', 'Đang chờ gửi thư')}</p>}
                  </td>
                  <td className="p-4"><div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" aria-label={c('View', 'Xem')} title={c('View user details', 'Xem chi tiết người dùng')} onClick={() => setDetail(row)}><Eye size={17} aria-hidden="true" /></Button>
                    {row.member && <>
                      <Button variant="ghost" size="icon" aria-label={c('Edit', 'Sửa')} title={c('Edit user', 'Sửa người dùng')} disabled={!editable} onClick={() => setForm({ member: row.member })}><Pencil size={17} aria-hidden="true" /></Button>
                      <Button variant="ghost" size="icon" aria-label={row.member.active ? c('Deactivate', 'Vô hiệu hóa') : c('Reactivate', 'Kích hoạt lại')} disabled={toggle.isPending || !canReduce || lastAdmin(row.member) ||
                        (!row.member.active && (!editable || !row.member.accountActive))}
                        title={lastAdmin(row.member) ? c('The last active Administrator must remain.', 'Phải giữ Quản trị viên hoạt động cuối cùng.') : undefined}
                        onClick={() => { toggle.reset(); setConfirm(row.member) }}>
                        {row.member.active ? <UserX size={17} className="text-destructive" aria-hidden="true" /> : <UserCheck size={17} className="text-success" aria-hidden="true" />}
                      </Button>
                    </>}
                    {row.invitation && <Button variant="outline" size="sm" disabled={!editable || resend.isPending}
                      onClick={() => { if (row.invitation) resend.mutate(row.invitation) }}>{c('Resend', 'Gửi lại')}</Button>}
                  </div></td>
                </tr>)}
                {visible.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">
                  {c('No users match these filters.', 'Không có người dùng phù hợp với bộ lọc.')}
                </td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} pageSize={10}
            onPageChange={setPage} itemLabel={c('users', 'người dùng')} locale={language} />
        </CardContent>
      </Card>
    </>}
    {form && <UserForm key={form.member?.membershipId ?? 'new'} member={form.member} references={references.data ?? []}
      referenceError={references.error} referenceLoading={references.isPending} organization={organization} enabled={editable}
      close={() => setForm(null)} saved={async (invited) => {
        await refresh(); setForm(null); setNotice(invited ? 'invited' : 'saved')
      }} />}
    <Dialog open={detail !== null} onOpenChange={open => { if (!open) setDetail(null) }} ariaLabel={c('User details', 'Chi tiết người dùng')}>
      <DialogHeader><DialogTitle>{c('User details', 'Chi tiết người dùng')}</DialogTitle>
        <DialogDescription>{c('Stored organization membership information. Passwords and MFA secrets are never displayed.', 'Thông tin membership đã lưu. Không hiển thị mật khẩu hoặc khóa MFA.')}</DialogDescription></DialogHeader>
      {detail && <dl className="grid gap-4 overflow-y-auto text-body-sm">
        {[[c('Full name', 'Họ tên'), detail.fullName ?? '—'], ['Email', detail.email],
          [c('Roles', 'Vai trò'), detail.roles.map(value => roleName(value, c)).join(', ')],
          [c('Department', 'Phòng ban'), detail.departmentName ?? c('Not assigned', 'Chưa phân công')],
          [c('Occupation', 'Nghề nghiệp'), detail.occupationName ?? c('Not assigned', 'Chưa phân công')],
          [c('Status', 'Trạng thái'), statusName(detail.status, c)]].map(([label, value]) =>
          <div key={label}><dt className="text-caption text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>)}
        {detail.invitation && <div><dt className="text-caption text-muted-foreground">{c('Activation expiry (Vietnam time)', 'Hạn kích hoạt (giờ Việt Nam)')}</dt>
          <dd>{new Date(detail.invitation.expiresAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</dd></div>}
      </dl>}
    </Dialog>
    <Dialog open={confirm !== null} onOpenChange={open => { if (!open && !toggle.isPending) setConfirm(null) }} ariaLabel={c('Confirm membership change', 'Xác nhận thay đổi membership')}>
      <DialogHeader><DialogTitle><UserX size={20} aria-hidden="true" />{c('Confirm membership change', 'Xác nhận thay đổi membership')}</DialogTitle>
        <DialogDescription>{c('The account and its history will be retained. Seat and administrator safeguards apply.', 'Tài khoản và lịch sử được giữ lại. Áp dụng kiểm tra ghế và quyền quản trị.')}</DialogDescription></DialogHeader>
      {confirm && <p className="break-words">{confirm.fullName ?? confirm.email} · {confirm.active ? c('Deactivate membership?', 'Vô hiệu hóa membership?') : c('Reactivate membership?', 'Kích hoạt lại membership?')}</p>}
      {toggle.isError && <Failure error={toggle.error} retry={() => { setConfirm(null); void refresh() }} />}
      <DialogFooter><Button variant="outline" disabled={toggle.isPending} onClick={() => setConfirm(null)}>{c('Cancel', 'Hủy')}</Button>
        <Button variant={confirm?.active ? 'destructive' : 'primary'} isLoading={toggle.isPending}
          onClick={() => { if (confirm) toggle.mutate(confirm) }}>{c('Confirm', 'Xác nhận')}</Button></DialogFooter>
    </Dialog>
  </AdminPageLayout>
}

function UserForm({ member, references, referenceError, referenceLoading, organization, enabled, close, saved }: {
  member: Member | null; references: Reference[]; referenceError: unknown; referenceLoading: boolean; organization: string
  enabled: boolean; close: () => void; saved: (invited: boolean) => Promise<void>
}) {
  const c = useCopy()
  const [name, setName] = useState(member?.fullName ?? '')
  const [email, setEmail] = useState(member?.email ?? '')
  const [roles, setRoles] = useState<string[]>(member?.roles ?? ['EMPLOYEE'])
  const [department, setDepartment] = useState(member?.departmentId ?? '')
  const [occupation, setOccupation] = useState(member?.occupationReferenceId ?? '')
  const employee = roles.includes('EMPLOYEE')
  const departments = Array.from(new Map(references.map(ref => [ref.departmentId, ref.departmentName])).entries())
  const occupations = references.filter(ref => ref.departmentId === department)
  const save = useMutation({ mutationFn: () => member ?
    updateMemberProfile(organization, member.membershipId, { fullName: name, roles, departmentId: department || null,
      occupationReferenceId: occupation || null, revision: member.revision }) :
    request(`/api/v1/organizations/${organization}/subscription/activations`, 'POST', {
      fullName: name, email, roles, departmentId: department || null, occupationReferenceId: occupation || null,
    }), onSuccess: () => saved(!member) })
  const title = member ? c('Edit User', 'Sửa người dùng') : c('Create User', 'Tạo người dùng')
  return <Dialog open onOpenChange={open => { if (!open && !save.isPending) close() }} ariaLabel={title} className="max-w-2xl">
    <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>
      {member ? c('Update the workspace profile and assignments. Activated email and credentials remain unchanged.', 'Cập nhật hồ sơ và phân công. Email đã kích hoạt và thông tin bảo mật không đổi.') :
        c('The recipient receives an activation link and chooses their own password. No seat is consumed until activation.', 'Người nhận được liên kết kích hoạt và tự đặt mật khẩu. Chưa tính ghế cho đến khi kích hoạt.')}
    </DialogDescription></DialogHeader>
    <form className="space-y-4 overflow-y-auto px-1" onSubmit={event => { event.preventDefault(); save.mutate() }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2 text-body-sm font-medium">{c('Full name', 'Họ tên')}<Input required maxLength={120} value={name} onChange={event => setName(event.target.value)} /></label>
        <label className="block space-y-2 text-body-sm font-medium">Email<Input required type="email" maxLength={254} readOnly={!!member} className={member ? 'bg-muted text-muted-foreground' : ''} value={email} onChange={event => setEmail(event.target.value)} /></label>
      </div>
      <fieldset className="rounded-lg border border-border p-3">
        <legend className="px-1 text-body-sm font-semibold">{c('Organization role', 'Vai trò trong tổ chức')}</legend>
        <div className="grid gap-2 sm:grid-cols-2">{ROLES.map(role => <label key={role} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-body-sm ${roles.includes(role) ? 'border-primary/30 bg-secondary/40' : 'border-border bg-card'}`}>
          <input type="radio" name="organization-role" className="h-4 w-4 accent-primary" checked={roles.length === 1 && roles[0] === role}
            onChange={() => setRoles([role])} />
          {roleName(role, c)}
        </label>)}</div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-body-sm">{c('Department', 'Phòng ban')}
          <select aria-label={c('Department', 'Phòng ban')} className={selectClass} required={employee} value={department}
            onChange={event => { setDepartment(event.target.value); setOccupation('') }}>
            <option value="">{c('Select department', 'Chọn phòng ban')}</option>
            {departments.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            {member?.departmentId && !departments.some(([id]) => id === member.departmentId) &&
              <option value={member.departmentId}>{member.departmentName ?? member.departmentId} ({c('historical', 'lịch sử')})</option>}
          </select>
        </label>
        <label className="space-y-1 text-body-sm">{c('Occupation', 'Nghề nghiệp')}
          <select aria-label={c('Occupation', 'Nghề nghiệp')} className={selectClass} required={employee} disabled={!department} value={occupation}
            onChange={event => setOccupation(event.target.value)}>
            <option value="">{c('Select occupation', 'Chọn nghề nghiệp')}</option>
            {occupations.map(ref => <option key={ref.occupationReferenceId} value={ref.occupationReferenceId}>{ref.occupationName}</option>)}
            {member?.occupationReferenceId && member.departmentId === department && !occupations.some(ref => ref.occupationReferenceId === member.occupationReferenceId) &&
              <option value={member.occupationReferenceId}>{member.occupationName ?? member.occupationReferenceId} ({c('historical', 'lịch sử')})</option>}
          </select>
        </label>
      </div>
      {referenceLoading && <Loading />}
      {referenceError != null && <Failure error={referenceError} />}
      {!referenceLoading && !referenceError && references.length === 0 && <p role="status" className="text-body-sm text-muted-foreground">
        {c('Employee creation requires real department and occupation data from the upstream catalog. No sample values will be substituted.', 'Tạo Nhân viên cần dữ liệu phòng ban và nghề nghiệp thực từ danh mục. Không thay bằng dữ liệu mẫu.')}
      </p>}
      {save.isError && <Failure error={save.error} />}
      <DialogFooter><Button variant="outline" disabled={save.isPending} onClick={close}>{c('Cancel', 'Hủy')}</Button>
        <Button type="submit" isLoading={save.isPending} disabled={!enabled || roles.length === 0 || (employee && (!department || !occupation))}>
          {member ? c('Save changes', 'Lưu thay đổi') : c('Send activation link', 'Gửi liên kết kích hoạt')}
        </Button></DialogFooter>
    </form>
  </Dialog>
}
