import * as XLSX from 'xlsx'
import { normalizeProfile, profileSnapshot, requirementKey, catalogStamp, parseJsonRecords } from './rq1InputValidation'
export { parseExpertEvaluationsFromText, parseExpertEvaluationsFromExcelBuffer, exportRq1ExpertTemplate } from './rq1ExpertInput'

export type KnowledgeLevel = 'FOUNDATION' | 'INTERMEDIATE' | 'ADVANCED'
export type RoleLevelName = 'Junior' | 'Middle' | 'Senior'
export type GapBand = 'LOW' | 'MEDIUM' | 'HIGH'
export type RequirementStateKind = 'OFFICIALLY_ACHIEVED' | 'BASELINE_EXEMPT' | 'NEEDS_LEARNING'

export interface Rq1OutcomeItem {
  code: string
  text: string
}

export interface Rq1Skill {
  id: string
  version: string
  name: string
  definition: string
  researchFocus: string
  competencyGroup: string
  provisionMode: string
  knowledgeOutcomes: Record<KnowledgeLevel, Rq1OutcomeItem[]>
  excludedScope: string
  sourceIds: string[]
}

export interface Rq1Module {
  id: string
  revision: number
  contentVersion: string
  organizationId: string
  title: string
  description: string
  knowledgeLevel: KnowledgeLevel
  learningOutcomes: string[]
  includedScope: string
  excludedScope: string
  scenarioFocus: string
}

export interface Rq1TeachingBinding {
  moduleId: string
  skillId: string
  skillVersion: string
  knowledgeLevel: KnowledgeLevel
  outcomeCodes: string[]
  mappingRationale: string
}

export interface Rq1RequirementRow {
  id: string
  roleId: string
  roleLevel: RoleLevelName
  skillId: string
  skillVersion: string
  requiredKnowledgeLevels: KnowledgeLevel[]
  mandatory: boolean
  rationale: string
}

export interface Rq1PrerequisiteEdge {
  id: string
  dependentSkillId: string
  dependentKnowledgeLevel: KnowledgeLevel
  prerequisiteSkillId: string
  prerequisiteKnowledgeLevel: KnowledgeLevel
  skillVersion: string
  relationType: string
  rationale: string
  applyToInitialGapExpansion: boolean
}

export interface Rq1RoleMetadata {
  id: string
  name: string
  researchSpecialization: string
  version: string
  levels: Array<{ name: RoleLevelName; ordinal: number; scope: string }>
  knowledgeSemantics: string
}

export interface Rq1CatalogStore {
  role: Rq1RoleMetadata
  skills: Rq1Skill[]
  modules: Rq1Module[]
  bindings: Rq1TeachingBinding[]
  requirements: Rq1RequirementRow[]
  prerequisites: Rq1PrerequisiteEdge[]
}

export interface Rq1SkillLevelRef {
  skillId: string
  knowledgeLevel: KnowledgeLevel
  skillVersion?: string
}

export interface Rq1BaselineObservation extends Rq1SkillLevelRef {
  outcome: 'PASSED' | 'FAILED'
}

export interface Rq1RequirementState extends Rq1SkillLevelRef {
  state: RequirementStateKind
}

export interface Rq1InputProfile {
  catalogVersion: string
  profileId: string
  roleLevel: RoleLevelName
  gapBand: GapBand
  gapCount: number
  evidenceHistoryStratum: string
  officialEvidence: Rq1SkillLevelRef[]
  baselineObservations: Rq1BaselineObservation[]
  learningNeeds: Rq1SkillLevelRef[]
  requirementStates: Rq1RequirementState[]
}

export interface Rq1PathwayStep {
  stepNumber: number
  skillId: string
  skillName: string
  competencyGroup: string
  knowledgeLevel: KnowledgeLevel
  targetOutcomes: Rq1OutcomeItem[]
  prerequisiteSkillIds: string[]
  matchedModules: Rq1Module[]
}

export interface Rq1RankedModuleItem {
  rank: number
  moduleId: string
  title: string
  skillId: string
  skillName: string
  knowledgeLevel: KnowledgeLevel
  scenarioFocus: string
  learningOutcomes: string[]
  score: number
  exactGraphMatch: boolean
  sameSkillWrongLevel: boolean
  diagnosticNoteVi: string
  diagnosticNoteEn: string
  expertGrade?: 0 | 1 | 2 | null
}

export interface Rq1ProfilePathwayResult {
  inputProfile: Rq1InputProfile
  catalogStamp: string
  candidateModuleIds: string[]
  profileId: string
  roleLevel: RoleLevelName
  gapBand: GapBand
  gapCount: number
  evidenceHistoryStratum: string
  totalTargetRequirements: number
  officiallyAchievedCount: number
  baselineExemptCount: number
  needsLearningCount: number
  pathwaySteps: Rq1PathwayStep[]
  allGraphMatchedModules: Rq1Module[]
  g0Top5: Rq1RankedModuleItem[]
  c0Top5: Rq1RankedModuleItem[]
}

export interface Rq1ExpertEvaluationRecord {
  inputProfile: Rq1InputProfile
  catalogStamp: string
  grade0ModuleIds: string[]
  evaluationSource: string
  profileId: string
  grade2ModuleIds: string[]
  grade1ModuleIds: string[]
  preferredTop5?: string[]
  reviewerNote?: string
}

