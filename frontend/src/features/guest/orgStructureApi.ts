import { RegistrationApiError } from './registrationApi'
import type { OrgStructureSheets } from './orgStructureFile'
import type { CatalogEdge, CatalogNode, PlatformCatalog } from './platformCatalogApi'

export interface StructureLevel { code: string; name: string; rank: number }
export interface StructureTargetRole { code: string; name: string; scope: string; levels: StructureLevel[] }
export interface StructureJobPosition { code: string; name: string; targetRoles: StructureTargetRole[]; interestProfile?: Record<string, number> }
export interface StructureDepartment { code: string; name: string; description: string; jobPositions: StructureJobPosition[] }
export interface OrganizationStructure {
  departmentCount: number
  jobPositionCount: number
  targetRoleCount: number
  levelCount: number
  departments: StructureDepartment[]
}
/** {@code sheet} is null and row 0 for whole-workbook problems; row 0 with a sheet means the whole sheet. */
export interface StructureRowError { sheet: string | null; row: number; column: string | null; message: string }

/** The server rejected the uploaded structure; each error points at a spreadsheet row (0 = whole file). */
export class StructureRejectedError extends RegistrationApiError {
  readonly rowErrors: StructureRowError[]

  constructor(message: string, rowErrors: StructureRowError[]) {
    super(400, 'INVALID_INPUT', message, 'organizationStructure')
    this.name = 'StructureRejectedError'
    this.rowErrors = rowErrors
  }
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Unexpected structure response.')
  return value as Record<string, unknown>
}
function text(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Unexpected structure response.')
  return value
}
function count(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) throw new Error('Unexpected structure response.')
  return value
}
function list<T>(value: unknown, map: (item: Record<string, unknown>) => T): T[] {
  if (!Array.isArray(value)) throw new Error('Unexpected structure response.')
  return value.map(item => map(record(item)))
}

export function parseOrganizationStructure(value: unknown): OrganizationStructure {
  const v = record(value)
  return {
    departmentCount: count(v.departmentCount), jobPositionCount: count(v.jobPositionCount),
    targetRoleCount: count(v.targetRoleCount), levelCount: count(v.levelCount),
    departments: list(v.departments, d => ({
      code: text(d.code), name: text(d.name), description: text(d.description),
      jobPositions: list(d.jobPositions, j => ({
        code: text(j.code), name: text(j.name), interestProfile: j.interestProfile == null ? {} : Object.fromEntries(Object.entries(record(j.interestProfile)).map(([key,value]) => [key,count(value)])),
        targetRoles: list(j.targetRoles, r => ({
          code: text(r.code), name: text(r.name), scope: text(r.scope),
          levels: list(r.levels, l => ({ code: text(l.code), name: text(l.name), rank: count(l.rank) })),
        })),
      })),
    })),
  }
}

async function readJson(response: Response): Promise<unknown> {
  const body = await response.text()
  let payload: unknown = null
  try { payload = body ? JSON.parse(body) : null } catch { payload = null }
  if (!response.ok) {
    const error = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {}
    const message = typeof error.message === 'string' ? error.message : 'The organization structure could not be checked.'
    if (Array.isArray(error.rowErrors)) throw new StructureRejectedError(message, error.rowErrors.map(item => {
      const e = record(item)
      return { sheet: typeof e.sheet === 'string' ? e.sheet : null, row: typeof e.row === 'number' ? e.row : 0, column: typeof e.column === 'string' ? e.column : null, message: text(e.message) }
    }))
    throw new RegistrationApiError(response.status, typeof error.code === 'string' ? error.code : 'SERVICE_UNAVAILABLE', message,
      typeof error.field === 'string' ? error.field : null)
  }
  return payload
}

/** Validates the workbook sheets on the server, which applies the same rules again when the registration is submitted. */
export async function validateOrganizationStructure(sheets: OrgStructureSheets, signal?: AbortSignal): Promise<OrganizationStructure> {
  const csrf = record(await readJson(await fetch('/api/v1/registration/csrf', { signal, credentials: 'same-origin', cache: 'no-store' })))
  const header = text(csrf.headerName)
  if (header !== 'X-CSRF-TOKEN') throw new Error('Unexpected structure response.')
  return parseOrganizationStructure(await readJson(await fetch('/api/v1/registration/org-structure/validate', {
    method: 'POST', signal, credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', [header]: text(csrf.token) },
    body: JSON.stringify(sheets),
  })))
}

/** Graph-shaped view for the shared catalog graph; ids are derived from codes and stay stable across renders. */
/** Display key that merges levels with the same name (case-insensitive) across roles. */
export const levelKey = (name: string) => `level:${name.trim().toUpperCase()}`
export const ORGANIZATION_NODE_ID = 'organization'

/** Number of distinct level names; the review shows merged levels rather than one per role. */
export function distinctLevelCount(structure: OrganizationStructure): number {
  return new Set(structure.departments.flatMap(d => d.jobPositions.flatMap(j => j.targetRoles.flatMap(r => r.levels.map(l => levelKey(l.name)))))).size
}

/**
 * Graph-shaped view for the shared catalog graph. A symbolic organization root links the departments, and levels
 * with the same name become one node linked from every role that uses it. Display only: the stored structure
 * keeps one level per role. Ids are derived from codes/names and stay stable across renders.
 */
export function structureGraph(structure: OrganizationStructure, organizationName: string): PlatformCatalog {
  const nodes: CatalogNode[] = [{ id: ORGANIZATION_NODE_ID, label: 'Organization', name: organizationName, code: null, description: null }]
  const edges: CatalogEdge[] = []
  const levels = new Set<string>()
  const link = (type: CatalogEdge['type'], from: string, to: string) => edges.push({ id: `${from}>${to}`, from, to, type, properties: {} })
  for (const d of structure.departments) {
    const dId = `department:${d.code}`
    nodes.push({ id: dId, label: 'Department', name: d.name, code: d.code, description: d.description })
    link('HAS_DEPARTMENT', ORGANIZATION_NODE_ID, dId)
    for (const j of d.jobPositions) {
      const jId = `job:${j.code}`
      nodes.push({ id: jId, label: 'JobPosition', name: j.name, code: j.code, description: null })
      link('HAS_JOB_POSITION', dId, jId)
      for (const r of j.targetRoles) {
        const rId = `role:${r.code}`
        nodes.push({ id: rId, label: 'TargetRole', name: r.name, code: r.code, description: r.scope })
        link('HAS_ROLE', jId, rId)
        for (const l of r.levels) {
          const lId = levelKey(l.name)
          if (!levels.has(lId)) {
            levels.add(lId)
            nodes.push({ id: lId, label: 'Level', name: l.name.trim(), code: null, description: null })
          }
          link('HAS_LEVEL', rId, lId)
        }
      }
    }
  }
  return { version: 'import', nodes, edges }
}
