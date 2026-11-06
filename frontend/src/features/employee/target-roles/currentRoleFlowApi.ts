import { workspaceFetch } from '../../../shared/api/workspaceFetch'
import { getActiveCompany } from '../../../shared/stores/companyStore'
import { loadDepartments } from '../../../shared/stores/departmentStore'
import { decodeJobPositionWithTargetRole } from '../../subscription/subscriptionApi'
import {
  getAvailableJobPositions,
  resolveJobPositionForRole,
  type SkillTargetConfig,
  type TargetRoleModel,
} from '../../manager/data/ldManagerMockData'

export interface CurrentSkill { id: string; code: string | null; name: string; requiredScore: number; mandatory: boolean }
export interface CurrentLevel { id: string; code: string; name: string; rank: number; context: string; attainmentRule: string; duration?: string; skills: CurrentSkill[] }
export interface CurrentRole { id: string; code: string; name: string; scope: string; jobPositionId: string; jobPositionName: string; catalogVersion: string; fingerprint: string; levels: CurrentLevel[] }
export interface CurrentSelection { selectionId: string; role: CurrentRole; revision: number; selectedAt: string; available: boolean; levelId?: string | null }
export interface RoleProgress { state: string; requiredCount: number; coveredCount: number; attemptId: string | null; baselineVersion: number | null }
export interface RoleFlowView {
  selection: CurrentSelection | null
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
              return {
                id: text(s.id),
                code: s.code === null || s.code === undefined ? null : optText(s.code, ''),
                name: optText(s.name, text(s.id)),
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

async function resolveEmployeeDepartmentContext(signal?: AbortSignal): Promise<EmployeeDepartmentContext> {
  let email = 'employee@technova.com'
  let organizationId = DEFAULT_ORG_ID
  let isEmployee = false

  try {
    const authRes = await workspaceFetch('/api/v1/workspace-auth/current', { method: 'GET', signal })
    if (authRes.ok) {
      const authData = (await authRes.json()) as {
        email?: string
        organizationId?: string | null
        roles?: string[]
      }
      if (authData.email) email = authData.email.toLowerCase().trim()
      if (authData.organizationId) organizationId = authData.organizationId
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
        }
        assignedRoleId = parsed.roleId?.trim() || null
        assignedRoleCode = parsed.roleCode?.trim() || assignedRoleId
        assignedRoleTitle = parsed.roleTitle?.trim() || assignedRoleCode
        assignedLevel = parsed.level?.trim() || null
        savedDeptName = parsed.departmentName?.trim() || null
        savedDeptId = parsed.departmentId?.trim() || null
      }
    } catch {
      // ignore storage errors
    }
  }

