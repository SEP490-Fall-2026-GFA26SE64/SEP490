import { useState, useMemo, useEffect } from 'react'
import { Building2, Briefcase, Trash2, Plus, Search, Users, Mail, UserCheck, UserX, Eye, Pencil, ShieldCheck, User, Target } from 'lucide-react'
import { Combobox, type ComboboxOption } from '../../../shared/components/ui/Combobox'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AdminPageLayout } from '../AdminPageLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../shared/components/ui/Card'
import { Button } from '../../../shared/components/ui/Button'
import { Input } from '../../../shared/components/ui/Input'
import { Badge } from '../../../shared/components/ui/Badge'
import { StatCard } from '../../../shared/components/ui/StatCard'
import { Pagination } from '../../../shared/components/ui/Pagination'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../shared/components/ui/Dialog'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { decodeJobPositionWithTargetRole, encodeJobPositionWithTargetRole, getIdentity, getMembers, getPendingActivations, getReferences, getSummary, request, updateMemberProfile,
  type Identity, type Member, type PendingActivation, type Reference } from '../../subscription/subscriptionApi'
import { Failure, Loading, useCopy } from '../../subscription/SubscriptionFeedback'
import { loadDepartments, updateDepartment, type DepartmentRecord } from '../../../shared/stores/departmentStore'
import { fetchDepartments, updateDepartmentApi, createDepartmentApi, type DepartmentDto } from '../../../shared/api/departmentApi'
import { fetchJobPositions, type JobPositionDto } from '../../../shared/api/jobPositionApi'
import { workspaceFetch } from '../../../shared/api/workspaceFetch'
import {
  getAvailableJobPositions,
  resolveJobPositionForRole,
  type JobPosition,
  type TargetRoleModel,
} from '../../manager/data/ldManagerMockData'
import { getActiveCompany, resolveWorkspaceOrgId } from '../../../shared/stores/companyStore'

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

