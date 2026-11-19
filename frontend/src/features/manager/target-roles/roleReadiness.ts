import type { TargetRoleModel, SkillTargetConfig } from '../data/ldManagerMockData'
import type { LearningModuleDto } from '../../../shared/api/learningModuleApi'
import type { BankQuestion } from '../../../shared/api/questionBankApi'

export interface LevelReadiness {
  level: string
  hasCompetency: boolean
  compCount: number
  hasMicroSkills: boolean
  skillCount: number
  isReady: boolean
}

export interface SkillReadiness {
  skillId: string
  skillName: string
  levelName?: string
  hasModule: boolean
  hasQuestions: boolean
  isReady: boolean
}

export interface RoleReadinessResult {
  levelValidation: LevelReadiness[]
  allLevelsValid: boolean
  skillValidation: SkillReadiness[]
  allSkillsValid: boolean
  isOverallReady: boolean
  missingSummary: string[]
  isBypassed?: boolean
}

export const BYPASS_CONTENT_STORAGE_KEY = 'adapt_learn_graph_bypass_content_readiness'

export function isContentReadinessBypassed(): boolean {
  try {
    return localStorage.getItem(BYPASS_CONTENT_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function setContentReadinessBypassed(bypassed: boolean): void {
  try {
    localStorage.setItem(BYPASS_CONTENT_STORAGE_KEY, String(bypassed))
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('adapt_learn_graph_bypass_readiness_changed', { detail: bypassed })
      )
    }
  } catch {}
}

/**
 * Validates role publication / submission readiness:
 * 1. Every defined career level must have >= 1 competency and >= 1 micro-skill.
 * 2. Every configured micro-skill must be covered by >= 1 learning module and >= 1 question bank item.
 * (Optional bypass flag allows testing role lifecycle without blocking on content).
 */
export function checkRoleReadiness(
  role: TargetRoleModel | null | undefined,
  modules: LearningModuleDto[],
  bankQuestions: BankQuestion[],
  bypassContentCheck?: boolean,
): RoleReadinessResult {
  const isBypassed = bypassContentCheck ?? isContentReadinessBypassed()
  if (!role) {
    return {
      levelValidation: [],
      allLevelsValid: false,
      skillValidation: [],
      allSkillsValid: false,
      isOverallReady: false,
      missingSummary: ['No role provided'],
      isBypassed,
    }
  }

  const detailRoleLevels =
    role.levels && role.levels.length > 0
      ? role.levels
      : ['Senior', 'Middle', 'Junior']

  // 1. Level architecture check
  const levelValidation: LevelReadiness[] = detailRoleLevels.map((lvl, idx) => {
    const compList = (role.levelCompetencies && role.levelCompetencies[lvl]) || []
    const hasCompetency =
      compList.length > 0 || (role.competencyIds && role.competencyIds.length > 0)
    const skillList = (role.skillTargets || []).filter(
      (st) =>
        (st as any).level === lvl ||
        (st as any).levelName === lvl ||
        (st as any).levelNumber === idx + 1,
    )
    const hasMicroSkills = skillList.length > 0
    return {
      level: lvl,
      hasCompetency,
      compCount: compList.length,
      hasMicroSkills,
      skillCount: skillList.length,
      isReady: Boolean(hasCompetency && hasMicroSkills),
    }
  })
  const allLevelsValid =
    levelValidation.length > 0 && levelValidation.every((lv) => lv.isReady)

  // 2. Micro-skill content check (Module + Question Bank)
  const taughtSkillIds = new Set<string>()
  const taughtSkillNames = new Set<string>()
  modules.forEach((m) => {
    m.teachesSkillIds?.forEach((id) => taughtSkillIds.add(id.toLowerCase()))
    m.teachesSkillNames?.forEach((name) => taughtSkillNames.add(name.toLowerCase()))
  })

  const questionSkillIds = new Set<string>()
  bankQuestions.forEach((q) => {
    q.versions?.forEach((v) => {
      if (v.content?.skillId) questionSkillIds.add(v.content.skillId.toLowerCase())
    })
  })

  const distinctSkillTargets = (role.skillTargets || []).reduce<SkillTargetConfig[]>(
    (acc, curr) => {
      if (!acc.some((s) => s.skillId === curr.skillId)) acc.push(curr)
      return acc
    },
    [],
  )

  const skillValidation: SkillReadiness[] = distinctSkillTargets.map((st) => {
    const sId = (st.skillId || '').toLowerCase()
    const sName = (st.skillName || '').toLowerCase()
    const realHasModule = taughtSkillIds.has(sId) || taughtSkillNames.has(sName)
    const realHasQuestions = questionSkillIds.has(sId)
    const hasModule = isBypassed ? true : realHasModule
    const hasQuestions = isBypassed ? true : realHasQuestions
    return {
      skillId: st.skillId,
      skillName: st.skillName || st.skillId,
      levelName: st.level || (st as any).levelName,
      hasModule,
      hasQuestions,
      isReady: hasModule && hasQuestions,
    }
  })
  const allSkillsValid =
    skillValidation.length > 0 && (isBypassed || skillValidation.every((sv) => sv.isReady))

  const isOverallReady = allLevelsValid && allSkillsValid

  const missingSummary: string[] = []
  if (!allLevelsValid) {
    const incompleteLevels = levelValidation
      .filter((lv) => !lv.isReady)
      .map((lv) => {
        const issues: string[] = []
        if (!lv.hasCompetency) issues.push('no competencies')
        if (!lv.hasMicroSkills) issues.push('no micro-skills')
        return `${lv.level} (${issues.join(', ')})`
      })
    missingSummary.push(`Incomplete levels: ${incompleteLevels.join('; ')}`)
  }
  if (!allSkillsValid) {
    if (skillValidation.length === 0) {
      missingSummary.push('No micro-skills configured')
    } else if (!isBypassed) {
      const incompleteSkills = skillValidation
        .filter((sv) => !sv.isReady)
        .map((sv) => {
          const issues: string[] = []
          if (!sv.hasModule) issues.push('missing module')
          if (!sv.hasQuestions) issues.push('missing questions')
          return `${sv.skillName} (${issues.join(', ')})`
        })
      missingSummary.push(`Skills lacking content: ${incompleteSkills.join('; ')}`)
    }
  }

  return {
    levelValidation,
    allLevelsValid,
    skillValidation,
    allSkillsValid,
    isOverallReady,
    missingSummary,
    isBypassed,
  }
}
