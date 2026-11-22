import { request } from './initialPathway'
import type { CertificateDefinition } from './certificates'
import type { KnowledgeLevel } from './requirementPathway'
export interface CertificateInput { skillId: string; knowledgeLevel: KnowledgeLevel; name: string; description: string; referenceUrl: string; expectedSkillVersion: string; replacesDefinitionId: string | null }
export interface CertificateDraft { id: string; revision: number; state: string; input: CertificateInput; skillName: string; authorId: string; reviewerId: string | null; reason: string; definitionId: string | null; updatedAt: string }
export interface CertificateSkill { skillId: string; skillCode: string; skillName: string; version: string; levels: KnowledgeLevel[] }
export interface CertificateDirectory { drafts: CertificateDraft[]; published: CertificateDefinition[]; skills: CertificateSkill[]; manager: boolean; experts: { id: string; name: string }[] }
export interface CertificateImportRow { row: number; alreadyExists: boolean; input: CertificateInput | null; skillName: string; error: string | null; existing: CertificateDefinition | null; openDraft: CertificateDraft | null }
function directory(v: unknown): CertificateDirectory {
  if (!v || typeof v !== 'object' || !('drafts' in v) || !Array.isArray(v.drafts) || !('published' in v) || !Array.isArray(v.published) || !('skills' in v) || !Array.isArray(v.skills) || !('manager' in v) || typeof v.manager !== 'boolean' || !('experts' in v) || !Array.isArray(v.experts)) throw Error('Invalid certificate directory')
  return v as CertificateDirectory
}
export const certificateDirectory = (manager: boolean, signal?: AbortSignal) => request(`${manager ? 'ld-manager' : 'expert'}/certificate-definitions`, directory, { signal })
export const certificatePreview = (file: File) => { const form = new FormData(); form.set('file', file); return request('expert/certificate-definitions/preview', v => { if (!Array.isArray(v) || v.length > 500) throw Error(); return v as CertificateImportRow[] }, { method: 'POST', body: form }) }
const post = <T>(path: string, body: unknown, key?: string) => request(path, v => v as T, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) }, body: JSON.stringify(body) })
export const submitCertificates = (rows: CertificateInput[], key: string) => post<string[]>('expert/certificate-definitions/submit', rows.map(input => ({ input, draftId: null, draftRevision: null })), key)
export const markCertificateViewed = (d: CertificateDraft) => post<CertificateDraft>(`ld-manager/certificate-definitions/${encodeURIComponent(d.id)}/viewed`, { revision: d.revision })
export const decideCertificates = (rows: { id: string; revision: number; decision: 'APPROVE' | 'REJECT'; reason: string }[]) => post<CertificateDraft[]>('ld-manager/certificate-definitions/decisions', rows)
export const resubmitCertificate = (d: CertificateDraft) => post<CertificateDraft>(`expert/certificate-definitions/${encodeURIComponent(d.id)}/submit`, { revision: d.revision })
export const editCertificate = (d: CertificateDraft, input: CertificateInput) => request(`expert/certificate-definitions/${encodeURIComponent(d.id)}`, v => v as CertificateDraft, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: d.revision, input }) })

export const submitCertificateImport = (rows: CertificateImportRow[], key: string) => post<string[]>('expert/certificate-definitions/submit', rows.map(r => ({ input: r.input, draftId: r.openDraft?.id ?? null, draftRevision: r.openDraft?.revision ?? null })), key)
