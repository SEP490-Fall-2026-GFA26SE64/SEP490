import type { Reference } from '../../subscription/subscriptionApi'
import { workspaceFetch } from '../../../shared/api/workspaceFetch'
import { resolveJobPositionForRole, type TargetRoleModel } from '../../manager/data/ldManagerMockData'
import { resolveWorkspaceOrgId } from '../../../shared/stores/companyStore'
import { loadDepartments } from '../../../shared/stores/departmentStore'

// Option-resolution helpers shared by the Create/Edit user form and the Excel bulk import,
// so both flows resolve departments, job positions and Target Roles identically.

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

export type CatalogJobPosition = { code: string; name: string; description?: string }
export type TargetRoleMeta = Record<
  string,
  {
    code?: string
    title?: string
    jobPositionCode?: string
    jobPositionTitle?: string
    department?: string
    levelNames?: string[]
    status?: string
    isStaffingEnabled?: boolean
  }
>

export async function fetchOrganizationTargetRoles(organization: string): Promise<Record<string, unknown>[]> {
  if (!organization) return []
  const targetOrgId = resolveWorkspaceOrgId(organization)
  try {
    const res = await fetch(`/api/v1/organizations/${targetOrgId}/roles`, {
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
}

export function readTargetRoleMeta(organization: string): TargetRoleMeta {
  const map: Record<string, { jobPositionCode?: string; department?: string; levelNames?: string[]; status?: string; isStaffingEnabled?: boolean }> = {}
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
      const parsed = JSON.parse(raw) as Record<string, { code?: string; jobPositionCode?: string; department?: string; levelNames?: string[]; status?: string; isStaffingEnabled?: boolean }>
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
}

export function buildOrganizationTargetRoles(
  organization: string,
  activeComp: { id?: string; targetRoles?: TargetRoleModel[] } | null | undefined,
  liveData: Record<string, unknown>[] | undefined,
  roleMetaByCode: TargetRoleMeta,
  jobPositions: CatalogJobPosition[],
): TargetRoleModel[] {
  const isSameOrgAsActiveComp = resolveWorkspaceOrgId(activeComp?.id) === resolveWorkspaceOrgId(organization)
  const localRoles = isSameOrgAsActiveComp ? (activeComp?.targetRoles || []) : []
  const liveRaw = liveData || []
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
    const isStaffingEnabled = Boolean(
      (r as any).isStaffingEnabled ||
      meta?.isStaffingEnabled ||
      localMatch?.isStaffingEnabled ||
      rawStatus === 'staged' ||
      metaStatus === 'staged'
    )
    const mappedStatus: TargetRoleModel['status'] =
      metaStatus === 'unpublished' || rawStatus === 'unpublished' || localStatus === 'unpublished'
        ? 'unpublished'
        : rawStatus === 'active' || rawStatus === 'published' || localStatus === 'published' || localStatus === 'active'
          ? 'published'
          : rawStatus === 'submitted'
            ? 'submitted'
            : rawStatus === 'staged' || metaStatus === 'staged'
              ? 'staged'
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
    const explicitJobPositionCode =
      (r.jobPositionCode ? String(r.jobPositionCode) : undefined) ||
      meta?.jobPositionCode ||
      localMatch?.jobPositionCode ||
      familyAsJobPosCode
    const occ = resolveJobPositionForRole(
      {
        code,
        title: String(r.name || r.title || localMatch?.title || code),
        familyCode: rawFamilyCode,
        jobPositionCode: explicitJobPositionCode,
      },
      organization,
    )
    const occNorm = occ.code.replace(/\.00$/, '').toLowerCase().trim()
    const localDepts = loadDepartments(organization)
    const matchedDept = localDepts.find((d) =>
      (d.linkedJobPositions || []).some(
        (p) => p.replace(/\.00$/, '').toLowerCase().trim() === occNorm
      )
    )
    const inferredDept =
      familyNorm === 'BE-ENG' || familyNorm === 'FE-ENG' || codeUpper === 'JAVA-BE' || codeUpper === 'REACT-FE'
        ? 'Software Engineering'
        : familyNorm === 'QA-ENG' || codeUpper === 'QA-AUTO'
          ? 'Quality Assurance'
          : familyNorm === 'DATA-ENG' || codeUpper === 'DATA-PIPE'
            ? 'Data & Analytics'
            : familyNorm === 'LD-SPEC' || codeUpper === 'LD-COORD'
              ? 'People & Learning'
              : ''
    const effectiveDept = String(r.department || meta?.department || localMatch?.department || matchedDept?.name || inferredDept || '')
    return {
      id: String(r.id || code),
      stableId: code,
      code,
      title: String(r.name || r.title || localMatch?.title || code),
      department: effectiveDept,
      jobPositionCode: explicitJobPositionCode || (rawFamilyCode && rawFamilyCode !== 'SOFTWARE_ENGINEERING' ? rawFamilyCode : undefined),
      familyCode: rawFamilyCode || localMatch?.familyCode,
      description: String(r.description || localMatch?.description || ''),
      version: String(r.version || localMatch?.version || '1.0'),
      status: mappedStatus,
      isStaffingEnabled,
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
    const isStaffingEnabled = Boolean(
      role.isStaffingEnabled ||
      meta?.isStaffingEnabled ||
      status === 'staged'
    )
    const enriched: TargetRoleModel = {
      ...role,
      status,
      isStaffingEnabled,
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

  // 2. Also include local-only / staged roles that are not yet returned from live backend
  for (const role of localRoles) {
    const codeKey = (role.code || '').trim().toUpperCase()
    if (!codeKey || isLiveFromBackend.has(codeKey)) continue
    const meta = roleMetaByCode[codeKey] || roleMetaByCode[(role.id || '').toUpperCase()]
    const metaStatus = meta?.status?.toLowerCase()
    const status = (metaStatus === 'unpublished') ? 'unpublished' : (meta?.status as TargetRoleModel['status'] || role.status)
    const isStaffingEnabled = Boolean(
      role.isStaffingEnabled ||
      meta?.isStaffingEnabled ||
      status === 'staged'
    )
    const enriched: TargetRoleModel = {
      ...role,
      status,
      isStaffingEnabled,
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

  // 3. Include any roles stored in roleMetaByCode that are staged or staffing-enabled
  for (const [keyOrId, meta] of Object.entries(roleMetaByCode)) {
    const codeKey = (meta.code || keyOrId || '').trim().toUpperCase()
    if (!codeKey || dedupedByCode.has(codeKey) || isLiveFromBackend.has(codeKey)) continue
    const status = meta.status?.toLowerCase()
    if (status === 'staged' || meta.isStaffingEnabled) {
      dedupedByCode.set(codeKey, {
        id: meta.code || codeKey,
        stableId: meta.code || codeKey,
        code: meta.code || codeKey,
        title: (meta as any).title || (meta as any).jobPositionTitle || meta.code || codeKey,
        department: meta.department || '',
        jobPositionCode: meta.jobPositionCode,
        description: '',
        version: '1.0',
        status: 'staged',
        isStaffingEnabled: true,
        competencyIds: [],
        skillTargets: [],
        levels: meta.levelNames && meta.levelNames.length > 0 ? meta.levelNames : ['Senior', 'Middle', 'Junior'],
        activeEnrollments: 0,
        updatedAt: new Date().toISOString(),
      })
    }
  }

  return Array.from(dedupedByCode.values())
}

export function targetRolesForEmployee(
  orgTargetRoles: TargetRoleModel[],
  department: string,
  selectedDeptObj: DepartmentItem | null,
  jobPosition: string,
  organization: string,
  jobPositions: CatalogJobPosition[],
  references: Reference[],
): TargetRoleModel[] {
  // Allow published roles OR staged/staffing-enabled roles (for workforce assignment by Org Admin)
  const eligibleRoles = orgTargetRoles.filter((r) => {
    const s = String(r.status || '').toLowerCase()
    return s === 'published' || s === 'active' || s === 'staged' || Boolean(r.isStaffingEnabled)
  })

  if (!department && !selectedDeptObj) {
    return eligibleRoles.sort((a, b) => a.title.localeCompare(b.title))
  }

  const normalizeOccCode = (c?: string) => (c || '').trim().toUpperCase().replace(/^OCC-/, '').replace(/\.00$/, '')
  const getRoleOccCode = (r: TargetRoleModel): string => {
    if (r.jobPositionCode && r.jobPositionCode.trim()) {
      return r.jobPositionCode.trim()
    }
    return resolveJobPositionForRole(r, organization).code
  }

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
  const deptName = (selectedDeptObj?.name || department || '').toLowerCase().trim()
  const deptCode = (selectedDeptObj?.code || department || '').toLowerCase().trim()
  const deptId = (selectedDeptObj?.id || department || '').toLowerCase().trim()

  if (deptName.includes('cognitive') || deptName.includes('software') || deptName.includes('engineering') || deptCode === 'eng-cog' || deptCode === 'eng-swe' || deptCode === 'eng' || deptCode === 'swe') {
    deptLinkedNorm.add('15-1252')
    deptLinkedNorm.add('BE-ENG')
    deptLinkedNorm.add('FE-ENG')
    deptLinkedNorm.add('DEV')
    deptLinkedNorm.add('SWE')
  }
  if (deptName.includes('data') || deptName.includes('artificial') || deptName.includes('analytics') || deptCode === 'eng-data' || deptCode === 'data') {
    deptLinkedNorm.add('15-1243')
    deptLinkedNorm.add('DATA-ENG')
    deptLinkedNorm.add('DATA')
  }
  if (deptName.includes('quality') || deptName.includes('assurance') || deptName.includes('test') || deptCode === 'eng-qa' || deptCode === 'qa') {
    deptLinkedNorm.add('15-1253')
    deptLinkedNorm.add('QA-ENG')
    deptLinkedNorm.add('QA')
  }
  if (deptName.includes('cloud') || deptName.includes('infrastructure') || deptCode === 'eng-cloud' || deptCode === 'cloud') {
    deptLinkedNorm.add('15-1299.08')
    deptLinkedNorm.add('CLOUD')
  }
  if (deptName.includes('security') || deptName.includes('cyber') || deptCode === 'eng-sec' || deptCode === 'sec') {
    deptLinkedNorm.add('15-1212')
    deptLinkedNorm.add('SEC')
  }
  if (deptName.includes('learning') || deptName.includes('people') || deptName.includes('hr') || deptCode === 'hr' || deptCode === 'ld') {
    deptLinkedNorm.add('13-1151')
    deptLinkedNorm.add('LD-SPEC')
    deptLinkedNorm.add('HR')
    deptLinkedNorm.add('LD')
  }

  // Filter to eligible roles belonging to the selected job position (if explicitly specified and matches exist)
  if (targetOccNorm) {
    const jpMatched = eligibleRoles.filter((r) => {
      const occNorm = normalizeOccCode(getRoleOccCode(r))
      const rJp = normalizeOccCode(r.jobPositionCode)
      const rFam = normalizeOccCode(r.familyCode)
      const matchesOcc = occNorm === targetOccNorm || rJp === targetOccNorm || rFam === targetOccNorm
      if (!matchesOcc) return false

      // Guard: if role has an explicit department that conflicts with the selected department, exclude it
      const rDept = (r.department || '').toLowerCase().trim()
      if (rDept && deptName && rDept !== deptName && !deptName.includes(rDept) && !rDept.includes(deptName)) {
        return false
      }
      return true
    })
    if (jpMatched.length > 0) {
      return jpMatched.sort((a, b) => a.title.localeCompare(b.title))
    }
  }

  const deptMatched = eligibleRoles.filter((r) => {
    const occNorm = normalizeOccCode(getRoleOccCode(r))
    const rDept = (r.department || '').toLowerCase().trim()
    const rDeptId = ((r as any).departmentId || '').toLowerCase().trim()
    const rCode = (r.code || '').toUpperCase().trim()
    const rTitle = (r.title || '').toLowerCase().trim()
    const rJpCode = normalizeOccCode(r.jobPositionCode)
    const rFam = normalizeOccCode(r.familyCode)

    if (rDept && (rDept === deptName || rDept === deptCode || rDept === deptId || deptName.includes(rDept) || rDept.includes(deptName) || deptCode === rDept)) {
      return true
    }
    if (rDeptId && (rDeptId === deptId || rDeptId === deptCode)) {
      return true
    }
    if (deptLinkedNorm.has(occNorm) || (rJpCode && deptLinkedNorm.has(rJpCode)) || (rFam && deptLinkedNorm.has(rFam))) {
      return true
    }

    const isEngDept = deptCode === 'eng' || deptCode === 'eng-swe' || deptCode === 'eng-cog' || deptCode === 'swe' || deptName.includes('software') || deptName.includes('engineering')
    if (isEngDept && (rCode === 'JAVA-BE' || rCode === 'REACT-FE' || rCode.startsWith('JAVA') || rCode.startsWith('REACT') || rTitle.includes('backend') || rTitle.includes('frontend') || rTitle.includes('developer') || rTitle.includes('software'))) {
      return true
    }

    const isQaDept = deptCode === 'qa' || deptCode === 'eng-qa' || deptName.includes('quality') || deptName.includes('assurance')
    if (isQaDept && (rCode === 'QA-AUTO' || rCode.startsWith('QA') || rTitle.includes('quality') || rTitle.includes('test') || rTitle.includes('automation'))) {
      return true
    }

    const isDataDept = deptCode === 'data' || deptCode === 'eng-data' || deptName.includes('data') || deptName.includes('analytics')
    if (isDataDept && (rCode === 'DATA-PIPE' || rCode.startsWith('DATA') || rTitle.includes('data') || rTitle.includes('pipeline') || rTitle.includes('analytics'))) {
      return true
    }

    const isHrDept = deptCode === 'hr' || deptCode === 'ld' || deptName.includes('people') || deptName.includes('learning')
    if (isHrDept && (rCode === 'LD-COORD' || rCode.startsWith('LD') || rCode.startsWith('HR') || rTitle.includes('learning') || rTitle.includes('coordinator') || rTitle.includes('training'))) {
      return true
    }

    return false
  })

  return deptMatched.sort((a, b) => a.title.localeCompare(b.title))
}

export function jobPositionsForDepartment(
  department: string,
  selectedDeptObj: DepartmentItem | null,
  jobPositions: CatalogJobPosition[],
  references: Reference[],
): JobPositionItem[] {
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
}

export function targetRoleLevels(role: Pick<TargetRoleModel, 'levels'> | null | undefined): string[] {
  return role?.levels && role.levels.length > 0 ? role.levels : ['Senior', 'Middle', 'Junior']
}
