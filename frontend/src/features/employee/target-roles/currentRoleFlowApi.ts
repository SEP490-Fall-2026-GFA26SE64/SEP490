import { workspaceFetch } from '../../../shared/api/workspaceFetch'
import { getActiveCompany, resolveWorkspaceOrgId } from '../../../shared/stores/companyStore'
import { loadDepartments } from '../../../shared/stores/departmentStore'
import { decodeJobPositionWithTargetRole } from '../../subscription/subscriptionApi'
import {
  getAvailableJobPositions,
  resolveJobPositionForRole,
  type SkillTargetConfig,
  type TargetRoleModel,
} from '../../manager/data/ldManagerMockData'

export interface CurrentSkill {
  id: string
  code: string | null
  name: string
  requiredKnowledgeLevels: string[]
  requiredScore: number
  mandatory: boolean
}
export interface CurrentLevel {
  id: string
  code: string
  name: string
  rank: number
  context: string
  attainmentRule: string
  duration?: string
  skills: CurrentSkill[]
}
export interface CurrentRole { id: string; code: string; name: string; scope: string; jobPositionId: string; jobPositionName: string; catalogVersion: string; fingerprint: string; levels: CurrentLevel[] }
export interface CurrentSelection { selectionId: string; role: CurrentRole; revision: number; selectedAt: string; available: boolean; levelId?: string | null }
export interface RoleProgress { state: string; requiredCount: number; coveredCount: number; attemptId: string | null; baselineVersion: number | null }
export interface RoleFlowView {
  selection: CurrentSelection | null
  startingPlacement?: CurrentSelection | null
  progress: RoleProgress
  assignedRoleId?: string | null
  assignedRoleCode?: string | null
  assignedRoleTitle?: string | null
  assignedLevel?: string | null
  assignedLevelRank?: number | null
}
export function normalizeLevelRank(levelStr?: string | null): number | null {
  if (!levelStr) return null
  const s = levelStr.toLowerCase().trim()
  const rankMatch = s.match(/(?:rank|level)\s*(\d+)/i)
  if (rankMatch) return parseInt(rankMatch[1], 10)
  const num = parseInt(s.replace(/[^0-9]/g, ''), 10)
  return isNaN(num) ? null : num
}

export function resolveLevelRankInRole(role: CurrentRole, levelIdentifier?: string | null): number | null {
  if (!levelIdentifier || !role?.levels?.length) return null
  const clean = levelIdentifier.toLowerCase().trim()
  const cleanWithoutRank = clean.replace(/^(?:rank|level)\s*\d+\s*:\s*/i, '').trim()
  const match = role.levels.find(
    (l) =>
      l.id.toLowerCase() === clean ||
      l.code.toLowerCase() === clean ||
      l.name.toLowerCase() === clean ||
      l.name.toLowerCase() === cleanWithoutRank,
  )
  if (match) return match.rank
  const rankMatch = clean.match(/(?:rank|level)\s*(\d+)/i)
  if (rankMatch) return parseInt(rankMatch[1], 10)
  return null
}
export class RoleFlowError extends Error {
  readonly code: string
  readonly status: number
  constructor(code: string, status = 0) { super(code); this.code = code; this.status = status }
  get ambiguous() { return this.status === 0 || this.status >= 500 || this.code === 'INVALID_RESPONSE' }
}
const object = (v: unknown): Record<string, unknown> => { if (!v || typeof v !== 'object' || Array.isArray(v)) throw Error(); return v as Record<string, unknown> }
const text = (v: unknown) => { if (typeof v !== 'string') throw Error(); return v }
const optText = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback)
const num = (v: unknown) => { if (typeof v !== 'number' || !Number.isFinite(v)) throw Error(); return v }
const optNum = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const bool = (v: unknown) => { if (typeof v !== 'boolean') throw Error(); return v }
const optBool = (v: unknown, fallback = true) => (typeof v === 'boolean' ? v : fallback)
const array = <T>(v: unknown, parse: (x: unknown) => T) => { if (!Array.isArray(v)) throw Error(); return v.map(parse) }
function role(value: unknown): CurrentRole {
  const r = object(value)
  return {
    id: text(r.id),
    code: optText(r.code, text(r.id)),
    name: text(r.name),
    scope: optText(r.scope, ''),
    jobPositionId: text(r.jobPositionId),
    jobPositionName: optText(r.jobPositionName, text(r.jobPositionId)),
    catalogVersion: optText(r.catalogVersion, '0.12.0'),
    fingerprint: optText(r.fingerprint, ''),
    levels: array(r.levels, value => {
      const l = object(value)
      return {
        id: text(l.id),
        code: optText(l.code, 'LV'),
        name: text(l.name),
        rank: optNum(l.rank, 1),
        context: optText(l.context, ''),
        attainmentRule: optText(l.attainmentRule, 'ALL_MANDATORY_SKILLS'),
        duration: l.duration ? String(l.duration) : undefined,
        skills: Array.isArray(l.skills)
          ? l.skills.map(sv => {
              const s = object(sv)
              const levels = Array.isArray(s.requiredKnowledgeLevels)
                ? s.requiredKnowledgeLevels.filter((k): k is string => typeof k === 'string')
                : []
              return {
                id: text(s.id),
                code: s.code === null || s.code === undefined ? null : optText(s.code, ''),
                name: optText(s.name, text(s.id)),
                requiredKnowledgeLevels: levels,
                requiredScore: optNum(s.requiredScore, 0.7),
                mandatory: optBool(s.mandatory, true),
              }
            })
          : [],
      }
    }),
  }
}
function selection(value: unknown): CurrentSelection {
  const s = object(value)
  return { selectionId: text(s.selectionId), role: role(s.role), revision: num(s.revision), selectedAt: text(s.selectedAt), available: bool(s.available), levelId: s.levelId === null || s.levelId === undefined ? null : text(s.levelId) }
}
async function request<T>(path: string, init: RequestInit, parse: (v: unknown) => T): Promise<T> {
  let response: Response
  try { response = await workspaceFetch('/api/v1/employee/' + path, init) }
  catch (cause) { if (init.signal?.aborted) throw cause; throw new RoleFlowError('NETWORK_ERROR') }
  let value: unknown
  try { value = await response.json() } catch { throw new RoleFlowError('INVALID_RESPONSE', response.status) }
  if (!response.ok) throw new RoleFlowError(typeof object(value).code === 'string' ? String(object(value).code) : 'DEPENDENCY_UNAVAILABLE', response.status)
  try { return parse(value) } catch { throw new RoleFlowError('INVALID_RESPONSE', response.status) }
}

