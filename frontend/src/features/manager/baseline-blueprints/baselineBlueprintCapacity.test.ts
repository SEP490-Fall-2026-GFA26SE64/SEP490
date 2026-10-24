import { describe, expect, it } from 'vitest'
import type { BlueprintCapacity, BlueprintRole } from './baselineBlueprintApi'
import {
  allocateRoleQuestionTotal,
  CapacityAllocationError,
  roleCapacityLimit,
  validateBlueprintCapacity,
} from './baselineBlueprintCapacity'

const CAPACITY: BlueprintCapacity = {
  occupationId: 'occupation-1',
  catalogVersion: 'v1',
  coverageAsOf: '2026-10-16T08:00:00Z',
  roles: [
    { roleId: 'role-a', skills: [
      { microSkillId: 'shared', availableEasy: 3, availableMedium: 3, availableHard: 3 },
      { microSkillId: 'only-a', availableEasy: 2, availableMedium: 2, availableHard: 2 },
    ] },
    { roleId: 'role-b', skills: [
      { microSkillId: 'shared', availableEasy: 3, availableMedium: 3, availableHard: 3 },
    ] },
  ],
}

describe('baselineBlueprintCapacity', () => {
  it('derives a dynamic role range after subtracting shared demand', () => {
    const roles = [role('role-a', ['shared', 'only-a']), role('role-b', ['shared'])]
    roles[1] = configured(roles[1], [[1, 2, 1]])

    expect(roleCapacityLimit(roles, 0, CAPACITY)).toMatchObject({
      minimum: 6,
      maximum: 11,
      feasible: true,
    })
  })

  it('preallocates one question per difficulty per skill then distributes deterministically', () => {
    const roles = [role('role-a', ['shared', 'only-a']), role('role-b', ['shared'])]

    const allocated = allocateRoleQuestionTotal(roles, 0, 8, CAPACITY)

    expect(allocated.totalQuestionCount).toBe(8)
    expect(allocated.skills).toEqual([
      expect.objectContaining({
        easyQuestionCount: 2, mediumQuestionCount: 2, hardQuestionCount: 1,
      }),
      expect.objectContaining({
        easyQuestionCount: 1, mediumQuestionCount: 1, hardQuestionCount: 1,
      }),
    ])
    expect(allocated).toMatchObject({
      easyScoreWeight: 0.2, mediumScoreWeight: 0.3, hardScoreWeight: 0.5,
    })
  })

  it('rejects totals below the per-cell minimum or above live capacity', () => {
    const roles = [role('role-a', ['shared', 'only-a']), role('role-b', ['shared'])]

    expect(() => allocateRoleQuestionTotal(roles, 0, 5, CAPACITY))
      .toThrow(CapacityAllocationError)
    expect(() => allocateRoleQuestionTotal(roles, 0, 16, CAPACITY))
      .toThrow(CapacityAllocationError)
  })

  it('allows zero to exclude a role and clears every count and display weight', () => {
    const current = configured(role('role-a', ['shared', 'only-a']), [[1, 1, 1], [1, 1, 1]])

    expect(allocateRoleQuestionTotal([current], 0, 0, CAPACITY)).toMatchObject({
      totalQuestionCount: 0,
      easyScoreWeight: 0,
      mediumScoreWeight: 0,
      hardScoreWeight: 0,
      skills: [
        expect.objectContaining({ easyQuestionCount: 0, mediumQuestionCount: 0, hardQuestionCount: 0 }),
        expect.objectContaining({ easyQuestionCount: 0, mediumQuestionCount: 0, hardQuestionCount: 0 }),
      ],
    })
  })

  it('reports cell minimum and aggregate shared-capacity violations immediately', () => {
    const roles = [
      configured(role('role-a', ['shared', 'only-a']), [[2, 0, 2], [1, 1, 1]]),
      configured(role('role-b', ['shared']), [[2, 2, 2]]),
    ]

    expect(validateBlueprintCapacity(roles, CAPACITY)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'CELL_MINIMUM', roleIds: ['role-a'], microSkillId: 'shared', difficulty: 'medium',
      }),
      expect.objectContaining({
        code: 'SHARED_CAPACITY', roleIds: ['role-a', 'role-b'],
        microSkillId: 'shared', difficulty: 'easy', required: 4, available: 3,
      }),
      expect.objectContaining({
        code: 'SHARED_CAPACITY', roleIds: ['role-a', 'role-b'],
        microSkillId: 'shared', difficulty: 'hard', required: 4, available: 3,
      }),
    ]))
  })
})

function role(roleId: string, skillIds: string[]): BlueprintRole {
  return {
    roleId,
    roleNameSnapshot: roleId,
    enabled: false,
    totalQuestionCount: 0,
    easyScoreWeight: 0,
    mediumScoreWeight: 0,
    hardScoreWeight: 0,
    skills: skillIds.map((microSkillId) => ({
      microSkillId,
      microSkillNameSnapshot: microSkillId,
      easyQuestionCount: 0,
      mediumQuestionCount: 0,
      hardQuestionCount: 0,
    })),
  }
}

function configured(roleValue: BlueprintRole, counts: [number, number, number][]): BlueprintRole {
  return {
    ...roleValue,
    enabled: true,
    totalQuestionCount: counts.flat().reduce((sum, value) => sum + value, 0),
    easyScoreWeight: 0.2,
    mediumScoreWeight: 0.3,
    hardScoreWeight: 0.5,
    skills: roleValue.skills.map((skill, index) => ({
      ...skill,
      easyQuestionCount: counts[index][0],
      mediumQuestionCount: counts[index][1],
      hardQuestionCount: counts[index][2],
    })),
  }
}
