import type { Reference } from '../../../subscription/subscriptionApi'
import type { TargetRoleModel } from '../../../manager/data/ldManagerMockData'
import {
  jobPositionsForDepartment,
  targetRoleLevels,
  targetRolesForEmployee,
  type CatalogJobPosition,
  type DepartmentItem,
} from '../userAssignmentOptions'
import {
  EMAIL_PATTERN,
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  departmentLabel,
  normalizeKey,
  parseRole,
  stripLevelRank,
  targetRoleLabel,
  type CopyFn,
  type ImportCatalog,
  type ImportCatalogDepartment,
  type ImportCatalogJobPosition,
  type ImportCatalogTargetRole,
  type ImportField,
  type ImportRole,
  type RawImportRow,
} from './userImportShared'

export function buildImportCatalog(input: {
  departments: DepartmentItem[]
  jobPositions: CatalogJobPosition[]
  references: Reference[]
  targetRoles: TargetRoleModel[]
  organization: string
}): ImportCatalog {
  return input.departments.map(department => ({
    department,
    label: departmentLabel(department),
    jobPositions: jobPositionsForDepartment(department.id, department, input.jobPositions, input.references).map(item => ({
      item,
      label: item.jobPositionName,
      targetRoles: targetRolesForEmployee(
        input.targetRoles,
        department.id,
        department,
        item.jobPositionReferenceId,
        input.organization,
        input.jobPositions,
        input.references,
      ).map(role => ({ role, label: targetRoleLabel(role), levels: targetRoleLevels(role) })),
    })),
  }))
}

export interface ImportIssue {
  field: ImportField | null
  message: string
}

export interface ResolvedImportRow {
  fullName: string
  email: string
  role: ImportRole
  department: ImportCatalogDepartment | null
  jobPosition: ImportCatalogJobPosition | null
  targetRole: ImportCatalogTargetRole | null
  level: string | null
}

export interface ValidatedImportRow {
  raw: RawImportRow
  issues: ImportIssue[]
  resolved: ResolvedImportRow | null
}

function matches(value: string, candidates: (string | null | undefined)[]): boolean {
  const key = normalizeKey(value)
  return candidates.some(candidate => Boolean(candidate) && normalizeKey(candidate as string) === key)
}

function findDepartment(catalog: ImportCatalog, value: string) {
  return catalog.find(entry => matches(value, [entry.label, entry.department.code, entry.department.name, entry.department.id]))
}

function findJobPosition(department: ImportCatalogDepartment, value: string) {
  return department.jobPositions.find(entry =>
    matches(value, [entry.label, entry.item.code, entry.item.name, entry.item.jobPositionReferenceId]))
}

function findTargetRole(jobPosition: ImportCatalogJobPosition, value: string) {
  return jobPosition.targetRoles.find(entry =>
    matches(value, [entry.label, entry.role.code, entry.role.title, entry.role.id]))
}