export interface Rq1MethodMetrics {
  hitAt5: number
  precisionAt5: number
  recallAt5: number
  ndcgAt5: number
  grade2HitsInTop5: number
  grade1HitsInTop5: number
}

export interface Rq1ProfileComparisonResult {
  profile: Rq1ProfilePathwayResult
  expertGrade2ModuleIds: string[]
  expertGrade1ModuleIds: string[]
  g0Metrics: Rq1MethodMetrics
  c0Metrics: Rq1MethodMetrics
  g0Top5Labeled: Rq1RankedModuleItem[]
  c0Top5Labeled: Rq1RankedModuleItem[]
  outcome: 'GRAPH_WIN' | 'TIE' | 'CBF_WIN'
}

export interface Rq1StratumComparisonRow {
  stratumKey: string
  stratumLabel: string
  profileCount: number
  g0HitRateAt5: number
  c0HitRateAt5: number
  g0PrecisionAt5: number
  c0PrecisionAt5: number
  g0RecallAt5: number
  c0RecallAt5: number
  g0NdcgAt5: number
  c0NdcgAt5: number
  graphWins: number
  ties: number
  cbfWins: number
}

export interface Rq1FullEvaluationSummary {
  isDemo?: boolean
  evaluatedProfileCount: number
  g0MeanHitRateAt5: number
  c0MeanHitRateAt5: number
  deltaHitRateAt5: number
  g0MeanPrecisionAt5: number
  c0MeanPrecisionAt5: number
  deltaPrecisionAt5: number
  g0MeanRecallAt5: number
  c0MeanRecallAt5: number
  deltaRecallAt5: number
  g0MeanNdcgAt5: number
  c0MeanNdcgAt5: number
  deltaNdcgAt5: number
  graphWins: number
  ties: number
  cbfWins: number
  byRoleLevel: Rq1StratumComparisonRow[]
  byGapBand: Rq1StratumComparisonRow[]
  profileComparisons: Rq1ProfileComparisonResult[]
}

const RQ1_SEED = '20261123'

const ENGLISH_STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'in',
  'into', 'is', 'it', 'its', 'of', 'on', 'or', 'that', 'the', 'their', 'this',
  'to', 'under', 'using', 'with', 'within', 'without', 'through', 'case',
  'synthetic', 'module', 'specification', 'concerns', 'addresses', 'introduces',
  'concepts', 'interpretation', 'bounded', 'example', 'stated', 'workflow',
])

export function deterministicTieHash(seed: string, profileId: string, moduleId: string): number {
  const input = `${seed}:${profileId}:${moduleId}`
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i)
    h1 ^= ch
    h1 = Math.imul(h1, 0x01000193)
    h2 ^= ch
    h2 = Math.imul(h2, 0x85ebca6b)
  }
  return ((h1 >>> 0) * 4294967296 + (h2 >>> 0))
}

export async function fetchBuiltInRq1Catalog(): Promise<Rq1CatalogStore> {
  const [roleRes, skillsRes, modulesRes, bindingsRes, reqsRes, prereqsRes] = await Promise.all([
    fetch('/fixtures/rq1-catalog/role.json'),
    fetch('/fixtures/rq1-catalog/skills.json'),
    fetch('/fixtures/rq1-catalog/modules.json'),
    fetch('/fixtures/rq1-catalog/teaching-bindings.json'),
    fetch('/fixtures/rq1-catalog/requirements.json'),
    fetch('/fixtures/rq1-catalog/prerequisites.json'),
  ])

  if (!roleRes.ok || !skillsRes.ok || !modulesRes.ok || !bindingsRes.ok || !reqsRes.ok || !prereqsRes.ok) {
    throw new Error('Không thể tải kho dữ liệu Catalog RQ1 (20 Skills & 72 Modules) từ hệ thống.')
  }

  const [role, skills, modules, bindings, requirements, prerequisites] = await Promise.all([
    roleRes.json() as Promise<Rq1RoleMetadata>,
    skillsRes.json() as Promise<Rq1Skill[]>,
    modulesRes.json() as Promise<Rq1Module[]>,
    bindingsRes.json() as Promise<Rq1TeachingBinding[]>,
    reqsRes.json() as Promise<Rq1RequirementRow[]>,
    prereqsRes.json() as Promise<Rq1PrerequisiteEdge[]>,
  ])

  return { role, skills, modules, bindings, requirements, prerequisites }
}

function buildInputProfileFromRawObject(obj: Record<string, unknown>, catalog: Rq1CatalogStore): Rq1InputProfile | null {
  const id = String(obj.profileId ?? obj['Profile ID'] ?? '').trim()
  if (!id) return null
  const snapshot = obj['Profile JSON Snapshot'] ?? obj.profileJsonSnapshot
  const raw = typeof snapshot === 'string' && snapshot.trim() ? JSON.parse(snapshot) : obj
  if (raw.profileId !== id) throw new Error('Profile ID không khớp Profile JSON Snapshot.')
  return normalizeProfile(raw, catalog)
}

function validateProfileIds(profiles: Rq1InputProfile[]): Rq1InputProfile[] {
  if (new Set(profiles.map(p => p.profileId)).size !== profiles.length) throw new Error('Profile ID bị trùng trong file.')
  return profiles
}