// ---------------------------------------------------------------------------
// Pure JavaScript MD5 & Type 3 Deterministic UUID (matching Java's nameUUIDFromBytes)
// ---------------------------------------------------------------------------
function md5(input: string): number[] {
  function safeAdd(x: number, y: number): number {
    const lsw = (x & 0xffff) + (y & 0xffff)
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16)
    return (msw << 16) | (lsw & 0xffff)
  }
  function bitRol(num: number, cnt: number): number { return (num << cnt) | (num >>> (32 - cnt)) }
  function md5cmn(q: number, a: number, b: number, x: number, s: number, t: number): number {
    return safeAdd(bitRol(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b)
  }
  function md5ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return md5cmn((b & c) | (~b & d), a, b, x, s, t)
  }
  function md5gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return md5cmn((b & d) | (c & ~d), a, b, x, s, t)
  }
  function md5hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return md5cmn(b ^ c ^ d, a, b, x, s, t)
  }
  function md5ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
    return md5cmn(c ^ (b | ~d), a, b, x, s, t)
  }

  const bytes = new TextEncoder().encode(input)
  const n = bytes.length
  const words: number[] = []
  for (let i = 0; i < n; i++) words[i >> 2] |= bytes[i] << ((i % 4) * 8)
  words[n >> 2] |= 0x80 << ((n % 4) * 8)
  const len = (((n + 8) >> 6) + 1) * 16
  for (let i = (n >> 2) + 1; i < len; i++) words[i] = 0
  words[len - 2] = n * 8
  words[len - 1] = Math.floor((n * 8) / 0x100000000)

  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878
  for (let i = 0; i < len; i += 16) {
    const olda = a, oldb = b, oldc = c, oldd = d
    a = md5ff(a, b, c, d, words[i], 7, -680876936); d = md5ff(d, a, b, c, words[i+1], 12, -389564586)
    c = md5ff(c, d, a, b, words[i+2], 17, 606105819); b = md5ff(b, c, d, a, words[i+3], 22, -1044525330)
    a = md5ff(a, b, c, d, words[i+4], 7, -176418897); d = md5ff(d, a, b, c, words[i+5], 12, 1200080426)
    c = md5ff(c, d, a, b, words[i+6], 17, -1473231341); b = md5ff(b, c, d, a, words[i+7], 22, -45705983)
    a = md5ff(a, b, c, d, words[i+8], 7, 1770035416); d = md5ff(d, a, b, c, words[i+9], 12, -1958414417)
    c = md5ff(c, d, a, b, words[i+10], 17, -42063); b = md5ff(b, c, d, a, words[i+11], 22, -1990404162)
    a = md5ff(a, b, c, d, words[i+12], 7, 1804603682); d = md5ff(d, a, b, c, words[i+13], 12, -40341101)
    c = md5ff(c, d, a, b, words[i+14], 17, -1502002290); b = md5ff(b, c, d, a, words[i+15], 22, 1236535329)

    a = md5gg(a, b, c, d, words[i+1], 5, -165796510); d = md5gg(d, a, b, c, words[i+6], 9, -1069501632)
    c = md5gg(c, d, a, b, words[i+11], 14, 643717713); b = md5gg(b, c, d, a, words[i], 20, -373897302)
    a = md5gg(a, b, c, d, words[i+5], 5, -701558691); d = md5gg(d, a, b, c, words[i+10], 9, 38016083)
    c = md5gg(c, d, a, b, words[i+15], 14, -660478335); b = md5gg(b, c, d, a, words[i+4], 20, -405537848)
    a = md5gg(a, b, c, d, words[i+9], 5, 568446438); d = md5gg(d, a, b, c, words[i+14], 9, -1019803690)
    c = md5gg(c, d, a, b, words[i+3], 14, -187363961); b = md5gg(b, c, d, a, words[i+8], 20, 1163531501)
    a = md5gg(a, b, c, d, words[i+13], 5, -1444681467); d = md5gg(d, a, b, c, words[i+2], 9, -51403784)
    c = md5gg(c, d, a, b, words[i+7], 14, 1735328473); b = md5gg(b, c, d, a, words[i+12], 20, -1926607734)

    a = md5hh(a, b, c, d, words[i+5], 4, -378558); d = md5hh(d, a, b, c, words[i+8], 11, -2022574463)
    c = md5hh(c, d, a, b, words[i+11], 16, 1839030562); b = md5hh(b, c, d, a, words[i+14], 23, -35309556)
    a = md5hh(a, b, c, d, words[i+1], 4, -1530992060); d = md5hh(d, a, b, c, words[i+4], 11, 1272893353)
    c = md5hh(c, d, a, b, words[i+7], 16, -155497632); b = md5hh(b, c, d, a, words[i+10], 23, -1094730640)
    a = md5hh(a, b, c, d, words[i+13], 4, 681279174); d = md5hh(d, a, b, c, words[i], 11, -358537222)
    c = md5hh(c, d, a, b, words[i+3], 16, -722521979); b = md5hh(b, c, d, a, words[i+6], 23, 76029189)
    a = md5hh(a, b, c, d, words[i+9], 4, -640364487); d = md5hh(d, a, b, c, words[i+12], 11, -421815835)
    c = md5hh(c, d, a, b, words[i+15], 16, 530742520); b = md5hh(b, c, d, a, words[i+2], 23, -995338651)

    a = md5ii(a, b, c, d, words[i], 6, -198630844); d = md5ii(d, a, b, c, words[i+7], 10, 1126891415)
    c = md5ii(c, d, a, b, words[i+14], 15, -1416354905); b = md5ii(b, c, d, a, words[i+5], 21, -57434055)
    a = md5ii(a, b, c, d, words[i+12], 6, 1700485571); d = md5ii(d, a, b, c, words[i+3], 10, -1894986606)
    c = md5ii(c, d, a, b, words[i+10], 15, -1051523); b = md5ii(b, c, d, a, words[i+1], 21, -2054922799)
    a = md5ii(a, b, c, d, words[i+8], 6, 1873313359); d = md5ii(d, a, b, c, words[i+15], 10, -30611744)
    c = md5ii(c, d, a, b, words[i+6], 15, -1560198380); b = md5ii(b, c, d, a, words[i+13], 21, 1309151649)
    a = md5ii(a, b, c, d, words[i+4], 6, -145523070); d = md5ii(d, a, b, c, words[i+11], 10, -1120210379)
    c = md5ii(c, d, a, b, words[i+2], 15, 718787259); b = md5ii(b, c, d, a, words[i+9], 21, -343485551)

    a = safeAdd(a, olda); b = safeAdd(b, oldb); c = safeAdd(c, oldc); d = safeAdd(d, oldd)
  }
  const out: number[] = []
  for (const w of [a, b, c, d]) {
    for (let j = 0; j < 4; j++) out.push((w >> (j * 8)) & 0xff)
  }
  return out
}

