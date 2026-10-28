export interface ModuleActor { id: string; organizationId: string; roles: string[] }
export interface CatalogChoice { id: string; name: string }
export interface ModuleMetadata { id: string; version: string; status: string; reviewStatus: string; reviewedBy: string | null; reviewedAt: string | null }
export interface TeachingInput { skillId: string; teachingFocus: 'PRIMARY' | 'SUPPORTING' | 'INCIDENTAL'; difficultyLevel: 'LOW' | 'MEDIUM' | 'HIGH' }
export interface ModuleTeaching extends TeachingInput { metadata: ModuleMetadata; skillName: string }
export interface ModuleContent { id: string; title: string; markdown: string; contentType: string; contentVersion: string; occupationIds: string[]; createdBy: string | null; createdAt: string }
export interface ModulePackage { metadata: ModuleMetadata; title: string; moduleType: string; contentUri: string; contentType: string; contentVersion: string; duration: number; price: number; teachings: ModuleTeaching[]; content: ModuleContent }
export interface ModuleRevision { number: number; state: string; payload: ModulePackage; editedBy: string; editedAt: string; decidedBy: string | null; decidedAt: string | null; feedback: string | null }
export interface ModuleEvent { sequence: number; revision: number; action: string; actorId: string; occurredAt: string; detail: string | null }
export interface ModuleDocument { id: string; organizationId: string; occupationIds: string[]; createdBy: string | null; createdAt: string; lockVersion: number; everReleased: boolean; archived: boolean; releasedRevision: number | null; revisions: ModuleRevision[]; history: ModuleEvent[]; intake?: ModuleIntake | null }
export interface ModuleSave { title: string; moduleType: string; contentId: string; duration: number; price: number; occupationIds: string[]; teachings: TeachingInput[] }
export interface ModulePage { items: ModuleDocument[]; total: number; page: number; pageSize: number }
export type CatalogMetadata = { [Key in keyof ModuleMetadata]: ModuleMetadata[Key] | null }
export interface CatalogTeaching { metadata: CatalogMetadata; skillId: string; skillName: string | null; teachingFocus: string | null; difficultyLevel: string | null }
export interface CatalogModule { metadata: CatalogMetadata & { id: string }; title: string | null; moduleType: string | null; contentUri: string | null; contentType: string | null; contentVersion: string | null; duration: number | null; price: number | null; teachings: CatalogTeaching[] }
export interface ModuleCatalogItem { module: CatalogModule; authoring: ModuleDocument | null; intake?: ModuleIntake | null }
export interface ModuleIntake { moduleId: string; organizationId: string; occupationIds: string[]; assignedBy: string; assignedAt: string; source: CatalogModule; acceptedBy: string | null; acceptedAt: string | null; history: ModuleEvent[] }
export interface ModuleCatalogPage { items: ModuleCatalogItem[]; total: number; page: number; pageSize: number }
export interface OccupationGrant { expertId: string; occupationId: string }

export async function moduleRequest<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/v1/module-management${path}`, {
    method, signal, credentials: 'same-origin', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) {
    const error: unknown = await response.json().catch(() => null)
    const message = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : `Request failed (${response.status})`
    throw new Error(response.status === 401 ? 'Your session has expired. Please sign in from the main login page.' : message)
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>
}