export function parseProfilesFromText(content: string, catalog: Rq1CatalogStore): Rq1InputProfile[] {
  const rawObjects = parseJsonRecords(content)

  const profiles: Rq1InputProfile[] = []
  for (const obj of rawObjects) {
    const p = buildInputProfileFromRawObject(obj, catalog)
    if (!p) throw new Error('Có record thiếu Profile ID trong file JSON/JSONL.')
    profiles.push(p)
  }

  if (profiles.length === 0) {
    throw new Error('Không tìm thấy hồ sơ người học hợp lệ (SYN-...) trong file JSON/JSONL.')
  }
  return validateProfileIds(profiles)
}

export function parseProfilesFromExcelBuffer(buffer: ArrayBuffer, catalog: Rq1CatalogStore): Rq1InputProfile[] {
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' })
  // Prefer sheet containing "Golden" or "Profiles", otherwise inspect all sheets
  const candidateSheets = [...wb.SheetNames].sort((a, b) => {
    const score = (name: string) =>
      name.includes('Golden_50_Baseline_Profiles')
        ? 0
        : name.includes('05_Golden_Set_50_Profiles')
          ? 1
          : name.toLowerCase().includes('golden')
            ? 2
            : name.toLowerCase().includes('profile')
              ? 3
              : 4
    return score(a) - score(b)
  })

  for (const sheetName of candidateSheets) {
    const ws = wb.Sheets[sheetName]
    if (!ws) continue
    // Find the header row containing "Profile ID"
    const rows2d = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })
    let headerRowIdx = -1
    for (let r = 0; r < Math.min(10, rows2d.length); r++) {
      const row = rows2d[r]
      if (Array.isArray(row) && row.some((c) => String(c).trim() === 'Profile ID')) {
        headerRowIdx = r
        break
      }
    }
    if (headerRowIdx === -1) continue

    const headers = (rows2d[headerRowIdx] as unknown[]).map((h) => String(h).trim())
    const profiles: Rq1InputProfile[] = []

    for (let r = headerRowIdx + 1; r < rows2d.length; r++) {
      const row = rows2d[r] as unknown[]
      if (!Array.isArray(row)) continue
      const obj: Record<string, unknown> = {}
      headers.forEach((h, idx) => {
        if (h) obj[h] = row[idx] ?? ''
      })
      const p = buildInputProfileFromRawObject(obj, catalog)
      if (p) profiles.push(p)
    }

    if (profiles.length > 0) {
      return validateProfileIds(profiles)
    }
  }

  throw new Error('Không tìm thấy bảng dữ liệu Hồ sơ (cột "Profile ID") trong file Excel tải lên.')
}

// ============================================================================
// TF-IDF Content-Based Filtering (C0) + Structured Graph Matching (G0)
// ============================================================================

function tokenizeEnglishText(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !ENGLISH_STOPWORDS.has(w) && !w.startsWith('rqm') && !w.startsWith('ms'))

  const tokens: string[] = [...words]
  for (let i = 0; i < words.length - 1; i++) {
    tokens.push(`${words[i]}_${words[i + 1]}`)
  }
  return tokens
}

interface TfIdfModel {
  idf: Map<string, number>
  moduleVectors: Map<string, Map<string, number>>
}

function buildTfIdfModel(modules: Rq1Module[]): TfIdfModel {
  const docCount = modules.length
  const df = new Map<string, number>()
  const rawModuleTokens = new Map<string, string[]>()

  for (const m of modules) {
    // Protocol C0 rule: use module title, description, learningOutcomes, and knowledgeLevel only.
    const text = [m.title, m.description, m.learningOutcomes.join(' '), m.knowledgeLevel].join(' ')
    const tokens = tokenizeEnglishText(text)
    rawModuleTokens.set(m.id, tokens)
    const unique = new Set(tokens)
    for (const t of unique) {
      df.set(t, (df.get(t) ?? 0) + 1)
    }
  }

  const idf = new Map<string, number>()
  for (const [term, count] of df.entries()) {
    idf.set(term, Math.log((1 + docCount) / (1 + count)) + 1)
  }

  const moduleVectors = new Map<string, Map<string, number>>()
  for (const m of modules) {
    const tokens = rawModuleTokens.get(m.id) ?? []
    moduleVectors.set(m.id, computeL2TfIdfVector(tokens, idf))
  }

  return { idf, moduleVectors }
}

function computeL2TfIdfVector(tokens: string[], idf: Map<string, number>): Map<string, number> {
  const tf = new Map<string, number>()
  for (const t of tokens) {
    if (idf.has(t)) {
      tf.set(t, (tf.get(t) ?? 0) + 1)
    }
  }
  const vec = new Map<string, number>()
  let normSq = 0
  for (const [term, count] of tf.entries()) {
    const weight = count * (idf.get(term) ?? 0)
    vec.set(term, weight)
    normSq += weight * weight
  }
  const norm = Math.sqrt(normSq)
  if (norm > 0) {
    for (const [term, weight] of vec.entries()) {
      vec.set(term, weight / norm)
    }
  }
  return vec
}

function cosineSimilarity(vecA: Map<string, number>, vecB: Map<string, number>): number {
  if (vecA.size === 0 || vecB.size === 0) return 0
  let dot = 0
  const [smaller, larger] = vecA.size <= vecB.size ? [vecA, vecB] : [vecB, vecA]
  for (const [term, wA] of smaller.entries()) {
    const wB = larger.get(term)
    if (wB !== undefined) {
      dot += wA * wB
    }
  }
  return dot
}

