import type { Rq1CatalogStore, Rq1InputProfile, Rq1SkillLevelRef, KnowledgeLevel } from './rq1BenchmarkEngine'

export function parseJsonRecords(content: string): Record<string, unknown>[] {
  const text = content.trim()
  if (!text) throw new Error('File JSON/JSONL đang trống.')
  let parsed: unknown
  try { parsed = JSON.parse(text) } catch {
    parsed = text.split(/\r?\n/).filter(line => line.trim()).map(line => JSON.parse(line))
  }
  const rows: unknown[] = Array.isArray(parsed) ? parsed : [parsed]
  if (!rows.length || rows.some(row => !row || typeof row !== 'object' || Array.isArray(row))) {
    throw new Error('File JSON/JSONL phải chứa các record đối tượng hợp lệ.')
  }
  return rows as Record<string, unknown>[]
}

export function requirementKey(ref: Rq1SkillLevelRef): string {
  return `${ref.skillId}|${ref.knowledgeLevel}|${ref.skillVersion}`
}

export function profileSnapshot(profile: Rq1InputProfile): string {
  const sorted = <T extends Rq1SkillLevelRef>(items: T[]) => [...items].sort((a, b) => requirementKey(a).localeCompare(requirementKey(b)))
  return JSON.stringify({
    profileId: profile.profileId, roleLevel: profile.roleLevel, catalogVersion: profile.catalogVersion,
    gapBand: profile.gapBand, evidenceHistoryStratum: profile.evidenceHistoryStratum,
    officialEvidence: sorted(profile.officialEvidence), baselineObservations: sorted(profile.baselineObservations),
  })
}

// Content stamp for reproducibility, not an authentication/signature mechanism.
export function catalogStamp(catalog: Rq1CatalogStore): string {
  const stable = (value: unknown): string => {
    if (Array.isArray(value)) return `[${value.map(stable).sort().join(',')}]`
    if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(',')}}`
    return JSON.stringify(value) ?? 'null'
  }
  let a = 2166136261, b = 2246822507
  for (const char of stable(catalog)) {
    a = Math.imul(a ^ char.charCodeAt(0), 16777619)
    b = Math.imul(b ^ char.charCodeAt(0), 3266489909)
  }
  return `${catalog.role.version}:${(a >>> 0).toString(16).padStart(8, '0')}${(b >>> 0).toString(16).padStart(8, '0')}`
}

export function normalizeProfile(obj: Record<string, unknown>, catalog: Rq1CatalogStore): Rq1InputProfile {
  const profileId = String(obj.profileId ?? '').trim()
  const fail = (message: string): never => { throw new Error(`${profileId || 'Hồ sơ'}: ${message}`) }
  if (!profileId.startsWith('SYN-')) fail('Profile ID không hợp lệ.')
  const roleLevel = obj.roleLevel
  if (roleLevel !== 'Junior' && roleLevel !== 'Middle' && roleLevel !== 'Senior') return fail('Role Level không hợp lệ.')
  if (obj.catalogVersion !== catalog.role.version) fail('Phiên bản catalog thiếu hoặc không khớp.')
  if (!Array.isArray(obj.officialEvidence) || !Array.isArray(obj.baselineObservations)) fail('Thiếu bằng chứng hoặc kết quả baseline.')
  const parseRefs = (raw: unknown[], baseline: boolean) => {
    const seen = new Set<string>()
    return raw.map(value => {
      if (!value || typeof value !== 'object') return fail('Bằng chứng không hợp lệ.')
      const row = value as Record<string, unknown>
      const skill = catalog.skills.find(s => s.id === row.skillId)
      if (!skill || row.skillVersion !== skill.version || row.compatible === false) fail('Bằng chứng không tương thích phiên bản kỹ năng.')
      if (!['FOUNDATION', 'INTERMEDIATE', 'ADVANCED'].includes(String(row.knowledgeLevel))) fail('Knowledge level không hợp lệ.')
      const ref = { skillId: String(row.skillId), knowledgeLevel: row.knowledgeLevel as KnowledgeLevel, skillVersion: String(row.skillVersion) }
      const key = requirementKey(ref)
      if (seen.has(key)) fail('Bằng chứng trùng hoặc mâu thuẫn.')
      seen.add(key)
      if (baseline && row.outcome !== 'PASSED' && row.outcome !== 'FAILED') fail('Baseline phải là PASSED hoặc FAILED.')
      return { ...ref, ...(baseline ? { outcome: row.outcome as 'PASSED' | 'FAILED' } : {}) }
    })
  }
  const officialEvidence = parseRefs(obj.officialEvidence as unknown[], false).map(({ skillId, knowledgeLevel, skillVersion }) => ({ skillId, knowledgeLevel, skillVersion }))
  const baselineObservations = parseRefs(obj.baselineObservations as unknown[], true).map(ref => ({ ...ref, outcome: ref.outcome! }))
  const target = catalog.requirements.filter(r => r.roleLevel === roleLevel).flatMap(r => r.requiredKnowledgeLevels.map(knowledgeLevel => ({ skillId: r.skillId, skillVersion: r.skillVersion, knowledgeLevel })))
  const targets = new Set(target.map(requirementKey))
  const official = new Set(officialEvidence.map(requirementKey))
  const baseline = new Map(baselineObservations.map(b => [requirementKey(b), b.outcome]))
  if ([...official, ...baseline.keys()].some(key => !targets.has(key))) fail('Bằng chứng ngoài yêu cầu role đang chọn.')
  if ([...official].some(key => baseline.has(key))) fail('Nhóm có cả bằng chứng chính thức và baseline; cần giải quyết mâu thuẫn.')
  const requirementStates = target.map(ref => {
    const key = requirementKey(ref)
    if (!official.has(key) && !baseline.has(key)) fail(`Chưa đủ baseline cho ${key}.`)
    const state = official.has(key) ? 'OFFICIALLY_ACHIEVED' : baseline.get(key) === 'PASSED' ? 'BASELINE_EXEMPT' : 'NEEDS_LEARNING'
    return { ...ref, state } as Rq1InputProfile['requirementStates'][number]
  })
  const learningNeeds = requirementStates.filter(r => r.state === 'NEEDS_LEARNING').map(({ skillId, skillVersion, knowledgeLevel }) => ({ skillId, skillVersion, knowledgeLevel }))
  const gapCount = learningNeeds.length
  const gapBand = gapCount <= 2 ? 'LOW' : gapCount <= 5 ? 'MEDIUM' : 'HIGH'
  if (obj.gapBand !== undefined && obj.gapBand !== gapBand) fail('Gap Band không khớp baseline.')
  if (obj.gapCount !== undefined && obj.gapCount !== gapCount) fail('Gap Count không khớp baseline.')
  return { profileId, roleLevel, catalogVersion: catalog.role.version, gapBand, gapCount, evidenceHistoryStratum: String(obj.evidenceHistoryStratum ?? 'UNSPECIFIED'), officialEvidence, baselineObservations, learningNeeds, requirementStates }
}
