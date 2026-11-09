import { workspaceFetch as fetch } from '../../../shared/api/workspaceFetch'
import { fetchJobPositions } from '../../../shared/api/jobPositionApi'
import {
  fetchCompetencies,
  type CompetencyDto,
} from '../../../shared/api/competencyApi'
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  CornerDownRight,
  Diff,
  Edit3,
  Eye,
  EyeOff,
  FileCheck,
  History,
  Layers,
  Network as NetworkIcon,
  Plus,
  Search,
  Send,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react'
import * as React from 'react'
import { TargetRoleGraphModal } from './components/TargetRoleGraphModal'
import { TargetRoleVersionDiff } from './components/TargetRoleVersionDiff'
import { missingRoleLevelRequirements, roleRequirements, validRequiredKnowledge } from './roleRequirements'
import { formatRequiredKnowledge } from './roleKnowledgePresentation'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { Badge } from '../../../shared/components/ui/Badge'
import { Button } from '../../../shared/components/ui/Button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../shared/components/ui/Card'
import { Pagination } from '../../../shared/components/ui/Pagination'
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
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import { getMembers, getReferences, request } from '../../subscription/subscriptionApi'
import { fetchDepartments, updateDepartmentApi, createDepartmentApi, linkJobPositionToDepartment } from '../../../shared/api/departmentApi'
import { loadDepartments, updateDepartment } from '../../../shared/stores/departmentStore'
import {
  getActiveCompany,
  resolveWorkspaceOrgId,
  updateActiveCompany,
} from '../../../shared/stores/companyStore'
import {
  ELIGIBLE_EXPERTS,
  findEligibleExpert,
  type JobPosition,
  compareRoleVersions,
  formatDate,
  getAvailableJobPositions,
  normalizeExpertId,
  getEligibleExpertsForJobPosition,
  getOrganizationExperts,
  type EligibleExpert,
  resolveJobPositionForRole,
  sortTargetRolesWithDraftsBelowPublished,
  type RoleLevelThresholds,
  type CompetencyModel,
  type TargetRoleModel,
} from '../data/ldManagerMockData'
import {
  Combobox,
  type ComboboxOption,
} from '../../../shared/components/ui/Combobox'

export const getExpertOptionsForJobPosition = (
  jobPositionCode?: string,
  organizationId?: string,
  departmentScope?: { id?: string; code?: string; name?: string } | null,
): ComboboxOption[] => {
  const eligible = getEligibleExpertsForJobPosition(
    jobPositionCode,
    organizationId,
    departmentScope,
  )

  return eligible.map((exp) => ({
    value: exp.id,
    label: exp.name,
    description: exp.title,
  }))
}

const ROLE_PRESETS: ImportPreset[] = []

export type ManagerRoleStatus =
  | 'published'
  | 'submitted'
  | 'sent'
  | 'draft'
  | 'feedback'
  | 'rejected'
  | 'unpublished'

export const getManagerEffectiveStatus = (
  role: TargetRoleModel,
): ManagerRoleStatus => {
  if (role.status === 'published') return 'published'
  if (role.status === 'unpublished') return 'unpublished'
  if (role.status === 'submitted') return 'submitted'
  if (role.status === 'sent') return 'sent'

  if (role.status === 'rejected') {
    return role.rejectionReason?.startsWith('[LD_MANAGER]:')
      ? 'rejected'
      : 'feedback'
  }

  return 'draft'
}

interface RoleMetadata {
  id?: string
  code: string
  jobPositionCode?: string
  jobPositionTitle?: string
  department?: string
  departmentId?: string
  assignedExpertId?: string
  assignedExpertName?: string
  levelNames?: string[]
  levelDurations?: Record<string, string>
  status?: TargetRoleModel['status']
}

function parseDurationNumber(val?: string | number, defaultNum = 6): number {
  if (val === undefined || val === null || val === '') return defaultNum
  const match = String(val).match(/\d+/)
  if (match) {
    const parsed = parseInt(match[0], 10)
    return isNaN(parsed) || parsed < 1 ? defaultNum : parsed
  }
  return defaultNum
}

function resolveLevelDuration(
  role: Pick<TargetRoleModel, 'levelDurations'>,
  levelName: string,
  index: number,
): string {
  const defaultMonths = index === 0 ? 6 : index === 1 ? 4 : index === 2 ? 3 : 2
  const direct = role.levelDurations?.[levelName]
  if (direct && direct.trim()) return `${parseDurationNumber(direct, defaultMonths)} months`
  if (role.levelDurations) {
    const matchedKey = Object.keys(role.levelDurations).find(
      (k) => k.toLowerCase().trim() === levelName.toLowerCase().trim(),
    )
    if (matchedKey && role.levelDurations[matchedKey]?.trim()) {
      return `${parseDurationNumber(role.levelDurations[matchedKey], defaultMonths)} months`
    }
  }
  const lower = levelName.toLowerCase()
  if (lower.includes('senior') || index === 0) return '6 months'
  if (lower.includes('middle') || lower.includes('mid') || index === 1) return '4 months'
  if (lower.includes('junior') || index === 2) return '3 months'
  return '2 months'
}

function getRoleMetaKeys(orgId: string): string[] {
  const resolved = resolveWorkspaceOrgId(orgId)
  if (resolved === 'e0000000-0000-0000-0000-000000000001') {
    return Array.from(
      new Set([
        'adaptlearn_target_role_meta_' + orgId,
        'adaptlearn_target_role_meta_e0000000-0000-0000-0000-000000000001',
        'adaptlearn_target_role_meta_comp-technova',
        'adaptlearn_target_role_meta_workspace-development',
        'adaptlearn_target_role_meta_',
      ]),
    )
  }
  return Array.from(
    new Set([
      'adaptlearn_target_role_meta_' + orgId,
      'adaptlearn_target_role_meta_' + resolved,
    ]),
  )
}

function getTargetRoleMetaMap(orgId: string): Record<string, RoleMetadata> {
  const map: Record<string, RoleMetadata> = {}
  if (typeof localStorage === 'undefined') return map
  try {
    const keys = getRoleMetaKeys(orgId)
    for (const k of keys) {
      const raw = localStorage.getItem(k)
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, RoleMetadata>
        for (const [idOrCode, val] of Object.entries(parsed || {})) {
          if (val) {
            map[idOrCode.toUpperCase()] = { ...(map[idOrCode.toUpperCase()] || {}), ...val }
            if (val.code) {
              map[val.code.toUpperCase()] = { ...(map[val.code.toUpperCase()] || {}), ...val }
            }
          }
        }
      }
    }
  } catch {}
  return map
}

function saveTargetRoleMeta(orgId: string, meta: RoleMetadata): void {
  if (typeof localStorage === 'undefined') return
  try {
    const keys = getRoleMetaKeys(orgId)
    for (const k of keys) {
      const raw = localStorage.getItem(k)
      const current = raw ? (JSON.parse(raw) as Record<string, RoleMetadata>) : {}
      if (meta.code) {
        current[meta.code.toUpperCase()] = { ...(current[meta.code.toUpperCase()] || {}), ...meta }
      }
      if (meta.id) {
        current[meta.id] = { ...(current[meta.id] || {}), ...meta }
      }
      localStorage.setItem(k, JSON.stringify(current))
    }
  } catch {}
}

function deleteTargetRoleMeta(orgId: string, id?: string, code?: string): void {
  if (typeof localStorage === 'undefined') return
  try {
    const keys = getRoleMetaKeys(orgId)
    for (const k of keys) {
      const raw = localStorage.getItem(k)
      if (raw) {
        const current = JSON.parse(raw) as Record<string, RoleMetadata>
        if (code) delete current[code.toUpperCase()]
        if (id) delete current[id]
        localStorage.setItem(k, JSON.stringify(current))
      }
    }
  } catch {}
}

