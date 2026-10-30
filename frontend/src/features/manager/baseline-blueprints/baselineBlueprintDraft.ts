import type { BlueprintDraft, BlueprintRole, OccupationDetail } from './baselineBlueprintApi'
import { difficultyQuestionTotal, roleQuestionTotal } from './baselineBlueprintForm'
import { defaultScoreWeights, isValidScoreWeights, weightsFromRole } from './baselineBlueprintWeights'

export function toBlueprintDraft(
  name: string,
  occupation: Pick<OccupationDetail, 'id' | 'name'>,
  roles: BlueprintRole[],
): BlueprintDraft {
  return {
    name: name.trim(),
    occupationId: occupation.id,
    occupationNameSnapshot: occupation.name,
    roles: roles.map(({ totalQuestionCount: _ignored, ...role }) => {
      const participates = roleQuestionTotal(role) > 0
      return {
        ...role,
        enabled: participates,
        ...(!participates && {
          easyScoreWeight: 0.3334,
          mediumScoreWeight: 0.3333,
          hardScoreWeight: 0.3333,
        }),
      }
    }),
  }
}

export function rolesForBlueprintEditor(roles: BlueprintRole[]): BlueprintRole[] {
  return roles.map((role) => {
    if (roleQuestionTotal(role) === 0) return {
      ...role,
      easyScoreWeight: 0,
      mediumScoreWeight: 0,
      hardScoreWeight: 0,
    }
    return isValidScoreWeights(weightsFromRole(role)) ? role : { ...role, ...defaultScoreWeights() }
  })
}

export function hasWeightWithoutQuestions(role: BlueprintRole) {
  if (roleQuestionTotal(role) === 0) return false
  return (difficultyQuestionTotal(role, 'easy') === 0 && role.easyScoreWeight !== 0)
    || (difficultyQuestionTotal(role, 'medium') === 0 && role.mediumScoreWeight !== 0)
    || (difficultyQuestionTotal(role, 'hard') === 0 && role.hardScoreWeight !== 0)
}