const DEFAULT_ORG_ID = 'e0000000-0000-0000-0000-000000000001'

interface EmployeeDepartmentContext {
  email: string
  organizationId: string
  isEmployee: boolean
  departmentName: string
  departmentId: string
  jobPositionName: string | null
  jobPositionCode: string | null
  allowedJobPositionCodes: Set<string>
  inactiveJobPositionCodes: Set<string>
  assignedRoleId: string | null
  assignedRoleCode: string | null
  assignedRoleTitle: string | null
  assignedLevel: string | null
}

const normalizeOccCode = (c?: string | null) =>
  (c || '')
    .trim()
    .toUpperCase()
    .replace(/^OCC-/, '')
    .replace(/\.00$/, '')

let inFlightContextPromise: Promise<EmployeeDepartmentContext> | null = null

async function resolveEmployeeDepartmentContext(): Promise<EmployeeDepartmentContext> {
  if (inFlightContextPromise) return inFlightContextPromise
  inFlightContextPromise = (async () => {
    try {
      let email = 'employee@technova.com'
      let organizationId = resolveWorkspaceOrgId(DEFAULT_ORG_ID)
      let isEmployee = false

      try {
        const authRes = await workspaceFetch('/api/v1/workspace-auth/current', { method: 'GET' })
        if (authRes.ok) {
          const authData = (await authRes.json()) as {
            email?: string
            organizationId?: string | null
            roles?: string[]
          }
          if (authData.email) email = authData.email.toLowerCase().trim()
          if (authData.organizationId) organizationId = resolveWorkspaceOrgId(authData.organizationId)
          if (Array.isArray(authData.roles)) {
            isEmployee = authData.roles.some(r => String(r).toUpperCase() === 'EMPLOYEE')
          }
        }
      } catch {
        // fallback to default employee context
      }

      let assignedRoleId: string | null = null
      let assignedRoleCode: string | null = null
      let assignedRoleTitle: string | null = null
      let assignedLevel: string | null = null
      let savedDeptName: string | null = null
      let savedDeptId: string | null = null
      let savedJobPosCode: string | null = null
      let assignedJobPositionName: string | null = null

      // 1. Fetch self assignment from backend (accessible to any workspace member)
      try {
        const myRes = await workspaceFetch(
          `/api/v1/organizations/${encodeURIComponent(organizationId)}/subscription/my-assignment`,
          { method: 'GET' },
        )
        if (myRes.ok) {
          const myData = (await myRes.json()) as {
            departmentId?: string | null
            departmentName?: string | null
            jobPositionName?: string | null
            targetRoleId?: string | null
            targetRoleCode?: string | null
            targetRoleName?: string | null
            targetRoleLevel?: string | null
          }
          if (myData) {
            if (myData.departmentName) savedDeptName = myData.departmentName
            if (myData.departmentId) savedDeptId = myData.departmentId
            const decoded = decodeJobPositionWithTargetRole(myData.jobPositionName)
            if (decoded.cleanJobPositionName) {
              assignedJobPositionName = decoded.cleanJobPositionName
              const codeMatch = decoded.cleanJobPositionName.match(/^([0-9]{2}-[0-9]{4}(?:\.[0-9]{2})?)/)
              if (codeMatch) savedJobPosCode = codeMatch[1]
            }
            const effRoleId = myData.targetRoleId || decoded.targetRoleId
            if (effRoleId) {
              assignedRoleId = effRoleId
              assignedRoleCode = myData.targetRoleCode || decoded.targetRoleCode || effRoleId
              assignedRoleTitle = myData.targetRoleName || decoded.targetRoleName || assignedRoleCode
            }
            const effLvl = myData.targetRoleLevel || decoded.targetRoleLevel
            if (effLvl) {
              assignedLevel = effLvl
            }
          }
        }
      } catch {
        // ignore if endpoint fails
      }

      // 2. If not found via my-assignment, try subscription members list (for managers/admins)
      if (!assignedRoleId && !savedDeptName) {
        try {
          const memRes = await workspaceFetch(
            `/api/v1/organizations/${encodeURIComponent(organizationId)}/subscription/members`,
            { method: 'GET' },
          )
          if (memRes.ok) {
            const members = (await memRes.json()) as Array<{
              email?: string
              departmentId?: string | null
              departmentName?: string | null
              jobPositionName?: string | null
              targetRoleId?: string | null
              targetRoleCode?: string | null
              targetRoleName?: string | null
              targetRoleLevel?: string | null
            }>
            if (Array.isArray(members)) {
              const matchedMember = members.find(
                m => m.email && m.email.toLowerCase().trim() === email.toLowerCase().trim(),
              )
              if (matchedMember) {
                if (matchedMember.departmentName) {
                  savedDeptName = matchedMember.departmentName
                }
                if (matchedMember.departmentId) {
                  savedDeptId = matchedMember.departmentId
                }
                const decoded = decodeJobPositionWithTargetRole(matchedMember.jobPositionName)
                if (decoded.cleanJobPositionName) {
                  assignedJobPositionName = decoded.cleanJobPositionName
                  const codeMatch = decoded.cleanJobPositionName.match(/^([0-9]{2}-[0-9]{4}(?:\.[0-9]{2})?)/)
                  if (codeMatch) savedJobPosCode = codeMatch[1]
                }
                const effRoleId = matchedMember.targetRoleId || decoded.targetRoleId
                if (effRoleId) {
                  assignedRoleId = effRoleId
                  assignedRoleCode = matchedMember.targetRoleCode || decoded.targetRoleCode || effRoleId
                  assignedRoleTitle = matchedMember.targetRoleName || decoded.targetRoleName || assignedRoleCode
                }
                const effLvl = matchedMember.targetRoleLevel || decoded.targetRoleLevel
                if (effLvl) {
                  assignedLevel = effLvl
                }
              }
            }
          }
        } catch {
          // ignore if employee is not permitted to read members list
        }
      }

      // 3. Fallback to localStorage if still not populated
      if (typeof localStorage !== 'undefined') {
        try {
          const raw = localStorage.getItem(`alg_employee_assignment_${email}`)
          if (raw) {
            const parsed = JSON.parse(raw) as {
              roleId?: string
              roleCode?: string
              roleTitle?: string
              level?: string
              departmentId?: string
              departmentName?: string
              jobPositionCode?: string
              jobPositionName?: string
            }
            if (!assignedRoleId && parsed.roleId) assignedRoleId = parsed.roleId.trim()
            if (!assignedRoleCode && (parsed.roleCode || parsed.roleId)) assignedRoleCode = (parsed.roleCode || parsed.roleId)!.trim()
            if (!assignedRoleTitle && (parsed.roleTitle || assignedRoleCode)) assignedRoleTitle = (parsed.roleTitle || assignedRoleCode)!.trim()
            if (!assignedLevel && parsed.level) assignedLevel = parsed.level.trim()
            if (!savedDeptName && parsed.departmentName) savedDeptName = parsed.departmentName.trim()
            if (!savedDeptId && parsed.departmentId) savedDeptId = parsed.departmentId.trim()
            if (!savedJobPosCode && parsed.jobPositionCode) savedJobPosCode = parsed.jobPositionCode.trim()
            if (!assignedJobPositionName && parsed.jobPositionName) assignedJobPositionName = parsed.jobPositionName.trim()
          }
        } catch {
          // ignore storage errors
        }
      }

      // Persist in localStorage for instant offline/subsequent sync
      if (typeof localStorage !== 'undefined' && email && (assignedRoleId || savedDeptName || assignedJobPositionName)) {
        try {
          localStorage.setItem(
            `alg_employee_assignment_${email}`,
            JSON.stringify({
              roleId: assignedRoleId,
              roleCode: assignedRoleCode,
              roleTitle: assignedRoleTitle,
              level: assignedLevel,
              departmentId: savedDeptId,
              departmentName: savedDeptName,
              jobPositionCode: savedJobPosCode,
              jobPositionName: assignedJobPositionName,
            }),
          )
        } catch {}
      }

      if (assignedLevel) {
        assignedLevel = assignedLevel.replace(/^(?:rank|level)\s*\d+\s*:\s*/i, '').trim()
      }

      let liveDepts: Array<{
        id?: string
        code?: string
        name?: string
        jobPositionCodes?: string[]
        linkedJobPositions?: string[]
      }> = []
      try {
        const deptRes = await workspaceFetch(
          `/api/v1/organizations/${encodeURIComponent(organizationId)}/departments`,
          { method: 'GET' },
        )
        if (deptRes.ok) {
          const parsedDepts = await deptRes.json()
          if (Array.isArray(parsedDepts)) {
            liveDepts = parsedDepts
          }
        }
      } catch {
        // ignore department fetch error
      }

      const isTechnovaOrg = organizationId === DEFAULT_ORG_ID
      const isEngCog =
        email.includes('se.employee') || email === 'employee@technova.com' || email.includes('alex.chen')
      const defaultDeptName = isTechnovaOrg
        ? isEngCog
          ? 'Engineering & Cognitive Systems'
          : 'Cloud Infrastructure & DevOps'
        : liveDepts[0]?.name || ''
      const defaultDeptId = isTechnovaOrg
        ? isEngCog
          ? 'd0000000-0000-0000-0000-000000000001'
          : 'dept-cloud'
        : liveDepts[0]?.id || liveDepts[0]?.code || ''

      const departmentName = savedDeptName || defaultDeptName
      const departmentId = savedDeptId || defaultDeptId

      if (!assignedRoleId) {
        try {
          const refRes = await workspaceFetch(
            `/api/v1/organizations/${encodeURIComponent(organizationId)}/subscription/member-references`,
            { method: 'GET' },
          )
          if (refRes.ok) {
            const refs = (await refRes.json()) as Array<{
              departmentName?: string
              jobPositionName?: string
            }>
            if (Array.isArray(refs)) {
              for (const ref of refs) {
                const decoded = decodeJobPositionWithTargetRole(ref.jobPositionName)
                if (
                  decoded.targetRoleId &&
                  (!ref.departmentName ||
                    !departmentName ||
                    ref.departmentName.toLowerCase() === departmentName.toLowerCase())
                ) {
                  assignedRoleId = decoded.targetRoleId
                  assignedRoleCode = decoded.targetRoleCode || decoded.targetRoleId
                  assignedRoleTitle = decoded.targetRoleName || decoded.targetRoleCode
                  assignedLevel = decoded.targetRoleLevel || 'Junior'
                  break
                }
              }
            }
          }
        } catch {
          // ignore if employee is not permitted to read member-references
        }
      }

      const allLocalPositions = getAvailableJobPositions(organizationId, true)
      const inactiveJobPositionCodes = new Set<string>()
      for (const jp of allLocalPositions) {
        if (jp.status === 'inactive') {
          inactiveJobPositionCodes.add(normalizeOccCode(jp.code))
        }
      }

      const allowedJobPositionCodes = new Set<string>()

      if (savedJobPosCode) {
        const normSaved = normalizeOccCode(savedJobPosCode)
        if (normSaved && !inactiveJobPositionCodes.has(normSaved)) {
          allowedJobPositionCodes.add(normSaved)
        }
      }

      const localDepts = loadDepartments().filter(
        d => !d.organizationId || resolveWorkspaceOrgId(d.organizationId) === organizationId,
      )
      const matchedLocalDept = localDepts.find(
        d =>
          (departmentId && d.id.toLowerCase() === departmentId.toLowerCase()) ||
          (departmentName && d.name.toLowerCase() === departmentName.toLowerCase()) ||
          (departmentId && d.code.toLowerCase() === departmentId.toLowerCase()) ||
          (departmentName && d.code.toLowerCase() === departmentName.toLowerCase()),
      )
      for (const code of matchedLocalDept?.linkedJobPositions || []) {
        const norm = normalizeOccCode(code)
        if (norm && !inactiveJobPositionCodes.has(norm)) {
          allowedJobPositionCodes.add(norm)
        }
      }

      // Include canonical department domain job position codes (matching UserManagementPage)
      const deptNameLower = departmentName.toLowerCase().trim()
      const deptIdLower = departmentId.toLowerCase().trim()
      if (
        deptNameLower.includes('cognitive') ||
        deptNameLower.includes('software') ||
        deptIdLower === 'eng-cog' ||
        deptIdLower === 'eng-swe' ||
        deptIdLower === 'd0000000-0000-0000-0000-000000000001'
      ) {
        if (!inactiveJobPositionCodes.has('15-1252')) allowedJobPositionCodes.add('15-1252')
      } else if (deptNameLower.includes('data') || deptNameLower.includes('artificial') || deptIdLower === 'eng-data') {
        if (!inactiveJobPositionCodes.has('15-1243')) allowedJobPositionCodes.add('15-1243')
      } else if (deptNameLower.includes('quality') || deptNameLower.includes('assurance') || deptIdLower === 'eng-qa') {
        if (!inactiveJobPositionCodes.has('15-1253')) allowedJobPositionCodes.add('15-1253')
      } else if (deptNameLower.includes('cloud') || deptNameLower.includes('infrastructure') || deptIdLower === 'eng-cloud') {
        if (!inactiveJobPositionCodes.has('15-1299.08')) allowedJobPositionCodes.add('15-1299.08')
      } else if (deptNameLower.includes('security') || deptNameLower.includes('cyber') || deptIdLower === 'eng-sec') {
        if (!inactiveJobPositionCodes.has('15-1212')) allowedJobPositionCodes.add('15-1212')
      }

      // Also include local job positions aligned to department domain
      for (const jp of allLocalPositions) {
        const norm = normalizeOccCode(jp.code)
        if (
          norm &&
          !inactiveJobPositionCodes.has(norm) &&
          ((deptNameLower.includes('cloud') && (norm.startsWith('15-1299') || norm.startsWith('15-1259') || norm.startsWith('15-1260'))) ||
            (deptNameLower.includes('cognitive') && norm.startsWith('15-1252')) ||
            (deptNameLower.includes('data') && norm.startsWith('15-1243')) ||
            (deptNameLower.includes('quality') && norm.startsWith('15-1253')) ||
            (deptNameLower.includes('security') && norm.startsWith('15-1212')))
        ) {
          allowedJobPositionCodes.add(norm)
        }
      }

      const matchedLive = liveDepts.find(
        d =>
          (departmentId && d.id && d.id.toLowerCase() === departmentId.toLowerCase()) ||
          (departmentName && d.name && d.name.toLowerCase() === departmentName.toLowerCase()) ||
          (departmentId && d.code && d.code.toLowerCase() === departmentId.toLowerCase()),
      )
      const liveCodes = [
        ...(matchedLive?.jobPositionCodes || []),
        ...(matchedLive?.linkedJobPositions || []),
      ]
      for (const code of liveCodes) {
        const norm = normalizeOccCode(code)
        if (norm && !inactiveJobPositionCodes.has(norm)) {
          allowedJobPositionCodes.add(norm)
        }
      }

      return {
        email,
        organizationId,
        isEmployee,
        departmentName,
        departmentId,
        jobPositionName: assignedJobPositionName,
        jobPositionCode: savedJobPosCode,
        allowedJobPositionCodes,
        inactiveJobPositionCodes,
        assignedRoleId,
        assignedRoleCode,
        assignedRoleTitle,
        assignedLevel,
      }
    } finally {
      setTimeout(() => {
        inFlightContextPromise = null
      }, 150)
    }
  })()
  return inFlightContextPromise
}