function sortNeedsTopologically(
  needs: Rq1SkillLevelRef[],
  prerequisites: Rq1PrerequisiteEdge[]
): { ordered: Rq1SkillLevelRef[]; prereqMap: Map<string, string[]> } {
  const levelOrder: Record<KnowledgeLevel, number> = {
    FOUNDATION: 1,
    INTERMEDIATE: 2,
    ADVANCED: 3,
  }
  const needByKey = new Map<string, Rq1SkillLevelRef>()
  for (const n of needs) {
    needByKey.set(`${n.skillId}|${n.knowledgeLevel}`, n)
  }

  const prereqMap = new Map<string, string[]>()
  const inDegree = new Map<string, number>()
  const adj = new Map<string, string[]>()

  for (const k of needByKey.keys()) {
    inDegree.set(k, 0)
    adj.set(k, [])
    prereqMap.set(k, [])
  }

  for (const edge of prerequisites) {
    const depKey = `${edge.dependentSkillId}|${edge.dependentKnowledgeLevel}`
    const preKey = `${edge.prerequisiteSkillId}|${edge.prerequisiteKnowledgeLevel}`
    const existingPrereqs = prereqMap.get(depKey)
    if (existingPrereqs && !existingPrereqs.includes(preKey)) {
      existingPrereqs.push(preKey)
    }
    if (needByKey.has(depKey) && needByKey.has(preKey)) {
      adj.get(preKey)?.push(depKey)
      inDegree.set(depKey, (inDegree.get(depKey) ?? 0) + 1)
    }
  }

  // Also preserve Foundation -> Intermediate -> Advanced within the same skill
  for (const n1 of needs) {
    for (const n2 of needs) {
      if (n1.skillId === n2.skillId && levelOrder[n1.knowledgeLevel] < levelOrder[n2.knowledgeLevel]) {
        const k1 = `${n1.skillId}|${n1.knowledgeLevel}`
        const k2 = `${n2.skillId}|${n2.knowledgeLevel}`
        if (!adj.get(k1)?.includes(k2)) {
          adj.get(k1)?.push(k2)
          inDegree.set(k2, (inDegree.get(k2) ?? 0) + 1)
        }
      }
    }
  }

  const cmpKey = (a: string, b: string) => {
    const [sa, la] = a.split('|') as [string, KnowledgeLevel]
    const [sb, lb] = b.split('|') as [string, KnowledgeLevel]
    if (levelOrder[la] !== levelOrder[lb]) return levelOrder[la] - levelOrder[lb]
    return sa.localeCompare(sb)
  }

  const queue = [...inDegree.entries()]
    .filter(([, deg]) => deg === 0)
    .map(([k]) => k)
    .sort(cmpKey)

  const ordered: Rq1SkillLevelRef[] = []
  while (queue.length > 0) {
    const curr = queue.shift()!
    const ref = needByKey.get(curr)
    if (ref) ordered.push(ref)
    for (const nxt of adj.get(curr) ?? []) {
      const nextDeg = (inDegree.get(nxt) ?? 1) - 1
      inDegree.set(nxt, nextDeg)
      if (nextDeg === 0) {
        queue.push(nxt)
        queue.sort(cmpKey)
      }
    }
  }

  if (ordered.length < needs.length) {
    for (const [k, ref] of needByKey.entries()) {
      if (!ordered.some((o) => `${o.skillId}|${o.knowledgeLevel}` === k)) {
        ordered.push(ref)
      }
    }
  }

  return { ordered, prereqMap }
}

