import {
decodeJobPositionWithTargetRole,
type Member
} from '../../subscription/subscriptionApi'

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