function getLocalRoleMetadataMap(organizationId: string): Record<
  string,
  { code?: string; jobPositionCode?: string; department?: string; status?: string; levelNames?: string[]; levelDurations?: Record<string, string> }
> {
  const map: Record<
    string,
    { code?: string; jobPositionCode?: string; department?: string; status?: string; levelNames?: string[]; levelDurations?: Record<string, string> }
  > = {}
  if (typeof localStorage === 'undefined') return map
  try {
    const resolvedOrg = resolveWorkspaceOrgId(organizationId)
    const keys = Array.from(
      new Set(
        resolvedOrg === DEFAULT_ORG_ID
          ? [
              `adaptlearn_target_role_meta_${organizationId}`,
              `adaptlearn_target_role_meta_${DEFAULT_ORG_ID}`,
              'adaptlearn_target_role_meta_comp-technova',
              'adaptlearn_target_role_meta_workspace-development',
              'adaptlearn_target_role_meta_',
            ]
          : [
              `adaptlearn_target_role_meta_${organizationId}`,
              `adaptlearn_target_role_meta_${resolvedOrg}`,
            ],
      ),
    )
    for (const k of keys) {
      const raw = localStorage.getItem(k)
      if (!raw) continue
      const parsed = JSON.parse(raw) as Record<
        string,
        { code?: string; jobPositionCode?: string; department?: string; status?: string; levelNames?: string[]; levelDurations?: Record<string, string> }
      >
      for (const [key, val] of Object.entries(parsed || {})) {
        if (val) {
          const upperKey = key.toUpperCase()
          map[upperKey] = { ...(map[upperKey] || {}), ...val }
          if (val.code) {
            const upperCode = val.code.trim().toUpperCase()
            map[upperCode] = { ...(map[upperCode] || {}), ...val }
          }
        }
      }
    }
  } catch {
    // ignore storage errors
  }
  return map
}