  // Check if subscription members or member-references in PostgreSQL has an encoded target role & department for this employee
  try {
    const memRes = await workspaceFetch(
      `/api/v1/organizations/${encodeURIComponent(organizationId)}/subscription/members`,
      { method: 'GET', signal },
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

  if (assignedLevel) {
    assignedLevel = assignedLevel.replace(/^(?:rank|level)\s*\d+\s*:\s*/i, '').trim()
  }

  const defaultDeptName = email.includes('se.employee')
    ? 'Engineering & Cognitive Systems'
    : 'Cloud Infrastructure & DevOps'
  const defaultDeptId = email.includes('se.employee') ? 'dept-eng' : 'dept-cloud'

  const departmentName = savedDeptName || defaultDeptName
  const departmentId = savedDeptId || defaultDeptId

  // Check if member-references in PostgreSQL has an encoded target role for this department
  if (!assignedRoleId) {
    try {
      const refRes = await workspaceFetch(
        `/api/v1/organizations/${encodeURIComponent(organizationId)}/subscription/member-references`,
        { method: 'GET', signal },
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

  const localDepts = loadDepartments()
  const matchedLocalDept = localDepts.find(
    d =>
      d.id.toLowerCase() === departmentId.toLowerCase() ||
      d.name.toLowerCase() === departmentName.toLowerCase() ||
      d.code.toLowerCase() === departmentId.toLowerCase() ||
      d.code.toLowerCase() === departmentName.toLowerCase(),
  )
  for (const code of matchedLocalDept?.linkedJobPositions || []) {
    const norm = normalizeOccCode(code)
    if (norm && !inactiveJobPositionCodes.has(norm)) {
      allowedJobPositionCodes.add(norm)
    }
  }

  // Also include job positions aligned to department domain
  for (const jp of allLocalPositions) {
    const norm = normalizeOccCode(jp.code)
    if (
      norm &&
      !inactiveJobPositionCodes.has(norm) &&
      ((departmentName.toLowerCase().includes('cloud') && (norm.startsWith('15-1299') || norm.startsWith('15-1259') || norm.startsWith('15-1260'))) ||
        (departmentName.toLowerCase().includes('cognitive') && norm.startsWith('15-1252')) ||
        (departmentName.toLowerCase().includes('data') && norm.startsWith('15-1243')) ||
        (departmentName.toLowerCase().includes('quality') && norm.startsWith('15-1253')) ||
        (departmentName.toLowerCase().includes('security') && norm.startsWith('15-1212')))
    ) {
      allowedJobPositionCodes.add(norm)
    }
  }

  try {
    const deptRes = await workspaceFetch(
      `/api/v1/organizations/${encodeURIComponent(organizationId)}/departments`,
      { method: 'GET', signal },
    )
    if (deptRes.ok) {
      const liveDepts = (await deptRes.json()) as Array<{
        id?: string
        code?: string
        name?: string
        jobPositionCodes?: string[]
      }>
      if (Array.isArray(liveDepts)) {
        const matchedLive = liveDepts.find(
          d =>
            (d.id && d.id.toLowerCase() === departmentId.toLowerCase()) ||
            (d.name && d.name.toLowerCase() === departmentName.toLowerCase()) ||
            (d.code && d.code.toLowerCase() === departmentId.toLowerCase()),
        )
        for (const code of matchedLive?.jobPositionCodes || []) {
          const norm = normalizeOccCode(code)
          if (norm && !inactiveJobPositionCodes.has(norm)) {
            allowedJobPositionCodes.add(norm)
          }
        }
      }
    }
  } catch {
    // ignore department fetch error
  }

  return {
    email,
    organizationId,
    isEmployee,
    departmentName,
    departmentId,
    allowedJobPositionCodes,
    inactiveJobPositionCodes,
    assignedRoleId,
    assignedRoleCode,
    assignedRoleTitle,
    assignedLevel,
  }
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
    const activeComp = getActiveCompany()
    for (const lr of activeComp?.targetRoles || []) {
      const entry = {
        code: lr.code,
        jobPositionCode: lr.jobPositionCode,
        department: lr.department,
        status: lr.status,
        levelNames: lr.levels,
        levelDurations: lr.levelDurations,
      }
      if (lr.id) map[lr.id.toUpperCase()] = entry
      if (lr.code) map[lr.code.trim().toUpperCase()] = entry
    }
    const keys = Array.from(new Set([
      `adaptlearn_target_role_meta_${organizationId}`,
      `adaptlearn_target_role_meta_${DEFAULT_ORG_ID}`,
      'adaptlearn_target_role_meta_comp-technova',
      'adaptlearn_target_role_meta_workspace-development',
      'adaptlearn_target_role_meta_',
    ]))
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith('adaptlearn_target_role_meta')) {
          keys.push(k)
        }
      }
    } catch {}
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

async function fetchDepartmentScopedPublishedRoles(signal?: AbortSignal): Promise<CurrentRole[]> {
  if (inFlightRolesPromise) return inFlightRolesPromise
  inFlightRolesPromise = (async () => {
    try {
      const ctx = await resolveEmployeeDepartmentContext(signal)
      const orgId = ctx.organizationId || DEFAULT_ORG_ID
      const metaMap = getLocalRoleMetadataMap(orgId)

      const orgCandidates = Array.from(new Set([orgId, DEFAULT_ORG_ID]))
      let rawRoles: unknown[] = []
      let jobsRes: Response | null = null
      for (const candidateOrg of orgCandidates) {
        const [rRes, jRes] = await Promise.all([
          workspaceFetch(`/api/v1/organizations/${encodeURIComponent(candidateOrg)}/target-roles`, {
            method: 'GET',
            signal,
          }).catch(() => null),
          workspaceFetch(`/api/v1/organizations/${encodeURIComponent(candidateOrg)}/job-positions`, {
            method: 'GET',
            signal,
          }).catch(() => null),
        ])
        if (rRes && rRes.ok) {
          const parsed = await rRes.json()
          if (Array.isArray(parsed) && parsed.length > 0) {
            rawRoles = parsed
            jobsRes = jRes
            break
          }
        } else if (rRes && (rRes.status === 401 || rRes.status === 403)) {
          break
        }
      }

  // If organization target-roles endpoint returned 403 for EMPLOYEE role or was empty, merge active company store + platform-catalog
  const activeCompRoles = (getActiveCompany()?.targetRoles || [])
    .filter(tr => {
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
      department: tr.department,
      levels: tr.levels,
      levelDurations: tr.levelDurations,
      skillTargets: tr.skillTargets,
    }))

  if (rawRoles.length === 0) {
    try {
      const catRes = await workspaceFetch('/api/v1/platform-catalog', { method: 'GET' })
      console.log('DEBUG_CAT: catRes status:', catRes.status, 'ok:', catRes.ok)
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
        console.log('DEBUG_CAT: platformRoles mapped:', platformRoles.length)
        rawRoles = [...activeCompRoles, ...platformRoles]
      } else {
        rawRoles = activeCompRoles
      }
    } catch (catErr) {
      console.error('DEBUG_CAT_EXCEPTION:', catErr)
      rawRoles = activeCompRoles
    }
  } else if (activeCompRoles.length > 0) {
    rawRoles = [...activeCompRoles, ...rawRoles]
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

  const dedupedByCode = new Map<string, CurrentRole>()

  for (const item of rawRoles) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    const id = String(r.id || r.code || '').trim()
    const code = String(r.code || id).trim()
    if (!id || !code) continue
    const codeUpper = code.toUpperCase()
    const meta = metaMap[codeUpper] || metaMap[id.toUpperCase()]

    // 1. Only published versions are offered. The backend status is authoritative so an
    //    in-flight revision draft never hides the currently published version.
    const rawStatus = String(r.status || 'ACTIVE').toUpperCase()
    if (rawStatus !== 'ACTIVE' && rawStatus !== 'PUBLISHED') continue

    const name = String(r.name || code).trim()
    const scope = String(r.description || '').trim()
    const version = String(r.version || '0.12.0').trim()

    const roleForOcc = {
      id,
      stableId: code,
      code,
      title: name,
      department: meta?.department || '',
      jobPositionCode:
        (r.jobPositionCode ? String(r.jobPositionCode) : undefined) || meta?.jobPositionCode,
      familyCode: String(r.familyCode || 'DEV'),
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

    // 2. Exclude roles under inactive Job Positions
    if (occCodeNorm && ctx.inactiveJobPositionCodes.has(occCodeNorm)) {
      continue
    }

    // 3. Filter strictly to the Employee's assigned Department (or its active Job Positions)
    const roleDept = (meta?.department || '').trim().toLowerCase()
    const empDept = ctx.departmentName.trim().toLowerCase()
    const matchesDeptName = Boolean(roleDept && empDept && roleDept === empDept)
    const matchesDeptJobPosition = Boolean(
      occCodeNorm && ctx.allowedJobPositionCodes.has(occCodeNorm),
    )

    if (!matchesDeptName && !matchesDeptJobPosition) {
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
      const levelSkills = skillTargets
        .filter(st => !st.level || st.level.toLowerCase() === lvlName.toLowerCase())
        .map(st => ({
          id: String(st.skillId || st.skillCode || ''),
          code: st.skillCode ? String(st.skillCode) : null,
          name: String(st.skillName || st.skillCode || st.skillId || ''),
          requiredScore: typeof st.threshold === 'number' ? st.threshold / 100 : 0.7,
          mandatory: true,
        }))
        .filter(st => Boolean(st.id))

      // Dynamically calculate level rank from the role's configured level ordering:
      // Index 0 is Rank 1 (highest level), Index 1 is Rank 2, etc. Zero hardcoded strings.
      const levelRank = rank

      return {
        id: `LVL-${code}-${lvlCode}`,
        code: lvlCode,
        name: lvlName,
        rank: levelRank,
        context: scope,
        attainmentRule: 'ALL_MANDATORY_SKILLS',
        duration,
        skills: levelSkills,
      }
    })

    const mappedRole: CurrentRole = {
      id,
      code,
      name,
      scope,
      jobPositionId,
      jobPositionName,
      catalogVersion: version,
      fingerprint: '',
      levels,
    }

    const existing = dedupedByCode.get(codeUpper)
    if (!existing) {
      dedupedByCode.set(codeUpper, mappedRole)
    } else if (existing.id.startsWith('role-') && !mappedRole.id.startsWith('role-')) {
      dedupedByCode.set(codeUpper, mappedRole)
    } else if (mappedRole.catalogVersion && compareVersions(mappedRole.catalogVersion, existing.catalogVersion) > 0) {
      dedupedByCode.set(codeUpper, mappedRole)
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

  console.log('DEBUG_ROLES: ctxDept:', ctx.departmentName, 'allowedOccs:', Array.from(ctx.allowedJobPositionCodes), 'rawRoles:', rawRoles.length, 'deduped:', dedupedByCode.size)

  return Array.from(dedupedByCode.values())
  } finally {
    setTimeout(() => {
      inFlightRolesPromise = null
    }, 150)
  }
  })()
  return inFlightRolesPromise
}

export const currentRoles = async (signal?: AbortSignal): Promise<CurrentRole[]> => {
  return await fetchDepartmentScopedPublishedRoles(signal)
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

  if (!matchedRole && (ctx.assignedRoleTitle || ctx.assignedRoleCode || ctx.assignedRoleId)) {
    const activeCompRole = (getActiveCompany()?.targetRoles || []).find(
      tr =>
        (ctx.assignedRoleId && tr.id === ctx.assignedRoleId) ||
        (ctx.assignedRoleCode && tr.code?.toUpperCase() === ctx.assignedRoleCode.toUpperCase()) ||
        (ctx.assignedRoleTitle && tr.title?.toLowerCase() === ctx.assignedRoleTitle.toLowerCase()),
    )
    if (activeCompRole) {
      matchedRole = {
        id: activeCompRole.id,
        code: activeCompRole.code,
        name: activeCompRole.title,
        scope: activeCompRole.description,
        jobPositionId: activeCompRole.jobPositionCode || '15-1299.08',
        jobPositionName: activeCompRole.jobPositionTitle || 'Computer Systems Engineers/Architects',
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
      matchedRole = {
        id: ctx.assignedRoleId || code,
        code,
        name: title,
        scope: '',
        jobPositionId: '15-1299.08',
        jobPositionName: 'Computer Systems Engineers/Architects',
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

export const readRoleFlow = async (signal?: AbortSignal): Promise<RoleFlowView> => {
  const [ctx, deptRoles] = await Promise.all([
    resolveEmployeeDepartmentContext(signal),
    fetchDepartmentScopedPublishedRoles(signal).catch(() => [] as CurrentRole[]),
  ])
  const synthesized = buildSynthesizedSelection(deptRoles, ctx)
  const matchedAssignedLevel = synthesized?.role.levels.find(l => l.id === synthesized.levelId)
  const assignedRank = matchedAssignedLevel?.rank ?? normalizeLevelRank(ctx.assignedLevel)

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

    const currentSelectedRank = view.selection
      ? (view.selection.role.levels.find(l => l.id === view.selection?.levelId)?.rank ??
         normalizeLevelRank(view.selection.levelId))
      : null

    const isBelowAssigned =
      typeof assignedRank === 'number' &&
      typeof currentSelectedRank === 'number' &&
      currentSelectedRank > assignedRank

    if (
      synthesized &&
      (!view.selection ||
        view.selection.role.id !== synthesized.role.id ||
        view.selection.levelId !== synthesized.levelId ||
        isBelowAssigned)
    ) {
      const totalSkills = synthesized.role.levels.reduce((acc, l) => acc + l.skills.length, 0)
      return {
        selection: synthesized,
        progress: {
          state: view.progress.state === 'SELECT_ROLE' ? 'READY' : view.progress.state,
          requiredCount: totalSkills || view.progress.requiredCount,
          coveredCount: view.progress.coveredCount,
          attemptId: view.progress.attemptId,
          baselineVersion: view.progress.baselineVersion,
        },
        assignedRoleId: ctx.assignedRoleId,
        assignedRoleCode: ctx.assignedRoleCode,
        assignedRoleTitle: ctx.assignedRoleTitle,
        assignedLevel: ctx.assignedLevel,
        assignedLevelRank: assignedRank,
      }
    }
    return {
      ...view,
      assignedRoleId: ctx.assignedRoleId,
      assignedRoleCode: ctx.assignedRoleCode,
      assignedRoleTitle: ctx.assignedRoleTitle,
      assignedLevel: ctx.assignedLevel,
      assignedLevelRank: assignedRank,
    }
  } catch (err) {
    if (signal?.aborted) throw err
    if (!ctx.isEmployee && err instanceof RoleFlowError && (err.status === 401 || err.status === 403)) throw err
    const totalSkills = synthesized
      ? synthesized.role.levels.reduce((acc, l) => acc + l.skills.length, 0)
      : 0
    return {
      selection: synthesized,
      progress: {
        state: synthesized ? 'READY' : 'SELECT_ROLE',
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
      const emailKey = `alg_employee_assignment_${ctx.email}`
      const existingRaw = localStorage.getItem(emailKey)
      const existing = existingRaw ? (JSON.parse(existingRaw) as Record<string, unknown>) : {}
      localStorage.setItem(
        emailKey,
        JSON.stringify({
          ...existing,
          roleId: chosenRole.id,
          roleCode: chosenRole.code,
          roleTitle: chosenRole.name,
          level: chosenLevelName,
          departmentId: ctx.departmentId,
          departmentName: ctx.departmentName,
        }),
      )
      const activeProfileKey = `alg_learner_learning_profile_${ctx.organizationId}`
      const profRaw = localStorage.getItem(activeProfileKey)
      if (profRaw) {
        const prof = JSON.parse(profRaw) as Record<string, unknown>
        prof.currentRole = chosenRole.name
        prof.currentLevel = chosenLevelName
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