export function toDeterministicUuid(name: string): string {
  if (!name) return ''
  const hash = md5(name)
  hash[6] = (hash[6] & 0x0f) | 0x30
  hash[8] = (hash[8] & 0x3f) | 0x80
  const hex = hash.map(b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export interface DepartmentItem {
  id: string
  code: string
  name: string
  description?: string
  headOfDepartment?: string
  headEmail?: string
  linkedJobPositions: string[]
  uuid: string
  uuidCode: string
}

export interface JobPositionItem {
  code: string
  name: string
  description?: string
  jobPositionReferenceId: string
  jobPositionName: string
  uuid: string
}

export function resolveDepartment(
  rawId: string | null | undefined,
  rawName: string | null | undefined,
  departments: DepartmentItem[]
): DepartmentItem | null {
  if (!rawId && !rawName) return null
  const idLower = (rawId || '').toLowerCase().trim()
  const nameLower = (rawName || '').toLowerCase().trim()

  for (const d of departments) {
    if (
      d.id.toLowerCase() === idLower ||
      d.code.toLowerCase() === idLower ||
      d.uuid.toLowerCase() === idLower ||
      d.uuidCode.toLowerCase() === idLower ||
      (nameLower && (d.name.toLowerCase() === nameLower || d.code.toLowerCase() === nameLower))
    ) {
      return d
    }
  }

  // Fallback if not matched but rawName is clean
  if (rawName && !rawName.startsWith('Department ') && !rawName.match(/^[0-9a-f]{8}-[0-9a-f]{4}/i)) {
    return {
      id: rawId || rawName,
      code: rawName.replace(/^dept-/, '').toUpperCase().slice(0, 8),
      name: rawName,
      description: 'Organizational business unit',
      linkedJobPositions: [],
      uuid: '',
      uuidCode: '',
    }
  }
  return null
}

export function resolveJobPosition(
  rawId: string | null | undefined,
  rawName: string | null | undefined,
  jobPositions: {
    code: string
    name: string
    description?: string
    jobPositionReferenceId?: string
    jobPositionName?: string
    uuid?: string
  }[]
): JobPositionItem | null {
  if (!rawId && !rawName) return null
  const idLower = (rawId || '').toLowerCase().trim()
  const nameLower = (rawName || '').toLowerCase().trim()

  for (const jp of jobPositions) {
    const jpCodeLower = (jp.code || '').toLowerCase().trim()
    const jpUuid = toDeterministicUuid(jp.code || '').toLowerCase().trim()
    const jpRefId = (jp as any).jobPositionReferenceId ? String((jp as any).jobPositionReferenceId).toLowerCase().trim() : ''
    const itemUuid = (jp as any).uuid ? String((jp as any).uuid).toLowerCase().trim() : ''
    const jpNameLower = (jp.name || '').toLowerCase().trim()
    const jpFullNameLower = (jp as any).jobPositionName ? String((jp as any).jobPositionName).toLowerCase().trim() : `${jpCodeLower} - ${jpNameLower}`

    if (
      (idLower && (
        jpCodeLower === idLower ||
        jpUuid === idLower ||
        (jpRefId && jpRefId === idLower) ||
        (itemUuid && itemUuid === idLower)
      )) ||
      (nameLower && (
        jpNameLower === nameLower ||
        jpFullNameLower === nameLower ||
        `${jpCodeLower} - ${jpNameLower}` === nameLower ||
        (nameLower.length > 3 && jpNameLower.includes(nameLower)) ||
        (jpNameLower.length > 3 && nameLower.includes(jpNameLower))
      ))
    ) {
      return {
        code: jp.code,
        name: jp.name,
        description: jp.description,
        jobPositionReferenceId: (jp as any).jobPositionReferenceId || jp.code,
        jobPositionName: (jp as any).jobPositionName || `${jp.code} - ${jp.name}`,
        uuid: itemUuid || jpUuid,
      }
    }
  }

  if (rawName && !rawName.startsWith('Job Position ') && !rawName.match(/^[0-9a-f]{8}-[0-9a-f]{4}/i)) {
    return {
      code: rawId || '',
      name: rawName,
      description: 'Standard industry competency profile',
      jobPositionReferenceId: rawId || '',
      jobPositionName: rawName,
      uuid: '',
    }
  }
  return null
}

export interface StoredEmployeeRoleAssignment {
  roleId: string
  roleCode: string
  roleTitle: string
  level: string
  departmentId?: string
  departmentName?: string
  jobPositionCode?: string
  jobPositionName?: string
}

export function resolveEmployeeTargetRoleAssignment(
  member?: Pick<Member, 'email' | 'targetRoleId' | 'targetRoleCode' | 'targetRoleName' | 'targetRoleLevel' | 'departmentId' | 'departmentName' | 'jobPositionName'> | null,
  fallbackEmail?: string | null,
): StoredEmployeeRoleAssignment | null {
  const decoded = decodeJobPositionWithTargetRole(member?.jobPositionName)
  const effRoleId = member?.targetRoleId || decoded.targetRoleId
  if (effRoleId) {
    const rawLvl = member?.targetRoleLevel || decoded.targetRoleLevel || 'Junior'
    const cleanLvl = rawLvl.replace(/^(?:rank|level)\s*\d+\s*:\s*/i, '').trim()
    return {
      roleId: effRoleId,
      roleCode: member?.targetRoleCode || decoded.targetRoleCode || effRoleId,
      roleTitle: member?.targetRoleName || decoded.targetRoleName || member?.targetRoleCode || effRoleId,
      level: cleanLvl || 'Junior',
      departmentId: member?.departmentId || undefined,
      departmentName: member?.departmentName || undefined,
      jobPositionName: decoded.cleanJobPositionName || member?.jobPositionName || undefined,
    }
  }
  const email = (member?.email || fallbackEmail || '').toLowerCase().trim()
  if (!email || typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(`alg_employee_assignment_${email}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredEmployeeRoleAssignment>
    const roleId = (parsed.roleId || parsed.roleCode || '').trim()
    if (!roleId) return null
    const rawLvl = (parsed.level || 'Junior').trim()
    const cleanLvl = rawLvl.replace(/^(?:rank|level)\s*\d+\s*:\s*/i, '').trim()
    return {
      roleId,
      roleCode: (parsed.roleCode || roleId).trim(),
      roleTitle: (parsed.roleTitle || parsed.roleCode || roleId).trim(),
      level: cleanLvl || 'Junior',
      departmentId: parsed.departmentId,
      departmentName: parsed.departmentName,
      jobPositionCode: parsed.jobPositionCode,
      jobPositionName: parsed.jobPositionName,
    }
  } catch {
    return null
  }
}

interface DirectoryRow {
  id: string
  fullName: string | null
  email: string
  roles: string[]
  status: string
  departmentName: string | null
  departmentCode: string | null
  departmentLeadership: string | null
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

  const [localDepts, setLocalDepts] = useState<DepartmentRecord[]>(() => loadDepartments(organization))

  const refetchLiveDepts = liveDeptsQuery.refetch

  useEffect(() => {
    setLocalDepts(loadDepartments(organization))
    const handleUpdated = () => {
      setLocalDepts(loadDepartments(organization))
      refetchLiveDepts()
    }
    window.addEventListener('departments_updated', handleUpdated)
    return () => window.removeEventListener('departments_updated', handleUpdated)
  }, [organization, refetchLiveDepts])
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
          jobZone: jp.jobZone || localMatch?.jobZone || existing?.jobZone || 4,
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
          headOfDepartment: ld.headOfDepartment,
          headEmail: ld.headEmail,
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
          headOfDepartment: ld.headOfDepartment,
          headEmail: ld.headEmail,
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
  }, [liveDeptsQuery.data, localDepts, references.data])

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
        departmentLeadership: resolvedDept?.headOfDepartment || null,
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
        departmentLeadership: resolvedDept?.headOfDepartment || null,
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
        <Button
          disabled={!editable || isCapReached}
          leftIcon={<Plus size={16} aria-hidden="true" />}
          onClick={() => { setNotice(null); setForm({ member: null }) }}
          title={isCapReached ? c('Seat limit reached. Upgrade subscription to add more users.', 'Đã đạt giới hạn ghế thành viên. Nâng cấp gói để thêm người dùng.') : undefined}
        >
          {c('Create User', 'Tạo người dùng')}
        </Button>
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
                    <span className="text-caption text-muted-foreground block">{c('Target Role Title', 'Chức danh mục tiêu')}</span>
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
  }, [member?.departmentId, member?.departmentName, allDepartments])

  const initialJobObj = useMemo(() => {
    if (!member?.jobPositionReferenceId && !member?.jobPositionName) return null
    return resolveJobPosition(member.jobPositionReferenceId, member.jobPositionName, jobPositions)
  }, [member?.jobPositionReferenceId, member?.jobPositionName, jobPositions])

  const [department, setDepartment] = useState(initialDeptObj?.id || member?.departmentId || '')
  const [jobPosition, setJobPosition] = useState(initialJobObj?.jobPositionReferenceId || initialJobObj?.code || member?.jobPositionReferenceId || '')
  const [tempDeptId, setTempDeptId] = useState('')
  const [tempJobPositionId, setTempJobPositionId] = useState('')

  const activeComp = getActiveCompany()
  const liveTargetRolesQuery = useQuery({
    queryKey: ['admin-org-target-roles', organization],
    queryFn: async () => {
      if (!organization) return []
      const targetOrgId = resolveWorkspaceOrgId(organization)
      try {
        const res = await fetch(`/api/v1/organizations/${targetOrgId}/target-roles`, {
          method: 'GET',
          credentials: 'same-origin',
          headers: {
            'X-User-Role': 'ORGANIZATION_ADMINISTRATOR',
          },
        })
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) {
            return data as Record<string, unknown>[]
          }
        }
      } catch {
        // fallback if restricted
      }

      // Try employee target-roles endpoint if organization call is restricted
      try {
        const empRes = await workspaceFetch('/api/v1/employee/target-roles', { method: 'GET' })
        if (empRes.ok) {
          const empData = await empRes.json()
          if (Array.isArray(empData) && empData.length > 0) {
            return empData as Record<string, unknown>[]
          }
        }
      } catch {
        // ignore
      }

      // Fallback to public platform catalog template when organization endpoint is restricted by role
      try {
        const catRes = await workspaceFetch('/api/v1/platform-catalog', { method: 'GET' })
        if (catRes.ok) {
          const graph = (await catRes.json()) as {
            version?: string
            nodes?: Array<{ id?: string; label?: string; name?: string; code?: string }>
            edges?: Array<{ from?: string; to?: string; type?: string }>
          }
          const roleToJobOcc = new Map<string, string>()
          for (const edge of graph.edges || []) {
            if (edge.type === 'HAS_ROLE' && edge.from && edge.to) {
              roleToJobOcc.set(edge.to, edge.from.replace(/^OCC-/, ''))
            }
          }
          const platformRoles: Record<string, unknown>[] = []
          for (const node of graph.nodes || []) {
            if (node.label === 'TargetRole' && node.id) {
              platformRoles.push({
                id: node.id,
                code: node.code || node.id,
                name: node.name || node.code || node.id,
                jobPositionCode: roleToJobOcc.get(node.id),
                status: 'ACTIVE',
                version: graph.version || '0.12.0',
              })
            }
          }
          if (platformRoles.length > 0) {
            return platformRoles
          }
        }
      } catch {
        // ignore platform catalog fallback error
      }
      return []
    },
    enabled: Boolean(organization && enabled),
    staleTime: 15000,
  })

  const roleMetaByCode = useMemo(() => {
    const map: Record<string, { jobPositionCode?: string; department?: string; levelNames?: string[]; status?: string }> = {}
    if (typeof localStorage === 'undefined') return map
    try {
      const resolvedOrg = resolveWorkspaceOrgId(organization)
      const keys = Array.from(
        new Set(
          resolvedOrg === 'e0000000-0000-0000-0000-000000000001'
            ? [
                `adaptlearn_target_role_meta_${organization}`,
                'adaptlearn_target_role_meta_e0000000-0000-0000-0000-000000000001',
              ]
            : [`adaptlearn_target_role_meta_${organization}`, `adaptlearn_target_role_meta_${resolvedOrg}`],
        ),
      )
      for (const k of keys) {
        const raw = localStorage.getItem(k)
        if (!raw) continue
        const parsed = JSON.parse(raw) as Record<string, { code?: string; jobPositionCode?: string; department?: string; levelNames?: string[]; status?: string }>
        for (const [key, val] of Object.entries(parsed || {})) {
          if (val) {
            map[key.toUpperCase()] = val
            if (val.code) map[val.code.toUpperCase()] = val
          }
        }
      }
    } catch {
      // ignore storage errors
    }
    return map
  }, [organization])

  const orgTargetRoles = useMemo<TargetRoleModel[]>(() => {
    const isSameOrgAsActiveComp = resolveWorkspaceOrgId(activeComp?.id) === resolveWorkspaceOrgId(organization)
    const localRoles = isSameOrgAsActiveComp ? (activeComp?.targetRoles || []) : []
    const liveRaw = liveTargetRolesQuery.data || []
    const knownJpCodes = new Set(
      jobPositions.map((jp) => (jp.code || '').trim().toUpperCase().replace(/^OCC-/, '').replace(/\.00$/, '')),
    )
    const liveMapped: TargetRoleModel[] = liveRaw.map((r) => {
      const code = String(r.code || '').trim()
      const codeUpper = code.toUpperCase()
      const meta = roleMetaByCode[codeUpper] || roleMetaByCode[String(r.id || '').toUpperCase()]
      const localMatch = localRoles.find(
        (lr) => lr.id === String(r.id || '') || lr.code?.trim().toUpperCase() === codeUpper,
      )
      const rawStatus = String(r.status || '').toLowerCase()
      const metaStatus = String(meta?.status || '').toLowerCase()
      const localStatus = String(localMatch?.status || '').toLowerCase()
      const mappedStatus: TargetRoleModel['status'] =
        metaStatus === 'unpublished' || rawStatus === 'unpublished' || localStatus === 'unpublished'
          ? 'unpublished'
          : rawStatus === 'active' || rawStatus === 'published' || localStatus === 'published' || localStatus === 'active'
            ? 'published'
            : rawStatus === 'submitted'
              ? 'submitted'
              : rawStatus === 'sent'
                ? 'sent'
                : rawStatus === 'rejected'
                  ? 'rejected'
                  : 'draft'
      const rawFamilyCode = r.familyCode ? String(r.familyCode).trim() : ''
      const familyNorm = rawFamilyCode.toUpperCase().replace(/^OCC-/, '').replace(/\.00$/, '')
      const familyAsJobPosCode =
        rawFamilyCode && (/^\d{2}-\d{4}/.test(rawFamilyCode) || knownJpCodes.has(familyNorm))
          ? rawFamilyCode
          : undefined
      return {
        id: String(r.id || code),
        stableId: code,
        code,
        title: String(r.name || r.title || localMatch?.title || code),
        department: String(r.department || meta?.department || localMatch?.department || ''),
        jobPositionCode:
          (r.jobPositionCode ? String(r.jobPositionCode) : undefined) ||
          meta?.jobPositionCode ||
          localMatch?.jobPositionCode ||
          familyAsJobPosCode,
        familyCode: rawFamilyCode || localMatch?.familyCode,
        description: String(r.description || localMatch?.description || ''),
        version: String(r.version || localMatch?.version || '1.0'),
        status: mappedStatus,
        competencyIds: Array.isArray(r.competencyIds) ? (r.competencyIds as string[]) : localMatch?.competencyIds || [],
        skillTargets: Array.isArray(r.skillTargets)
          ? (r.skillTargets as TargetRoleModel['skillTargets'])
          : localMatch?.skillTargets || [],
        levels:
          Array.isArray(r.levels) && (r.levels as string[]).length > 0
            ? (r.levels as string[])
            : meta?.levelNames || localMatch?.levels || ['Senior', 'Middle', 'Junior'],
        activeEnrollments: 0,
        updatedAt: String(r.updatedAt || localMatch?.updatedAt || '2026-01-01T00:00:00Z'),
      }
    })

    const dedupedByCode = new Map<string, TargetRoleModel>()
    const isLiveFromBackend = new Set<string>()

    // 1. Live mapped database roles are authoritative
    for (const role of liveMapped) {
      const codeKey = (role.code || '').trim().toUpperCase()
      if (!codeKey) continue
      const meta = roleMetaByCode[codeKey] || roleMetaByCode[(role.id || '').toUpperCase()]
      const metaStatus = meta?.status?.toLowerCase()
      const status = (metaStatus === 'unpublished') ? 'unpublished' : role.status
      const enriched: TargetRoleModel = {
        ...role,
        status,
        jobPositionCode: role.jobPositionCode || meta?.jobPositionCode,
        department: role.department || meta?.department || '',
        levels:
          role.levels && role.levels.length > 0
            ? role.levels
            : meta?.levelNames || ['Senior', 'Middle', 'Junior'],
      }
      const existing = dedupedByCode.get(codeKey)
      const isPublishedOrUnpublished = status === 'published' || status === 'unpublished'
      const existingIsPublishedOrUnpublished =
        existing?.status === 'published' || existing?.status === 'unpublished'
      if (!existing || (isPublishedOrUnpublished && !existingIsPublishedOrUnpublished)) {
        dedupedByCode.set(codeKey, enriched)
      }
      isLiveFromBackend.add(codeKey)
    }

    // 2. Only fall back to local-only roles if live backend returned nothing
    if (liveMapped.length === 0) {
      for (const role of localRoles) {
        const codeKey = (role.code || '').trim().toUpperCase()
        if (!codeKey || isLiveFromBackend.has(codeKey)) continue
        const meta = roleMetaByCode[codeKey] || roleMetaByCode[(role.id || '').toUpperCase()]
        const metaStatus = meta?.status?.toLowerCase()
        const status = (metaStatus === 'unpublished') ? 'unpublished' : role.status
        const enriched: TargetRoleModel = {
          ...role,
          status,
          jobPositionCode: role.jobPositionCode || meta?.jobPositionCode,
          department: role.department || meta?.department || '',
          levels:
            role.levels && role.levels.length > 0
              ? role.levels
              : meta?.levelNames || ['Senior', 'Middle', 'Junior'],
        }
        const existing = dedupedByCode.get(codeKey)
        if (!existing) {
          dedupedByCode.set(codeKey, enriched)
        }
      }
    }

    return Array.from(dedupedByCode.values())
  }, [activeComp?.targetRoles, liveTargetRolesQuery.data, roleMetaByCode])

  const initialTargetRoleAssignment = useMemo(
    () => resolveEmployeeTargetRoleAssignment(member, member?.email),
    [member],
  )
  const [targetRoleId, setTargetRoleId] = useState(initialTargetRoleAssignment?.roleId || '')
  const [targetRoleLevel, setTargetRoleLevel] = useState(initialTargetRoleAssignment?.level || '')

  useEffect(() => {
    if (!initialTargetRoleAssignment || orgTargetRoles.length === 0) return
    const matched = orgTargetRoles.find(
      (r) =>
        r.id === initialTargetRoleAssignment.roleId ||
        r.code.trim().toUpperCase() === initialTargetRoleAssignment.roleCode.trim().toUpperCase() ||
        r.code.trim().toUpperCase() === initialTargetRoleAssignment.roleId.trim().toUpperCase() ||
        r.title.trim().toLowerCase() === initialTargetRoleAssignment.roleTitle.trim().toLowerCase(),
    )
    if (matched) {
      setTargetRoleId((prev) => {
        if (!prev || prev === initialTargetRoleAssignment.roleId || prev === initialTargetRoleAssignment.roleCode) {
          return matched.id
        }
        return prev
      })
      if (initialTargetRoleAssignment.level) {
        setTargetRoleLevel((prev) => prev || initialTargetRoleAssignment.level)
      }
    }
  }, [initialTargetRoleAssignment, orgTargetRoles])

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
        headOfDepartment: '',
        headEmail: '',
        linkedJobPositions: [],
        uuid: toDeterministicUuid(member.departmentId),
        uuidCode: '',
      }
    }
    return null
  }, [department, member, allDepartments])

  const availableTargetRolesForEmployee = useMemo(() => {
    if (!department && !selectedDeptObj) return []

    const normalizeOccCode = (c?: string) => (c || '').trim().toUpperCase().replace(/^OCC-/, '').replace(/\.00$/, '')
    const getRoleOccCode = (r: TargetRoleModel): string => {
      if (r.jobPositionCode && r.jobPositionCode.trim()) {
        return r.jobPositionCode.trim()
      }
      return resolveJobPositionForRole(r, organization).code
    }

    // Strictly published only: NEVER include unpublished, inactive, or draft roles
    const publishedRoles = orgTargetRoles.filter((r) => {
      const s = String(r.status || '').toLowerCase()
      return s === 'published' || s === 'active'
    })

    // 1. Resolve jobPosition code if selected
    let targetOccNorm = ''
    if (jobPosition) {
      const matchedJpObj =
        jobPositions.find(
          (jp) =>
            jp.code === jobPosition ||
            jp.name.toLowerCase() === jobPosition.toLowerCase(),
        ) ||
        references.find((ref) => ref.jobPositionReferenceId === jobPosition)
      targetOccNorm = normalizeOccCode(
        (matchedJpObj && 'code' in matchedJpObj ? matchedJpObj.code : '') || jobPosition,
      )
    }

    // 2. Resolve department's linked job positions + domain fallback
    const deptLinkedNorm = new Set(
      (selectedDeptObj?.linkedJobPositions || []).map((c) => normalizeOccCode(c)).filter(Boolean),
    )
    const deptName = (selectedDeptObj?.name || '').toLowerCase().trim()
    const deptCode = (selectedDeptObj?.code || '').toLowerCase().trim()
    if (deptName.includes('cognitive') || deptName.includes('software') || deptCode === 'eng-cog' || deptCode === 'eng-swe') {
      deptLinkedNorm.add('15-1252')
    } else if (deptName.includes('data') || deptName.includes('artificial') || deptCode === 'eng-data') {
      deptLinkedNorm.add('15-1243')
    } else if (deptName.includes('quality') || deptName.includes('assurance') || deptCode === 'eng-qa') {
      deptLinkedNorm.add('15-1253')
    } else if (deptName.includes('cloud') || deptName.includes('infrastructure') || deptCode === 'eng-cloud') {
      deptLinkedNorm.add('15-1299.08')
    } else if (deptName.includes('security') || deptName.includes('cyber') || deptCode === 'eng-sec') {
      deptLinkedNorm.add('15-1212')
    }

    // Filter strictly to published roles belonging to the selected job position (if it has roles) or selected department
    if (targetOccNorm) {
      const jpMatched = publishedRoles.filter((r) => normalizeOccCode(getRoleOccCode(r)) === targetOccNorm)
      if (jpMatched.length > 0) {
        return jpMatched.sort((a, b) => a.title.localeCompare(b.title))
      }
    }

    const deptMatched = publishedRoles.filter((r) => {
      const occNorm = normalizeOccCode(getRoleOccCode(r))
      const rDept = (r.department || '').toLowerCase().trim()
      return (
        deptLinkedNorm.has(occNorm) ||
        (deptName && rDept && (rDept === deptName || rDept.includes(deptName) || deptName.includes(rDept)))
      )
    })

    return deptMatched.sort((a, b) => a.title.localeCompare(b.title))
  }, [orgTargetRoles, jobPosition, department, selectedDeptObj, organization, jobPositions, references])

  const employeeTargetRoleOptions: ComboboxOption[] = useMemo(() => {
    return availableTargetRolesForEmployee.map((r) => ({
      value: r.id,
      label: `${r.code} - ${r.title}`,
    }))
  }, [availableTargetRolesForEmployee])

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
    if (!department) return []
    const linked = new Set(selectedDeptObj?.linkedJobPositions || [])

    const matching = jobPositions
      .filter(jp => linked.has(jp.code) || linked.has(jp.name) || Array.from(linked).some(lc => lc.includes(jp.code)))
      .map(jp => ({
        code: jp.code,
        name: jp.name,
        description: jp.description || 'Industry job position competency domain',
        jobPositionReferenceId: (jp as any).jobPositionReferenceId || jp.code,
        jobPositionName: `${jp.code} - ${jp.name}`,
        uuid: toDeterministicUuid(jp.code),
      }))

    const deptIds = new Set<string>()
    if (department) deptIds.add(department.toLowerCase().trim())
    if (selectedDeptObj?.id) deptIds.add(selectedDeptObj.id.toLowerCase().trim())
    if (selectedDeptObj?.code) deptIds.add(selectedDeptObj.code.toLowerCase().trim())
    if (selectedDeptObj?.uuid) deptIds.add(selectedDeptObj.uuid.toLowerCase().trim())
    if (selectedDeptObj?.uuidCode) deptIds.add(selectedDeptObj.uuidCode.toLowerCase().trim())
    if (selectedDeptObj?.id) deptIds.add(toDeterministicUuid(selectedDeptObj.id).toLowerCase().trim())
    if (selectedDeptObj?.code) deptIds.add(toDeterministicUuid(selectedDeptObj.code).toLowerCase().trim())

    const deptNameLower = (selectedDeptObj?.name || '').toLowerCase().trim()

    const fromRefs = references
      .filter(ref => {
        const refDeptIdLower = (ref.departmentId || '').toLowerCase().trim()
        const refDeptNameLower = (ref.departmentName || '').toLowerCase().trim()
        return (refDeptIdLower && deptIds.has(refDeptIdLower)) || (deptNameLower && refDeptNameLower === deptNameLower)
      })
      .flatMap(ref => {
        const rawClean = (ref.jobPositionName || '').split('|')[0].trim()
        const cleanName = rawClean.startsWith('Job Position ')
          ? 'Software Developers'
          : rawClean
        const matchedCatalog = jobPositions.find(
          jp => jp.name.toLowerCase() === cleanName.toLowerCase() ||
                cleanName.toLowerCase().includes(jp.name.toLowerCase()) ||
                cleanName.includes(jp.code)
        )
        if (jobPositions.length > 0 && !matchedCatalog) {
          return []
        }
        const displayCode = matchedCatalog?.code || '15-1252.00'
        const displayName = matchedCatalog?.name || cleanName
        return [{
          code: displayCode,
          name: displayName,
          description: matchedCatalog?.description || 'Standard industry competency profile',
          jobPositionReferenceId: ref.jobPositionReferenceId || displayCode,
          jobPositionName: `${displayCode} - ${displayName}`,
          uuid: toDeterministicUuid(ref.jobPositionReferenceId || displayCode),
        }]
      })

    const map = new Map<string, JobPositionItem>()
    for (const r of fromRefs) {
      const codeKey = r.code.trim().toUpperCase()
      if (!map.has(codeKey)) {
        map.set(codeKey, r)
      }
    }
    for (const m of matching) {
      const codeKey = m.code.trim().toUpperCase()
      if (!map.has(codeKey)) {
        map.set(codeKey, m)
      }
    }

    if (map.size === 0) {
      for (const jp of jobPositions) {
        map.set(jp.code, {
          code: jp.code,
          name: jp.name,
          description: jp.description || 'Industry job position competency domain',
          jobPositionReferenceId: (jp as any).jobPositionReferenceId || jp.code,
          jobPositionName: `${jp.code} - ${jp.name}`,
          uuid: toDeterministicUuid(jp.code),
        })
      }
    }
    return Array.from(map.values())
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
    setTempDeptId('')
    setTempJobPositionId('')
  }

  const handleRemoveDepartment = () => {
    setDepartment('')
    setJobPosition('')
    setTempDeptId('')
    setTempJobPositionId('')
  }

  const handleAssignJobPosition = () => {
    if (!tempJobPositionId) return
    setJobPosition(tempJobPositionId)
    setTempJobPositionId('')
  }

  const handleRemoveJobPosition = () => {
    setJobPosition('')
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

          if (isLdManager) {
            if (member?.departmentId && member.departmentId !== selectedDeptObj?.id) {
              const oldDept = allDepartments.find((d) => d.id === member.departmentId || d.code === member.departmentId)
              if (oldDept) {
                updateDepartment(oldDept.id, { headOfDepartment: '', headEmail: '' }, organization)
                updateDepartmentApi(organization, oldDept.id, {
                  code: oldDept.code,
                  name: oldDept.name,
                  headOfDepartment: '',
                  headEmail: '',
                }).catch(() => {})
              }
            }
            if (selectedDeptObj?.id) {
              updateDepartment(selectedDeptObj.id, { headOfDepartment: name, headEmail: email }, organization)
              updateDepartmentApi(organization, selectedDeptObj.id, {
                code: selectedDeptObj.code,
                name: selectedDeptObj.name,
                headOfDepartment: name,
                headEmail: email,
              }).catch(() => {
                createDepartmentApi(organization, {
                  id: selectedDeptObj.id,
                  code: selectedDeptObj.code,
                  name: selectedDeptObj.name,
                  headOfDepartment: name,
                  headEmail: email,
                  status: 'ACTIVE',
                  linkedJobPositions: selectedDeptObj.linkedJobPositions,
                }).catch(() => {})
              })
            }
            window.dispatchEvent(new Event('departments_updated'))
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
                  {c('Select Target Role', 'Chọn Target Role')}
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
                  placeholder={c('Search & select target role for employee...', 'Tìm kiếm & chọn target role...')}
                  searchPlaceholder={c('Search by code or title...', 'Tìm theo mã hoặc tên...')}
                  emptyMessage={c('No target roles available', 'Không có target role nào')}
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
                  placeholder={targetRoleId ? c('Select starting level...', 'Chọn cấp độ khởi điểm...') : c('Select target role first...', 'Chọn vị trí mục tiêu trước...')}
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