export function runStep1PathwayAndRanking(
  profiles: Rq1InputProfile[],
  catalog: Rq1CatalogStore
): Rq1ProfilePathwayResult[] {
  const skillById = new Map(catalog.skills.map((s) => [s.id, s]))
  const moduleById = new Map(catalog.modules.map((m) => [m.id, m]))
  const bindingByModuleId = new Map(catalog.bindings.map((b) => [b.moduleId, b]))

  const modulesBySkillLevel = new Map<string, Rq1Module[]>()
  for (const b of catalog.bindings) {
    const key = requirementKey(b)
    const mod = moduleById.get(b.moduleId)
    if (mod) {
      const list = modulesBySkillLevel.get(key) ?? []
      list.push(mod)
      modulesBySkillLevel.set(key, list)
    }
  }

  const tfidfModel = buildTfIdfModel(catalog.modules)
  const stamp = catalogStamp(catalog)

  return profiles.map((p) => {
    const needKeys = new Set(p.learningNeeds.map(requirementKey))
    const needSkillIds = new Set(p.learningNeeds.map((n) => n.skillId))

    const { ordered, prereqMap } = sortNeedsTopologically(p.learningNeeds, catalog.prerequisites)

    const pathwaySteps: Rq1PathwayStep[] = ordered.map((need, idx) => {
      const sk = skillById.get(need.skillId)
      const key = requirementKey(need)
      const matchedModules = modulesBySkillLevel.get(key) ?? []
      const targetOutcomes = sk?.knowledgeOutcomes[need.knowledgeLevel] ?? []
      return {
        stepNumber: idx + 1,
        skillId: need.skillId,
        skillName: sk?.name ?? need.skillId,
        competencyGroup: sk?.competencyGroup ?? 'General',
        knowledgeLevel: need.knowledgeLevel,
        targetOutcomes,
        prerequisiteSkillIds: prereqMap.get(`${need.skillId}|${need.knowledgeLevel}`) ?? [],
        matchedModules,
      }
    })

    const allGraphMatchedModules: Rq1Module[] = []
    for (const step of pathwaySteps) {
      for (const m of step.matchedModules) {
        if (!allGraphMatchedModules.some((x) => x.id === m.id)) {
          allGraphMatchedModules.push(m)
        }
      }
    }

    // 1. G0 (Structured Graph Matching): score 1 if exact (skillId, knowledgeLevel, skillVersion) match, else 0
    const g0Candidates = catalog.modules.map((m) => {
      const b = bindingByModuleId.get(m.id)
      const sk = b ? skillById.get(b.skillId) : undefined
      const key = b ? requirementKey(b) : ''
      const exactMatch = needKeys.has(key)
      const sameSkillWrongLevel = !exactMatch && b !== undefined && needSkillIds.has(b.skillId)
      const score = exactMatch ? 1.0 : 0.0
      return {
        module: m,
        binding: b,
        skill: sk,
        score,
        exactMatch,
        sameSkillWrongLevel,
        tieHash: deterministicTieHash(RQ1_SEED, p.profileId, m.id),
      }
    })

    g0Candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.tieHash - b.tieHash
    })

    const g0Top5: Rq1RankedModuleItem[] = g0Candidates.slice(0, 5).map((item, idx) => ({
      rank: idx + 1,
      moduleId: item.module.id,
      title: item.module.title,
      skillId: item.binding?.skillId ?? '',
      skillName: item.skill?.name ?? '',
      knowledgeLevel: item.module.knowledgeLevel,
      scenarioFocus: item.module.scenarioFocus,
      learningOutcomes: item.module.learningOutcomes,
      score: item.score,
      exactGraphMatch: item.exactMatch,
      sameSkillWrongLevel: item.sameSkillWrongLevel,
      diagnosticNoteVi: item.exactMatch
        ? `Khớp chính xác cạnh đồ thị TEACHES (${item.binding?.skillId} • ${item.module.knowledgeLevel})`
        : 'Điền bổ sung cho đủ Top-5 (hồ sơ có ít hơn 5 module khớp lỗ hổng)',
      diagnosticNoteEn: item.exactMatch
        ? `Exact TEACHES graph binding match (${item.binding?.skillId} • ${item.module.knowledgeLevel})`
        : 'Deterministic tie-break fill-in (fewer than 5 matching modules in catalog)',
    }))

    // 2. C0 (Content-Based Filtering — TF-IDF Cosine Similarity)
    // Average L2-normalized gap vectors from each unmet learning need's skill name, definition & knowledge level
    const avgGapVec = new Map<string, number>()
    for (const need of p.learningNeeds) {
      const sk = skillById.get(need.skillId)
      const gapText = [
        sk?.name ?? '',
        sk?.definition ?? '',
        sk?.researchFocus ?? '',
        need.knowledgeLevel,
      ].join(' ')
      const gapVec = computeL2TfIdfVector(tokenizeEnglishText(gapText), tfidfModel.idf)
      for (const [term, w] of gapVec.entries()) {
        avgGapVec.set(term, (avgGapVec.get(term) ?? 0) + w)
      }
    }
    // L2 normalize the averaged query vector
    let qNormSq = 0
    for (const w of avgGapVec.values()) qNormSq += w * w
    const qNorm = Math.sqrt(qNormSq)
    if (qNorm > 0) {
      for (const [term, w] of avgGapVec.entries()) {
        avgGapVec.set(term, w / qNorm)
      }
    }

    const c0Candidates = catalog.modules.map((m) => {
      const b = bindingByModuleId.get(m.id)
      const sk = b ? skillById.get(b.skillId) : undefined
      const key = b ? requirementKey(b) : ''
      const exactMatch = needKeys.has(key)
      const sameSkillWrongLevel = !exactMatch && b !== undefined && needSkillIds.has(b.skillId)
      const modVec = tfidfModel.moduleVectors.get(m.id) ?? new Map<string, number>()
      const sim = Math.round(cosineSimilarity(avgGapVec, modVec) * 10000) / 10000
      return {
        module: m,
        binding: b,
        skill: sk,
        score: sim,
        exactMatch,
        sameSkillWrongLevel,
        tieHash: deterministicTieHash(RQ1_SEED, p.profileId, m.id),
      }
    })

    c0Candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.tieHash - b.tieHash
    })

    const c0Top5: Rq1RankedModuleItem[] = c0Candidates.slice(0, 5).map((item, idx) => ({
      rank: idx + 1,
      moduleId: item.module.id,
      title: item.module.title,
      skillId: item.binding?.skillId ?? '',
      skillName: item.skill?.name ?? '',
      knowledgeLevel: item.module.knowledgeLevel,
      scenarioFocus: item.module.scenarioFocus,
      learningOutcomes: item.module.learningOutcomes,
      score: item.score,
      exactGraphMatch: item.exactMatch,
      sameSkillWrongLevel: item.sameSkillWrongLevel,
      diagnosticNoteVi: item.exactMatch
        ? `Trùng từ khóa TF-IDF & khớp đúng lỗ hổng (${item.binding?.skillId} • ${item.module.knowledgeLevel})`
        : item.sameSkillWrongLevel
          ? `Đúng kỹ năng ${item.binding?.skillId} nhưng SAI CẤP ĐỘ (${item.module.knowledgeLevel} không nằm trong lỗ hổng)`
          : `Nhiễu từ khóa TF-IDF sang kỹ năng khác (${item.binding?.skillId} không nằm trong lỗ hổng)`,
      diagnosticNoteEn: item.exactMatch
        ? `TF-IDF lexical match & matches target gap (${item.binding?.skillId} • ${item.module.knowledgeLevel})`
        : item.sameSkillWrongLevel
          ? `Same skill ${item.binding?.skillId} but WRONG LEVEL (${item.module.knowledgeLevel} not needed)`
          : `Cross-skill lexical drift (${item.binding?.skillId} is not in profile learning needs)`,
    }))

    const officiallyAchievedCount = p.requirementStates.filter((r) => r.state === 'OFFICIALLY_ACHIEVED').length
    const baselineExemptCount = p.requirementStates.filter((r) => r.state === 'BASELINE_EXEMPT').length

    return {
      inputProfile: structuredClone(p),
      catalogStamp: stamp,
      candidateModuleIds: catalog.modules.map(m => m.id),
      profileId: p.profileId,
      roleLevel: p.roleLevel,
      gapBand: p.gapBand,
      gapCount: p.learningNeeds.length,
      evidenceHistoryStratum: p.evidenceHistoryStratum,
      totalTargetRequirements: p.requirementStates.length,
      officiallyAchievedCount,
      baselineExemptCount,
      needsLearningCount: p.learningNeeds.length,
      pathwaySteps,
      allGraphMatchedModules,
      g0Top5,
      c0Top5,
    }
  })
}