let inFlightRolesPromise: Promise<CurrentRole[]> | null = null

async function fetchDepartmentScopedPublishedRoles(): Promise<CurrentRole[]> {
  if (inFlightRolesPromise) return inFlightRolesPromise
  inFlightRolesPromise = (async () => {
    try {
      const ctx = await resolveEmployeeDepartmentContext()
      const orgId = resolveWorkspaceOrgId(ctx.organizationId || DEFAULT_ORG_ID)
      const metaMap = getLocalRoleMetadataMap(orgId)

      // Optional Neo4j level/skill enrichment map so seeded roles retain their Neo4j level skills if skillTargets is empty
      const neo4jRoleLevelsMap = new Map<string, CurrentLevel[]>()
      try {
        const empRes = await workspaceFetch('/api/v1/employee/target-roles', {
          method: 'GET',
        }).catch(() => null)
        if (empRes && empRes.ok) {
          const empList = (await empRes.json()) as Array<Record<string, unknown>>
          if (Array.isArray(empList)) {
            for (const robj of empList) {
              if (!robj || typeof robj !== 'object') continue
              const id = String(robj.id || '').trim().toUpperCase()
              const code = String(robj.code || '').split('#')[0].trim().toUpperCase()
              const name = String(robj.name || '').trim().toLowerCase()
              const levels = Array.isArray(robj.levels) ? (robj.levels as CurrentLevel[]) : []
              if (levels.length > 0) {
                if (id) neo4jRoleLevelsMap.set(id, levels)
                if (code) neo4jRoleLevelsMap.set(code, levels)
                if (name) neo4jRoleLevelsMap.set(name, levels)
              }
            }
          }
        }
      } catch {
        // ignore enrichment error
      }

      // Primary source of truth: Organization Target Roles catalog (same source as Admin User Management & L&D Target Roles)
      let rawRoles: unknown[] = []
      const [rRes, jobsRes] = await Promise.all([
        workspaceFetch(`/api/v1/organizations/${encodeURIComponent(orgId)}/target-roles`, {
          method: 'GET',
        }).catch(() => null),
        workspaceFetch(`/api/v1/organizations/${encodeURIComponent(orgId)}/job-positions`, {
          method: 'GET',
        }).catch(() => null),
      ])
      if (rRes && rRes.ok) {
        const parsed = await rRes.json()
        if (Array.isArray(parsed)) {
          rawRoles = parsed
        }
      }

      const activeComp = getActiveCompany()
      const isSameOrgAsActiveComp = resolveWorkspaceOrgId(activeComp?.id) === orgId
      const activeCompRoles = (isSameOrgAsActiveComp ? activeComp?.targetRoles || [] : [])
        .filter(tr => {
          const codeUpper = String(tr.code || '').trim().toUpperCase()
          const meta = metaMap[codeUpper] || metaMap[String(tr.id || '').toUpperCase()]
          if (meta?.status && (meta.status.toUpperCase() === 'UNPUBLISHED' || meta.status.toUpperCase() === 'INACTIVE')) return false
          const s = String(tr.status || '').toLowerCase()
          return s === 'published' || s === 'active'
        })
        .map(tr => ({
          id: tr.id,
          code: tr.code,
          name: tr.title,
          description: tr.description,
          version: tr.version,
          status: tr.status,
          jobPositionCode: tr.jobPositionCode,
          familyCode: tr.familyCode,
          department: tr.department,
          levels: tr.levels,
          levelDurations: tr.levelDurations,
          skillTargets: tr.skillTargets,
        }))

      if (rawRoles.length === 0) {
        rawRoles = activeCompRoles
      }

      const jobMap = new Map<string, { id: string; code: string; name: string; status: string }>()
      if (jobsRes && jobsRes.ok) {
        try {
          const rawJobs = await jobsRes.json()
          if (Array.isArray(rawJobs)) {
            for (const j of rawJobs) {
              if (j && typeof j === 'object') {
                const jObj = j as Record<string, unknown>
                const code = String(jObj.code || '').trim()
                const id = String(jObj.id || (code ? `OCC-${code}` : '')).trim()
                const name = String(jObj.name || code || id).trim()
                const status = String(jObj.status || 'ACTIVE').toUpperCase()
                if (status === 'INACTIVE') {
                  ctx.inactiveJobPositionCodes.add(normalizeOccCode(code || id))
                }
                if (code) jobMap.set(normalizeOccCode(code), { id, code, name, status })
                if (id) jobMap.set(normalizeOccCode(id), { id, code: code || id, name, status })
              }
            }
          }
        } catch {
          // ignore job positions parse error
        }
      }

      function compareVersions(vA = '1.0', vB = '1.0') {
        const pA = vA.split('.').map(n => parseInt(n, 10) || 0)
        const pB = vB.split('.').map(n => parseInt(n, 10) || 0)
        for (let i = 0; i < Math.max(pA.length, pB.length); i++) {
          const a = pA[i] || 0, b = pB[i] || 0
          if (a !== b) return a - b
        }
        return 0
      }

      // Step 1: Deduplicate rawRoles by code across versions using exact UserManagementPage rules
      const dedupedRawByCode = new Map<string, { item: Record<string, unknown>; effectiveStatus: 'published' | 'unpublished' | 'other'; version: string }>()
      for (const item of rawRoles) {
        if (!item || typeof item !== 'object') continue
        const r = item as Record<string, unknown>
        const id = String(r.id || r.code || '').trim()
        const code = String(r.code || id).split('#')[0].trim()
        if (!id || !code) continue
        const codeUpper = code.toUpperCase()
        const meta = metaMap[codeUpper] || metaMap[id.toUpperCase()]
        const rawStatus = String(r.status || '').toLowerCase()
        const metaStatus = String(meta?.status || '').toLowerCase()
        const effectiveStatus: 'published' | 'unpublished' | 'other' =
          metaStatus === 'unpublished' || rawStatus === 'unpublished'
            ? 'unpublished'
            : rawStatus === 'active' || rawStatus === 'published'
              ? 'published'
              : 'other'
        const version = String(r.version || '1.0').trim()

        const existing = dedupedRawByCode.get(codeUpper)
        const isPubOrUnpub = effectiveStatus === 'published' || effectiveStatus === 'unpublished'
        const existingIsPubOrUnpub = existing?.effectiveStatus === 'published' || existing?.effectiveStatus === 'unpublished'

        if (!existing) {
          dedupedRawByCode.set(codeUpper, { item: r, effectiveStatus, version })
        } else if (isPubOrUnpub && !existingIsPubOrUnpub) {
          dedupedRawByCode.set(codeUpper, { item: r, effectiveStatus, version })
        } else if (isPubOrUnpub === existingIsPubOrUnpub && compareVersions(version, existing.version) > 0) {
          dedupedRawByCode.set(codeUpper, { item: r, effectiveStatus, version })
        }
      }

      // Step 2: Map only published roles belonging to the employee's department / active job positions
      const dedupedByCode = new Map<string, CurrentRole>()

      for (const [codeUpper, entry] of dedupedRawByCode.entries()) {
        if (entry.effectiveStatus !== 'published') continue
        const r = entry.item
        const id = String(r.id || r.code || '').trim()
        const code = String(r.code || id).split('#')[0].trim()
        const meta = metaMap[codeUpper] || metaMap[id.toUpperCase()]

        const name = String(r.name || r.title || code).trim()
        const scope = String(r.description || '').trim()
        const version = entry.version

        const familyCodeStr = String(r.familyCode || '').trim()
        const familyNorm = normalizeOccCode(familyCodeStr)
        const familyAsJobPosCode =
          familyCodeStr &&
          (/^\d{2}-\d{4}/.test(familyCodeStr) ||
            jobMap.has(familyNorm) ||
            ctx.allowedJobPositionCodes.has(familyNorm))
            ? familyCodeStr
            : familyCodeStr.toUpperCase() === 'DEV'
              ? '15-1252.00'
              : undefined
        const explicitJobPosCode =
          (r.jobPositionCode ? String(r.jobPositionCode) : undefined) ||
          meta?.jobPositionCode ||
          familyAsJobPosCode

        const roleForOcc = {
          id,
          stableId: code,
          code,
          title: name,
          department: String(r.department || meta?.department || '').trim(),
          jobPositionCode: explicitJobPosCode,
          familyCode: familyCodeStr || undefined,
          description: scope,
          version,
          status: 'published',
          competencyIds: [],
          skillTargets: [],
          activeEnrollments: 0,
          updatedAt: String(r.updatedAt || ''),
        } as TargetRoleModel

        const resolvedOcc = resolveJobPositionForRole(roleForOcc, orgId)
        const occCodeNorm = normalizeOccCode(roleForOcc.jobPositionCode || resolvedOcc.code)

        // Exclude roles under inactive Job Positions
        if (occCodeNorm && ctx.inactiveJobPositionCodes.has(occCodeNorm)) {
          continue
        }

        // Filter strictly to the Employee's assigned Department (or its active Job Positions)
        const roleDept = (roleForOcc.department || '').trim().toLowerCase()
        const empDept = ctx.departmentName.trim().toLowerCase()
        const isAssignedRole = Boolean(
          (ctx.assignedRoleId && (id === ctx.assignedRoleId || code === ctx.assignedRoleId)) ||
          (ctx.assignedRoleCode && code.toUpperCase() === ctx.assignedRoleCode.toUpperCase())
        )
        const matchesDeptName = Boolean(
          roleDept && empDept && (roleDept === empDept || roleDept.includes(empDept) || empDept.includes(roleDept)),
        )
        const matchesDeptJobPosition = Boolean(
          occCodeNorm && ctx.allowedJobPositionCodes.has(occCodeNorm),
        )

        if (!isAssignedRole && !matchesDeptName && !matchesDeptJobPosition) {
          continue
        }

        const occInfo = jobMap.get(occCodeNorm)
        const jobPositionId = occInfo?.id || `OCC-${roleForOcc.jobPositionCode || resolvedOcc.code}`
        const jobPositionName = occInfo?.name || resolvedOcc.name

        const rawLevels =
          Array.isArray(r.levels) && r.levels.length > 0
            ? r.levels.map(x => String(x))
            : meta?.levelNames && meta.levelNames.length > 0
              ? meta.levelNames
              : ['Senior', 'Middle', 'Junior']
        const durationsObj =
          r.levelDurations && typeof r.levelDurations === 'object' && !Array.isArray(r.levelDurations)
            ? (r.levelDurations as Record<string, string>)
            : meta?.levelDurations || {}
        const skillTargets: SkillTargetConfig[] = Array.isArray(r.skillTargets)
          ? (r.skillTargets as SkillTargetConfig[])
          : []

        const fallbackNeo4jLevels =
          neo4jRoleLevelsMap.get(id.toUpperCase()) ||
          neo4jRoleLevelsMap.get(codeUpper) ||
          neo4jRoleLevelsMap.get(name.toLowerCase())

        const levels: CurrentLevel[] = rawLevels.map((lvlName, idx) => {
          const rank = idx + 1
          const normLvl = lvlName.toLowerCase()
          const lvlCode = normLvl.startsWith('sen')
            ? 'S'
            : normLvl.startsWith('mid')
              ? 'M'
              : normLvl.startsWith('jun')
                ? 'J'
                : normLvl.startsWith('int')
                  ? 'I'
                  : `LV-${rank}`
          const defaultDur =
            normLvl.includes('senior') || rank === 1
              ? '6 months'
              : normLvl.includes('middle') || normLvl.includes('mid') || rank === 2
                ? '4 months'
                : normLvl.includes('junior') || rank === 3
                  ? '3 months'
                  : '2 months'
          const duration = durationsObj[lvlName] || durationsObj[String(rank)] || defaultDur
          let levelSkills: CurrentSkill[] = skillTargets
            .filter(st => !st.level || st.level.toLowerCase() === lvlName.toLowerCase())
            .map(st => ({
              id: String(st.skillId || st.skillCode || ''),
              code: st.skillCode ? String(st.skillCode) : null,
              name: String(st.skillName || st.skillCode || st.skillId || ''),
              requiredKnowledgeLevels: Array.isArray(st.requiredKnowledgeLevels) ? st.requiredKnowledgeLevels : [],
              requiredScore: typeof st.threshold === 'number' ? st.threshold / 100 : 0.7,
              mandatory: true,
            }))
            .filter(st => Boolean(st.id))

          if (levelSkills.length === 0 && fallbackNeo4jLevels) {
            const matchedNeo4jLvl =
              fallbackNeo4jLevels.find(
                nl => nl.name.toLowerCase() === normLvl || nl.rank === rank,
              ) || fallbackNeo4jLevels[idx]
            if (matchedNeo4jLvl && Array.isArray(matchedNeo4jLvl.skills)) {
              levelSkills = matchedNeo4jLvl.skills
            }
          }

          return {
            id: `LVL-${code}-${lvlCode}`,
            code: lvlCode,
            name: lvlName,
            rank,
            context: scope,
            attainmentRule: 'ALL_MANDATORY_SKILLS',
            duration,
            skills: levelSkills,
          }
        })

        dedupedByCode.set(codeUpper, {
          id,
          code,
          name,
          scope,
          jobPositionId,
          jobPositionName,
          catalogVersion: version,
          fingerprint: '',
          levels,
        })
      }

      return Array.from(dedupedByCode.values())
    } finally {
      setTimeout(() => {
        inFlightRolesPromise = null
      }, 150)
    }
  })()
  return inFlightRolesPromise
}