export function TargetRolesPage() {
  const { toast } = useToast()
  const { language, t } = useTranslation()
  const publicationCopy = (en: string, vi: string) => language === 'vi' ? vi : en
  const [publishingRoleId, setPublishingRoleId] = React.useState<string | null>(null)
  const publicationLock = React.useRef(false)

  // Master roles state

  const [roles, setRoles] = React.useState<TargetRoleModel[]>([])
  const [isRolesLoading, setIsRolesLoading] = React.useState(true)
  const [isDeptLoading, setIsDeptLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<
    | 'all'
    | 'published'
    | 'draft'
    | 'submitted'
    | 'sent'
    | 'feedback'
    | 'rejected'
    | 'unpublished'
  >('all')

  const [expandedLineages, setExpandedLineages] = React.useState<
    Record<string, boolean>
  >({})
  const toggleLineage = (lineageKey: string) => {
    setExpandedLineages((prev) => ({
      ...prev,
      [lineageKey]: !prev[lineageKey],
    }))
  }

  const session = React.useContext(WorkspaceSessionContext)
  const activeComp = getActiveCompany()
  const orgId = resolveWorkspaceOrgId(
    session?.identity?.organizationId || activeComp?.id,
  )
  const [availableJobPositions, setAvailableJobPositions] = React.useState<JobPosition[]>(() =>
    getAvailableJobPositions(orgId)
  )

  const refreshAvailableJobPositions = React.useCallback(async () => {
    const localAllPositions = getAvailableJobPositions(orgId, true)
    const localActivePositions = localAllPositions.filter((p) => p.status !== 'inactive')
    const localByCode = new Map(localAllPositions.map((p) => [p.code, p]))
    setAvailableJobPositions(localActivePositions)

    try {
      const apiPositions = await fetchJobPositions(orgId)
      if (Array.isArray(apiPositions) && apiPositions.length > 0) {
        const mergedMap = new Map<string, JobPosition>()
        for (const p of localActivePositions) {
          mergedMap.set(p.code, p)
        }
        for (const ap of apiPositions) {
          const code = ap.code || ap.id || ''
          if (code) {
            const localMatch = localByCode.get(code)
            const existing = mergedMap.get(code)
            const statusStr = String(
              localMatch?.status || (ap as any).status || existing?.status || 'active',
            ).toLowerCase()
            if (statusStr === 'inactive') {
              mergedMap.delete(code)
              continue
            }
            mergedMap.set(code, {
              code,
              name: ap.name || localMatch?.name || existing?.name || code,
              description: (ap as any).description || localMatch?.description || existing?.description || '',
              jobZone: ap.jobZone || localMatch?.jobZone || existing?.jobZone || 4,
              profiles: localMatch?.profiles || existing?.profiles || ['DEV'],
              assignedExpertIds: localMatch?.assignedExpertIds || existing?.assignedExpertIds || [],
              status: 'active',
            })
          }
        }
        setAvailableJobPositions(
          Array.from(mergedMap.values()).filter((p) => p.status !== 'inactive'),
        )
      }
    } catch {
      // localStorage fallback is already active
    }
  }, [orgId])

  React.useEffect(() => {
    refreshAvailableJobPositions()
    let timeoutId: any = null
    const handleJobPositionsUpdated = (e?: StorageEvent | Event) => {
      if (e instanceof StorageEvent) {
        if (e.key && e.key !== 'adaptlearn_job_positions_v1') return
      }
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        refreshAvailableJobPositions()
      }, 500)
    }
    window.addEventListener('storage', handleJobPositionsUpdated)
    window.addEventListener('adaptlearn_job_positions_updated', handleJobPositionsUpdated)
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('storage', handleJobPositionsUpdated)
      window.removeEventListener('adaptlearn_job_positions_updated', handleJobPositionsUpdated)
    }
  }, [refreshAvailableJobPositions])

  const [orgExperts, setOrgExperts] = React.useState<EligibleExpert[]>(() =>
    getOrganizationExperts(orgId),
  )

  React.useEffect(() => {
    let isMounted = true
    const loadOrgMembers = async () => {
      try {
        const members = await getMembers(orgId).catch(() => [])
        const expertMembers = (members || []).filter(
          (m) =>
            m.active &&
            (m.roles.includes('DOMAIN_EXPERT') || m.roles.includes('EXPERT')),
        )
        if (expertMembers.length > 0) {
          const mapped: EligibleExpert[] = expertMembers.map((m) => ({
            id: m.accountId,
            name: m.fullName || m.email,
            title: m.jobPositionName || m.departmentName || 'Domain Expert',
            email: m.email,
            departmentId: m.departmentId || undefined,
            departmentName: m.departmentName || undefined,
            jobPositionReferenceId: m.jobPositionReferenceId || undefined,
            jobPositionName: m.jobPositionName || undefined,
          }))
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(
              'adaptlearn_org_experts_' + orgId,
              JSON.stringify(mapped),
            )
          }
          if (isMounted) {
            setOrgExperts((prev) => {
              if (
                prev.length === mapped.length &&
                prev.every(
                  (e, idx) =>
                    e.id === mapped[idx].id &&
                    e.name === mapped[idx].name &&
                    e.departmentId === mapped[idx].departmentId &&
                    e.jobPositionReferenceId === mapped[idx].jobPositionReferenceId,
                )
              ) {
                return prev
              }
              return mapped
            })
          }
        } else {
          const fallback = getOrganizationExperts(orgId)
          if (isMounted) setOrgExperts(fallback)
        }
      } catch {
        const fallback = getOrganizationExperts(orgId)
        if (isMounted) setOrgExperts(fallback)
      }
    }
    loadOrgMembers()
    return () => {
      isMounted = false
    }
  }, [orgId])

  const isAdministrator = Boolean(
    session?.identity?.roles?.includes('ORGANIZATION_ADMINISTRATOR') ||
    session?.identity?.roles?.includes('PLATFORM_ADMINISTRATOR')
  )
  const isLdManager = !isAdministrator && Boolean(
    session?.identity?.roles?.includes('LD_MANAGER') ||
    (typeof window !== 'undefined' && (window.location.pathname.includes('/manager/') || window.location.pathname.includes('/ld-manager/')))
  )

  const isLoading = isRolesLoading || (isLdManager && isDeptLoading)

  const [managerDepartment, setManagerDepartment] = React.useState<{
    id: string
    code?: string
    name: string
    jobPositionCodes: string[]
  } | null>(() => {
    try {
      const localDepts = loadDepartments(orgId)
      const activeEmail = session?.identity?.email
      if (activeEmail) {
        const assignmentRaw =
          typeof window !== 'undefined'
            ? localStorage.getItem(`alg_employee_assignment_${activeEmail.toLowerCase().trim()}`)
            : null
        if (assignmentRaw) {
          const assignment = JSON.parse(assignmentRaw)
          const matched = localDepts.find(
            (d) =>
              (assignment.departmentId &&
                (d.id === assignment.departmentId || d.code === assignment.departmentId)) ||
              (assignment.departmentName &&
                d.name?.trim().toLowerCase() === assignment.departmentName.trim().toLowerCase())
          )
          if (matched) {
            return {
              id: matched.id,
              code: matched.code,
              name: matched.name,
              jobPositionCodes: matched.linkedJobPositions || [],
            }
          }
        }
        const matchedHead = localDepts.find(
          (d) => d.headEmail?.toLowerCase() === activeEmail.toLowerCase()
        )
        if (matchedHead) {
          return {
            id: matchedHead.id,
            code: matchedHead.code,
            name: matchedHead.name,
            jobPositionCodes: matchedHead.linkedJobPositions || [],
          }
        }
      }
    } catch {}
    return null
  })

  React.useEffect(() => {
    let isMounted = true
    const loadManagerDept = async () => {
      try {
        const [members, depts, refs] = await Promise.all([
          getMembers(orgId).catch(() => []),
          fetchDepartments(orgId).catch(() => []),
          getReferences(orgId).catch(() => []),
        ])
        const currentMember = (members || []).find(
          (m) =>
            (session?.identity?.accountId && m.accountId === session?.identity?.accountId) ||
            (session?.identity?.email && m.email?.toLowerCase() === session?.identity?.email?.toLowerCase())
        )
        const localDepts = loadDepartments(orgId)

        // Merge departments from Neo4j, Postgres references, and localStorage
        const deptMap = new Map<string, any>()
        for (const ld of localDepts) {
          const key = (ld.name || ld.code || ld.id).toLowerCase().trim()
          deptMap.set(key, { ...ld, jobPositionCodes: ld.linkedJobPositions || [] })
        }
        for (const ref of refs || []) {
          if (ref.departmentId || ref.departmentName) {
            const key = (ref.departmentName || ref.departmentId).toLowerCase().trim()
            if (!deptMap.has(key)) {
              deptMap.set(key, {
                id: ref.departmentId,
                code: ref.departmentName,
                name: ref.departmentName,
                jobPositionCodes: [],
                linkedJobPositions: [],
              })
            }
          }
        }
        for (const d of depts || []) {
          const key = (d.name || d.code || d.id).toLowerCase().trim()
          const existing = deptMap.get(key)
          const serverCodes = d.jobPositionCodes || (d as any).linkedJobPositions || []
          deptMap.set(key, {
            ...existing,
            ...d,
            jobPositionCodes: serverCodes,
            linkedJobPositions: serverCodes,
          })
        }
        const effectiveDepts = Array.from(deptMap.values())

        let matched: any = null

        let localAssignmentObj: any = null
        if (session?.identity?.email) {
          try {
            const raw = localStorage.getItem(`alg_employee_assignment_${session.identity.email.toLowerCase().trim()}`)
            if (raw) localAssignmentObj = JSON.parse(raw)
          } catch {}
        }

        const targetDeptId = localAssignmentObj?.departmentId || currentMember?.departmentId
        const targetDeptName = localAssignmentObj?.departmentName || currentMember?.departmentName

        if (targetDeptId || targetDeptName) {
          matched = effectiveDepts.find((d) => {
            if (targetDeptId) {
              if (d.id === targetDeptId || d.code === targetDeptId) return true
              if ((d as any).uuid === targetDeptId || (d as any).uuidCode === targetDeptId) return true
            }
            if (targetDeptName && d.name) {
              if (d.name.trim().toLowerCase() === targetDeptName.trim().toLowerCase()) return true
            }
            return false
          })

          if (!matched && targetDeptName) {
            matched = {
              id: targetDeptId || `dept-${targetDeptName.toLowerCase().replace(/\s+/g, '-')}`,
              code: targetDeptName || 'DPT',
              name: targetDeptName,
              jobPositionCodes: [],
              linkedJobPositions: [],
            }
            if (!localAssignmentObj) {
              createDepartmentApi(orgId, {
                id: matched.id,
                code: matched.code,
                name: matched.name,
                headEmail: session?.identity?.email || '',
                headOfDepartment: session?.identity?.fullName || session?.identity?.email || '',
                status: 'ACTIVE',
              }).catch(() => {})
            }
          }
        }

        // Secondary fallback: Match headEmail ONLY if user has no assigned department anywhere
        if (!matched && session?.identity?.email) {
          matched = effectiveDepts.find(
            (d) => (d as any).headEmail?.toLowerCase() === session?.identity?.email?.toLowerCase()
          )
        }

        if (matched && isMounted) {
          const serverCodes = (matched as any).jobPositionCodes ?? (matched as any).linkedJobPositions
          let effectiveCodes: string[] = []
          if (Array.isArray(serverCodes) && (matched as any).createdAt !== undefined) {
            effectiveCodes = serverCodes
          } else {
            const localDeptMatch = localDepts.find(
              (ld) =>
                ld.id === matched.id ||
                ld.code === matched.code ||
                ld.name?.toLowerCase() === matched.name?.toLowerCase()
            )
            effectiveCodes = (serverCodes && serverCodes.length > 0) ? serverCodes : (localDeptMatch?.linkedJobPositions || [])
          }
          setManagerDepartment((prev) => {
            if (
              prev &&
              prev.id === matched.id &&
              prev.name === matched.name &&
              prev.jobPositionCodes.length === effectiveCodes.length &&
              prev.jobPositionCodes.every((c, i) => c === effectiveCodes[i])
            ) {
              return prev
            }
            return {
              id: matched.id,
              code: matched.code,
              name: matched.name,
              jobPositionCodes: effectiveCodes,
            }
          })
        } else if (!matched && isMounted) {
          setManagerDepartment(null)
        }
      } catch {
        // Leave current or null
      } finally {
        if (isMounted) {
          setIsDeptLoading(false)
        }
      }
    }
    loadManagerDept()
    window.addEventListener('departments_updated', loadManagerDept)
    window.addEventListener('adaptlearn_job_positions_updated', loadManagerDept)
    return () => {
      isMounted = false
      window.removeEventListener('departments_updated', loadManagerDept)
      window.removeEventListener('adaptlearn_job_positions_updated', loadManagerDept)
    }
  }, [orgId, session?.identity?.accountId, session?.identity?.email])

  const jobPositionOptions: ComboboxOption[] = React.useMemo(() => {
    const inactiveCodes = new Set<string>()
    if (typeof localStorage !== 'undefined') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i)
          if (k && /adaptlearn_job.*positions/i.test(k)) {
            const raw = localStorage.getItem(k)
            if (raw) {
              const list = JSON.parse(raw)
              if (Array.isArray(list)) {
                for (const item of list) {
                  if (item?.code && String(item?.status || '').toLowerCase() === 'inactive') {
                    inactiveCodes.add(String(item.code).toLowerCase().trim())
                    inactiveCodes.add(String(item.code).replace(/\.00$/, '').toLowerCase().trim())
                  }
                }
              }
            }
          }
        }
      } catch {}
    }

    const activePositions = availableJobPositions.filter((occ) => {
      if (occ.status === 'inactive') return false
      const c = (occ.code || '').toLowerCase().trim()
      const base = c.replace(/\.00$/, '')
      return !inactiveCodes.has(c) && !inactiveCodes.has(base)
    })
    const allowedCodes = new Set(
      (managerDepartment?.jobPositionCodes || []).map((c) => c.toLowerCase().trim())
    )
    const filteredPositions =
      isLdManager
        ? managerDepartment
          ? activePositions.filter((occ) => {
              const code = (occ.code || '').toLowerCase().trim()
              const baseCode = code.replace(/\.00$/, '')
              return (
                allowedCodes.has(code) ||
                Array.from(allowedCodes).some((c) => c.replace(/\.00$/, '') === baseCode)
              )
            })
          : []
        : activePositions

    return filteredPositions.map((occ) => ({
      value: occ.code,
      label: `${occ.code} — ${occ.name.replace(/\s*\((?:Department|dept)\)\s*/gi, '').trim()}`,
      description: occ.description,
    }))
  }, [availableJobPositions, isLdManager, managerDepartment])

  const isFetchingRef = React.useRef(false)
  const fetchRoles = React.useCallback(async () => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    try {
      const res = await fetch(`/api/v1/organizations/${orgId}/target-roles`, {
        credentials: 'same-origin',
        headers: {
          'X-User-Role': 'LD_MANAGER',
        },
      })

      if (res.ok) {
        const data = await res.json()
        const currentActiveComp = getActiveCompany()
        const metaMap = getTargetRoleMetaMap(orgId)

        const mapped: TargetRoleModel[] = (
          data as Record<string, unknown>[]
        ).map((r) => {
          const rCode = String(r.code || '').toUpperCase()
          const rId = String(r.id || '')
          const meta = metaMap[rCode] || metaMap[rId]

          const storeRole = (currentActiveComp?.targetRoles || []).find(
            (tr) =>
              tr.id === rId ||
              (tr.code?.toUpperCase() === rCode && tr.version === String(r.version || '1.0')),
          )

          const explicitJobPositionCode =
            meta?.jobPositionCode ||
            storeRole?.jobPositionCode ||
            (typeof r.jobPositionCode === 'string' && r.jobPositionCode
              ? r.jobPositionCode
              : (typeof r.familyCode === 'string' && r.familyCode.match(/^\d{2}-\d{4}/)
                  ? r.familyCode
                  : undefined))

          const occ = resolveJobPositionForRole(
            {
              code: String(r.code || ''),
              title: String(r.name || ''),
              familyCode: String(r.familyCode || ''),
              jobPositionCode: explicitJobPositionCode,
            },
            orgId,
          )

          const localDepts = loadDepartments(orgId)
          const matchedDept = localDepts.find((d) =>
            (d.linkedJobPositions || []).some(
              (p) => p.replace(/\.00$/, '').toLowerCase().trim() === occ.code.replace(/\.00$/, '').toLowerCase().trim()
            )
          )

          const effectiveDept =
            meta?.department ||
            storeRole?.department ||
            (typeof r.department === 'string' && r.department
              ? r.department
              : matchedDept?.name || undefined)

          const effectiveDeptId =
            meta?.departmentId ||
            storeRole?.departmentId ||
            (typeof r.departmentId === 'string' && r.departmentId
              ? r.departmentId
              : matchedDept?.id)

          const effectiveJobPositionCode = explicitJobPositionCode || meta?.jobPositionCode || occ.code
          const effectiveJobPositionTitle = meta?.jobPositionTitle || storeRole?.jobPositionTitle || occ.name

          const expertId = r.assignedExpertId
            ? String(r.assignedExpertId)
            : meta?.assignedExpertId || storeRole?.assignedExpertId

          const expertName =
            meta?.assignedExpertName ||
            storeRole?.assignedExpertName ||
            findEligibleExpert(
              expertId as string | null | undefined,
              orgId,
            )?.name ||
            ELIGIBLE_EXPERTS.find((e) => e.id === expertId)?.name ||
            undefined

          return {
            id: rId,
            stableId: String(r.code || ''),
            code: String(r.code || ''),
            title: String(r.name || ''),
            jobPositionCode: effectiveJobPositionCode,
            jobPositionTitle: effectiveJobPositionTitle,
            scope: String(r.scope || r.description || occ.description),
            levels:
              Array.isArray(r.levels) && (r.levels as string[]).length > 0
                ? (r.levels as string[])
                : (currentActiveComp?.targetRoles || []).find(
                    (tr) =>
                      tr.id === rId ||
                      (tr.code?.toUpperCase() === rCode &&
                        tr.version === String(r.version || '1.0')),
                  )?.levels || ['Senior', 'Middle', 'Junior'],
            levelThresholds: (r.levelThresholds as RoleLevelThresholds) || {
              J: 60,
              M: 75,
              S: 90,
            },
            levelDurations:
              (r.levelDurations && Object.keys(r.levelDurations as Record<string, string>).length > 0
                ? (r.levelDurations as Record<string, string>)
                : meta?.levelDurations || storeRole?.levelDurations) || {},
            familyCode: String(r.familyCode || occ.profiles[0] || 'DEV'),
            track: (r.track as TargetRoleModel['track']) || 'PROFESSIONAL',
            assignedExpertId: expertId,
            assignedExpertName: expertName,
            department: effectiveDept,
            departmentId: effectiveDeptId,
            description: String(r.description || ''),
            responsibilities: Array.isArray(r.responsibilities)
              ? (r.responsibilities as string[])
              : [],
            version: String(r.version || '1.0'),
            // The backend status is the single source of truth so every portal (L&D Manager,
            // Domain Expert, Employee) sees the same lifecycle state for each version.
            status: (
              String(r.status || '').toLowerCase() === 'active' ||
                    String(r.status || '').toLowerCase() === 'published'
                ? 'published'
                : String(r.status || '').toLowerCase() === 'unpublished'
                ? 'unpublished'
                : String(r.status || '').toLowerCase() === 'submitted'
                ? 'submitted'
                : String(r.status || '').toLowerCase() === 'sent'
                ? 'sent'
                : String(r.status || '').toLowerCase() === 'rejected'
                ? 'rejected'
                : 'draft'
            ) as TargetRoleModel['status'],
            rejectionReason: String(r.rejectionReason || ''),
            levelCompetencies:
              r.levelCompetencies && Object.keys(r.levelCompetencies).length > 0
                ? (r.levelCompetencies as Record<string, string[]>)
                : (currentActiveComp?.targetRoles || []).find(
                    (tr) =>
                      tr.id === rId ||
                      (tr.code?.toUpperCase() === rCode &&
                        tr.version === String(r.version || '1.0')),
                  )?.levelCompetencies || {},
            competencyIds: Array.from(
              new Set([
                ...(Array.isArray(r.competencyIds)
                  ? (r.competencyIds as string[])
                  : []),
                ...((currentActiveComp?.targetRoles || []).find(
                  (tr) =>
                    tr.id === rId ||
                    (tr.code?.toUpperCase() === rCode &&
                      tr.version === String(r.version || '1.0')),
                )?.competencyIds || []),
                ...Object.values(
                  (r.levelCompetencies as Record<string, string[]>) || {},
                ).flat(),
              ]),
            ),
            skillTargets: Array.isArray(r.skillTargets)
              ? (r.skillTargets as TargetRoleModel['skillTargets'])
              : [],
            activeEnrollments: 0,
            createdAt: r.createdAt
              ? String(r.createdAt)
              : r.updatedAt
                ? String(r.updatedAt)
                : '2026-01-01T00:00:00Z',
            updatedAt: r.updatedAt
              ? String(r.updatedAt)
              : r.createdAt
                ? String(r.createdAt)
                : '2026-01-01T00:00:00Z',
          }
        })

        setRoles((prevRoles) => {
          const backendKeys = new Set(
            mapped.map((m) => `${m.code.toUpperCase()}::${String(m.version || '1.0').trim()}`)
          )
          const backendIds = new Set(mapped.map((m) => m.id))
          const localOnlyDrafts = (currentActiveComp?.targetRoles || []).filter(
            (s) =>
              !backendIds.has(s.id) &&
              !backendKeys.has(`${s.code.toUpperCase()}::${String(s.version || '1.0').trim()}`) &&
              (s.status === 'draft' || s.status === 'sent' || s.status === 'submitted' || s.status === 'rejected'),
          )
          const rawCombined = [...localOnlyDrafts, ...mapped]
          const dedupedMap = new Map<string, TargetRoleModel>()
          for (const item of rawCombined) {
            const key = `${String(item.code || '').trim().toUpperCase()}::${String(item.version || '1.0').trim()}`
            const existing = dedupedMap.get(key)
            if (!existing || (String(existing.id || '').startsWith('role-') && !String(item.id || '').startsWith('role-'))) {
              dedupedMap.set(key, item)
            }
          }
          const allRoles = Array.from(dedupedMap.values())

          const resolvedRoles = allRoles.map((m) => {
            const rCode = String(m.code || '').toUpperCase()
            const rId = String(m.id || '')
            const meta = metaMap[rCode] || metaMap[rId]

            const prev = prevRoles.find(
              (p) =>
                p.id === rId || (p.code.toUpperCase() === rCode && p.version === m.version),
            )
            const storeRole = (currentActiveComp?.targetRoles || []).find(
              (tr) =>
                tr.id === rId ||
                (tr.code?.toUpperCase() === rCode && tr.version === m.version),
            )
            const prevLevelComps =
              m.levelCompetencies && Object.keys(m.levelCompetencies).length > 0
                ? m.levelCompetencies
                : prev?.levelCompetencies &&
                    Object.keys(prev.levelCompetencies).length > 0
                  ? prev.levelCompetencies
                  : storeRole?.levelCompetencies || {}

            const prevCompetencyIds = Array.from(
              new Set([
                ...(m.competencyIds || []),
                ...(prev?.competencyIds || []),
                ...(storeRole?.competencyIds || []),
                ...Object.values(prevLevelComps).flat(),
              ]),
            )

            const effectiveDept =
              m.department ||
              meta?.department ||
              prev?.department ||
              storeRole?.department ||
              ''

            const effectiveDeptId =
              m.departmentId ||
              meta?.departmentId ||
              prev?.departmentId ||
              storeRole?.departmentId ||
              ''

            const effectiveJobPositionCode =
              m.jobPositionCode || meta?.jobPositionCode || prev?.jobPositionCode || storeRole?.jobPositionCode

            const effectiveJobPositionTitle =
              m.jobPositionTitle || meta?.jobPositionTitle || prev?.jobPositionTitle || storeRole?.jobPositionTitle

            const effectiveExpertId =
              m.assignedExpertId || meta?.assignedExpertId || prev?.assignedExpertId || storeRole?.assignedExpertId

            const effectiveExpertName =
              m.assignedExpertName || meta?.assignedExpertName || prev?.assignedExpertName || storeRole?.assignedExpertName

            const effectiveLevelDurations =
              m.levelDurations && Object.keys(m.levelDurations).length > 0
                ? m.levelDurations
                : meta?.levelDurations && Object.keys(meta.levelDurations).length > 0
                  ? meta.levelDurations
                  : prev?.levelDurations && Object.keys(prev.levelDurations).length > 0
                    ? prev.levelDurations
                    : storeRole?.levelDurations || {}

            return {
              ...m,
              jobPositionCode: effectiveJobPositionCode || m.jobPositionCode,
              jobPositionTitle: effectiveJobPositionTitle || m.jobPositionTitle,
              department: effectiveDept || m.department,
              departmentId: effectiveDeptId || m.departmentId,
              assignedExpertId: effectiveExpertId || m.assignedExpertId,
              assignedExpertName: effectiveExpertName || m.assignedExpertName,
              levelDurations: effectiveLevelDurations,
              levelCompetencies: prevLevelComps,
              competencyIds: prevCompetencyIds,
            }
          })

          return resolvedRoles
        })
      }
    } catch (err) {
      console.warn('Failed to fetch target roles:', err)
    } finally {
      isFetchingRef.current = false
      setIsRolesLoading(false)
    }
  }, [orgId])

  React.useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  // Synchronize state when active company scope changes

  React.useEffect(() => {
    let timeoutId: any = null
    const handleSync = (e?: StorageEvent | Event) => {
      // Guard against infinite cross-tab storage event cascade
      if (e instanceof StorageEvent) {
        if (!e.key || (!e.key.startsWith('adaptlearn_target_role') && e.key !== 'adaptlearn_companies_v1')) {
          return
        }
      }
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        fetchRoles()
      }, 500)
    }

    window.addEventListener('active_company_changed', handleSync)
    window.addEventListener('storage', handleSync)

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('active_company_changed', handleSync)
      window.removeEventListener('storage', handleSync)
    }
  }, [fetchRoles])

  // Explicit persistence helper to prevent circular re-render loops

  const saveAndSetRoles = React.useCallback(
    (
      updater:
        TargetRoleModel[] | ((prev: TargetRoleModel[]) => TargetRoleModel[]),
    ) => {
      setRoles((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater

        updateActiveCompany((c) => ({
          ...c,
          targetRoles: next,
        }))

        return next
      })
    },
    [],
  )

  const [liveCompetencies, setLiveCompetencies] = React.useState<
    CompetencyDto[]
  >([])

  React.useEffect(() => {
    fetchCompetencies(orgId)
      .then((data) => {
        if (Array.isArray(data)) setLiveCompetencies(data)
      })
      .catch(() => {})
  }, [orgId])

  const allAvailableCompetencies = React.useMemo<CompetencyModel[]>(() => {
    const fromComp: CompetencyModel[] = (activeComp?.competencies || []).map(
      (c) => ({
        ...c,
        code: c.code || c.id,
        description: c.description || '',
        status: (c.status as CompetencyModel['status']) || 'ACTIVE',
        skillIds: c.skillIds || [],
      }),
    )

    const merged = [...fromComp]

    liveCompetencies.forEach((lc) => {
      if (
        !merged.some((m) => m.id === lc.id || (lc.code && m.code === lc.code))
      ) {
        merged.push({
          id: lc.id,
          code: lc.code || lc.id,
          name: lc.name,
          description: lc.description || '',
          status: (lc.status as CompetencyModel['status']) || 'ACTIVE',
          skillIds: lc.skillIds || [],
          levelCodes: lc.levelCodes || [],
        })
      }
    })

    return merged
  }, [activeComp?.competencies, liveCompetencies])

  const companyCompetencies = allAvailableCompetencies
  const companyMicroSkills = activeComp?.microSkills || []

  // Modals state

  const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] =
    React.useState(false)
  const [isMappingsModalOpen, setIsMappingsModalOpen] = React.useState(false)
  const [isSkillTargetsModalOpen, setIsSkillTargetsModalOpen] =
    React.useState(false)
  const [isPublishModalOpen, setIsPublishModalOpen] = React.useState(false)
  const [isManagerRejectDialogOpen, setIsManagerRejectDialogOpen] =
    React.useState(false)
  const [managerRejectingRole, setManagerRejectingRole] =
    React.useState<TargetRoleModel | null>(null)
  const [managerRejectionReason, setManagerRejectionReason] = React.useState('')
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false)
  const [selectedRole, setSelectedRole] =
    React.useState<TargetRoleModel | null>(null)
  const [viewingDetailsRole, setViewingDetailsRole] =
    React.useState<TargetRoleModel | null>(null)
  const [detailViewMode, setDetailViewMode] = React.useState<'specs' | 'diff'>(
    'specs',
  )
  const [graphRole, setGraphRole] = React.useState<TargetRoleModel | null>(null)
  const [deletingRole, setDeletingRole] =
    React.useState<TargetRoleModel | null>(null)
  const [roleToUnpublish, setRoleToUnpublish] =
    React.useState<TargetRoleModel | null>(null)
  const [selectedDetailLevelTab, setSelectedDetailLevelTab] =
    React.useState<string>('ALL')
  const [compSearchQuery, setCompSearchQuery] = React.useState('')
  const handleImportRoles = (data: unknown) => {
    const list = Array.isArray(data)
      ? data
      : typeof data === 'object' &&
          data !== null &&
          'roles' in data &&
          Array.isArray((data as Record<string, unknown>).roles)
        ? ((data as Record<string, unknown>).roles as unknown[])
        : []

    const normalized: TargetRoleModel[] = list.map(
      (itemRecord: unknown, idx: number) => {
        const item = (
          typeof itemRecord === 'object' && itemRecord !== null
            ? itemRecord
            : {}
        ) as Record<string, unknown>

        return {
          id: (item.id as string) || `role-${Date.now()}-${idx}`,
          stableId:
            (item.stableId as string) || `role-uuid-${Date.now()}-${idx}`,
          code: String(item.code || `ROLE-IMP-${idx + 1}`)
            .trim()
            .toUpperCase(),
          title: String(item.title || 'Untitled Target Role').trim(),
          department: String(
            item.department || 'Machine Learning & Cognitive Architecture',
          ).trim(),
          description: String(
            item.description || 'Target career role definition',
          ).trim(),
          version: String(item.version || '1.0'),
          status:
            item.status === 'draft' ||
            item.status === 'submitted' ||
            item.status === 'sent' ||
            item.status === 'rejected' ||
            item.status === 'unpublished'
              ? item.status
              : 'published',
          competencyIds: Array.isArray(item.competencyIds)
            ? (item.competencyIds as string[])
            : [],
          skillTargets: Array.isArray(item.skillTargets)
            ? (item.skillTargets as TargetRoleModel['skillTargets'])
            : [],
          activeEnrollments: Number(item.activeEnrollments) || 0,
          updatedAt: String(
            item.updatedAt || new Date().toISOString().slice(0, 10),
          ),
        }
      },
    )

    saveAndSetRoles((prev) => [...normalized, ...prev])
  }

  // Form states for creating role

  const [roleForm, setRoleForm] = React.useState({
    code: '',
    title: '',
    jobPositionCode: '15-1252.00',
    scope:
      'Design, code, and test applications, systems software, and infrastructure pipelines.',
    familyCode: 'DEV',
    track: 'PROFESSIONAL' as 'PROFESSIONAL' | 'MANAGEMENT',
    levelNames: ['Senior', 'Middle', 'Junior'],
    levelDurations: {
      Senior: '6 months',
      Middle: '4 months',
      Junior: '3 months',
    } as Record<string, string>,
    assignedExpertId: ELIGIBLE_EXPERTS[0].id as string,
    description: '',
  })

  // Form states for editing role (L&D Manager view/edit scope)

  const [editRoleForm, setEditRoleForm] = React.useState({
    title: '',
    jobPositionCode: '15-1252.00',
    scope: '',
    familyCode: 'DEV',
    track: 'PROFESSIONAL' as 'PROFESSIONAL' | 'MANAGEMENT',
    levelNames: ['Senior', 'Middle', 'Junior'],
    levelDurations: {} as Record<string, string>,
    assignedExpertId: '',
    description: '',
  })

  // Dynamic expert options filtered to experts certified for the selected jobPosition

  const createExpertOptions: ComboboxOption[] = React.useMemo(() => {
    let list = getEligibleExpertsForJobPosition(
      roleForm.jobPositionCode,
      orgId,
      managerDepartment,
      orgExperts,
    )
    if (list.length === 0 && orgExperts.length > 0) {
      list = orgExperts
    }
    return list.map((exp) => ({
      value: exp.id,
      label: exp.name,
      description: exp.title,
    }))
  }, [roleForm.jobPositionCode, orgId, managerDepartment, orgExperts])

  const editRoleDeptScope = React.useMemo(() => {
    if (selectedRole?.departmentId) {
      return {
        id: selectedRole.departmentId,
        name: selectedRole.department,
      }
    }
    return managerDepartment
  }, [selectedRole?.department, selectedRole?.departmentId, managerDepartment])

  const editExpertOptions: ComboboxOption[] = React.useMemo(() => {
    let list = getEligibleExpertsForJobPosition(
      editRoleForm.jobPositionCode,
      orgId,
      editRoleDeptScope,
      orgExperts,
    )
    if (list.length === 0 && orgExperts.length > 0) {
      list = orgExperts
    }
    const options = list.map((exp) => ({
      value: exp.id,
      label: exp.name,
      description: exp.title,
    }))
    if (selectedRole?.assignedExpertId) {
      const alreadyIncluded = options.some(
        (o) => normalizeExpertId(o.value) === normalizeExpertId(selectedRole.assignedExpertId)
      )
      if (!alreadyIncluded) {
        const expertObj =
          orgExperts.find((e) => normalizeExpertId(e.id) === normalizeExpertId(selectedRole.assignedExpertId)) ||
          findEligibleExpert(selectedRole.assignedExpertId, orgId, orgExperts)
        if (expertObj) {
          options.unshift({
            value: expertObj.id,
            label: expertObj.name,
            description: expertObj.title,
          })
        }
      }
    }
    return options
  }, [editRoleForm.jobPositionCode, orgId, editRoleDeptScope, orgExperts, selectedRole?.assignedExpertId])

  // Sort criteria: defaults to 'latest' so newly created or updated roles go to the top

  const [sortBy, setSortBy] = React.useState<'latest' | 'title'>('latest')

  // Pagination states

  const [currentPage, setCurrentPage] = React.useState(1)
  const pageSize = 10

  // Reset page when search/filter/sort changes

  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, sortBy])

  // Base list of roles visible to L&D Manager:
  // 1. Hide unsubmitted expert successor drafts until submitted
  // 2. Hide target roles not in the L&D Manager's assigned department
  const managerVisibleRoles = React.useMemo(() => {
    if (isLdManager) {
      if (isDeptLoading || !managerDepartment) {
        return []
      }
      const allowedJobPositionCodes = new Set(
        (managerDepartment.jobPositionCodes || []).map((c) => c.toLowerCase().trim())
      )
      const deptName = managerDepartment.name?.toLowerCase().trim()
      const deptId = managerDepartment.id?.toLowerCase().trim()

      return roles.filter((r) => {
        const roleDept = (r.department || '').toLowerCase().trim()
        const roleDeptId = (r.departmentId || '').toLowerCase().trim()
        const matchesDept = Boolean(
          (deptName && (roleDept === deptName || roleDept.includes(deptName) || deptName.includes(roleDept))) ||
          (deptId && (roleDeptId === deptId || roleDept === deptId || roleDeptId.includes(deptId)))
        )

        const occCode = (r.jobPositionCode || '').toLowerCase().trim()
        const baseOccCode = occCode.replace(/\.00$/, '')
        const matchesJobPosition =
          allowedJobPositionCodes.size > 0 &&
          (allowedJobPositionCodes.has(occCode) ||
            Array.from(allowedJobPositionCodes).some((c) => c.replace(/\.00$/, '') === baseOccCode))

        return matchesJobPosition || matchesDept
      })
    }

    return roles
  }, [roles, isLdManager, managerDepartment, isDeptLoading])

  // Filtered and sorted roles: Drafts always immediately below their previous published version

  const filteredRoles = React.useMemo(() => {
    const sorted = sortTargetRolesWithDraftsBelowPublished(
      managerVisibleRoles,
      sortBy,
    )

    return sorted.filter((r) => {
      const effStatus = getManagerEffectiveStatus(r)
      const matchesStatus = statusFilter === 'all' || effStatus === statusFilter

      const matchesSearch =
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.department &&
          r.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.familyCode &&
          r.familyCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.assignedExpertName &&
          r.assignedExpertName
            .toLowerCase()
            .includes(searchQuery.toLowerCase()))

      return matchesStatus && matchesSearch
    })
  }, [managerVisibleRoles, statusFilter, searchQuery, sortBy])

  // Visible roles considering collapsed/expanded lineages

  const visibleRoles = React.useMemo(() => {
    return filteredRoles.filter((role) => {
      const isPublishedOrUnpublished = role.status === 'published' || role.status === 'unpublished'
      const publishedInLineage = managerVisibleRoles
        .filter(
          (r) =>
            (r.stableId === role.stableId || r.code === role.code) &&
            (r.status === 'published' || r.status === 'unpublished'),
        )
        .sort((a, b) => compareRoleVersions(b.version, a.version))

      const newestPublished = publishedInLineage[0]
      const isOlderPublished =
        isPublishedOrUnpublished && newestPublished && role.id !== newestPublished.id
      const lineageKey = role.stableId || role.code
      const isLineageExpanded = Boolean(expandedLineages[lineageKey])

      return !(isOlderPublished && !isLineageExpanded)
    })
  }, [filteredRoles, managerVisibleRoles, expandedLineages])

  const totalPages = Math.max(1, Math.ceil(visibleRoles.length / pageSize))
  const paginatedRoles = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize

    return visibleRoles.slice(start, start + pageSize)
  }, [visibleRoles, currentPage, pageSize])

  // Aggregate stats (based on managerVisibleRoles so unsubmitted expert drafts don't skew counts)

  const totalRoles = managerVisibleRoles.length
  const publishedRoles = managerVisibleRoles.filter(
    (r) => getManagerEffectiveStatus(r) === 'published',
  ).length
  const draftRoles = managerVisibleRoles.filter(
    (r) => getManagerEffectiveStatus(r) === 'draft',
  ).length
  const sentRoles = managerVisibleRoles.filter(
    (r) => getManagerEffectiveStatus(r) === 'sent',
  ).length
  const submittedRoles = managerVisibleRoles.filter(
    (r) => getManagerEffectiveStatus(r) === 'submitted',
  ).length
  const feedbackRoles = managerVisibleRoles.filter(
    (r) => getManagerEffectiveStatus(r) === 'feedback',
  ).length
  const rejectedRoles = managerVisibleRoles.filter(
    (r) => getManagerEffectiveStatus(r) === 'rejected',
  ).length

  // Handlers

  const handleOpenCreateRole = () => {
    refreshAvailableJobPositions()
    const latestPositions = getAvailableJobPositions(orgId)
    setAvailableJobPositions(latestPositions)
    const allowedCodes = new Set(
      (managerDepartment?.jobPositionCodes || []).map((c) => c.toLowerCase().trim())
    )
    const departmentPositions =
      isLdManager
        ? managerDepartment
          ? latestPositions.filter((occ) => {
              const code = (occ.code || '').toLowerCase().trim()
              const baseCode = code.replace(/\.00$/, '')
              return (
                allowedCodes.has(code) ||
                Array.from(allowedCodes).some((c) => c.replace(/\.00$/, '') === baseCode)
              )
            })
          : []
        : latestPositions
    const defaultOcc = departmentPositions.length > 0 ? departmentPositions[0] : null
    const eligibleExperts = defaultOcc
      ? getEligibleExpertsForJobPosition(
          defaultOcc.code,
          orgId,
          managerDepartment,
          orgExperts,
        )
      : []
    setRoleForm({
      code: `ROLE-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      title: '',
      jobPositionCode: defaultOcc?.code || '',
      scope: defaultOcc?.description || '',
      familyCode: defaultOcc?.profiles?.[0] || 'DEV',
      track: 'PROFESSIONAL',
      levelNames: ['Senior', 'Middle', 'Junior'],
      levelDurations: {
        Senior: '6 months',
        Middle: '4 months',
        Junior: '3 months',
      },
      assignedExpertId: eligibleExperts[0]?.id || orgExperts[0]?.id || '',
      description: defaultOcc?.description || '',
    })

    setIsCreateRoleModalOpen(true)
  }

  const handleCreateRoleSubmit = async (
    targetStatus: 'draft' | 'sent' = 'draft',
  ) => {
    if (!roleForm.code.trim() || !roleForm.title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Role Code and Title are strictly required.',
        variant: 'destructive',
      })

      return
    }

    if (!roleForm.jobPositionCode?.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Job Position is mandatory. Please select an active job position.',
        variant: 'destructive',
      })

      return
    }

    // Check unique code among active roles

    if (
      roles.some(
        (r) => r.code.toUpperCase() === roleForm.code.trim().toUpperCase(),
      )
    ) {
      toast({
        title: 'Duplicate Role Code',
        description: `Role Code ${roleForm.code} already exists in the role catalog.`,
        variant: 'destructive',
      })

      return
    }

    const orgId = resolveWorkspaceOrgId(
      session?.identity?.organizationId || activeComp?.id,
    )
    let generatedId = `role-${Date.now()}`
    const selectedOcc = availableJobPositions.find((o) => o.code === roleForm.jobPositionCode)
    if (!selectedOcc) {
      toast({
        title: 'Validation Error',
        description: 'A valid active job position is required to create a target role.',
        variant: 'destructive',
      })

      return
    }
    const roleCode = roleForm.code.trim().toUpperCase()
    const backendStatus = targetStatus === 'sent' ? 'SENT' : 'DRAFT'
    const assignedExpert =
      orgExperts.find((e) => e.id === roleForm.assignedExpertId) ||
      findEligibleExpert(roleForm.assignedExpertId, orgId) ||
      ELIGIBLE_EXPERTS.find((e) => e.id === roleForm.assignedExpertId)
    const expertName = assignedExpert?.name || 'Assigned Expert'

    const newRole: TargetRoleModel = {
      id: generatedId,
      stableId: roleCode,
      code: roleCode,
      title: roleForm.title.trim(),
      jobPositionCode: selectedOcc.code,
      jobPositionTitle: selectedOcc.name,
      scope: roleForm.scope || selectedOcc.description,
      levels: roleForm.levelNames,
      levelDurations: roleForm.levelDurations,
      familyCode: roleForm.familyCode || selectedOcc.profiles[0] || 'DEV',
      track: roleForm.track || 'PROFESSIONAL',
      responsibilities: [],
      assignedExpertId: roleForm.assignedExpertId,
      assignedExpertName: expertName,
      department: managerDepartment?.name || selectedOcc.name,
      departmentId: managerDepartment?.id,
      description:
        roleForm.scope || roleForm.description || selectedOcc.description,
      version: '1.0',
      status: targetStatus === 'sent' ? 'sent' : 'draft',
      competencyIds: [],
      skillTargets: [],
      activeEnrollments: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Automatically link selected job position to manager's department
    if (managerDepartment && selectedOcc?.code) {
      const nextCodes = Array.from(
        new Set([
          ...(managerDepartment.jobPositionCodes || []),
          selectedOcc.code,
          selectedOcc.code.toLowerCase(),
          selectedOcc.code.replace(/\.00$/, ''),
          selectedOcc.code.replace(/\.00$/, '').toLowerCase(),
        ])
      )
      setManagerDepartment((prev) => (prev ? { ...prev, jobPositionCodes: nextCodes } : prev))

      if (managerDepartment.id) {
        try {
          const depts = loadDepartments(orgId)
          const targetDept = depts.find(
            (d) => d.id === managerDepartment.id || d.code === managerDepartment.id
          )
          if (targetDept) {
            const currentLinked = targetDept.linkedJobPositions || []
            if (!currentLinked.includes(selectedOcc.code)) {
              const nextLinked = [...currentLinked, selectedOcc.code]
              updateDepartment(targetDept.id, { linkedJobPositions: nextLinked }, orgId)
              linkJobPositionToDepartment(orgId, targetDept.id, selectedOcc.code).catch(() => {})
              updateDepartmentApi(orgId, targetDept.id, {
                code: targetDept.code,
                name: targetDept.name,
                linkedJobPositions: nextLinked,
              }).catch(() => {})
              window.dispatchEvent(new Event('departments_updated'))
            }
          }
        } catch (e) {
          console.warn('Failed to link job position to department:', e)
        }
      }
    }

    // Persist metadata locally first
    saveTargetRoleMeta(orgId, {
      id: generatedId,
      code: roleCode,
      jobPositionCode: selectedOcc.code,
      jobPositionTitle: selectedOcc.name,
      department: managerDepartment?.name || selectedOcc.name,
      departmentId: managerDepartment?.id,
      assignedExpertId: roleForm.assignedExpertId,
      assignedExpertName: expertName,
      levelNames: roleForm.levelNames,
      levelDurations: roleForm.levelDurations,
    })

    // Persist locally immediately so the role never vanishes upon save draft
    updateActiveCompany((c) => ({
      ...c,
      targetRoles: [newRole, ...(c.targetRoles || []).filter((r) => r.code !== newRole.code)],
    }))
    setRoles((prev) => [newRole, ...prev.filter((r) => r.code !== newRole.code)])

    // Immediately close modal and show immediate feedback
    setIsCreateRoleModalOpen(false)

    toast({
      title:
        targetStatus === 'sent'
          ? 'Target Role Created & Sent to Expert'
          : 'Target Role Draft Created',
      description:
        targetStatus === 'sent'
          ? `Role ${roleForm.title.trim()} (${roleCode}) created and dispatched to ${expertName}.`
          : `Draft role ${roleCode} - ${roleForm.title.trim()} created and saved to catalog.`,
      variant: 'success',
    })

    // Reset create role form
    setRoleForm({
      code: `ROLE-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      title: '',
      jobPositionCode: selectedOcc.code,
      scope: selectedOcc.description,
      familyCode: selectedOcc.profiles?.[0] || 'DEV',
      track: 'PROFESSIONAL',
      levelNames: ['Senior', 'Middle', 'Junior'],
      levelDurations: {
        Senior: '6 months',
        Middle: '4 months',
        Junior: '3 months',
      },
      assignedExpertId: '',
      description: selectedOcc.description,
    })

    try {
      const createdData = (await request(
        `/api/v1/organizations/${orgId}/target-roles`,
        'POST',
        {
          code: roleCode,
          name: newRole.title,
          familyCode: selectedOcc.code,
          track: roleForm.track,
          responsibilities: [],
          assignedExpertId: roleForm.assignedExpertId,
          description:
            roleForm.scope || roleForm.description || selectedOcc.description,
          competencyIds: [],
          levels: roleForm.levelNames,
          levelDurations: roleForm.levelDurations,
          status: backendStatus,
        },
        {
          'X-User-Role': 'LD_MANAGER',
        },
      )) as Record<string, unknown> | null

      if (createdData && createdData.id) {
        newRole.id = String(createdData.id)
        saveTargetRoleMeta(orgId, {
          id: String(createdData.id),
          code: roleCode,
          jobPositionCode: selectedOcc.code,
          jobPositionTitle: selectedOcc.name,
          department: managerDepartment?.name || selectedOcc.name,
          departmentId: managerDepartment?.id,
          assignedExpertId: roleForm.assignedExpertId,
          assignedExpertName: expertName,
          levelNames: roleForm.levelNames,
          levelDurations: roleForm.levelDurations,
        })
        saveAndSetRoles((prev) =>
          prev.map((r) => (r.code === roleCode ? newRole : r)),
        )
      }
      await fetchRoles()
    } catch (err: any) {
      if (err?.status === 409 || err?.message?.includes('409') || err?.code === 'CONFLICT') {
        // Rollback local optimistic add
        updateActiveCompany((c) => ({
          ...c,
          targetRoles: (c.targetRoles || []).filter((r) => r.code !== newRole.code),
        }))
        setRoles((prev) => prev.filter((r) => r.code !== newRole.code))

        toast({
          title: 'Duplicate Role Code',
          description: `Role Code ${roleCode} already exists for this organization.`,
          variant: 'destructive',
        })
        return
      }
    }
  }

  // Delete Target Role (Draft or Published)
  const handleDeleteRole = async (role: TargetRoleModel) => {
    const orgId = resolveWorkspaceOrgId(
      session?.identity?.organizationId || activeComp?.id,
    )

    // 1. Instantly close confirmation and edit/view modals
    setDeletingRole(null)
    if (
      selectedRole?.id === role.id ||
      (selectedRole?.code && role.code && selectedRole.code.trim().toUpperCase() === role.code.trim().toUpperCase())
    ) {
      setIsSkillTargetsModalOpen(false)
      setSelectedRole(null)
    }
    if (
      viewingDetailsRole?.id === role.id ||
      (viewingDetailsRole?.code && role.code && viewingDetailsRole.code.trim().toUpperCase() === role.code.trim().toUpperCase())
    ) {
      setViewingDetailsRole(null)
    }

    // 2. Instantly remove from local roles state and persisted company store
    const isTargetMatch = (r: TargetRoleModel) =>
      r.id === role.id ||
      (Boolean(r.code && role.code) &&
        r.code.trim().toUpperCase() === role.code.trim().toUpperCase() &&
        String(r.version || '1.0').trim() === String(role.version || '1.0').trim())

    deleteTargetRoleMeta(orgId, role.id, role.code)
    saveAndSetRoles((prev) => prev.filter((r) => !isTargetMatch(r)))

    toast({
      title:
        role.status === 'draft'
          ? 'Draft Role Discarded'
          : 'Target Role Deleted',
      description: `${role.title} (${role.code} v${role.version}) has been permanently deleted from the organization catalog.`,
      variant: 'info',
    })

    // 3. Perform backend delete in background
    try {
      await request(
        `/api/v1/organizations/${orgId}/target-roles/${role.id}`,
        'DELETE',
        undefined,
        {
          'X-User-Role': 'LD_MANAGER',
        },
      )
      await fetchRoles()
    } catch (err: any) {
      if (err?.status === 403 || err?.code === 'FORBIDDEN') {
        toast({
          title: 'Action Not Permitted',
          description:
            'L&D Managers can only delete target roles in draft status.',
          variant: 'destructive',
        })
        await fetchRoles()
      }
    }
  }

  // Open edit role modal (L&D Manager scope: edit attributes & assigned expert)

  const handleOpenEditRole = (role: TargetRoleModel) => {
    refreshAvailableJobPositions()
    const latestPositions = getAvailableJobPositions(orgId)
    setAvailableJobPositions(latestPositions)
    const occ = resolveJobPositionForRole(role, orgId)
    const rawOccCode = role.jobPositionCode || occ.code
    const activeDepartmentCodes = new Set(jobPositionOptions.map((o) => o.value))
    const activeAllCodes = new Set(latestPositions.map((o) => o.code))
    const occCode =
      activeDepartmentCodes.has(rawOccCode) || activeAllCodes.has(rawOccCode)
        ? rawOccCode
        : jobPositionOptions[0]?.value || latestPositions[0]?.code || ''
    const roleDeptScope =
      role.departmentId
        ? { id: role.departmentId, name: role.department }
        : managerDepartment
    let eligibleExperts = getEligibleExpertsForJobPosition(
      occCode,
      orgId,
      roleDeptScope,
      orgExperts,
    )
    if (eligibleExperts.length === 0 && orgExperts.length > 0) {
      eligibleExperts = orgExperts
    }
    const isCurrentEligible = eligibleExperts.some(
      (e) =>
        normalizeExpertId(e.id) === normalizeExpertId(role.assignedExpertId),
    )
    const effectiveExpertId =
      role.assignedExpertId ||
      (isCurrentEligible ? role.assignedExpertId : '') ||
      eligibleExperts[0]?.id ||
      ''

    setSelectedRole(role)

    setEditRoleForm({
      title: role.title,
      jobPositionCode: occCode,
      scope: role.scope || role.description || occ.description,
      familyCode: role.familyCode || occ.profiles[0] || 'DEV',
      track: (role.track || 'PROFESSIONAL') as 'PROFESSIONAL' | 'MANAGEMENT',
      levelNames:
        role.levels && role.levels.length > 0
          ? [...role.levels]
          : ['Senior', 'Middle', 'Junior'],
      levelDurations:
        role.levelDurations && Object.keys(role.levelDurations).length > 0
          ? { ...role.levelDurations }
          : {
              Senior: '6 months',
              Middle: '4 months',
              Junior: '3 months',
            },
      assignedExpertId: effectiveExpertId,
      description: role.description || role.scope || occ.description,
    })

    setIsSkillTargetsModalOpen(true)
  }

  // Save updated role attributes (L&D Manager scope)

  const handleSaveEditRole = async (targetStatus?: 'draft' | 'sent') => {
    if (!selectedRole) return

    if (!editRoleForm.title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Role Title is strictly required.',
        variant: 'destructive',
      })

      return
    }

    if (!editRoleForm.jobPositionCode?.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Job Position is strictly required.',
        variant: 'destructive',
      })

      return
    }

    const orgId = resolveWorkspaceOrgId(
      session?.identity?.organizationId || activeComp?.id,
    )
    const assignedExpert =
      orgExperts.find((e) => e.id === editRoleForm.assignedExpertId) ||
      findEligibleExpert(editRoleForm.assignedExpertId, orgId) ||
      ELIGIBLE_EXPERTS.find((e) => e.id === editRoleForm.assignedExpertId)
    const expertName = assignedExpert?.name || 'Assigned Expert'
    const selectedOcc = availableJobPositions.find((o) => o.code === editRoleForm.jobPositionCode)
    if (!selectedOcc) {
      toast({
        title: 'Validation Error',
        description: 'A valid active job position is required.',
        variant: 'destructive',
      })

      return
    }
    const newStatus =
      targetStatus === 'sent'
        ? 'SENT'
        : selectedRole.status === 'published'
          ? 'ACTIVE'
          : selectedRole.status === 'unpublished'
            ? 'UNPUBLISHED'
            : selectedRole.status === 'sent'
            ? 'SENT'
            : selectedRole.status === 'submitted'
              ? 'SUBMITTED'
              : selectedRole.status === 'rejected'
                ? 'REJECTED'
                : 'DRAFT'

    const updatedRole: TargetRoleModel = {
      ...selectedRole,
      title: editRoleForm.title.trim(),
      jobPositionCode: selectedOcc.code,
      jobPositionTitle: selectedOcc.name,
      scope:
        editRoleForm.scope ||
        editRoleForm.description ||
        selectedOcc.description,
      levels: editRoleForm.levelNames,
      levelDurations: editRoleForm.levelDurations,
      familyCode:
        editRoleForm.familyCode ||
        selectedRole.familyCode ||
        selectedOcc.profiles[0] ||
        'DEV',
      track: editRoleForm.track || selectedRole.track || 'PROFESSIONAL',
      responsibilities: [],
      assignedExpertId: editRoleForm.assignedExpertId,
      assignedExpertName: expertName,
      department: managerDepartment?.name || selectedOcc.name,
      description:
        editRoleForm.scope ||
        editRoleForm.description ||
        selectedOcc.description,
      status: targetStatus === 'sent' ? 'sent' : selectedRole.status,
      updatedAt: new Date().toISOString(),
    }

    // 1. Immediately update local state and persistence
    saveAndSetRoles((prev) =>
      prev.map((r) =>
        r.id === selectedRole.id ||
        (Boolean(r.code && selectedRole.code) &&
          r.code.trim().toUpperCase() === selectedRole.code.trim().toUpperCase() &&
          r.version === selectedRole.version)
          ? updatedRole
          : r
      ),
    )

    // 2. Immediately close the Edit Role modal
    setIsSkillTargetsModalOpen(false)
    setSelectedRole(null)

    // 3. Immediately show feedback toast
    toast({
      title:
        targetStatus === 'sent'
          ? 'Target Role Sent to Expert'
          : 'Target Role Updated',
      description:
        targetStatus === 'sent'
          ? `${updatedRole.title} (${updatedRole.code} v${updatedRole.version}) has been dispatched to ${expertName}.`
          : `Saved changes to ${updatedRole.code} - ${updatedRole.title}.`,
      variant: 'success',
    })

    // 4. Background server sync
    try {
      await request(
        `/api/v1/organizations/${orgId}/target-roles/${selectedRole.id}`,
        'PUT',
        {
          name: editRoleForm.title.trim(),
          familyCode: selectedOcc.code || editRoleForm.familyCode,
          track: editRoleForm.track,
          responsibilities: [],
          assignedExpertId: editRoleForm.assignedExpertId,
          description:
            editRoleForm.scope ||
            editRoleForm.description ||
            selectedOcc.description,
          status: newStatus,
          version: selectedRole.version,
          skillTargets: roleRequirements(selectedRole.skillTargets),
          levels: editRoleForm.levelNames,
          levelDurations: editRoleForm.levelDurations,
          levelCompetencies: selectedRole.levelCompetencies,
          competencyIds: selectedRole.competencyIds,
        },
        {
          'X-User-Role': 'LD_MANAGER',
        },
      )
      await fetchRoles()
    } catch {
      // Local fallback
    }
  }

  // L&D Manager: Approve and Publish submitted configuration (REQ-052)

  const handleApproveAndPublishRole = async (role: TargetRoleModel) => {
    if (publicationLock.current) return false
    const validation = getPublishValidation(role)
    const missingLevelsMessage = (levels: string[]) => publicationCopy(
      `Add skills and select their required knowledge levels for: ${levels.join(', ')}.`,
      `Bổ sung kỹ năng và chọn mức kiến thức yêu cầu cho các Level: ${levels.join(', ')}.`,
    )
    if (!validation.canPublish) {
      toast({
        title: publicationCopy('Publication blocked', 'Chưa thể xuất bản'),
        description: validation.missingLevels.length ? missingLevelsMessage(validation.missingLevels) : publicationCopy(
          'Complete the Role name, code, member levels, competency links and required knowledge levels before publishing.',
          'Hoàn thiện tên, mã Role, các Level, liên kết competency và mức kiến thức yêu cầu trước khi xuất bản.',
        ),
        variant: 'destructive',
      })
      return false
    }
    const orgId = resolveWorkspaceOrgId(
      session?.identity?.organizationId || activeComp?.id,
    )
    let failureMessage = publicationCopy(
      'Publication was not confirmed. Refresh the Role to check its status before trying again.',
      'Chưa xác nhận được kết quả xuất bản. Tải lại Role để kiểm tra trạng thái trước khi thử lại.',
    )
    publicationLock.current = true
    setPublishingRoleId(role.id)
    try {
      const res = await fetch(
        `/api/v1/organizations/${orgId}/target-roles/${encodeURIComponent(role.id)}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Role': 'LD_MANAGER',
          },
          body: JSON.stringify({
            name: role.title,
            familyCode: role.jobPositionCode || role.familyCode,
            track: (role.track || 'PROFESSIONAL').toUpperCase(),
            responsibilities: role.responsibilities,
            assignedExpertId: role.assignedExpertId,
            description: role.description,
            status: 'ACTIVE',
            version: role.version,
            skillTargets: roleRequirements(role.skillTargets),
            competencyIds: role.competencyIds,
            levelCompetencies: role.levelCompetencies,
            levels: role.levels,
            levelDurations: role.levelDurations,
          }),
        },
      )

      if (!res.ok) {
        const failure = await res.json().catch(() => null)
        if (failure?.code === 'INCOMPLETE_LEVEL_REQUIREMENTS' && Array.isArray(failure.levels)) {
          failureMessage = missingLevelsMessage(failure.levels.filter((level: unknown): level is string => typeof level === 'string'))
        }
        throw new Error('Publication rejected')
      }
      const saved = await res.json()
      if (saved?.id !== role.id || !['ACTIVE', 'PUBLISHED'].includes(saved?.status)) throw new Error('Publication not confirmed')
      const updatedRole: TargetRoleModel = {
        ...role,
        status: 'published',
        updatedAt: typeof saved.updatedAt === 'string' ? saved.updatedAt : role.updatedAt,
      }
      saveAndSetRoles((prev) =>
        prev.map((r) =>
          r.id === role.id ||
          (r.code && role.code && r.code.toUpperCase() === role.code.toUpperCase() && r.version === role.version)
            ? updatedRole
            : r
        ),
      )
      setViewingDetailsRole(prev => prev?.id === role.id ? updatedRole : prev)
      setSelectedRole(prev => prev?.id === role.id ? updatedRole : prev)
      await fetchRoles()
      toast({
        title: publicationCopy('Target Role published', 'Đã xuất bản Role'),
        description: publicationCopy(
          `${role.title} (${role.code} v${role.version}) has been approved and published.`,
          `${role.title} (${role.code} v${role.version}) đã được duyệt và xuất bản.`,
        ),
        variant: 'success',
      })
      return true
    } catch {
      toast({ title: publicationCopy('Publication not confirmed', 'Chưa xác nhận xuất bản'), description: failureMessage, variant: 'destructive' })
      return false
    } finally {
      publicationLock.current = false
      setPublishingRoleId(null)
    }
  }

  // L&D Manager: Unpublish target role
  const handleUnpublishRole = async (role: TargetRoleModel) => {
    const effectiveOrgId = resolveWorkspaceOrgId(
      session?.identity?.organizationId || activeComp?.id,
    )
    const updatedRole: TargetRoleModel = {
      ...role,
      status: 'unpublished',
      updatedAt: new Date().toISOString(),
    }

    saveAndSetRoles((prev) =>
      prev.map((r) =>
        r.id === role.id ||
        (r.code && role.code && r.code.toUpperCase() === role.code.toUpperCase() && r.version === role.version)
          ? updatedRole
          : r
      ),
    )

    try {
      const payload = {
        name: role.title,
        familyCode: role.jobPositionCode || role.familyCode,
        track: (role.track || 'PROFESSIONAL').toUpperCase(),
        responsibilities: role.responsibilities,
        assignedExpertId: role.assignedExpertId,
        description: role.description,
        status: 'UNPUBLISHED',
        version: role.version,
        skillTargets: role.skillTargets,
        competencyIds: role.competencyIds,
        levelCompetencies: role.levelCompetencies,
        levels: role.levels,
        levelDurations: role.levelDurations,
      }
      try {
        await request(
          `/api/v1/organizations/${effectiveOrgId}/target-roles/${encodeURIComponent(role.id)}`,
          'PUT',
          payload,
          {
            'X-User-Role': 'LD_MANAGER',
          },
        )
      } catch {
        if (role.code && role.code !== role.id) {
          await request(
            `/api/v1/organizations/${effectiveOrgId}/target-roles/${encodeURIComponent(role.code)}`,
            'PUT',
            payload,
            {
              'X-User-Role': 'LD_MANAGER',
            },
          ).catch(() => {})
        }
      }
      await fetchRoles()
    } catch {
      // Already saved via saveAndSetRoles
    }

    if (viewingDetailsRole?.id === role.id) {
      setViewingDetailsRole(null)
    }

    toast({
      title: 'Target Role Unpublished',
      description: `${role.title} (${role.code} v${role.version}) has been unpublished. Employees will no longer see this role in their catalog.`,
      variant: 'info',
    })
  }

  // L&D Manager: Open Reject dialog

  const handleOpenManagerRejectDialog = (role: TargetRoleModel) => {
    setManagerRejectingRole(role)

    setManagerRejectionReason('')

    setIsManagerRejectDialogOpen(true)
  }

  // L&D Manager: Confirm Reject & return configuration to expert for revision (REQ-052)

  const handleConfirmManagerRejection = async () => {
    if (!managerRejectingRole) return

    if (!managerRejectionReason.trim()) {
      toast({
        title: 'Revision Feedback Required',
        description:
          'Please specify clear guidance or revision notes for the domain expert.',
        variant: 'destructive',
      })

      return
    }

    const orgId = resolveWorkspaceOrgId(
      session?.identity?.organizationId || activeComp?.id,
    )
    const fullRejectionReason = `[LD_MANAGER]: ${managerRejectionReason.trim()}`
    const updatedRole: TargetRoleModel = {
      ...managerRejectingRole,
      status: 'rejected',
      rejectionReason: fullRejectionReason,
      updatedAt: new Date().toISOString(),
    }

    // Immediately close modal and reset state
    setIsManagerRejectDialogOpen(false)
    setManagerRejectingRole(null)
    setManagerRejectionReason('')

    // Immediately update optimistic state
    saveAndSetRoles((prev) =>
      prev.map((r) => (r.id === managerRejectingRole.id ? updatedRole : r)),
    )

    if (viewingDetailsRole?.id === managerRejectingRole.id) {
      setViewingDetailsRole(null)
    }

    toast({
      title: 'Target Role Returned for Revision',
      description: `${updatedRole.title} (${updatedRole.code}) returned to draft status with revision guidance for the expert.`,
      variant: 'info',
    })

    try {
      await request(
        `/api/v1/organizations/${orgId}/target-roles/${managerRejectingRole.id}`,
        'PUT',
        {
          name: managerRejectingRole.title,
          familyCode: managerRejectingRole.familyCode,
          track: managerRejectingRole.track,
          responsibilities: managerRejectingRole.responsibilities,
          assignedExpertId: managerRejectingRole.assignedExpertId,
          description: managerRejectingRole.description,
          status: 'REJECTED',
          version: managerRejectingRole.version,
          skillTargets: roleRequirements(managerRejectingRole.skillTargets),
          competencyIds: managerRejectingRole.competencyIds,
          levelCompetencies: managerRejectingRole.levelCompetencies,
          levels: managerRejectingRole.levels,
          levelDurations: managerRejectingRole.levelDurations,
          rejectionReason: fullRejectionReason,
        },
        {
          'X-User-Role': 'LD_MANAGER',
        },
      )
      await fetchRoles()
    } catch {
      // Local optimistic state is already saved
    }
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

        return {
          ...r,
          competencyIds: updatedCompIds,
          updatedAt: new Date().toISOString(),
        }
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
    const validThresholds = role.skillTargets.every(
      (st) => validRequiredKnowledge(st.requiredKnowledgeLevels),
    )
    const missingLevels = missingRoleLevelRequirements(role.levels, role.skillTargets)
    const canPublish =
      hasTitle &&
      hasCode &&
      hasCompetencies &&
      hasSkillTargets &&
      validThresholds && Boolean(role.levels?.length) && missingLevels.length === 0

    return {
      canPublish,
      hasTitle,
      hasCode,
      hasCompetencies,
      hasSkillTargets,
      validThresholds,
      missingLevels,
    }
  }

  // Execute Publication

  const handleExecutePublish = async (role: TargetRoleModel) => {
    if (await handleApproveAndPublishRole(role)) setIsPublishModalOpen(false)
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            variant="gradient"

            icon={<Briefcase className="h-4 w-4 text-primary" />}

            title="Total Role Profiles"

            value={isLoading ? '—' : totalRoles.toString()}

            valueClassName="text-primary"

            description="Across technical architectures"
          />

          <StatCard
            variant="gradient"

            icon={<CheckCircle2 className="h-4 w-4 text-success" />}

            title="Published Versions"

            value={isLoading ? '—' : publishedRoles.toString()}

            valueClassName="text-success"

            description="Active for diagnostic pathways"
          />

          <StatCard
            variant="gradient"

            icon={<Edit3 className="h-4 w-4 text-warning" />}

            title="In-Flight Profiles"

            value={isLoading ? '—' : (
              draftRoles +
              sentRoles +
              submittedRoles +
              feedbackRoles +
              rejectedRoles
            ).toString()}

            valueClassName="text-warning"

            description={`${draftRoles} drafts · ${sentRoles} sent · ${submittedRoles} submitted · ${feedbackRoles} feedback`}
          />
        </div>

        {/* Roles Table and Filters */}

        <Card>
          <CardHeader>
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div className="min-w-0 pr-2">
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary shrink-0" />
                  <span>Target Role Version Catalog</span>
                </CardTitle>

                <CardDescription>
                  {isLdManager && managerDepartment
                    ? `Draft and published role definitions for ${managerDepartment.name}.`
                    : t('roleKnowledge.catalogHelp')}
                </CardDescription>
              </div>

              {/* Search and Status Filters - Guaranteed 1 Single Row */}

              <div className="flex items-center gap-2.5 shrink-0 flex-nowrap overflow-x-auto pb-0.5">
                <div className="relative w-48 sm:w-56 shrink-0">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"

                    placeholder="Search roles..."

                    value={searchQuery}

                    onChange={(e) => setSearchQuery(e.target.value)}

                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                  />
                </div>

                <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1.5 shadow-2xs shrink-0">
                  <span className="text-[11px] text-muted-foreground font-medium">
                    Status:
                  </span>
                  <select
                    value={statusFilter}

                    onChange={(e) =>
                      setStatusFilter(
                        e.target.value as
                          | 'all'
                          | 'published'
                          | 'draft'
                          | 'sent'
                          | 'submitted'
                          | 'feedback'
                          | 'rejected'
                          | 'unpublished',
                      )
                    }

                    className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer font-medium"
                  >
                    <option value="all">All ({totalRoles})</option>
                    <option value="published">
                      Published ({publishedRoles})
                    </option>
                    <option value="unpublished">
                      Unpublished ({managerVisibleRoles.filter((r) => getManagerEffectiveStatus(r) === 'unpublished').length})
                    </option>
                    <option value="sent">Sent ({sentRoles})</option>
                    <option value="submitted">
                      Submitted ({submittedRoles})
                    </option>
                    <option value="draft">Drafts ({draftRoles})</option>
                    <option value="feedback">Feedback ({feedbackRoles})</option>
                    <option value="rejected">Rejected ({rejectedRoles})</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1.5 shadow-2xs shrink-0">
                  <span className="text-[11px] text-muted-foreground font-medium">
                    Sort:
                  </span>
                  <select
                    value={sortBy}

                    onChange={(e) =>
                      setSortBy(e.target.value as 'latest' | 'title')
                    }

                    className="text-xs bg-transparent text-foreground border-0 focus:outline-none cursor-pointer font-medium"
                  >
                    <option value="latest">Latest</option>
                    <option value="title">Title (A–Z)</option>
                  </select>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-3" />
                <p className="text-sm font-medium">
                  Loading target roles from database...
                </p>
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                <p className="text-sm font-semibold">
                  {isLdManager && !managerDepartment
                    ? 'No department assigned. Please contact your workspace administrator to assign you to a department.'
                    : 'No target roles found.'}
                </p>
                {(!isLdManager || Boolean(managerDepartment)) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setStatusFilter('all')}
                  >
                    Reset Filter
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[11px] font-semibold">
                        <th className="py-2.5 px-3">Role Code</th>
                        <th className="py-2.5 px-3">Title &amp; Version</th>
                        <th className="py-2.5 px-3">Job Position</th>
                        <th className="py-2.5 px-3 text-center whitespace-nowrap">
                          Levels
                        </th>
                        <th className="py-2.5 px-3">Assigned Expert</th>
                        <th className="py-2.5 px-3 text-center">Competency</th>
                        <th className="py-2.5 px-3 text-center">Micro-skill</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-border">
                      {filteredRoles.length === 0 ? (
                        <tr>
                          <td
                            colSpan={9}
                            className="text-center py-10 text-muted-foreground text-xs"
                          >
                            No target roles registered yet for this company.
                            Click "+ New Target Role" or import a role matrix to
                            begin.
                          </td>
                        </tr>
                      ) : (
                        paginatedRoles.map((role) => {
                          const effStatus = getManagerEffectiveStatus(role)
                          const isDraft = effStatus === 'draft'
                          const isSent = effStatus === 'sent'
                          const isSubmitted = effStatus === 'submitted'
                          const isFeedback = effStatus === 'feedback'
                          const isRejected = effStatus === 'rejected'
                          const isPublished = effStatus === 'published'
                          const isUnpublished = effStatus === 'unpublished'
                          const isPublishedOrUnpublished = isPublished || isUnpublished
                          const cleanRejectionReason = (
                            role.rejectionReason || ''
                          ).replace(/^\[(EXPERT|LD_MANAGER)\]:\s*/, '')

                          // Lineage identification for published / unpublished versions

                          const publishedInLineage = roles
                            .filter(
                              (r) =>
                                (r.stableId === role.stableId ||
                                  r.code === role.code) &&
                                (r.status === 'published' || r.status === 'unpublished'),
                            )
                            .sort((a, b) =>
                              compareRoleVersions(b.version, a.version),
                            )

                          const newestPublished = publishedInLineage[0]
                          const isNewestPublished =
                            isPublishedOrUnpublished &&
                            newestPublished &&
                            role.id === newestPublished.id
                          const isOlderPublished =
                            isPublishedOrUnpublished && !isNewestPublished
                          const hasOlderPublished =
                            isNewestPublished && publishedInLineage.length > 1
                          const lineageKey = role.stableId || role.code
                          const isLineageExpanded = Boolean(
                            expandedLineages[lineageKey],
                          )

                          // Collapse older versions if lineage dropdown is not expanded

                          if (isOlderPublished && !isLineageExpanded) {
                            return null
                          }

                          // Identify if role is a successor placed below a published/unpublished version

                          const predecessorPublished = roles.find(
                            (r) =>
                              (r.stableId === role.stableId ||
                                r.code === role.code) &&
                              (r.status === 'published' || r.status === 'unpublished') &&
                              r.id !== role.id,
                          )

                          const isSuccessor =
                            !isPublishedOrUnpublished && Boolean(predecessorPublished)
                          const expert =
                            orgExperts.find(
                              (e) => e.id === role.assignedExpertId,
                            ) ||
                            findEligibleExpert(role.assignedExpertId, orgId) ||
                            ELIGIBLE_EXPERTS.find(
                              (e) => e.id === role.assignedExpertId,
                            )

                          return (
                            <tr
                              key={role.id}

                              onClick={() => {
                                if (hasOlderPublished) {
                                  toggleLineage(lineageKey)
                                }
                              }}

                              className={`transition-colors ${
                                hasOlderPublished
                                  ? 'cursor-pointer select-none hover:bg-primary/5'
                                  : 'hover:bg-muted/20'
                              } ${
                                isOlderPublished
                                  ? 'bg-muted/5 text-muted-foreground'
                                  : isSuccessor
                                    ? 'bg-muted/10 border-l-2 border-l-primary/60'
                                    : ''
                              }`}

                              title={
                                hasOlderPublished
                                  ? isLineageExpanded
                                    ? 'Click row to collapse previous versions'
                                    : 'Click row to view previous versions'
                                  : undefined
                              }
                            >
                              <td className="py-3 px-3 font-mono font-bold text-foreground">
                                {isOlderPublished ? (
                                  <div
                                    className="flex items-center gap-1.5 pl-6 text-muted-foreground"
                                    title={`Historical version v${role.version}`}
                                  >
                                    <History className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <span className="text-muted-foreground font-normal">
                                      {role.code}
                                    </span>
                                  </div>
                                ) : isSuccessor ? (
                                  <div
                                    className="flex items-center gap-1.5 pl-3"
                                    title="Successor draft positioned below published version"
                                  >
                                    <CornerDownRight className="h-3.5 w-3.5 text-primary shrink-0" />
                                    <span>{role.code}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    {hasOlderPublished && (
                                      <span className="text-primary/70 shrink-0">
                                        {isLineageExpanded ? (
                                          <ChevronDown className="h-3.5 w-3.5" />
                                        ) : (
                                          <ChevronRight className="h-3.5 w-3.5" />
                                        )}
                                      </span>
                                    )}

                                    <span>{role.code}</span>
                                  </div>
                                )}
                              </td>

                              <td className="py-3 px-3">
                                <div className="font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                                  <span>{role.title}</span>

                                  {isOlderPublished && (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] py-0 px-1 font-mono text-muted-foreground border-border"
                                    >
                                      Previous v{role.version}
                                    </Badge>
                                  )}
                                </div>

                                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <Badge
                                    variant="secondary"
                                    className="font-mono text-[10px] py-0 px-1"
                                  >
                                    v{role.version}
                                  </Badge>

                                  <span>
                                    Updated {formatDate(role.updatedAt)}
                                  </span>
                                </div>

                                {isFeedback && cleanRejectionReason && (
                                  <div
                                    className="text-[11px] text-black flex items-center gap-1 mt-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25 w-fit"
                                    title={cleanRejectionReason}
                                  >
                                    <AlertTriangle className="h-3 w-3 shrink-0 text-black" />
                                    <span className="font-semibold text-black">
                                      Expert Feedback:
                                    </span>
                                    <span className="truncate max-w-xs text-black">
                                      {cleanRejectionReason}
                                    </span>
                                  </div>
                                )}

                                {isRejected && cleanRejectionReason && (
                                  <div
                                    className="text-[11px] text-destructive flex items-center gap-1 mt-1 bg-destructive/5 px-2 py-0.5 rounded border border-destructive/20 w-fit"
                                    title={cleanRejectionReason}
                                  >
                                    <AlertTriangle className="h-3 w-3 shrink-0" />
                                    <span className="font-semibold">
                                      Revision Notes:
                                    </span>
                                    <span className="truncate max-w-xs">
                                      {cleanRejectionReason}
                                    </span>
                                  </div>
                                )}
                              </td>

                              <td className="py-3 px-3">
                                {(() => {
                                  const occ = resolveJobPositionForRole(role, orgId)

                                  return (
                                    <span className="text-xs font-medium text-foreground">
                                      {role.jobPositionTitle || occ.name}
                                    </span>
                                  )
                                })()}
                              </td>

                              <td className="py-3 px-3 text-center">
                                <span className="font-semibold text-foreground text-xs font-mono">
                                  {
                                    (role.levels && role.levels.length > 0
                                      ? role.levels
                                      : ['Senior', 'Middle', 'Junior']
                                    ).length
                                  }
                                </span>
                              </td>

                              <td className="py-3 px-3">
                                {role.assignedExpertName || expert ? (
                                  <div className="flex items-center gap-1.5">
                                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">
                                      {(
                                        expert?.name || (role.assignedExpertName && !role.assignedExpertName.includes('-') ? role.assignedExpertName : undefined) || orgExperts.find((e) => e.id === role.assignedExpertId)?.name || 'E'
                                      )
                                        .slice(0, 2)
                                        .toUpperCase()}
                                    </div>

                                    <span className="text-xs font-medium text-foreground">
                                      {expert?.name || (role.assignedExpertName && !role.assignedExpertName.includes('-') ? role.assignedExpertName : undefined) || orgExperts.find((e) => e.id === role.assignedExpertId)?.name || 'Unassigned'}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground italic">
                                    Unassigned
                                  </span>
                                )}
                              </td>

                              <td className="py-3 px-3 text-center">
                                <span className="font-semibold text-foreground text-xs font-mono">
                                  {role.competencyIds.length}
                                </span>
                              </td>

                              <td className="py-3 px-3 text-center">
                                <span className="font-semibold text-foreground text-xs font-mono">
                                  {role.skillTargets.length}
                                </span>
                              </td>

                              <td className="py-3 px-3">
                                {isPublished && (
                                  <Badge variant="success">PUBLISHED</Badge>
                                )}

                                {isUnpublished && (
                                  <Badge variant="outline" className="border-muted-foreground/40 text-muted-foreground font-bold">
                                    UNPUBLISHED
                                  </Badge>
                                )}

                                {isSubmitted && (
                                  <Badge
                                    variant="primary"
                                    className="bg-sky-500/10 text-sky-600 border-sky-500/20 font-bold dark:text-sky-400"
                                  >
                                    SUBMITTED
                                  </Badge>
                                )}

                                {isSent && (
                                  <Badge className="bg-[#EA580C] text-white border-transparent font-bold hover:bg-[#C2410C]">
                                    SENT
                                  </Badge>
                                )}

                                {isFeedback && (
                                  <Badge
                                    variant="outline"
                                    className="bg-amber-500/15 !text-black border-amber-500/30 font-bold dark:!text-black"
                                  >
                                    FEEDBACK
                                  </Badge>
                                )}

                                {isRejected && (
                                  <Badge variant="destructive">REJECTED</Badge>
                                )}

                                {isDraft && (
                                  <Badge variant="warning">DRAFT</Badge>
                                )}
                              </td>

                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* View Details (Reviews submitted roles, inspects all fields per level) */}

                                  <Button
                                    variant="outline"

                                    size="sm"

                                    className="h-8 w-8 p-0"

                                    onClick={(e) => {
                                      e.stopPropagation()

                                      setViewingDetailsRole(role)
                                    }}

                                    title="View Details"

                                    aria-label="View Details"
                                  >
                                    <Eye className="h-4 w-4 text-primary" />
                                  </Button>

                                  {/* View Knowledge Graph (REQ-018-F01) */}

                                  <Button
                                    variant="outline"

                                    size="sm"

                                    className="h-8 w-8 p-0"

                                    onClick={(e) => {
                                      e.stopPropagation()

                                      setGraphRole(role)
                                    }}

                                    title="View Competency Knowledge Graph"

                                    aria-label="View Competency Knowledge Graph"
                                  >
                                    <NetworkIcon className="h-4 w-4 text-primary" />
                                  </Button>

                                  {/* Edit Role (Draft/Feedback/Rejected/Published/Unpublished) - Lock editing only when Sent or Submitted */}

                                  {!isSent && !isSubmitted && (
                                    <Button
                                      variant="outline"

                                      size="sm"

                                      className="h-8 w-8 p-0"

                                      onClick={(e) => {
                                        e.stopPropagation()

                                        handleOpenEditRole(role)
                                      }}

                                      title={
                                        isPublished || isUnpublished
                                          ? 'Edit Role & Assigned Expert'
                                          : isFeedback
                                            ? 'Edit & Address Expert Feedback'
                                            : 'Edit Role Details'
                                      }

                                      aria-label={
                                        isPublished || isUnpublished
                                          ? 'Edit Role & Assigned Expert'
                                          : isFeedback
                                            ? 'Edit & Address Expert Feedback'
                                            : 'Edit Role Details'
                                      }
                                    >
                                      {isFeedback ? (
                                        <Edit3 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                      ) : (
                                        <Edit3 className="h-4 w-4" />
                                      )}
                                    </Button>
                                  )}

                                  {/* Unpublish Role (for Published roles) */}
                                  {isPublished && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-muted-foreground hover:bg-muted"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setRoleToUnpublish(role)
                                      }}
                                      title="Unpublish Target Role"
                                      aria-label="Unpublish Target Role"
                                    >
                                      <EyeOff className="h-4 w-4" />
                                    </Button>
                                  )}

                                  {/* Re-publish Role (for Unpublished roles) */}
                                  {isUnpublished && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-success hover:bg-success/10 border-success/30"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleApproveAndPublishRole(role)
                                      }}
                                      title="Re-publish Target Role"
                                      aria-label="Re-publish Target Role"
                                    >
                                      <CheckCircle2 className="h-4 w-4" />
                                    </Button>
                                  )}

                                  {/* Delete Role */}

                                  {isDraft && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setDeletingRole(role)
                                      }}
                                      title="Delete Draft"
                                      aria-label="Delete Draft"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {visibleRoles.length > 0 && (
                  <Pagination
                    currentPage={currentPage}

                    totalPages={totalPages}

                    totalItems={visibleRoles.length}

                    pageSize={pageSize}

                    onPageChange={setCurrentPage}

                    itemLabel="roles"
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 1. CREATE TARGET ROLE MODAL */}

      <Dialog
        open={isCreateRoleModalOpen}
        onOpenChange={setIsCreateRoleModalOpen}
        className="max-w-3xl max-h-[88vh] flex flex-col p-6 overflow-hidden"
      >
        <DialogHeader className="shrink-0 mb-3">
          <div className="flex items-center justify-between pr-4">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary shrink-0" />
              <span>{roleForm.title.trim() || 'Create Target Role'}</span>
            </DialogTitle>

            <Badge
              variant="outline"
              className="bg-primary/10 text-primary border-primary/25 font-bold text-xs"
            >
              NEW DRAFT
            </Badge>
          </div>

          <DialogDescription className="text-xs text-muted-foreground">
            Define a target role profile, align with industry standards, and
            establish benchmark proficiency targets for your workforce.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1.5 space-y-3.5 text-xs min-h-0">
          {/* Card 1: Role Identity */}

          <div className="p-3.5 rounded-lg border border-border bg-card space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Role Identification &amp; Code
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-foreground block mb-1">
                  Unique Role Code <span className="text-destructive">*</span>
                </label>

                <input
                  type="text"

                  placeholder="e.g. ROLE-AI-ARCH"

                  value={roleForm.code}

                  onChange={(e) =>
                    setRoleForm({ ...roleForm, code: e.target.value })
                  }

                  className="w-full px-2.5 py-1.5 rounded-md bg-background border border-border text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-foreground block mb-1">
                  Role Title <span className="text-destructive">*</span>
                </label>

                <input
                  type="text"

                  placeholder="e.g. AI Knowledge Architect"

                  value={roleForm.title}

                  onChange={(e) =>
                    setRoleForm({ ...roleForm, title: e.target.value })
                  }

                  className="w-full px-2.5 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Industry Job Position Alignment */}

          <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
            {managerDepartment && (
              <div className="flex items-center justify-between p-2.5 rounded-md bg-background border border-border">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                      Assigned Department
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {managerDepartment.name}
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/30">
                  AUTO-LINKED
                </Badge>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                  Industry Job Position Alignment
                </span>

                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Align this role with a recognized industry job position
                  and benchmark standard.
                </p>
              </div>

              <Badge
                variant="secondary"
                className="text-[10px] font-semibold shrink-0 self-start sm:self-center"
              >
                Job Zone 4
              </Badge>
            </div>

            {jobPositionOptions.length === 0 && (
              <div role="status" className="rounded-lg border border-warning/40 bg-warning/5 p-3 text-body-sm text-foreground flex items-start gap-2.5 my-2">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-xs text-foreground">No active job positions available</p>
                  <p className="text-[11.5px] text-muted-foreground mt-0.5">
                    Target roles must belong to an active job position. Please create or link a job position before creating target roles.
                  </p>
                </div>
              </div>
            )}

            <div className="pt-1">
              <label className="text-[11px] font-semibold text-foreground block mb-1">
                Job Position <span className="text-destructive">*</span>
              </label>

              <Combobox
                size="sm"
                clearable={false}
                disabled={jobPositionOptions.length === 0}
                options={jobPositionOptions}
                value={roleForm.jobPositionCode}
                onChange={(val) => {
                  if (!val) {
                    setRoleForm((prev) => ({
                      ...prev,
                      jobPositionCode: '',
                    }))
                    return
                  }

                  const occ =
                    availableJobPositions.find((o) => o.code === val) ||
                    availableJobPositions.find((o) => o.code === val)
                  const eligible = getEligibleExpertsForJobPosition(
                    val,
                    orgId,
                    managerDepartment,
                    orgExperts,
                  )
                  const isCurrentEligible = eligible.some(
                    (e) =>
                      normalizeExpertId(e.id) ===
                      normalizeExpertId(roleForm.assignedExpertId),
                  )
                  const newExpertId = isCurrentEligible
                    ? roleForm.assignedExpertId
                    : eligible[0]?.id || ''

                  setRoleForm((prev) => ({
                    ...prev,
                    jobPositionCode: val,
                    assignedExpertId: newExpertId,
                    scope: prev.scope || occ?.description || '',
                    description: prev.description || occ?.description || '',
                  }))
                }}
                placeholder={jobPositionOptions.length === 0 ? 'No job positions available' : 'Select Job Position...'}
                searchPlaceholder="Search job position..."
              />
            </div>

            {(() => {
              const selectedOcc =
                availableJobPositions.find((o) => o.code === roleForm.jobPositionCode) ||
                availableJobPositions.find((o) => o.code === roleForm.jobPositionCode)

              if (!selectedOcc) return null

              return (
                <p className="text-[10.5px] text-muted-foreground bg-background/60 p-2 rounded border border-primary/10 leading-relaxed">
                  {selectedOcc.description}
                </p>
              )
            })()}
          </div>

          {/* Card 3: Role Mastery Levels */}

          <div className="p-3.5 rounded-lg border border-border bg-card space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-foreground block">
                  {t('roleKnowledge.memberLevels')}
                </span>

                <span className="text-[10px] text-muted-foreground">
                  Define progressive levels for this role. Level codes are
                  automatically generated.
                </span>
              </div>

              <Button
                type="button"

                variant="outline"

                size="sm"

                onClick={() => {
                  const nextRank = roleForm.levelNames.length + 1
                  const newName = `Rank ${nextRank}`
                  const defaultDur = nextRank === 1 ? '6 months' : nextRank === 2 ? '4 months' : nextRank === 3 ? '3 months' : '2 months'
                  setRoleForm((prev) => ({
                    ...prev,
                    levelNames: [...prev.levelNames, newName],
                    levelDurations: {
                      ...(prev.levelDurations || {}),
                      [newName]: defaultDur,
                    },
                  }))
                }}

                className="h-7 text-xs font-semibold"

                leftIcon={<Plus className="h-3.5 w-3.5 text-primary" />}
              >
                Add Level
              </Button>
            </div>

            <div className="space-y-2">
              {roleForm.levelNames.map((name, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 rounded-md bg-muted/20 border border-border"
                >
                  <Badge
                    variant="secondary"
                    className="font-mono text-xs px-2 shrink-0"
                  >
                    Rank {idx + 1}
                  </Badge>

                  <input
                    type="text"

                    value={name}

                    onChange={(e) => {
                      const newNames = [...roleForm.levelNames]
                      const oldName = newNames[idx]
                      const newName = e.target.value
                      newNames[idx] = newName
                      const newDurations = { ...(roleForm.levelDurations || {}) }
                      if (oldName && newDurations[oldName]) {
                        newDurations[newName] = newDurations[oldName]
                        delete newDurations[oldName]
                      }
                      setRoleForm({ ...roleForm, levelNames: newNames, levelDurations: newDurations })
                    }}

                    placeholder={`e.g. ${idx === 0 ? 'Senior' : idx === 1 ? 'Middle' : idx === 2 ? 'Junior' : 'Foundational'}`}

                    className="flex-1 px-2.5 py-1 text-xs rounded border border-border bg-background text-foreground font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                  />

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">Est. Duration:</span>
                    <div className="inline-flex items-center rounded border border-border bg-background focus-within:ring-1 focus-within:ring-primary focus-within:border-primary overflow-hidden">
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={parseDurationNumber(roleForm.levelDurations?.[name], idx === 0 ? 6 : idx === 1 ? 4 : idx === 2 ? 3 : 2)}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '')
                          const num = raw ? Math.max(1, parseInt(raw, 10)) : 1
                          setRoleForm((prev) => ({
                            ...prev,
                            levelDurations: {
                              ...(prev.levelDurations || {}),
                              [name]: `${num} months`,
                            },
                          }))
                        }}
                        className="w-12 px-2 py-1 text-xs bg-transparent text-foreground font-semibold text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        title="Estimated Level Duration"
                      />
                      <span className="px-1.5 py-1 text-xs text-muted-foreground font-medium bg-muted/40 border-l border-border select-none">
                        months
                      </span>
                    </div>
                  </div>

                  {roleForm.levelNames.length > 1 && (
                    <Button
                      type="button"

                      variant="ghost"

                      size="sm"

                      onClick={() => {
                        const removedName = roleForm.levelNames[idx]
                        const newNames = roleForm.levelNames.filter(
                          (_, i) => i !== idx,
                        )
                        const newDurations = { ...(roleForm.levelDurations || {}) }
                        delete newDurations[removedName]
                        setRoleForm({ ...roleForm, levelNames: newNames, levelDurations: newDurations })
                      }}

                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"

                      title="Remove Level"

                      aria-label="Remove Level"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Card 4: Assigned Subject Matter Expert */}

          <div className="p-3.5 rounded-lg border border-border bg-card space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Assigned Subject Matter Expert
              </span>

              <span className="text-[10px] text-primary font-medium">
                {createExpertOptions.length} eligible expert
                {createExpertOptions.length !== 1 ? 's' : ''} available for this
                job position
              </span>
            </div>

            <div>
              <Combobox
                size="sm"

                clearable={false}

                options={createExpertOptions}

                value={roleForm.assignedExpertId}

                onChange={(val) =>
                  val && setRoleForm({ ...roleForm, assignedExpertId: val })
                }

                placeholder="Select assigned domain expert..."

                searchPlaceholder="Search eligible expert for this job position..."
              />

              <span className="text-[10px] text-muted-foreground mt-1 block">
                Assign an active subject matter expert from your organization to
                curate role competencies and micro-skills.
              </span>
            </div>
          </div>

          {/* Card 5: Role Scope & Summary */}

          <div className="p-3.5 rounded-lg border border-border bg-card space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Role Scope &amp; Summary
            </span>

            <div>
              <label className="text-[11px] font-semibold text-foreground block mb-1">
                Role Scope &amp; Summary
              </label>

              <textarea
                rows={3}

                placeholder="Summarize the purpose, scope, and strategic objectives of this target role..."

                value={roleForm.scope}

                onChange={(e) =>
                  setRoleForm({
                    ...roleForm,
                    scope: e.target.value,
                    description: e.target.value,
                  })
                }

                className="w-full px-2.5 py-1.5 rounded-md bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 pt-3 border-t border-border mt-3 flex items-center justify-between sm:justify-between w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreateRoleModalOpen(false)}
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={
                !roleForm.code.trim() ||
                !roleForm.title.trim() ||
                !roleForm.jobPositionCode.trim() ||
                jobPositionOptions.length === 0
              }
              onClick={() => handleCreateRoleSubmit('draft')}
            >
              Save as Draft
            </Button>

            <Button
              variant="primary"
              size="sm"
              leftIcon={<Send className="h-4 w-4" />}
              disabled={
                !roleForm.code.trim() ||
                !roleForm.title.trim() ||
                !roleForm.jobPositionCode.trim() ||
                jobPositionOptions.length === 0
              }
              onClick={() => handleCreateRoleSubmit('sent')}
            >
              Create &amp; Send to Expert
            </Button>
          </div>
        </DialogFooter>
      </Dialog>

      {/* 2. MAINTAIN ROLE-COMPETENCY MAPPINGS MODAL */}

      {selectedRole && (
        <Dialog
          open={isMappingsModalOpen}
          onOpenChange={(open) => {
            setIsMappingsModalOpen(open)
            if (!open) setSelectedRole(null)
          }}
        >
          <div className="space-y-4">
            <DialogHeader>
              <div className="flex items-center justify-between pr-4">
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />

                  {selectedRole.title}
                </DialogTitle>

                <Badge
                  variant={
                    selectedRole.status === 'submitted'
                      ? 'success'
                      : selectedRole.status === 'sent'
                        ? 'secondary'
                        : selectedRole.status === 'draft'
                          ? 'warning'
                          : 'outline'
                  }
                >
                  {selectedRole.status.toUpperCase()}
                </Badge>
              </div>

              <DialogDescription className="text-xs text-muted-foreground">
                Link and maintain active competency requirements for this target
                role.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">
                  Available Competencies Catalog
                </span>
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
                    No competencies registered for this company yet. Define
                    competencies in Competency Management first.
                  </div>
                ) : (
                  (() => {
                    const filtered = companyCompetencies.filter(
                      (c) =>
                        !compSearchQuery.trim() ||
                        c.code
                          .toLowerCase()
                          .includes(compSearchQuery.toLowerCase()) ||
                        c.name
                          .toLowerCase()
                          .includes(compSearchQuery.toLowerCase()) ||
                        (c.description || '')
                          .toLowerCase()
                          .includes(compSearchQuery.toLowerCase()),
                    )

                    if (filtered.length === 0) {
                      return (
                        <div className="p-4 text-center text-muted-foreground text-xs border border-dashed rounded-lg">
                          No competencies match &ldquo;{compSearchQuery}&rdquo;.
                        </div>
                      )
                    }

                    return filtered.map((comp) => {
                      const isLinked = selectedRole.competencyIds.includes(
                        comp.id,
                      )
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
                              <span className="font-mono font-bold text-foreground">
                                {comp.code}
                              </span>
                              <span className="font-semibold text-foreground truncate">
                                {comp.name}
                              </span>
                              <Badge
                                variant={isArchived ? 'outline' : 'secondary'}
                                className="text-[10px] py-0 px-1"
                              >
                                {comp.status}
                              </Badge>
                            </div>

                            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                              {comp.description}
                            </p>
                          </div>

                          <div className="shrink-0">
                            {isArchived ? (
                              <Badge
                                variant="destructive"
                                className="text-[10px]"
                              >
                                Archived (Rejected)
                              </Badge>
                            ) : (selectedRole.status === 'published' || selectedRole.status === 'unpublished') ? (
                              <Badge variant={isLinked ? 'success' : 'outline'}>
                                {isLinked ? 'Linked (Locked)' : 'Unlinked'}
                              </Badge>
                            ) : (
                              <Button
                                variant={isLinked ? 'outline' : 'primary'}

                                size="sm"

                                onClick={() =>
                                  handleToggleCompetency(
                                    selectedRole.id,
                                    comp.id,
                                  )
                                }
                              >
                                {isLinked ? 'Remove Link' : 'Link Competency'}
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })
                  })()
                )}
              </div>

              {(selectedRole.status === 'published' || selectedRole.status === 'unpublished') && (
                <div className="p-2.5 rounded bg-warning/10 border border-warning/30 text-[11px] text-warning flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    This role is published or unpublished. To modify competency links, create a
                    successor draft first.
                  </span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setIsMappingsModalOpen(false)
                  setSelectedRole(null)
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}

      {/* 3. SET ROLE SKILL TARGETS / REVIEW MODAL */}

      {selectedRole &&
        (() => {
          const modalEffStatus = getManagerEffectiveStatus(selectedRole)
          const isSubmittedRole = modalEffStatus === 'submitted'
          const isSentRole = modalEffStatus === 'sent'
          const isPublishedRole = modalEffStatus === 'published'
          const isUnpublishedRole = modalEffStatus === 'unpublished'
          const isFeedbackRole = modalEffStatus === 'feedback'
          const isRejectedRole = modalEffStatus === 'rejected'
          const isDraftRole =
            modalEffStatus === 'draft' || isFeedbackRole || isRejectedRole
          const cleanModalRejectionReason = (
            selectedRole.rejectionReason || ''
          ).replace(/^\[(EXPERT|LD_MANAGER)\]:\s*/, '')

          return (
            <Dialog
              open={isSkillTargetsModalOpen}
              onOpenChange={(open) => {
                setIsSkillTargetsModalOpen(open)
                if (!open) setSelectedRole(null)
              }}
              className="max-w-3xl max-h-[88vh] flex flex-col p-6 overflow-hidden"
            >
              <DialogHeader className="shrink-0 mb-3">
                <div className="flex items-center justify-between pr-4">
                  <DialogTitle className="text-base font-bold flex items-center gap-2">
                    {isSubmittedRole ? (
                      <FileCheck className="h-5 w-5 text-foreground shrink-0" />
                    ) : (
                      <Edit3 className="h-5 w-5 text-primary shrink-0" />
                    )}

                    <span>
                      {isSubmittedRole
                        ? `Review Submitted Role: ${selectedRole.title}`
                        : editRoleForm?.title || selectedRole.title}
                    </span>
                  </DialogTitle>

                  <Badge
                    variant={
                      isPublishedRole
                        ? 'success'
                        : isSubmittedRole
                          ? 'primary'
                          : isFeedbackRole
                            ? 'warning'
                            : isRejectedRole
                              ? 'destructive'
                              : isSentRole
                                ? 'outline'
                                : 'warning'
                    }

                    className={
                      isSubmittedRole
                        ? 'bg-sky-500/10 text-sky-600 border-sky-500/20 font-bold dark:text-sky-400'
                        : isSentRole
                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold dark:text-amber-400'
                          : isFeedbackRole
                            ? 'bg-amber-500/15 !text-black border-amber-500/30 font-bold dark:!text-black'
                            : ''
                    }
                  >
                    {modalEffStatus.toUpperCase()}
                  </Badge>
                </div>

                <DialogDescription className="text-xs text-muted-foreground">
                  {isSubmittedRole
                    ? 'Review the target role configuration, competencies, and micro-skills submitted by the domain expert.'
                    : isSentRole
                      ? t('roleKnowledge.dispatched')
                      : isFeedbackRole
                        ? 'The domain expert provided feedback requesting revisions on this proposal. Update details and re-dispatch.'
                        : isRejectedRole
                          ? 'This configuration was returned to the domain expert for revision.'
                          : 'Update role details, customize benchmark proficiency targets, and manage expert assignments.'}
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto pr-2 space-y-3.5 text-xs min-h-0">
                {/* Review Banner when submitted */}

                {isSubmittedRole && (
                  <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-800 dark:text-sky-300 flex items-start gap-2.5">
                    <FileCheck className="h-4 w-4 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" />
                    <div className="space-y-0.5 text-xs">
                      <span className="font-semibold block">
                        Configuration Submitted for Review
                      </span>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        The assigned Domain Expert has completed micro-skill
                        authoring and submitted this configuration for your
                        confirmation. Review the specifications below. Choose{' '}
                        <strong>Approve &amp; Publish</strong> to activate the
                        role or <strong>Return for Revision</strong> to send it
                        back to draft.
                      </p>
                    </div>
                  </div>
                )}

                {/* Revision Feedback Banner when in feedback state */}

                {isFeedbackRole && cleanModalRejectionReason && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-black flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-black mt-0.5 shrink-0" />
                    <div className="space-y-0.5 text-xs text-black">
                      <span className="font-semibold block text-black">
                        Domain Expert Feedback
                      </span>
                      <p className="text-[11px] leading-relaxed text-black">
                        {cleanModalRejectionReason}
                      </p>
                    </div>
                  </div>
                )}

                {/* Rejection Notes when manager returned configuration */}

                {isRejectedRole && cleanModalRejectionReason && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <div className="space-y-0.5 text-xs">
                      <span className="font-semibold block">
                        Revision Notes for Expert
                      </span>
                      <p className="text-[11px] leading-relaxed">
                        {cleanModalRejectionReason}
                      </p>
                    </div>
                  </div>
                )}

                {/* Card 1: Role Identity */}

                <div className="p-3.5 rounded-lg border border-border bg-card space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Role Identification &amp; Code
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-foreground block mb-1">
                        Role Code{' '}
                        <span className="text-[10px] text-muted-foreground font-normal">
                          (Identifier)
                        </span>
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

                        disabled={isSubmittedRole || isPublishedRole}

                        value={editRoleForm.title}

                        onChange={(e) =>
                          setEditRoleForm({
                            ...editRoleForm,
                            title: e.target.value,
                          })
                        }

                        className={`w-full px-2.5 py-1.5 rounded-md border text-xs shadow-2xs ${
                          isSubmittedRole || isPublishedRole
                            ? 'bg-muted/50 border-border text-foreground cursor-not-allowed opacity-80'
                            : 'bg-background border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Card 2: Industry Job Position Alignment */}

                <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                        Industry Job Position Alignment
                      </span>

                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Align this role with a recognized industry
                        job position and benchmark standard.
                      </p>
                    </div>

                    <Badge
                      variant="secondary"
                      className="text-[10px] font-semibold shrink-0 self-start sm:self-center"
                    >
                      Job Zone 4
                    </Badge>
                  </div>

                  <div className="pt-1">
                    <label className="text-[11px] font-semibold text-foreground block mb-1">
                      Job Position <span className="text-destructive">*</span>
                    </label>

                    <Combobox
                      size="sm"

                      clearable={false}

                      disabled={isSubmittedRole || isPublishedRole}

                      options={jobPositionOptions}

                      value={editRoleForm.jobPositionCode}

                      onChange={(val) => {
                        if (!val) return

                        const occ =
                          availableJobPositions.find((o) => o.code === val) ||
                          availableJobPositions.find((o) => o.code === val)
                        let eligible = getEligibleExpertsForJobPosition(
                          val,
                          orgId,
                          editRoleDeptScope,
                          orgExperts,
                        )
                        if (eligible.length === 0 && orgExperts.length > 0) {
                          eligible = orgExperts
                        }
                        const isCurrentEligible = eligible.some(
                          (e) =>
                            normalizeExpertId(e.id) ===
                            normalizeExpertId(editRoleForm.assignedExpertId),
                        )
                        const newExpertId =
                          editRoleForm.assignedExpertId ||
                          (isCurrentEligible ? editRoleForm.assignedExpertId : '') ||
                          eligible[0]?.id ||
                          ''

                        setEditRoleForm((prev) => ({
                          ...prev,
                          jobPositionCode: val,
                          assignedExpertId: newExpertId,
                          scope: prev.scope || occ?.description || '',
                          description:
                            prev.description || occ?.description || '',
                        }))
                      }}

                      placeholder="Select Job Position..."

                      searchPlaceholder="Search job position..."
                    />
                  </div>

                  {(() => {
                    const selectedOcc =
                      availableJobPositions.find((o) => o.code === editRoleForm.jobPositionCode) ||
                      availableJobPositions.find((o) => o.code === editRoleForm.jobPositionCode)

                    if (!selectedOcc) return null

                    return (
                      <p className="text-[10.5px] text-muted-foreground bg-background/60 p-2 rounded border border-primary/10 leading-relaxed">
                        {selectedOcc.description}
                      </p>
                    )
                  })()}
                </div>

                {/* Card 3: Role Mastery Levels */}

                <div className="p-3.5 rounded-lg border border-border bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-foreground block">
                        {t('roleKnowledge.memberLevels')}
                      </span>

                      <span className="text-[10px] text-muted-foreground">
                        Define progressive levels for this role. Level codes are
                        automatically generated.
                      </span>
                    </div>

                    {!isSubmittedRole && !isPublishedRole && (
                      <Button
                        type="button"

                        variant="outline"

                        size="sm"

                        onClick={() => {
                          const nextRank = editRoleForm.levelNames.length + 1
                          const newName = `Rank ${nextRank}`
                          const defaultDur = nextRank === 1 ? '6 months' : nextRank === 2 ? '4 months' : nextRank === 3 ? '3 months' : '2 months'
                          setEditRoleForm((prev) => ({
                            ...prev,
                            levelNames: [...prev.levelNames, newName],
                            levelDurations: {
                              ...(prev.levelDurations || {}),
                              [newName]: defaultDur,
                            },
                          }))
                        }}

                        className="h-7 text-xs font-semibold"

                        leftIcon={<Plus className="h-3.5 w-3.5 text-primary" />}
                      >
                        Add Level
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {editRoleForm.levelNames.map((name, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 rounded-md bg-muted/20 border border-border"
                      >
                        <Badge
                          variant="secondary"
                          className="font-mono text-xs px-2 shrink-0"
                        >
                          Rank {idx + 1}
                        </Badge>

                        <input
                          type="text"

                          disabled={isSubmittedRole || isPublishedRole}

                          value={name}

                          onChange={(e) => {
                            const newNames = [...editRoleForm.levelNames]
                            const oldName = newNames[idx]
                            const newName = e.target.value
                            newNames[idx] = newName
                            const newDurations = { ...(editRoleForm.levelDurations || {}) }
                            if (oldName && newDurations[oldName]) {
                              newDurations[newName] = newDurations[oldName]
                              delete newDurations[oldName]
                            }

                            setEditRoleForm({
                              ...editRoleForm,
                              levelNames: newNames,
                              levelDurations: newDurations,
                            })
                          }}

                          placeholder={`e.g. ${idx === 0 ? 'Senior' : idx === 1 ? 'Middle' : idx === 2 ? 'Junior' : 'Foundational'}`}

                          className={`flex-1 px-2.5 py-1 text-xs rounded border border-border bg-background text-foreground font-medium focus:ring-1 focus:ring-primary focus:outline-none ${
                            isSubmittedRole || isPublishedRole
                              ? 'bg-muted/50 cursor-not-allowed opacity-80'
                              : ''
                          }`}
                        />

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap">Est. Duration:</span>
                          <div className={`inline-flex items-center rounded border border-border bg-background focus-within:ring-1 focus-within:ring-primary focus-within:border-primary overflow-hidden ${
                            isSubmittedRole || isPublishedRole
                              ? 'bg-muted/50 cursor-not-allowed opacity-80'
                              : ''
                          }`}>
                            <input
                              type="number"
                              min={1}
                              step={1}
                              disabled={isSubmittedRole || isPublishedRole}
                              value={parseDurationNumber(editRoleForm.levelDurations?.[name], idx === 0 ? 6 : idx === 1 ? 4 : idx === 2 ? 3 : 2)}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/\D/g, '')
                                const num = raw ? Math.max(1, parseInt(raw, 10)) : 1
                                setEditRoleForm((prev) => ({
                                  ...prev,
                                  levelDurations: {
                                    ...(prev.levelDurations || {}),
                                    [name]: `${num} months`,
                                  },
                                }))
                              }}
                              className="w-12 px-2 py-1 text-xs bg-transparent text-foreground font-semibold text-center focus:outline-none disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              title="Estimated Level Duration"
                            />
                            <span className="px-1.5 py-1 text-xs text-muted-foreground font-medium bg-muted/40 border-l border-border select-none">
                              months
                            </span>
                          </div>
                        </div>

                        {!isSubmittedRole &&
                          !isPublishedRole &&
                          editRoleForm.levelNames.length > 1 && (
                            <Button
                              type="button"

                              variant="ghost"

                              size="sm"

                              onClick={() => {
                                const removedName = editRoleForm.levelNames[idx]
                                const newNames = editRoleForm.levelNames.filter(
                                  (_, i) => i !== idx,
                                )
                                const newDurations = { ...(editRoleForm.levelDurations || {}) }
                                delete newDurations[removedName]

                                setEditRoleForm({
                                  ...editRoleForm,
                                  levelNames: newNames,
                                  levelDurations: newDurations,
                                })
                              }}

                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"

                              title="Remove Level"

                              aria-label="Remove Level"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card 4: Assigned Subject Matter Expert */}

                <div className="p-3.5 rounded-lg border border-border bg-card space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Assigned Subject Matter Expert
                    </span>

                    <span className="text-[10px] text-primary font-medium">
                      {editExpertOptions.length} eligible expert
                      {editExpertOptions.length !== 1 ? 's' : ''} available for
                      this job position
                    </span>
                  </div>

                  <div>
                    <Combobox
                      size="sm"

                      clearable={false}

                      disabled={isSubmittedRole}

                      options={editExpertOptions}

                      value={editRoleForm.assignedExpertId}

                      onChange={(val) =>
                        val &&
                        setEditRoleForm({
                          ...editRoleForm,
                          assignedExpertId: val,
                        })
                      }

                      placeholder="Select assigned domain expert..."

                      searchPlaceholder="Search eligible expert for this job position..."
                    />

                    <span className="text-[10px] text-muted-foreground mt-1 block">
                      Assign an active subject matter expert from your
                      organization to curate role competencies and micro-skills.
                    </span>
                  </div>
                </div>

                {/* Card 5: Role Scope & Summary */}

                <div className="p-3.5 rounded-lg border border-border bg-card space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Role Scope &amp; Summary
                  </span>

                  <div>
                    <label className="text-[11px] font-semibold text-foreground block mb-1">
                      Role Scope &amp; Summary
                    </label>

                    <textarea
                      rows={3}

                      disabled={isSubmittedRole || isPublishedRole}

                      placeholder="Summarize the purpose, scope, and strategic objectives of this target role..."

                      value={editRoleForm.scope}

                      onChange={(e) =>
                        setEditRoleForm({
                          ...editRoleForm,
                          scope: e.target.value,
                          description: e.target.value,
                        })
                      }

                      className={`w-full px-2.5 py-1.5 rounded-md border text-xs shadow-2xs ${
                        isSubmittedRole || isPublishedRole
                          ? 'bg-muted/50 border-border text-foreground cursor-not-allowed opacity-80'
                          : 'bg-background border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary'
                      }`}
                    />
                  </div>
                </div>

                {/* Current assigned targets table (Read-only for L&D Manager) */}

                {selectedRole.skillTargets &&
                  selectedRole.skillTargets.length > 0 && (
                    <div>
                      <div className="font-semibold text-foreground mb-2 flex items-center justify-between">
                        <span>
                          Assigned Micro-Skills Matrix (
                          {selectedRole.skillTargets.length})
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Configured by Domain Expert
                        </span>
                      </div>

                      <div className="overflow-x-auto border rounded-lg border-border">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase text-[10px] font-semibold">
                              <th className="py-2 px-3">
                                Skill Code &amp; Name
                              </th>
                              <th className="py-2 px-3 text-center">
                                {t('roleKnowledge.required')}
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-border">
                            {selectedRole.skillTargets.map((st) => (
                              <tr
                                key={st.skillId}
                                className="hover:bg-muted/10"
                              >
                                <td className="py-2.5 px-3">
                                  <div className="font-mono font-bold text-foreground">
                                    {st.skillCode}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground">
                                    {st.skillName}
                                  </div>
                                </td>

                                <td className="py-2.5 px-3 text-center">
                                  <span className="font-bold text-primary">
                                    {formatRequiredKnowledge(st.requiredKnowledgeLevels, t)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
              </div>

              <DialogFooter className="shrink-0 pt-3 border-t border-border mt-3 flex items-center justify-between sm:justify-between w-full">
                {isSubmittedRole ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsSkillTargetsModalOpen(false)}
                    >
                      Cancel
                    </Button>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"

                        size="sm"

                        className="text-destructive hover:bg-destructive/10 border-destructive/30 font-medium"

                        onClick={() => {
                          const r = selectedRole

                          setIsSkillTargetsModalOpen(false)

                          handleOpenManagerRejectDialog(r)
                        }}

                        leftIcon={
                          <XCircle className="h-3.5 w-3.5 text-destructive" />
                        }
                      >
                        Return for Revision
                      </Button>

                      <Button
                        variant="primary"

                        size="sm"

                        onClick={async () => {
                          const r = selectedRole

                          if (await handleApproveAndPublishRole(r)) setIsSkillTargetsModalOpen(false)
                        }}

                        disabled={publishingRoleId !== null}
                        isLoading={publishingRoleId === selectedRole.id}

                        leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                      >
                        Approve &amp; Publish
                      </Button>
                    </div>
                  </>
                ) : isDraftRole ? (
                  <>
                    <Button
                      variant="destructive"
                      size="sm"
                      leftIcon={<Trash2 className="h-4 w-4" />}
                      onClick={() => {
                        const r = selectedRole
                        setIsSkillTargetsModalOpen(false)
                        setSelectedRole(null)
                        setDeletingRole(r)
                      }}
                    >
                      Delete Draft Role
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsSkillTargetsModalOpen(false)
                          setSelectedRole(null)
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!editRoleForm.title.trim() || !editRoleForm.jobPositionCode.trim()}
                        onClick={() => handleSaveEditRole('draft')}
                      >
                        Save Changes
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<Send className="h-4 w-4" />}
                        disabled={!editRoleForm.title.trim() || !editRoleForm.jobPositionCode.trim()}
                        onClick={() => handleSaveEditRole('sent')}
                      >
                        {isSentRole || isFeedbackRole
                          ? 'Save & Re-dispatch to Expert'
                          : selectedRole.rejectionReason
                            ? 'Save & Re-send to Expert'
                            : 'Save & Send to Expert'}
                      </Button>
                    </div>
                  </>
                ) : isSentRole ? (
                  <>
                    <div />
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsSkillTargetsModalOpen(false)
                          setSelectedRole(null)
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!editRoleForm.title.trim() || !editRoleForm.jobPositionCode.trim()}
                        onClick={() => handleSaveEditRole('draft')}
                      >
                        Save Changes
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<Send className="h-4 w-4" />}
                        disabled={!editRoleForm.title.trim() || !editRoleForm.jobPositionCode.trim()}
                        onClick={() => handleSaveEditRole('sent')}
                      >
                        Save & Re-dispatch to Expert
                      </Button>
                    </div>
                  </>
                ) : isPublishedRole || isUnpublishedRole ? (
                  <>
                    <div />
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsSkillTargetsModalOpen(false)
                          setSelectedRole(null)
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={!editRoleForm.assignedExpertId}
                        onClick={() => handleSaveEditRole()}
                      >
                        Save Changes
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsSkillTargetsModalOpen(false)
                        setSelectedRole(null)
                      }}
                    >
                      Close
                    </Button>
                  </>
                )}
              </DialogFooter>
            </Dialog>
          )
        })()}

      {/* 4. PUBLICATION READINESS VERIFICATION MODAL */}

      {selectedRole && (
        <Dialog open={isPublishModalOpen} onOpenChange={setIsPublishModalOpen}>
          <div className="space-y-4">
            <DialogHeader>
              <div className="flex items-center justify-between pr-4">
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />

                  {selectedRole.title}
                </DialogTitle>

                <Badge
                  variant={
                    selectedRole.status === 'published' ? 'success' : 'outline'
                  }
                >
                  {selectedRole.status.toUpperCase()}
                </Badge>
              </div>

              <DialogDescription className="text-xs text-muted-foreground">
                {t('roleKnowledge.publishHelp')}
              </DialogDescription>
            </DialogHeader>

            {(() => {
              const validation = getPublishValidation(selectedRole)

              return (
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                    <div className="font-semibold text-foreground mb-1">
                      Publication Criteria Checklist
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Unique Role Code &amp; Title defined
                      </span>

                      {validation.hasTitle && validation.hasCode ? (
                        <span className="text-success font-semibold flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" /> Verified
                        </span>
                      ) : (
                        <span className="text-destructive font-semibold">
                          Missing Code/Title
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Competency (&ge; 1 required)
                      </span>

                      {validation.hasCompetencies ? (
                        <span className="text-success font-semibold flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" />{' '}
                          {selectedRole.competencyIds.length} Linked
                        </span>
                      ) : (
                        <span className="text-destructive font-semibold">
                          0 Competencies
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Micro-skills configured
                      </span>

                      {validation.hasSkillTargets ? (
                        <span className="text-success font-semibold flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" />{' '}
                          {selectedRole.skillTargets.length} Configured
                        </span>
                      ) : (
                        <span className="text-destructive font-semibold">
                          0 Micro-skills
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {t('roleKnowledge.requiredLevels')}
                      </span>

                      {validation.validThresholds ? (
                        <span className="text-success font-semibold flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" /> Compliant
                        </span>
                      ) : (
                        <span className="text-destructive font-semibold">
                          {t('roleKnowledge.needsConfiguration')}
                        </span>
                      )}
                    </div>
                  </div>

                  {!validation.canPublish ? (
                    <div role="alert" className="p-2.5 rounded bg-destructive/10 border border-destructive/20 text-destructive text-[11px] flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>
                        {validation.missingLevels.length ? publicationCopy(
                          `Add skills and select their required knowledge levels for: ${validation.missingLevels.join(', ')}.`,
                          `Bổ sung kỹ năng và chọn mức kiến thức yêu cầu cho các Level: ${validation.missingLevels.join(', ')}.`,
                        ) : publicationCopy(
                          'Complete the checklist above before publishing this Role.',
                          'Hoàn thiện các mục bên trên trước khi xuất bản Role.',
                        )}
                      </span>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded bg-success/10 border border-success/20 text-success text-[11px] flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>
                        All validation checks passed! Publishing will make this
                        version available for diagnostic gap analysis.
                      </span>
                    </div>
                  )}
                </div>
              )
            })()}

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPublishModalOpen(false)}
              >
                Cancel
              </Button>

              <Button
                variant="primary"

                size="sm"

                disabled={publishingRoleId !== null || !getPublishValidation(selectedRole).canPublish}
                isLoading={publishingRoleId === selectedRole.id}

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

          className="max-w-5xl w-full h-[88vh] max-h-[88vh] flex flex-col p-6 overflow-hidden"
        >
          <DialogHeader className="shrink-0 mb-3">
            <div className="flex items-center justify-between pr-4">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary shrink-0" />
                <span>{viewingDetailsRole.title}</span>
              </DialogTitle>

              {(() => {
                const viewEffStatus =
                  getManagerEffectiveStatus(viewingDetailsRole)

                return (
                  <Badge
                    variant={
                      viewEffStatus === 'published'
                        ? 'success'
                        : viewEffStatus === 'feedback'
                          ? 'outline'
                          : viewEffStatus === 'rejected'
                            ? 'destructive'
                            : 'warning'
                    }

                    className={
                      viewEffStatus === 'feedback'
                        ? 'bg-amber-500/15 !text-black border-amber-500/30 font-bold dark:!text-black text-xs'
                        : viewEffStatus === 'submitted'
                          ? 'bg-sky-500/10 text-sky-600 border-sky-500/20 font-bold dark:text-sky-400 text-xs'
                          : viewEffStatus === 'sent'
                            ? 'bg-[#EA580C] text-white border-transparent font-bold text-xs hover:bg-[#C2410C]'
                            : 'font-bold text-xs'
                    }
                  >
                    {viewEffStatus.toUpperCase()}
                  </Badge>
                )
              })()}
            </div>

            <DialogDescription className="text-xs text-muted-foreground">
              Comprehensive role specifications, level-by-level competency
              requirements, and workforce alignment.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1.5 space-y-4 text-xs min-h-0">
            {/* Rejection / Feedback Notice */}

            {(() => {
              const viewEffStatus =
                getManagerEffectiveStatus(viewingDetailsRole)
              const cleanViewRejectionReason = (
                viewingDetailsRole.rejectionReason || ''
              ).replace(/^\[(EXPERT|LD_MANAGER)\]:\s*/, '')

              if (!cleanViewRejectionReason) return null

              if (viewEffStatus === 'feedback') {
                return (
                  <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-black flex items-start gap-2.5">
                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-black" />
                    <div className="text-black">
                      <div className="font-bold text-black">
                        Domain Expert Feedback:
                      </div>
                      <div className="mt-1 text-black leading-relaxed whitespace-pre-wrap">
                        {cleanViewRejectionReason}
                      </div>
                    </div>
                  </div>
                )
              }

              if (viewEffStatus === 'rejected') {
                return (
                  <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/25 text-xs text-destructive flex items-start gap-2.5">
                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-destructive" />
                    <div>
                      <div className="font-bold text-foreground">
                        Revision Notes:
                      </div>
                      <div className="mt-1 text-foreground leading-relaxed whitespace-pre-wrap">
                        {cleanViewRejectionReason}
                      </div>
                    </div>
                  </div>
                )
              }

              return null
            })()}

            {/* Job Position & Ontology Levels Banner */}

            {(() => {
              const occ = resolveJobPositionForRole(viewingDetailsRole, orgId)

              return (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                        Job Position
                      </div>

                      <div className="text-sm font-bold text-foreground flex items-center gap-2 mt-0.5">
                        <span>
                          {viewingDetailsRole.jobPositionTitle || occ.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="font-mono text-xs font-semibold text-primary border-primary/30"
                        >
                          {viewingDetailsRole.jobPositionCode || occ.code}
                        </Badge>
                      </div>

                      <p className="text-[11px] text-muted-foreground mt-1 max-w-xl">
                        {occ.description}
                      </p>
                    </div>

                    <div className="shrink-0 text-right sm:border-l sm:border-border sm:pl-4">
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-semibold"
                      >
                        Job Zone 4
                      </Badge>

                      <div className="text-[10px] text-muted-foreground mt-1">
                        Considerable Preparation
                      </div>
                    </div>
                  </div>

                  {/* Role Mastery Levels */}

                  <div className="p-3 rounded-lg border border-border bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-foreground">
                        {t('roleKnowledge.memberLevels')}
                      </span>

                      <span className="text-[10px] text-muted-foreground font-semibold">
                        {viewingDetailsRole.levels?.length || 3} Progressive
                        Levels
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(viewingDetailsRole.levels &&
                      viewingDetailsRole.levels.length > 0
                        ? viewingDetailsRole.levels
                        : ['Senior', 'Middle', 'Junior']
                      ).map((lvlName, idx) => {
                        const lvlDuration = resolveLevelDuration(viewingDetailsRole, lvlName, idx)
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-1.5 p-2 rounded-md bg-muted/30 border border-border/80"
                          >
                            <Badge
                              variant="secondary"
                              className="text-[9px] py-0 px-1 font-mono"
                            >
                              Rank {idx + 1}
                            </Badge>
                            <span className="font-bold text-foreground text-xs">
                              {lvlName}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded font-mono">
                              <Clock className="h-2.5 w-2.5" />
                              {lvlDuration}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Meta Grid */}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg border border-border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                  Role Code
                </span>
                <span className="font-mono font-bold text-foreground mt-0.5 block">
                  {viewingDetailsRole.code}
                </span>
              </div>

              <div className="p-2.5 rounded-lg border border-border bg-card">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                  Version
                </span>
                <span className="font-mono font-bold text-foreground mt-0.5 block">
                  v{viewingDetailsRole.version}
                </span>
              </div>

              <div className="p-2.5 rounded-lg border border-border bg-card col-span-2 sm:col-span-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                  Assigned Domain Expert
                </span>
                <span className="font-semibold text-primary mt-0.5 truncate block">
                  {viewingDetailsRole.assignedExpertName ||
                    findEligibleExpert(viewingDetailsRole.assignedExpertId)
                      ?.name ||
                    ELIGIBLE_EXPERTS.find(
                      (e) => e.id === viewingDetailsRole.assignedExpertId,
                    )?.name ||
                    'Unassigned'}
                </span>
              </div>
            </div>

            {/* Role Scope & Operational Objectives */}

            <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1.5 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Role Scope &amp; Summary
              </span>

              <p className="text-foreground leading-relaxed">
                {viewingDetailsRole.scope ||
                  viewingDetailsRole.description ||
                  'Defines standardized competency requirements and skill milestones for this enterprise role profile.'}
              </p>
            </div>

            {/* Level-Specific Competencies & Micro-skills Breakdown */}

            {(() => {
              const detailRoleLevels =
                viewingDetailsRole.levels &&
                viewingDetailsRole.levels.length > 0
                  ? viewingDetailsRole.levels
                  : ['Senior', 'Middle', 'Junior']

              const hasExplicitLevelComps = Boolean(
                viewingDetailsRole.levelCompetencies &&
                Object.keys(viewingDetailsRole.levelCompetencies).length > 0 &&
                Object.values(viewingDetailsRole.levelCompetencies).some(
                  (list) => Array.isArray(list) && list.length > 0,
                ),
              )

              return (
                <div className="space-y-3 pt-1">
                  {/* View Mode Toggle: Specifications vs Version Diff */}

                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border">
                    <div className="inline-flex p-0.5 rounded-lg bg-muted border border-border">
                      <button
                        type="button"

                        onClick={() => setDetailViewMode('specs')}

                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                          detailViewMode === 'specs'
                            ? 'bg-card text-foreground shadow-2xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Architecture Specifications
                      </button>

                      <button
                        type="button"

                        onClick={() => setDetailViewMode('diff')}

                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                          detailViewMode === 'diff'
                            ? 'bg-card text-foreground font-bold shadow-2xs border border-border/80'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Diff className="h-3.5 w-3.5 text-primary" />
                        <span>Version Changes (Diff)</span>
                      </button>
                    </div>

                    <span className="text-[11px] text-muted-foreground font-medium">
                      {detailViewMode === 'specs'
                        ? 'Inspect levels, competencies & skills'
                        : 'Compare against previous baseline'}
                    </span>
                  </div>

                  {detailViewMode === 'diff' ? (
                    <TargetRoleVersionDiff
                      currentRole={viewingDetailsRole}

                      allRoles={managerVisibleRoles}

                      competencies={companyCompetencies}

                      microSkills={companyMicroSkills}
                    />
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Layers className="h-4 w-4 text-primary" />
                          Level Competencies &amp; Micro-skill Requirements
                        </span>

                        <span className="text-[11px] text-muted-foreground font-medium">
                          Select level to inspect isolated competencies &amp;
                          skills
                        </span>
                      </div>

                      {/* Level Tabs */}

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"

                          onClick={() => setSelectedDetailLevelTab('ALL')}

                          className={`px-3 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                            selectedDetailLevelTab === 'ALL'
                              ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                              : 'bg-card text-muted-foreground hover:bg-muted/30 border-border'
                          }`}
                        >
                          All Levels Overview
                        </button>

                        {detailRoleLevels.map((lvl, lIdx) => {
                          const lvlComps =
                            viewingDetailsRole.levelCompetencies?.[lvl] ||
                            (!hasExplicitLevelComps &&
                            lvl === detailRoleLevels[0]
                              ? viewingDetailsRole.competencyIds
                              : []) ||
                            []
                          const lvlSkills =
                            viewingDetailsRole.skillTargets.filter(
                              (st) => (st.level || detailRoleLevels[0]) === lvl,
                            )
                          const isSelected = selectedDetailLevelTab === lvl
                          const lvlDuration = resolveLevelDuration(viewingDetailsRole, lvl, lIdx)

                          return (
                            <button
                              key={lvl}

                              type="button"

                              onClick={() => setSelectedDetailLevelTab(lvl)}

                              className={`px-3 py-1 rounded-md text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                                isSelected
                                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                  : 'bg-card text-foreground hover:bg-muted/30 border-border'
                              }`}
                            >
                              <span>{lvl}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                              >
                                {lvlDuration} · {lvlSkills.length} skills · {lvlComps.length}{' '}
                                comps
                              </span>
                            </button>
                          )
                        })}
                      </div>

                      {/* Content for All Levels or Selected Level */}

                      {selectedDetailLevelTab === 'ALL' ? (
                        <div className="space-y-3">
                          {detailRoleLevels.map((lvl, lIdx) => {
                            const lvlComps =
                              viewingDetailsRole.levelCompetencies?.[lvl] ||
                              (!hasExplicitLevelComps &&
                              lvl === detailRoleLevels[0]
                                ? viewingDetailsRole.competencyIds
                                : []) ||
                              []
                            const lvlSkills =
                              viewingDetailsRole.skillTargets.filter(
                                (st) =>
                                  (st.level || detailRoleLevels[0]) === lvl,
                              )
                            const lvlDuration = resolveLevelDuration(viewingDetailsRole, lvl, lIdx)

                            return (
                              <div
                                key={lvl}
                                className="p-3.5 rounded-lg border border-border bg-card space-y-2.5"
                              >
                                <div className="flex items-center justify-between pb-1.5 border-b border-border flex-wrap gap-2">
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="secondary"
                                      className="font-mono text-[10px]"
                                    >
                                      Rank {lIdx + 1}
                                    </Badge>
                                    <span className="font-bold text-foreground text-xs">
                                      {lvl} Level
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full font-mono">
                                      <Clock className="h-3 w-3" />
                                      Est. Duration: {lvlDuration}
                                    </span>
                                  </div>

                                  <span className="text-[11px] text-muted-foreground font-mono">
                                    {lvlSkills.length} skills configured ·{' '}
                                    {lvlComps.length} competencies
                                  </span>
                                </div>

                                {/* Competencies for this Level */}

                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                                    Level Competencies ({lvlComps.length})
                                  </span>

                                  {lvlComps.length === 0 ? (
                                    <span className="text-[11px] text-muted-foreground italic">
                                      No competencies assigned to {lvl} level.
                                    </span>
                                  ) : (
                                    <div className="flex flex-wrap gap-1.5">
                                      {lvlComps.map((cid) => {
                                        const comp = companyCompetencies.find(
                                          (c) => c.id === cid || c.code === cid,
                                        )

                                        return (
                                          <span
                                            key={cid}

                                            className="px-2 py-0.5 rounded bg-secondary text-primary font-medium text-[11px] border border-primary/20"
                                          >
                                            {comp
                                              ? `${comp.code}: ${comp.name}`
                                              : cid}
                                          </span>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>

                                {/* Micro-skills for this Level */}

                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                                    Required Micro-skills ({lvlSkills.length})
                                  </span>

                                  {lvlSkills.length === 0 ? (
                                    <span className="text-[11px] text-muted-foreground italic">
                                      No micro-skills configured for {lvl}{' '}
                                      level.
                                    </span>
                                  ) : (
                                    <div className="rounded border border-border overflow-hidden">
                                      <table className="w-full text-left text-xs">
                                        <thead className="bg-muted/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                                          <tr>
                                            <th className="py-1.5 px-2.5">
                                              Skill Code &amp; Title
                                            </th>
                                            <th className="py-1.5 px-2.5 text-center w-28">
                                              {t('roleKnowledge.required')}
                                            </th>
                                          </tr>
                                        </thead>

                                        <tbody className="divide-y divide-border">
                                          {lvlSkills.map((st) => {
                                            const skill =
                                              companyMicroSkills.find(
                                                (s) =>
                                                  s.id === st.skillId ||
                                                  s.code === st.skillCode,
                                              )

                                            return (
                                              <tr
                                                key={st.skillId || st.skillCode}
                                                className="hover:bg-muted/20"
                                              >
                                                <td className="py-1.5 px-2.5">
                                                  <span className="font-mono font-bold text-primary mr-1">
                                                    {st.skillCode ||
                                                      skill?.code}
                                                  </span>
                                                  <span className="text-foreground">
                                                    {st.skillName ||
                                                      skill?.name}
                                                  </span>
                                                </td>

                                                <td className="py-1.5 px-2.5 text-center font-mono font-bold text-primary">
                                                  {formatRequiredKnowledge(st.requiredKnowledgeLevels, t)}
                                                </td>
                                              </tr>
                                            )
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-lg border border-border bg-card space-y-3">
                          {(() => {
                            const selectedIdx = Math.max(0, detailRoleLevels.indexOf(selectedDetailLevelTab))
                            const selectedDur = resolveLevelDuration(viewingDetailsRole, selectedDetailLevelTab, selectedIdx)
                            return (
                              <div className="flex items-center justify-between pb-2 border-b border-border flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="font-mono text-[10px]">
                                    Rank {selectedIdx + 1}
                                  </Badge>
                                  <span className="font-bold text-foreground text-xs">
                                    {selectedDetailLevelTab} Level
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full font-mono">
                                    <Clock className="h-3 w-3" />
                                    Est. Duration: {selectedDur}
                                  </span>
                                </div>
                              </div>
                            )
                          })()}

                          {/* Competencies for selected Level */}

                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                              Assigned Competencies for {selectedDetailLevelTab}
                            </span>

                            {(() => {
                              const lvlComps =
                                viewingDetailsRole.levelCompetencies?.[
                                  selectedDetailLevelTab
                                ] ||
                                (!hasExplicitLevelComps &&
                                selectedDetailLevelTab === detailRoleLevels[0]
                                  ? viewingDetailsRole.competencyIds
                                  : []) ||
                                []

                              if (lvlComps.length === 0) {
                                return (
                                  <div className="text-[11px] text-muted-foreground italic">
                                    No competencies assigned to{' '}
                                    {selectedDetailLevelTab}.
                                  </div>
                                )
                              }

                              return (
                                <div className="flex flex-wrap gap-1.5">
                                  {lvlComps.map((cid) => {
                                    const comp = companyCompetencies.find(
                                      (c) => c.id === cid || c.code === cid,
                                    )

                                    return (
                                      <span
                                        key={cid}
                                        className="px-2.5 py-1 rounded bg-secondary text-primary font-medium text-xs border border-primary/20"
                                      >
                                        {comp
                                          ? `${comp.code}: ${comp.name}`
                                          : cid}
                                      </span>
                                    )
                                  })}
                                </div>
                              )
                            })()}
                          </div>

                          {/* Micro-skills Table for selected Level */}

                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                              Target Micro-skills for {selectedDetailLevelTab}
                            </span>

                            {(() => {
                              const lvlSkills =
                                viewingDetailsRole.skillTargets.filter(
                                  (st) =>
                                    (st.level || detailRoleLevels[0]) ===
                                    selectedDetailLevelTab,
                                )

                              if (lvlSkills.length === 0) {
                                return (
                                  <div className="text-[11px] text-muted-foreground italic">
                                    No micro-skills configured for{' '}
                                    {selectedDetailLevelTab}.
                                  </div>
                                )
                              }

                              return (
                                <div className="rounded-lg border border-border overflow-hidden">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-muted/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                                      <tr>
                                        <th className="py-2 px-3">
                                          Skill Code &amp; Title
                                        </th>
                                        <th className="py-2 px-3 text-center w-32">
                                          {t('roleKnowledge.required')}
                                        </th>
                                      </tr>
                                    </thead>

                                    <tbody className="divide-y divide-border">
                                      {lvlSkills.map((st) => {
                                        const skill = companyMicroSkills.find(
                                          (s) =>
                                            s.id === st.skillId ||
                                            s.code === st.skillCode,
                                        )

                                        return (
                                          <tr
                                            key={st.skillId || st.skillCode}
                                            className="hover:bg-muted/20"
                                          >
                                            <td className="py-2 px-3">
                                              <span className="font-mono font-bold text-primary mr-1.5">
                                                {st.skillCode || skill?.code}
                                              </span>
                                              <span className="text-foreground">
                                                {st.skillName || skill?.name}
                                              </span>
                                            </td>

                                            <td className="py-2 px-3 text-center font-mono font-bold text-primary">
                                              {formatRequiredKnowledge(st.requiredKnowledgeLevels, t)}
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )
                            })()}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })()}
          </div>

          <DialogFooter className="shrink-0 pt-3 border-t border-border mt-3 flex items-center justify-between sm:justify-between w-full">
            {viewingDetailsRole?.status?.toLowerCase() === 'draft' ? (
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
                Delete Draft Role
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingDetailsRole(null)}
              >
                Close
              </Button>

              {viewingDetailsRole.status?.toLowerCase() === 'submitted' && (
                <>
                  <Button
                    variant="outline"

                    size="sm"

                    className="text-destructive hover:bg-destructive/10 border-destructive/30"

                    onClick={() => {
                      const r = viewingDetailsRole

                      setViewingDetailsRole(null)

                      handleOpenManagerRejectDialog(r)
                    }}

                    leftIcon={
                      <XCircle className="h-3.5 w-3.5 text-destructive" />
                    }
                  >
                    Return for Revision
                  </Button>

                  <Button
                    variant="primary"

                    size="sm"

                    onClick={() => {
                      const r = viewingDetailsRole
                      setViewingDetailsRole(null)
                      handleApproveAndPublishRole(r)
                    }}

                    disabled={publishingRoleId !== null}
                    isLoading={publishingRoleId === viewingDetailsRole.id}

                    leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                  >
                    Approve & Publish
                  </Button>
                </>
              )}

              {viewingDetailsRole.status === 'published' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-muted-foreground/30 text-muted-foreground hover:bg-muted"
                  onClick={() => {
                    const r = viewingDetailsRole
                    setViewingDetailsRole(null)
                    setRoleToUnpublish(r)
                  }}
                  leftIcon={<EyeOff className="h-3.5 w-3.5" />}
                >
                  Unpublish
                </Button>
              )}

              {viewingDetailsRole.status === 'unpublished' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const r = viewingDetailsRole
                    handleApproveAndPublishRole(r)
                  }}
                  leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                >
                  Re-publish
                </Button>
              )}

              {viewingDetailsRole.status !== 'published' &&
                viewingDetailsRole.status !== 'unpublished' &&
                viewingDetailsRole.status !== 'submitted' &&
                viewingDetailsRole.status !== 'sent' && (
                  <Button
                    variant="primary"

                    size="sm"

                    onClick={() => {
                      const r = viewingDetailsRole

                      setViewingDetailsRole(null)

                      handleOpenEditRole(r)
                    }}

                    leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                  >
                    Edit Target Role
                  </Button>
                )}
            </div>
          </DialogFooter>
        </Dialog>
      )}

      {/* 5. CONFIRMATION PROMPT TO DELETE TARGET ROLE (DRAFT OR PUBLISHED) */}

      <Dialog
        open={Boolean(deletingRole)}

        onOpenChange={(open) => !open && setDeletingRole(null)}
      >
        {deletingRole && (
          <>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                Discard Draft Target Role?
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Are you sure you want to discard{' '}
                <strong className="text-foreground">
                  {deletingRole.title}
                </strong>
                ?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
                <div className="font-semibold text-foreground">
                  {deletingRole.title}
                </div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                  <span>{deletingRole.track || 'PROFESSIONAL'}</span>
                  <span>•</span>
                  <span>v{deletingRole.version}</span>
                  <span>•</span>
                  <span>{deletingRole.skillTargets?.length || 0} Skills</span>
                  <span>•</span>
                  <span>
                    {deletingRole.competencyIds?.length || 0} Competencies
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/25 text-xs flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                <div className="text-[11.5px] leading-relaxed text-foreground">
                  <strong className="text-destructive font-semibold">
                    Draft Removal Impact:
                  </strong>{' '}
                  All uncommitted micro-skill benchmark thresholds,
                  responsibilities, and configuration changes for this draft
                  will be permanently deleted from the database.
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingRole(null)}
              >
                Keep Role
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (deletingRole) {
                    handleDeleteRole(deletingRole)
                  }
                }}
                leftIcon={<Trash2 className="h-3.5 w-3.5" />}
              >
                Delete Draft Role
              </Button>
            </DialogFooter>
          </>
        )}
      </Dialog>

      {/* 5B. UNPUBLISH TARGET ROLE CONFIRMATION MODAL */}
      <Dialog
        open={Boolean(roleToUnpublish)}
        onOpenChange={(open) => !open && setRoleToUnpublish(null)}
      >
        {roleToUnpublish && (
          <>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Unpublish Target Role?
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Are you sure you want to unpublish{' '}
                <strong className="text-foreground">
                  {roleToUnpublish.title}
                </strong>
                ?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
                <div className="font-semibold text-foreground flex items-center justify-between">
                  <span>{roleToUnpublish.title}</span>
                  <span className="text-[11px] text-muted-foreground font-mono">v{roleToUnpublish.version}</span>
                </div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                  <span>{roleToUnpublish.jobPositionTitle || roleToUnpublish.jobPositionCode || 'Unassigned'}</span>
                  <span>•</span>
                  <span>{roleToUnpublish.levels?.length || 0} Levels</span>
                  <span>•</span>
                  <span>{roleToUnpublish.skillTargets?.length || 0} Skills</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/25 text-xs flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                <div className="text-[11.5px] leading-relaxed text-foreground">
                  <strong className="text-destructive font-semibold">
                    Operational Impact:
                  </strong>{' '}
                  Unpublishing this target role will suspend it from active employee upskilling catalogs.
                  Existing learning pathways and historical diagnostic records will be preserved.
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRoleToUnpublish(null)}
              >
                Keep Published
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (roleToUnpublish) {
                    handleUnpublishRole(roleToUnpublish)
                    setRoleToUnpublish(null)
                  }
                }}
                leftIcon={<EyeOff className="h-3.5 w-3.5" />}
              >
                Unpublish Target Role
              </Button>
            </DialogFooter>
          </>
        )}
      </Dialog>

      {/* 6. MANAGER REJECTION / RETURN FOR REVISION MODAL */}

      {managerRejectingRole && (
        <Dialog
          open={isManagerRejectDialogOpen}

          onOpenChange={setIsManagerRejectDialogOpen}

          className="max-w-md"
        >
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                <span>Return for Revision: {managerRejectingRole.title}</span>
              </DialogTitle>

              <DialogDescription>
                Return this target role configuration to the assigned domain
                expert for revision.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground font-mono">
                    {managerRejectingRole.code}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    v{managerRejectingRole.version}
                  </Badge>
                </div>

                <div className="text-muted-foreground text-xs font-medium">
                  {managerRejectingRole.title}
                </div>

                <div className="text-[11px] text-muted-foreground pt-1.5 border-t border-destructive/10 flex items-center justify-between">
                  <span>Assigned Domain Expert:</span>
                  <span className="font-semibold text-foreground">
                    {managerRejectingRole.assignedExpertName || 'Domain Expert'}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Revision Notes &amp; Feedback{' '}
                  <span className="text-destructive">*</span>
                </label>

                <textarea
                  rows={3}

                  value={managerRejectionReason}

                  onChange={(e) => setManagerRejectionReason(e.target.value)}

                  placeholder="Specify clear revision feedback for the domain expert (e.g. required skill competencies are incomplete, benchmark thresholds need adjustment)..."

                  className="w-full text-xs p-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-2">
              <Button
                variant="outline"

                size="sm"

                onClick={() => {
                  setIsManagerRejectDialogOpen(false)

                  setManagerRejectingRole(null)
                }}
              >
                Cancel
              </Button>

              <Button
                variant="destructive"

                size="sm"

                disabled={!managerRejectionReason.trim()}

                onClick={handleConfirmManagerRejection}

                leftIcon={<XCircle className="h-4 w-4" />}

                className="font-semibold shadow-2xs"
              >
                Confirm Return
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}

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

      {/* Target-Role Knowledge Graph View Modal (REQ-018-F01) */}

      <TargetRoleGraphModal
        open={Boolean(graphRole)}

        onOpenChange={(open) => !open && setGraphRole(null)}

        roleId={graphRole?.id || null}

        organizationId={orgId}

        roleTitle={graphRole?.title}

        levels={graphRole?.levels}

        role={graphRole}

        skillTargets={graphRole?.skillTargets}
      />
    </WorkspaceLayout>
  )
}
