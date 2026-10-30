import type {
  BlueprintCapacity,
  BlueprintRole,
} from './baselineBlueprintApi'
import {
  difficulties,
  roleQuestionTotal,
  type CountField,
  type Difficulty,
} from './baselineBlueprintForm'

type AvailableField = 'availableEasy' | 'availableMedium' | 'availableHard'

export interface CapacityIssue {
  code: 'ROLE_MINIMUM' | 'CELL_MINIMUM' | 'SHARED_CAPACITY'
  roleIds: string[]
  microSkillId?: string
  difficulty?: Difficulty
  required: number
  available: number
}

export interface RoleCapacityLimit {
  minimum: number
  maximum: number
  cells: Record<string, number>
  feasible: boolean
}

export class CapacityAllocationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CapacityAllocationError'
  }
}

export function roleCapacityLimit(
  roles: BlueprintRole[],
  roleIndex: number,
  capacity: BlueprintCapacity,
): RoleCapacityLimit {
  const role = roles[roleIndex]
  if (!role) return { minimum: 0, maximum: 0, cells: {}, feasible: false }

  const cells: Record<string, number> = {}
  for (const skill of role.skills) {
    for (const difficulty of difficulties) {
      const available = availableFor(capacity, role.roleId, skill.microSkillId, difficulty)
      const usedByOtherRoles = demandFor(
        roles.filter((_, index) => index !== roleIndex), skill.microSkillId, difficulty,
      )
      cells[cellKey(skill.microSkillId, difficulty)] = Math.max(0, available - usedByOtherRoles)
    }
  }

  const minimum = role.skills.length * difficulties.length
  const maximum = Object.values(cells).reduce((sum, value) => sum + value, 0)
  const feasible = minimum > 0
    && maximum >= minimum
    && Object.values(cells).every((value) => value >= 1)
  return { minimum, maximum, cells, feasible }
}

export function allocateRoleQuestionTotal(
  roles: BlueprintRole[],
  roleIndex: number,
  requestedTotal: number,
  capacity: BlueprintCapacity,
): BlueprintRole {
  const role = roles[roleIndex]
  if (!role) throw new CapacityAllocationError('Role is unavailable')
  if (!Number.isInteger(requestedTotal) || requestedTotal < 0) {
    throw new CapacityAllocationError('Question total must be a non-negative integer')
  }
  if (requestedTotal === 0) return clearRole(role)

  const limit = roleCapacityLimit(roles, roleIndex, capacity)
  if (!limit.feasible || requestedTotal < limit.minimum || requestedTotal > limit.maximum) {
    throw new CapacityAllocationError('Question total is outside the feasible capacity range')
  }

  const counts = role.skills.map(() => [1, 1, 1])
  const cells = role.skills.flatMap((skill, skillIndex) => difficulties.map((difficulty, difficultyIndex) => ({
    skillIndex,
    difficultyIndex,
    remaining: limit.cells[cellKey(skill.microSkillId, difficulty)] - 1,
  })))
  let remaining = requestedTotal - limit.minimum
  let cursor = 0

  while (remaining > 0) {
    let allocated = false
    for (let offset = 0; offset < cells.length; offset += 1) {
      const index = (cursor + offset) % cells.length
      const cell = cells[index]
      if (cell.remaining <= 0) continue
      counts[cell.skillIndex][cell.difficultyIndex] += 1
      cell.remaining -= 1
      remaining -= 1
      cursor = (index + 1) % cells.length
      allocated = true
      break
    }
    if (!allocated) throw new CapacityAllocationError('Question capacity was exhausted')
  }

  return {
    ...role,
    totalQuestionCount: requestedTotal,
    easyScoreWeight: 0.2,
    mediumScoreWeight: 0.3,
    hardScoreWeight: 0.5,
    skills: role.skills.map((skill, skillIndex) => ({
      ...skill,
      easyQuestionCount: counts[skillIndex][0],
      mediumQuestionCount: counts[skillIndex][1],
      hardQuestionCount: counts[skillIndex][2],
    })),
  }
}