export function validateImportRows(
  rows: RawImportRow[],
  catalog: ImportCatalog,
  existingEmails: Iterable<string>,
  c: CopyFn,
): ValidatedImportRow[] {
  const existing = new Set(Array.from(existingEmails, email => email.trim().toLowerCase()))
  const firstRowByEmail = new Map<string, number>()

  return rows.map(raw => {
    const issues: ImportIssue[] = []
    const add = (field: ImportField | null, en: string, vi: string) => issues.push({ field, message: c(en, vi) })

    const fullName = raw.fullName.trim()
    const email = raw.email.trim().toLowerCase()

    if (!fullName) add('fullName', 'Full name is required.', 'Họ và tên là bắt buộc.')
    else if (fullName.length > MAX_NAME_LENGTH) add('fullName', `Full name must be at most ${MAX_NAME_LENGTH} characters.`, `Họ và tên tối đa ${MAX_NAME_LENGTH} ký tự.`)

    if (!email) add('email', 'Email is required.', 'Email là bắt buộc.')
    else if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) add('email', 'Email format is invalid.', 'Email không đúng định dạng.')
    else {
      const firstRow = firstRowByEmail.get(email)
      if (firstRow !== undefined) add('email', `Email is duplicated with row ${firstRow}.`, `Email bị trùng với dòng ${firstRow}.`)
      else firstRowByEmail.set(email, raw.rowNumber)
      if (existing.has(email)) add('email', 'This email already has an account or a pending invitation.', 'Email này đã có tài khoản hoặc lời mời đang chờ.')
    }

    const role = raw.role.trim() ? parseRole(raw.role) : null
    if (!raw.role.trim()) add('role', 'Role is required.', 'Vai trò là bắt buộc.')
    else if (!role) add('role', 'Role must be Employee, Domain Expert or L&D Manager.', 'Vai trò phải là Nhân viên, Chuyên gia hoặc Quản lý L&D.')

    let department: ImportCatalogDepartment | null = null
    let jobPosition: ImportCatalogJobPosition | null = null
    let targetRole: ImportCatalogTargetRole | null = null
    let level: string | null = null

    if (raw.department.trim()) {
      department = findDepartment(catalog, raw.department) ?? null
      if (!department) add('department', `Department "${raw.department.trim()}" was not found. Pick one from the list.`, `Không tìm thấy phòng ban "${raw.department.trim()}". Hãy chọn từ danh sách.`)
    } else if (role) {
      add('department', 'Department is required for this role.', 'Phòng ban là bắt buộc với vai trò này.')
    }

    const needsJobPosition = role === 'EMPLOYEE' || role === 'DOMAIN_EXPERT'
    if (raw.jobPosition.trim() && role !== 'LD_MANAGER') {
      if (department) {
        jobPosition = findJobPosition(department, raw.jobPosition) ?? null
        if (!jobPosition) add('jobPosition', `Job position "${raw.jobPosition.trim()}" does not belong to department ${department.label}.`, `Vị trí "${raw.jobPosition.trim()}" không thuộc phòng ban ${department.label}.`)
      }
    } else if (needsJobPosition) {
      add('jobPosition', 'Job position is required for Employee and Domain Expert.', 'Vị trí công việc là bắt buộc với Nhân viên và Chuyên gia.')
    }

    const hasTargetRole = Boolean(raw.targetRole.trim())
    const hasLevel = Boolean(raw.level.trim())
    if ((hasTargetRole || hasLevel) && role && role !== 'EMPLOYEE') {
      add('targetRole', 'Target role and Level apply only to Employee rows. Leave them empty.', 'Vai trò mục tiêu và Cấp độ chỉ dùng cho Nhân viên. Hãy để trống.')
    } else if (hasLevel && !hasTargetRole) {
      add('level', 'Level requires a Target role.', 'Cấp độ cần đi kèm Vai trò mục tiêu.')
    } else if (hasTargetRole && jobPosition) {
      targetRole = findTargetRole(jobPosition, raw.targetRole) ?? null
      if (!targetRole) {
        add('targetRole', `Target role "${raw.targetRole.trim()}" is not published for job position ${jobPosition.label}.`, `Vai trò mục tiêu "${raw.targetRole.trim()}" chưa được xuất bản cho vị trí ${jobPosition.label}.`)
      } else if (hasLevel) {
        const wanted = stripLevelRank(raw.level)
        level = targetRole.levels.find(item => normalizeKey(item) === normalizeKey(wanted)) ?? null
        if (!level) add('level', `Level must be one of: ${targetRole.levels.join(', ')}.`, `Cấp độ phải là một trong: ${targetRole.levels.join(', ')}.`)
      } else {
        level = targetRole.levels[targetRole.levels.length - 1] ?? null
      }
    }

    return {
      raw,
      issues,
      resolved: issues.length === 0 && role
        ? { fullName, email, role, department, jobPosition: role === 'LD_MANAGER' ? null : jobPosition, targetRole, level }
        : null,
    }
  })
}