// ============================================================================
// Step 2: Parse Expert Evaluation File & Compute RQ1 Metrics
// ============================================================================

function scoreSingleMethodTop5(
  top5: Rq1RankedModuleItem[],
  grade2Set: Set<string>,
  grade1Set: Set<string>,
  grade0Set: Set<string>
): { metrics: Rq1MethodMetrics; labeledTop5: Rq1RankedModuleItem[] } {
  let grade2Hits = 0
  let grade1Hits = 0
  let dcg = 0

  const labeledTop5 = top5.map((item, idx) => {
    const rank = idx + 1
    if (!grade2Set.has(item.moduleId) && !grade1Set.has(item.moduleId) && !grade0Set.has(item.moduleId)) {
      throw new Error(`Module ${item.moduleId} chưa được chấm; không thể tính điểm.`)
    }
    const grade: 0 | 1 | 2 = grade2Set.has(item.moduleId)
      ? 2
      : grade1Set.has(item.moduleId)
        ? 1
        : 0
    if (grade === 2) grade2Hits++
    if (grade === 1) grade1Hits++
    // RQ1 Protocol Section "Metrics and analysis": Linear gain grade / log2(rank + 1)
    dcg += grade / Math.log2(rank + 1)
    return {
      ...item,
      expertGrade: grade,
    }
  })

  // Compute Ideal DCG@5 from the profile's judged pool (all Grade 2s first, then Grade 1s)
  const idealGrades: number[] = [
    ...Array<number>(grade2Set.size).fill(2),
    ...Array<number>(grade1Set.size).fill(1),
  ].slice(0, 5)

  let idcg = 0
  for (let i = 0; i < idealGrades.length; i++) {
    idcg += idealGrades[i] / Math.log2(i + 2)
  }

  const hitAt5 = grade2Hits > 0 ? 1.0 : 0.0
  const precisionAt5 = grade2Hits / 5.0
  const recallAt5 = grade2Set.size > 0 ? grade2Hits / grade2Set.size : 0.0
  const ndcgAt5 = idcg > 0 ? dcg / idcg : 0.0

  return {
    metrics: {
      hitAt5: Math.round(hitAt5 * 10000) / 10000,
      precisionAt5: Math.round(precisionAt5 * 10000) / 10000,
      recallAt5: Math.round(recallAt5 * 10000) / 10000,
      ndcgAt5: Math.round(ndcgAt5 * 10000) / 10000,
      grade2HitsInTop5: grade2Hits,
      grade1HitsInTop5: grade1Hits,
    },
    labeledTop5,
  }
}

function buildStratumRow(
  stratumKey: string,
  stratumLabel: string,
  items: Rq1ProfileComparisonResult[]
): Rq1StratumComparisonRow {
  const n = items.length || 1
  const mean = (fn: (x: Rq1ProfileComparisonResult) => number) =>
    Math.round((items.reduce((acc, x) => acc + fn(x), 0) / n) * 10000) / 10000

  return {
    stratumKey,
    stratumLabel,
    profileCount: items.length,
    g0HitRateAt5: mean((x) => x.g0Metrics.hitAt5),
    c0HitRateAt5: mean((x) => x.c0Metrics.hitAt5),
    g0PrecisionAt5: mean((x) => x.g0Metrics.precisionAt5),
    c0PrecisionAt5: mean((x) => x.c0Metrics.precisionAt5),
    g0RecallAt5: mean((x) => x.g0Metrics.recallAt5),
    c0RecallAt5: mean((x) => x.c0Metrics.recallAt5),
    g0NdcgAt5: mean((x) => x.g0Metrics.ndcgAt5),
    c0NdcgAt5: mean((x) => x.c0Metrics.ndcgAt5),
    graphWins: items.filter((x) => x.outcome === 'GRAPH_WIN').length,
    ties: items.filter((x) => x.outcome === 'TIE').length,
    cbfWins: items.filter((x) => x.outcome === 'CBF_WIN').length,
  }
}