export function validateBlueprintCapacity(
  roles: BlueprintRole[], capacity: BlueprintCapacity,
): CapacityIssue[] {
  const issues: CapacityIssue[] = []

  for (const role of roles) {
    const total = roleQuestionTotal(role)
    if (total === 0) continue
    const minimum = role.skills.length * difficulties.length
    if (total < minimum) {
      issues.push({
        code: 'ROLE_MINIMUM', roleIds: [role.roleId], required: minimum, available: total,
      })
    }
    for (const skill of role.skills) {
      for (const difficulty of difficulties) {
        const count = skill[countField(difficulty)]
        if (count < 1) {
          issues.push({
            code: 'CELL_MINIMUM',
            roleIds: [role.roleId],
            microSkillId: skill.microSkillId,
            difficulty,
            required: 1,
            available: count,
          })
        }
      }
    }
  }

  const sharedCells = new Set<string>()
  for (const role of roles) {
    for (const skill of role.skills) {
      for (const difficulty of difficulties) sharedCells.add(cellKey(skill.microSkillId, difficulty))
    }
  }
  for (const key of sharedCells) {
    const [microSkillId, difficulty] = splitCellKey(key)
    const required = demandFor(roles, microSkillId, difficulty)
    const available = sharedAvailableFor(capacity, microSkillId, difficulty)
    if (required <= available) continue
    issues.push({
      code: 'SHARED_CAPACITY',
      roleIds: roles
        .filter((role) => role.skills.some((skill) =>
          skill.microSkillId === microSkillId && skill[countField(difficulty)] > 0))
        .map((role) => role.roleId),
      microSkillId,
      difficulty,
      required,
      available,
    })
  }
  return issues
}

export function capacityCellKey(microSkillId: string, difficulty: Difficulty) {
  return cellKey(microSkillId, difficulty)
}

function clearRole(role: BlueprintRole): BlueprintRole {
  return {
    ...role,
    totalQuestionCount: 0,
    easyScoreWeight: 0,
    mediumScoreWeight: 0,
    hardScoreWeight: 0,
    skills: role.skills.map((skill) => ({
      ...skill, easyQuestionCount: 0, mediumQuestionCount: 0, hardQuestionCount: 0,
    })),
  }
}

function availableFor(
  capacity: BlueprintCapacity,
  roleId: string,
  microSkillId: string,
  difficulty: Difficulty,
) {
  const skill = capacity.roles.find((role) => role.roleId === roleId)
    ?.skills.find((entry) => entry.microSkillId === microSkillId)
  return skill ? skill[availableField(difficulty)] : 0
}

function sharedAvailableFor(
  capacity: BlueprintCapacity, microSkillId: string, difficulty: Difficulty,
) {
  const values = capacity.roles.flatMap((role) => role.skills)
    .filter((skill) => skill.microSkillId === microSkillId)
    .map((skill) => skill[availableField(difficulty)])
  return values.length === 0 ? 0 : Math.min(...values)
}

function demandFor(roles: BlueprintRole[], microSkillId: string, difficulty: Difficulty) {
  const field = countField(difficulty)
  return roles.reduce((sum, role) => sum + (role.skills
    .find((skill) => skill.microSkillId === microSkillId)?.[field] ?? 0), 0)
}

function countField(difficulty: Difficulty): CountField {
  return `${difficulty}QuestionCount`
}

function availableField(difficulty: Difficulty): AvailableField {
  return `available${difficulty[0].toUpperCase()}${difficulty.slice(1)}` as AvailableField
}

function cellKey(microSkillId: string, difficulty: Difficulty) {
  return `${microSkillId}:${difficulty}`
}

function splitCellKey(key: string): [string, Difficulty] {
  const separator = key.lastIndexOf(':')
  return [key.slice(0, separator), key.slice(separator + 1) as Difficulty]
}
