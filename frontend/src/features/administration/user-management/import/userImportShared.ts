import type { TargetRoleModel } from '../../../manager/data/ldManagerMockData'
import type { DepartmentItem, JobPositionItem } from '../userAssignmentOptions'

export type ImportLanguage = 'en' | 'vi'
export type ImportRole = 'EMPLOYEE' | 'DOMAIN_EXPERT' | 'LD_MANAGER'
export type ImportField = 'fullName' | 'email' | 'role' | 'department' | 'jobPosition' | 'targetRole' | 'level'

export const MAX_IMPORT_ROWS = 50
export const MAX_NAME_LENGTH = 120
export const MAX_EMAIL_LENGTH = 254
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const IMPORT_ROLES: readonly ImportRole[] = ['EMPLOYEE', 'DOMAIN_EXPERT', 'LD_MANAGER']

export const ROLE_LABELS: Record<ImportRole, Record<ImportLanguage, string>> = {
  EMPLOYEE: { en: 'Employee', vi: 'Nhân viên' },
  DOMAIN_EXPERT: { en: 'Domain Expert', vi: 'Chuyên gia' },
  LD_MANAGER: { en: 'L&D Manager', vi: 'Quản lý L&D' },
}

export interface ImportColumn {
  field: ImportField
  required: boolean
  header: Record<ImportLanguage, string>
  width: number
}

export const IMPORT_COLUMNS: readonly ImportColumn[] = [
  { field: 'fullName', required: true, header: { en: 'Full name', vi: 'Họ và tên' }, width: 28 },
  { field: 'email', required: true, header: { en: 'Email', vi: 'Email' }, width: 34 },
  { field: 'role', required: true, header: { en: 'Role', vi: 'Vai trò' }, width: 18 },
  { field: 'department', required: false, header: { en: 'Department', vi: 'Phòng ban' }, width: 32 },
  { field: 'jobPosition', required: false, header: { en: 'Job position', vi: 'Vị trí công việc' }, width: 40 },
  { field: 'targetRole', required: false, header: { en: 'Target role', vi: 'Vai trò mục tiêu' }, width: 36 },
  { field: 'level', required: false, header: { en: 'Level', vi: 'Cấp độ' }, width: 14 },
]

export const SHEET_NAMES: Record<'guide' | 'users' | 'lists', Record<ImportLanguage, string>> = {
  guide: { en: 'Guide', vi: 'Hướng dẫn' },
  users: { en: 'Users', vi: 'Người dùng' },
  lists: { en: 'Lists', vi: 'Danh mục' },
}

export const ERROR_COLUMN_HEADER: Record<ImportLanguage, string> = { en: 'Import error', vi: 'Lỗi nhập' }

export function columnHeader(column: ImportColumn, language: ImportLanguage): string {
  return column.required ? `${column.header[language]} *` : column.header[language]
}

/** Lower-cases, strips Vietnamese diacritics, `*` markers and extra whitespace for tolerant matching. */
export function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

const HEADER_LOOKUP = new Map<string, ImportField>()
for (const column of IMPORT_COLUMNS) {
  HEADER_LOOKUP.set(normalizeKey(column.header.en), column.field)
  HEADER_LOOKUP.set(normalizeKey(column.header.vi), column.field)
  HEADER_LOOKUP.set(normalizeKey(column.field), column.field)
}

export function headerField(value: string): ImportField | null {
  return HEADER_LOOKUP.get(normalizeKey(value)) ?? null
}

const ROLE_LOOKUP = new Map<string, ImportRole>()
for (const role of IMPORT_ROLES) {
  ROLE_LOOKUP.set(normalizeKey(role), role)
  ROLE_LOOKUP.set(normalizeKey(role.replace(/_/g, ' ')), role)
  ROLE_LOOKUP.set(normalizeKey(ROLE_LABELS[role].en), role)
  ROLE_LOOKUP.set(normalizeKey(ROLE_LABELS[role].vi), role)
}
ROLE_LOOKUP.set(normalizeKey('Expert'), 'DOMAIN_EXPERT')
ROLE_LOOKUP.set(normalizeKey('Chuyên gia nghiệp vụ'), 'DOMAIN_EXPERT')
ROLE_LOOKUP.set(normalizeKey('LD Manager'), 'LD_MANAGER')

export function parseRole(value: string): ImportRole | null {
  return ROLE_LOOKUP.get(normalizeKey(value)) ?? null
}

export function stripLevelRank(value: string): string {
  return value.replace(/^(?:rank|level|hạng|cấp)\s*\d+\s*:\s*/i, '').trim()
}

/** Department → job position → Target role → levels, resolved with the same rules as the Create User form. */
export interface ImportCatalogTargetRole {
  role: TargetRoleModel
  label: string
  levels: string[]
}

export interface ImportCatalogJobPosition {
  item: JobPositionItem
  label: string
  targetRoles: ImportCatalogTargetRole[]
}

export interface ImportCatalogDepartment {
  department: DepartmentItem
  label: string
  jobPositions: ImportCatalogJobPosition[]
}

export type ImportCatalog = ImportCatalogDepartment[]

export function departmentLabel(department: Pick<DepartmentItem, 'code' | 'name'>): string {
  return department.code ? `${department.code} - ${department.name}` : department.name
}

export function targetRoleLabel(role: Pick<TargetRoleModel, 'code' | 'title'>): string {
  return role.code ? `${role.code} - ${role.title}` : role.title
}

export interface RawImportRow {
  rowNumber: number
  fullName: string
  email: string
  role: string
  department: string
  jobPosition: string
  targetRole: string
  level: string
}

export type CopyFn = (en: string, vi: string) => string