export const currentRoles = async (_signal?: AbortSignal): Promise<CurrentRole[]> => {
  return await fetchDepartmentScopedPublishedRoles()
}

function buildSynthesizedSelection(
  roles: CurrentRole[],
  ctx: EmployeeDepartmentContext,
): CurrentSelection | null {
  if (!ctx.assignedRoleId && !ctx.assignedRoleCode && !ctx.assignedRoleTitle) {
    return null
  }
  let matchedRole = roles.find(
    r =>
      (ctx.assignedRoleId && r.id === ctx.assignedRoleId) ||
      (ctx.assignedRoleCode && r.code.toUpperCase() === ctx.assignedRoleCode.toUpperCase()) ||
      (ctx.assignedRoleId && r.code.toUpperCase() === ctx.assignedRoleId.toUpperCase()) ||
      (ctx.assignedRoleTitle && r.name.toLowerCase() === ctx.assignedRoleTitle.toLowerCase()),
  )

  if (matchedRole && ctx.jobPositionName && (!matchedRole.jobPositionName || matchedRole.jobPositionName === matchedRole.jobPositionId)) {
    matchedRole = {
      ...matchedRole,
      jobPositionName: ctx.jobPositionName,
    }
  }

  if (!matchedRole && (ctx.assignedRoleTitle || ctx.assignedRoleCode || ctx.assignedRoleId)) {
    const activeCompRole = (getActiveCompany()?.targetRoles || []).find(
      tr =>
        (ctx.assignedRoleId && tr.id === ctx.assignedRoleId) ||
        (ctx.assignedRoleCode && tr.code?.toUpperCase() === ctx.assignedRoleCode.toUpperCase()) ||
        (ctx.assignedRoleTitle && tr.title?.toLowerCase() === ctx.assignedRoleTitle.toLowerCase()),
    )
    if (activeCompRole) {
      const resolvedOcc = resolveJobPositionForRole(activeCompRole, ctx.organizationId)
      matchedRole = {
        id: activeCompRole.id,
        code: activeCompRole.code,
        name: activeCompRole.title,
        scope: activeCompRole.description,
        jobPositionId: activeCompRole.jobPositionCode || resolvedOcc.code || '15-1252.00',
        jobPositionName: ctx.jobPositionName || resolvedOcc.name || 'Software Developers',
        catalogVersion: activeCompRole.version,
        fingerprint: '',
        levels: (activeCompRole.levels || ['Senior', 'Middle', 'Junior']).map((lvlName, idx) => ({
          id: `LVL-${activeCompRole.code}-${lvlName}`,
          code: lvlName.slice(0, 1).toUpperCase(),
          name: lvlName,
          rank: idx + 1,
          context: '',
          attainmentRule: 'ALL_MANDATORY_SKILLS',
          duration: activeCompRole.levelDurations?.[lvlName] || (idx === 0 ? '6 months' : idx === 1 ? '4 months' : '3 months'),
          skills: [],
        })),
      }
    } else {
      const code = ctx.assignedRoleCode || ctx.assignedRoleId || 'ROLE'
      const title = ctx.assignedRoleTitle || code
      const resolvedOcc = resolveJobPositionForRole(
        {
          code,
          title,
          familyCode: 'DEV',
        },
        ctx.organizationId,
      )
      matchedRole = {
        id: ctx.assignedRoleId || code,
        code,
        name: title,
        scope: '',
        jobPositionId: resolvedOcc.code || '15-1252.00',
        jobPositionName: ctx.jobPositionName || resolvedOcc.name || 'Software Developers',
        catalogVersion: '1.0',
        fingerprint: '',
        levels: ['Senior', 'Middle', 'Junior'].map((lvlName, idx) => ({
          id: `LVL-${code}-${lvlName}`,
          code: lvlName.slice(0, 1).toUpperCase(),
          name: lvlName,
          rank: idx + 1,
          context: '',
          attainmentRule: 'ALL_MANDATORY_SKILLS',
          duration: idx === 0 ? '6 months' : idx === 1 ? '4 months' : '3 months',
          skills: [],
        })),
      }
    }
  }

  if (!matchedRole) return null

  const wantedRank = normalizeLevelRank(ctx.assignedLevel)
  const wantedLevel = (ctx.assignedLevel || '').trim().toLowerCase()
  const matchedLevel =
    (wantedRank !== null
      ? matchedRole.levels.find(
          l =>
            l.rank === wantedRank ||
            normalizeLevelRank(l.name) === wantedRank ||
            normalizeLevelRank(l.id) === wantedRank,
        )
      : undefined) ||
    matchedRole.levels.find(
      l =>
        l.id.toLowerCase() === wantedLevel ||
        l.name.toLowerCase() === wantedLevel ||
        l.code.toLowerCase() === wantedLevel,
    ) ||
    matchedRole.levels[0]

  return {
    selectionId: '00000000-0000-4000-8000-000000000001',
    role: matchedRole,
    revision: 1,
    selectedAt: new Date().toISOString(),
    available: true,
    levelId: matchedLevel?.id ?? null,
  }
}

