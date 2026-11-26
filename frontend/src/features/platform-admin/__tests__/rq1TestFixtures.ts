import fs from 'node:fs'
import path from 'node:path'
import type { Rq1CatalogStore, Rq1ExpertEvaluationRecord, Rq1ProfilePathwayResult } from '../rq1BenchmarkEngine'

const root = path.resolve(__dirname, '../../../../..')
export function loadRq1TestCatalog(): Rq1CatalogStore {
  const read = (name: string) => JSON.parse(fs.readFileSync(path.join(root, 'documents/research/data/rq1/application-developer-v0.1', `${name}.json`), 'utf8'))
  return { role: read('role'), skills: read('skills'), modules: read('modules'), bindings: read('teaching-bindings'), requirements: read('requirements'), prerequisites: read('prerequisites') }
}

// Isolated software-test labels. Never export these as human research judgments.
export function testExpertRecords(results: Rq1ProfilePathwayResult[]): Rq1ExpertEvaluationRecord[] {
  return results.map(result => ({
    profileId: result.profileId, inputProfile: structuredClone(result.inputProfile), catalogStamp: result.catalogStamp,
    evaluationSource: 'HUMAN_EXPERT', reviewerNote: 'TEST DOUBLE ONLY — not a research annotation',
    grade2ModuleIds: [result.candidateModuleIds[0]], grade1ModuleIds: [], grade0ModuleIds: result.candidateModuleIds.slice(1),
  }))
}
