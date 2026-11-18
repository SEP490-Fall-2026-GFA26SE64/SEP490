import { encodeJobPositionWithTargetRole, request } from '../../../subscription/subscriptionApi'
import { createDepartmentApi, updateDepartmentApi } from '../../../../shared/api/departmentApi'
import { updateDepartment } from '../../../../shared/stores/departmentStore'
import type { ResolvedImportRow } from './userImportValidation'

export interface InvitationPayload {
  fullName: string
  email: string
  roles: string[]
  departmentId: string | null
  jobPositionReferenceId: string | null
  departmentName: string | null
  jobPositionName: string | null
}

/** Same invitation payload the Create User form sends for a new user. */
export function buildInvitationPayload(row: ResolvedImportRow): InvitationPayload {
  const department = row.department?.department ?? null
  const jobPosition = row.role === 'LD_MANAGER' ? null : row.jobPosition?.item ?? null
  const rawJobPositionName = jobPosition ? (jobPosition.jobPositionName || jobPosition.name || null) : null
  const targetRole = row.role === 'EMPLOYEE' ? row.targetRole?.role ?? null : null
  return {
    fullName: row.fullName,
    email: row.email,
    roles: [row.role],
    departmentId: department?.id || null,
    jobPositionReferenceId: jobPosition?.jobPositionReferenceId || null,
    departmentName: department?.name || null,
    jobPositionName: targetRole
      ? encodeJobPositionWithTargetRole(rawJobPositionName, targetRole.id, targetRole.code, targetRole.title, row.level)
      : rawJobPositionName,
  }
}

function applyLocalAssignment(row: ResolvedImportRow, organization: string) {
  if (row.role !== 'EMPLOYEE' && row.role !== 'LD_MANAGER') return
  const department = row.department?.department
  const jobPosition = row.role === 'EMPLOYEE' ? row.jobPosition?.item : null
  const targetRole = row.role === 'EMPLOYEE' ? row.targetRole?.role : null
  try {
    localStorage.setItem(`alg_employee_assignment_${row.email}`, JSON.stringify({
      roleTitle: targetRole?.title || '',
      roleId: targetRole?.id || '',
      roleCode: targetRole?.code || '',
      level: targetRole ? row.level || '' : '',
      departmentId: department?.id || '',
      departmentName: department?.name || '',
      jobPositionCode: jobPosition?.code || '',
      jobPositionName: jobPosition?.jobPositionName || jobPosition?.name || '',
    }))
  } catch { /* storage unavailable: assignment cache is best-effort, as in the Create User form */ }

  if (row.role === 'LD_MANAGER' && department?.id) {
    updateDepartment(department.id, { headOfDepartment: row.fullName, headEmail: row.email }, organization)
    updateDepartmentApi(organization, department.id, {
      code: department.code,
      name: department.name,
      headOfDepartment: row.fullName,
      headEmail: row.email,
    }).catch(() => {
      createDepartmentApi(organization, {
        id: department.id,
        code: department.code,
        name: department.name,
        headOfDepartment: row.fullName,
        headEmail: row.email,
        status: 'ACTIVE',
        linkedJobPositions: department.linkedJobPositions,
      }).catch(() => {})
    })
  }
}

export async function sendImportInvitation(row: ResolvedImportRow, organization: string): Promise<void> {
  await request(`/api/v1/organizations/${organization}/subscription/activations`, 'POST', buildInvitationPayload(row))
  applyLocalAssignment(row, organization)
}