export function runStep2ExpertComparison(
  pathwayResults: Rq1ProfilePathwayResult[],
  expertMap: Map<string, Rq1ExpertEvaluationRecord>
): Rq1FullEvaluationSummary {
  if (expertMap.size !== pathwayResults.length || pathwayResults.some(p => !expertMap.has(p.profileId))) {
    throw new Error('Hai file phải chứa đúng cùng tập Profile ID; không được thiếu, thừa hoặc trùng hồ sơ.')
  }
  const sources = new Set([...expertMap.values()].map(record => record.evaluationSource))
  if (sources.size !== 1) throw new Error('Không thể trộn nhãn demo và nhãn chuyên gia trong một lượt.')
  const isDemo = sources.has('SIMULATED_DEMO')
  const comparisons: Rq1ProfileComparisonResult[] = []

  for (const profile of pathwayResults) {
    const exp = expertMap.get(profile.profileId)
    if (!exp) throw new Error('Thiếu phiếu chuyên gia.')
    if (!isDemo && exp.evaluationSource !== 'HUMAN_EXPERT') throw new Error('Nhãn minh họa không phải đánh giá chuyên gia độc lập.')
    if (exp.catalogStamp !== profile.catalogStamp || profileSnapshot(exp.inputProfile) !== profileSnapshot(profile.inputProfile)) {
      throw new Error(`${profile.profileId}: Hồ sơ/baseline hoặc catalog của hai file không khớp.`)
    }
    const judged = [...exp.grade0ModuleIds, ...exp.grade1ModuleIds, ...exp.grade2ModuleIds]
    const judgedSet = new Set(judged)
    if (judgedSet.size !== judged.length) throw new Error(`${profile.profileId}: Module bị chấm trùng hoặc mâu thuẫn.`)
    if (judgedSet.size !== profile.candidateModuleIds.length || profile.candidateModuleIds.some(id => !judgedSet.has(id))) {
      throw new Error(`${profile.profileId}: Chưa đủ dữ liệu đánh giá toàn bộ catalog (Grade 0/1/2). Module chưa chấm không được coi là Grade 0.`)
    }
    if (!exp.grade2ModuleIds.length) throw new Error(`${profile.profileId}: Không có module Grade 2. Recall không áp dụng; cần báo cáo riêng ngoài tập positive-query RQ1.`)

    const grade2Set = new Set(exp.grade2ModuleIds)
    const grade1Set = new Set(exp.grade1ModuleIds)

    const grade0Set = new Set(exp.grade0ModuleIds)
    const g0Eval = scoreSingleMethodTop5(profile.g0Top5, grade2Set, grade1Set, grade0Set)
    const c0Eval = scoreSingleMethodTop5(profile.c0Top5, grade2Set, grade1Set, grade0Set)

    const eps = 1e-6
    let outcome: 'GRAPH_WIN' | 'TIE' | 'CBF_WIN' = 'TIE'
    if (g0Eval.metrics.ndcgAt5 - c0Eval.metrics.ndcgAt5 > eps) {
      outcome = 'GRAPH_WIN'
    } else if (c0Eval.metrics.ndcgAt5 - g0Eval.metrics.ndcgAt5 > eps) {
      outcome = 'CBF_WIN'
    } else if (g0Eval.metrics.precisionAt5 - c0Eval.metrics.precisionAt5 > eps) {
      outcome = 'GRAPH_WIN'
    } else if (c0Eval.metrics.precisionAt5 - g0Eval.metrics.precisionAt5 > eps) {
      outcome = 'CBF_WIN'
    }

    comparisons.push({
      profile,
      expertGrade2ModuleIds: exp.grade2ModuleIds,
      expertGrade1ModuleIds: exp.grade1ModuleIds,
      g0Metrics: g0Eval.metrics,
      c0Metrics: c0Eval.metrics,
      g0Top5Labeled: g0Eval.labeledTop5,
      c0Top5Labeled: c0Eval.labeledTop5,
      outcome,
    })
  }

  if (comparisons.length === 0) {
    throw new Error(
      'Không có mã Profile ID nào trong phiếu chấm chuyên gia khớp với danh sách Hồ sơ đã nạp ở Bước 1.'
    )
  }

  const allRow = buildStratumRow('ALL', 'All Evaluated Profiles', comparisons)

  const byRoleLevel: Rq1StratumComparisonRow[] = (['Junior', 'Middle', 'Senior'] as RoleLevelName[]).map(
    (lvl) =>
      buildStratumRow(
        lvl,
        lvl,
        comparisons.filter((c) => c.profile.roleLevel === lvl)
      )
  )

  const byGapBand: Rq1StratumComparisonRow[] = (
    [
      { key: 'LOW', label: 'LOW (1–2 Gaps)' },
      { key: 'MEDIUM', label: 'MEDIUM (3–5 Gaps)' },
      { key: 'HIGH', label: 'HIGH (6–9 Gaps)' },
    ] as Array<{ key: GapBand; label: string }>
  ).map((b) =>
    buildStratumRow(
      b.key,
      b.label,
      comparisons.filter((c) => c.profile.gapBand === b.key)
    )
  )

  return {
    isDemo,
    evaluatedProfileCount: comparisons.length,
    g0MeanHitRateAt5: allRow.g0HitRateAt5,
    c0MeanHitRateAt5: allRow.c0HitRateAt5,
    deltaHitRateAt5: Math.round((allRow.g0HitRateAt5 - allRow.c0HitRateAt5) * 10000) / 10000,
    g0MeanPrecisionAt5: allRow.g0PrecisionAt5,
    c0MeanPrecisionAt5: allRow.c0PrecisionAt5,
    deltaPrecisionAt5: Math.round((allRow.g0PrecisionAt5 - allRow.c0PrecisionAt5) * 10000) / 10000,
    g0MeanRecallAt5: allRow.g0RecallAt5,
    c0MeanRecallAt5: allRow.c0RecallAt5,
    deltaRecallAt5: Math.round((allRow.g0RecallAt5 - allRow.c0RecallAt5) * 10000) / 10000,
    g0MeanNdcgAt5: allRow.g0NdcgAt5,
    c0MeanNdcgAt5: allRow.c0NdcgAt5,
    deltaNdcgAt5: Math.round((allRow.g0NdcgAt5 - allRow.c0NdcgAt5) * 10000) / 10000,
    graphWins: allRow.graphWins,
    ties: allRow.ties,
    cbfWins: allRow.cbfWins,
    byRoleLevel,
    byGapBand,
    profileComparisons: comparisons,
  }
}