function buildActiveRoleSelection(
  roles: CurrentRole[],
  ctx: EmployeeDepartmentContext,
  startingPlacement: CurrentSelection | null,
  assignedRank: number | null,
): CurrentSelection | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(`alg_employee_active_role_${ctx.email}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as {
      roleId?: string
      roleCode?: string
      roleTitle?: string
      levelId?: string
      level?: string
      selectedAt?: string
    }
    if (!parsed.roleId && !parsed.roleCode && !parsed.roleTitle) return null
    const activeCtx: EmployeeDepartmentContext = {
      ...ctx,
      assignedRoleId: parsed.roleId || null,
      assignedRoleCode: parsed.roleCode || null,
      assignedRoleTitle: parsed.roleTitle || null,
      assignedLevel: parsed.level || parsed.levelId || null,
    }
    const sel = buildSynthesizedSelection(roles, activeCtx)
    if (!sel) return null
    if (startingPlacement) {
      const isSameRole =
        sel.role.id === startingPlacement.role.id ||
        sel.role.code.toUpperCase() === startingPlacement.role.code.toUpperCase() ||
        sel.role.name.toLowerCase() === startingPlacement.role.name.toLowerCase()
      if (isSameRole && typeof assignedRank === 'number') {
        const selLevel = sel.role.levels.find(l => l.id === sel.levelId)
        const selRank = selLevel?.rank ?? normalizeLevelRank(sel.levelId)
        if (typeof selRank === 'number' && selRank >= assignedRank) {
          return null
        }
      }
    }
    return {
      ...sel,
      selectedAt: parsed.selectedAt || sel.selectedAt,
    }
  } catch {
    return null
  }
}

export const readRoleFlow = async (signal?: AbortSignal): Promise<RoleFlowView> => {
  const [ctx, deptRoles] = await Promise.all([
    resolveEmployeeDepartmentContext(),
    fetchDepartmentScopedPublishedRoles().catch(() => [] as CurrentRole[]),
  ])
  const startingPlacement = buildSynthesizedSelection(deptRoles, ctx)
  const matchedAssignedLevel = startingPlacement?.role.levels.find(l => l.id === startingPlacement.levelId)
  const assignedRank = matchedAssignedLevel?.rank ?? normalizeLevelRank(ctx.assignedLevel)
  const localActive = buildActiveRoleSelection(deptRoles, ctx, startingPlacement, assignedRank)

  try {
    const view = await request('target-role-selection', { method: 'GET', signal }, v => {
      const data = object(v),
        p = object(data.progress)
      return {
        selection: data.selection === null ? null : selection(data.selection),
        progress: {
          state: text(p.state),
          requiredCount: num(p.requiredCount),
          coveredCount: num(p.coveredCount),
          attemptId: p.attemptId === null ? null : text(p.attemptId),
          baselineVersion: p.baselineVersion === null ? null : num(p.baselineVersion),
        },
      } satisfies RoleFlowView
    })

    let effectiveSelection: CurrentSelection | null = localActive ?? view.selection
    if (effectiveSelection && startingPlacement) {
      const isSameAsStartingRole =
        effectiveSelection.role.id === startingPlacement.role.id ||
        effectiveSelection.role.code.toUpperCase() === startingPlacement.role.code.toUpperCase() ||
        effectiveSelection.role.name.toLowerCase() === startingPlacement.role.name.toLowerCase()
      const currentSelectedRank =
        effectiveSelection.role.levels.find(l => l.id === effectiveSelection?.levelId)?.rank ??
        normalizeLevelRank(effectiveSelection.levelId)
      if (
        isSameAsStartingRole &&
        typeof assignedRank === 'number' &&
        typeof currentSelectedRank === 'number' &&
        currentSelectedRank >= assignedRank
      ) {
        effectiveSelection = null
      }
    }

    const totalSkills = effectiveSelection
      ? effectiveSelection.role.levels.reduce((acc, l) => acc + l.skills.length, 0)
      : 0

    return {
      selection: effectiveSelection,
      startingPlacement,
      progress: {
        state: effectiveSelection
          ? view.progress.state === 'SELECT_ROLE'
            ? 'READY'
            : view.progress.state
          : view.progress.state === 'RESUME'
            ? 'RESUME'
            : 'SELECT_ROLE',
        requiredCount: effectiveSelection ? totalSkills || view.progress.requiredCount : 0,
        coveredCount: effectiveSelection ? view.progress.coveredCount : 0,
        attemptId: view.progress.attemptId,
        baselineVersion: view.progress.baselineVersion,
      },
      assignedRoleId: ctx.assignedRoleId,
      assignedRoleCode: ctx.assignedRoleCode,
      assignedRoleTitle: ctx.assignedRoleTitle,
      assignedLevel: ctx.assignedLevel,
      assignedLevelRank: assignedRank,
    }
  } catch (err) {
    if (signal?.aborted) throw err
    if (!ctx.isEmployee && err instanceof RoleFlowError && (err.status === 401 || err.status === 403)) throw err
    const totalSkills = localActive
      ? localActive.role.levels.reduce((acc, l) => acc + l.skills.length, 0)
      : 0
    return {
      selection: localActive,
      startingPlacement,
      progress: {
        state: localActive ? 'READY' : 'SELECT_ROLE',
        requiredCount: totalSkills,
        coveredCount: 0,
        attemptId: null,
        baselineVersion: null,
      },
      assignedRoleId: ctx.assignedRoleId,
      assignedRoleCode: ctx.assignedRoleCode,
      assignedRoleTitle: ctx.assignedRoleTitle,
      assignedLevel: ctx.assignedLevel,
      assignedLevelRank: assignedRank,
    }
  }
}

export interface RoleChoiceCommand { body: string; key: string }
export interface MasteryProfile { jobPositionId: string; jobPositionName: string; attemptId: string; baselineVersion: number; initializedAt: string; skills: { id: string; name: string; mastery: number; confidence: string }[] }
export const readMyMastery = (signal?: AbortSignal) => request('target-role-selection/mastery', { method: 'GET', signal }, value => array(value, value => {
  const p = object(value)
  return {
    jobPositionId: text(p.jobPositionId), jobPositionName: text(p.jobPositionName), attemptId: text(p.attemptId), baselineVersion: num(p.baselineVersion), initializedAt: text(p.initializedAt),
    skills: array(p.skills, value => {
      const s = object(value), mastery = num(s.mastery), confidence = text(s.confidence)
      if (mastery < 0 || mastery > 1 || !['LOW', 'MEDIUM', 'HIGH'].includes(confidence)) throw Error()
      return { id: text(s.id), name: text(s.name), mastery, confidence }
    })
  } satisfies MasteryProfile
}))
export const prepareRoleChoice = (id: string, expected: string | null, levelId?: string): RoleChoiceCommand => ({ body: JSON.stringify({ roleId: id, ...(levelId ? { levelId } : {}), expectedCurrentSelectionId: expected }), key: crypto.randomUUID() })
export const chooseCurrentRole = async (command: RoleChoiceCommand): Promise<CurrentSelection> => {
  const parsedBody = JSON.parse(command.body) as {
    roleId: string
    levelId?: string
    expectedCurrentSelectionId?: string | null
  }
  const [ctx, deptRoles] = await Promise.all([
    resolveEmployeeDepartmentContext(),
    fetchDepartmentScopedPublishedRoles().catch(() => [] as CurrentRole[]),
  ])
  const chosenRole = deptRoles.find(
    r => r.id === parsedBody.roleId || r.code.toUpperCase() === parsedBody.roleId.toUpperCase(),
  )
  const chosenLevelObj = chosenRole?.levels.find(
    l => l.id === parsedBody.levelId || l.name.toLowerCase() === (parsedBody.levelId || '').toLowerCase(),
  )
  const chosenLevelName = chosenLevelObj?.name || parsedBody.levelId || 'Junior'

  if (chosenRole && typeof localStorage !== 'undefined') {
    try {
      const activeRoleKey = `alg_employee_active_role_${ctx.email}`
      localStorage.setItem(
        activeRoleKey,
        JSON.stringify({
          roleId: chosenRole.id,
          roleCode: chosenRole.code,
          roleTitle: chosenRole.name,
          levelId: chosenLevelObj?.id || parsedBody.levelId || null,
          level: chosenLevelName,
          selectedAt: new Date().toISOString(),
        }),
      )
      const activeProfileKey = `alg_learner_learning_profile_${ctx.organizationId}`
      const profRaw = localStorage.getItem(activeProfileKey)
      if (profRaw) {
        const prof = JSON.parse(profRaw) as Record<string, unknown>
        prof.targetRole = chosenRole.name
        prof.targetLevel = chosenLevelName
        prof.department = ctx.departmentName
        localStorage.setItem(activeProfileKey, JSON.stringify(prof))
      }
    } catch {
      // ignore storage errors
    }
  }

  try {
    return await request(
      'target-role-selection',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': command.key },
        body: command.body,
      },
      selection,
    )
  } catch (err) {
    if (!ctx.isEmployee && err instanceof RoleFlowError && (err.status === 401 || err.status === 403)) throw err
    if (chosenRole) {
      return {
        selectionId: '00000000-0000-4000-8000-000000000001',
        role: chosenRole,
        revision: 1,
        selectedAt: new Date().toISOString(),
        available: true,
        levelId: chosenLevelObj?.id ?? parsedBody.levelId ?? null,
      }
    }
    throw err
  }
}
