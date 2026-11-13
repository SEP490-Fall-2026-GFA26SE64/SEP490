import type { KnowledgeNode } from '../baseline-assessment/knowledgeMap'
import { knowledgeKey } from '../baseline-assessment/masteryJourney'
import type { OverviewPair } from './roleOverviewData'

export type ProfileState = 'recognized' | 'waiting' | 'failed' | 'unassessed' | 'unknown'
export type OverviewFilter = 'all' | 'pass' | 'not_pass' | 'pending'
export function overviewSkillFilter(skill: ProfileSkill, skills: ProfileSkill[]): Exclude<OverviewFilter, 'all'> {
  const own = skill.levels.filter(level => level.required)
  const target = skills.filter(other => other.id === skill.id).flatMap(other => other.levels.filter(level => level.required))
  if (own.length && target.length && target.every(level => level.state === 'recognized')) return 'pass'
  const levels = own.length ? own : skill.levels
  return levels.some(level => level.state === 'failed') ? 'not_pass' : 'pending'
}
export interface ProfileLevel {
  key: string
  knowledgeLevel: string
  state: ProfileState
  required: boolean
  record?: KnowledgeNode
  pair?: OverviewPair
}
export interface ProfileSkill {
  key: string
  id: string
  name: string
  version: string | null
  levels: ProfileLevel[]
}
export const profileStateLabels: Record<ProfileState, [string, string]> = {
  recognized: ['Recognized', 'Đã công nhận'],
  waiting: ['Awaiting conditions', 'Chờ điều kiện'],
  failed: ['Assessed · not passed', 'Đánh giá chưa đạt'],
  unassessed: ['Not assessed', 'Chưa đánh giá'],
  unknown: ['Data incomplete', 'Chưa đủ dữ liệu'],
}

/** Recognition of target requirements comes only from the authoritative overview projection.
 * History is joined at the exact skill/level/version; absence is conclusive only after all pages load.
 */
export function buildOverviewProfile(pairs: OverviewPair[], records: KnowledgeNode[], historyComplete: boolean): ProfileSkill[] {
  const skills = new Map<string, ProfileSkill>()
  const byKey = new Map(records.map(record => [record.key, record]))
  const cluster = (id: string, name: string, version: string | null) => {
    const key = JSON.stringify([id, version])
    let skill = skills.get(key)
    if (!skill) { skill = { key, id, name, version, levels: [] }; skills.set(key, skill) }
    return skill
  }
  const assessmentState = (record?: KnowledgeNode): ProfileState => record?.latestAssessment
    ? record.latestAssessment.passed && !record.latestAssessment.vetoTriggered ? 'waiting' : 'failed'
    : historyComplete ? 'unassessed' : 'unknown'
  for (const pair of pairs) {
    const r = pair.requirement, key = knowledgeKey(r.skillId, r.skillVersion, r.knowledgeLevel)
    const record = r.skillVersion === null ? undefined : byKey.get(key)
    const assessed = assessmentState(record)
    const state: ProfileState = pair.status === 'achieved' ? 'recognized'
      : r.skillVersion === null ? 'unknown'
      : assessed === 'failed' ? 'failed'
      : pair.status === 'waiting' || pair.status === 'baseline' ? 'waiting' : assessed
    cluster(r.skillId, r.skillName, r.skillVersion).levels.push({ key, knowledgeLevel: r.knowledgeLevel, state, required: true, pair, record })
  }
  for (const record of records) {
    const skill = cluster(record.skillId, record.skillName, record.skillVersion)
    if (skill.levels.some(level => level.key === record.key)) continue
    skill.levels.push({ key: record.key, knowledgeLevel: record.knowledgeLevel, required: false, record,
      state: record.evidence.length ? 'recognized' : historyComplete ? assessmentState(record) : 'unknown' })
  }
  const order = ['FOUNDATION', 'INTERMEDIATE', 'ADVANCED']
  for (const skill of skills.values()) skill.levels.sort((a, b) => order.indexOf(a.knowledgeLevel) - order.indexOf(b.knowledgeLevel))
  return [...skills.values()]
}

export function skillProfileState(skill: ProfileSkill): ProfileState {
  const required = skill.levels.filter(level => level.required)
  const levels = required.length ? required : skill.levels
  return (['failed', 'waiting', 'unknown', 'unassessed'] as const).find(state => levels.some(level => level.state === state)) ?? 'recognized'
}

/** Complete skills are counted by skill id across all required versions, never by assessment score. */
export function completeTargetSkills(pairs: OverviewPair[]) {
  const ids = [...new Set(pairs.map(pair => pair.requirement.skillId))]
  return { total: ids.length, complete: ids.filter(id => pairs.filter(pair => pair.requirement.skillId === id).every(pair => pair.status === 'achieved')).length }
}