export function exportRq1EvaluationToExcel(
  pathwayResults: Rq1ProfilePathwayResult[],
  summary: Rq1FullEvaluationSummary | null
): void {
  const wb = XLSX.utils.book_new()

  if (summary) {
    const summaryRows = [
      {
        Metric: 'Hit Rate@5 (HR@5)',
        'Graph-Traversal (G0)': `${(summary.g0MeanHitRateAt5 * 100).toFixed(1)}%`,
        'Content-Based Filtering (C0)': `${(summary.c0MeanHitRateAt5 * 100).toFixed(1)}%`,
        'Delta (G0 - C0)': `${(summary.deltaHitRateAt5 * 100).toFixed(1)}%`,
      },
      {
        Metric: 'Precision@5',
        'Graph-Traversal (G0)': `${(summary.g0MeanPrecisionAt5 * 100).toFixed(1)}%`,
        'Content-Based Filtering (C0)': `${(summary.c0MeanPrecisionAt5 * 100).toFixed(1)}%`,
        'Delta (G0 - C0)': `${(summary.deltaPrecisionAt5 * 100).toFixed(1)}%`,
      },
      {
        Metric: 'Recall@5',
        'Graph-Traversal (G0)': `${(summary.g0MeanRecallAt5 * 100).toFixed(1)}%`,
        'Content-Based Filtering (C0)': `${(summary.c0MeanRecallAt5 * 100).toFixed(1)}%`,
        'Delta (G0 - C0)': `${(summary.deltaRecallAt5 * 100).toFixed(1)}%`,
      },
      {
        Metric: 'Graded nDCG@5',
        'Graph-Traversal (G0)': `${(summary.g0MeanNdcgAt5 * 100).toFixed(1)}%`,
        'Content-Based Filtering (C0)': `${(summary.c0MeanNdcgAt5 * 100).toFixed(1)}%`,
        'Delta (G0 - C0)': `${(summary.deltaNdcgAt5 * 100).toFixed(1)}%`,
      },
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), '01_RQ1_Summary')

    const detailRows = summary.profileComparisons.map((c, idx) => ({
      STT: idx + 1,
      'Profile ID': c.profile.profileId,
      'Role Level': c.profile.roleLevel,
      'Gap Band': c.profile.gapBand,
      'Gap Count': c.profile.gapCount,
      'Learning Needs': c.profile.pathwaySteps.map((s) => `${s.skillId} (${s.knowledgeLevel})`).join(', '),
      'G0 Top-5 Modules': c.g0Top5Labeled.map((m) => `${m.moduleId} [G${m.expertGrade}]`).join(', '),
      'C0 Top-5 Modules': c.c0Top5Labeled.map((m) => `${m.moduleId} [G${m.expertGrade}]`).join(', '),
      'Expert Grade 2 Modules': c.expertGrade2ModuleIds.join(', '),
      'G0 HR@5': c.g0Metrics.hitAt5,
      'C0 HR@5': c.c0Metrics.hitAt5,
      'G0 Precision@5': c.g0Metrics.precisionAt5,
      'C0 Precision@5': c.c0Metrics.precisionAt5,
      'G0 Recall@5': c.g0Metrics.recallAt5,
      'C0 Recall@5': c.c0Metrics.recallAt5,
      'G0 nDCG@5': c.g0Metrics.ndcgAt5,
      'C0 nDCG@5': c.c0Metrics.ndcgAt5,
      Outcome: c.outcome,
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailRows), '02_50_Profiles_Comparison')
  } else {
    const step1Rows = pathwayResults.map((p, idx) => ({
      STT: idx + 1,
      'Profile ID': p.profileId,
      'Role Level': p.roleLevel,
      'Gap Band': p.gapBand,
      'Gap Count': p.gapCount,
      'Skills To Learn (Pathway Order)': p.pathwaySteps
        .map((s) => `${s.stepNumber}. ${s.skillId} (${s.knowledgeLevel}) - ${s.skillName}`)
        .join(' | '),
      'Graph Pathway Modules': p.allGraphMatchedModules.map((m) => `${m.id} (${m.title})`).join(', '),
      'G0 Top-5 Modules': p.g0Top5.map((m) => `${m.moduleId} (${m.title})`).join(', '),
      'C0 Top-5 Modules': p.c0Top5.map((m) => `${m.moduleId} (${m.title})`).join(', '),
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(step1Rows), '01_Step1_Pathway_Output')
  }

  XLSX.writeFile(wb, 'RQ1_Benchmark_Comparison_Results.xlsx')
}
