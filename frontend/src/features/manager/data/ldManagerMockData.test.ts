import { describe, it, expect } from 'vitest'
import {
  getEligibleExpertsForJobPosition,
  resolveJobPositionForRole,
  type EligibleExpert,
  type TargetRoleModel,
} from './ldManagerMockData'

describe('resolveJobPositionForRole', () => {
  it('correctly maps testin2 with DEV familyCode to 15-1252.00 Software Developers, not QA', () => {
    const role: TargetRoleModel = {
      id: 'f115896a-c9cf-4776-abec-59dc94ecf462',
      stableId: 'ROLE-IE07',
      code: 'ROLE-IE07',
      title: 'testin2',
      familyCode: 'DEV',
      department: '',
      description: '',
      version: '1.2',
      status: 'published',
      competencyIds: [],
      skillTargets: [],
      levels: ['Senior', 'Middle', 'Junior'],
      activeEnrollments: 0,
      updatedAt: '2026-11-07T00:00:00Z',
    }
    const resolved = resolveJobPositionForRole(role)
    expect(resolved.code).toBe('15-1252.00')
    expect(resolved.name).toBe('Software Developers')
  })

  it('correctly maps QA roles with explicit qa words to 15-1253.00', () => {
    const role: TargetRoleModel = {
      id: 'role-qa-1',
      stableId: 'ROLE-QA-1',
      code: 'AUTOMATION_TESTER',
      title: 'Automation Tester',
      department: '',
      description: '',
      version: '1.0',
      status: 'published',
      competencyIds: [],
      skillTargets: [],
      levels: ['Senior', 'Middle', 'Junior'],
      activeEnrollments: 0,
      updatedAt: '2026-11-07T00:00:00Z',
    }
    const resolved = resolveJobPositionForRole(role)
    expect(resolved.code).toBe('15-1253.00')
  })
})

describe('getEligibleExpertsForJobPosition', () => {
  const mockExperts: EligibleExpert[] = [
    {
      id: 'expert-sarah-chen',
      name: 'Dr. Sarah Chen',
      title: '15-1252.00 - Software Developers',
      email: 'expert@technova.com',
      departmentId: 'd0000000-0000-0000-0000-000000000001',
      departmentName: 'Engineering & Cognitive Systems',
      jobPositionReferenceId: '15-1252.00',
      jobPositionName: '15-1252.00 - Software Developers',
    },
    {
      id: 'expert-marcus-vance',
      name: 'Marcus Vance',
      title: '15-1253.00 - Software Quality Assurance Analysts and Testers',
      email: 'marcus.vance@technova.com',
      departmentId: '4bb9ce13-f65a-349e-803d-017fd495a62f',
      departmentName: 'Quality Engineering & Assurance',
      jobPositionReferenceId: '15-1253.00',
      jobPositionName: '15-1253.00 - Software Quality Assurance Analysts and Testers',
    },
    {
      id: 'expert-alex-rivera',
      name: 'Alex Rivera',
      title: '15-1212.00 - Information Security Analysts',
      email: 'alex.rivera@technova.com',
      departmentId: 'c05d5732-9897-38c7-9d8f-dfdbe71cfd53',
      departmentName: 'Cybersecurity & Compliance',
      jobPositionReferenceId: '15-1212.00',
      jobPositionName: '15-1212.00 - Information Security Analysts',
    },
  ]

  it('excludes Marcus Vance when editing a role in Engineering & Cognitive Systems for Software Developers', () => {
    const results = getEligibleExpertsForJobPosition(
      '15-1252.00',
      'comp-technova',
      {
        id: 'd0000000-0000-0000-0000-000000000001',
        name: 'Engineering & Cognitive Systems',
      },
      mockExperts,
    )

    expect(results.some((e) => e.name === 'Marcus Vance')).toBe(false)
    expect(results.some((e) => e.name === 'Dr. Sarah Chen')).toBe(true)
    expect(results).toHaveLength(1)
  })

  it('does not falsely match Marcus Vance on "software" substring when no department is specified', () => {
    const results = getEligibleExpertsForJobPosition(
      '15-1252.00',
      'comp-technova',
      null,
      mockExperts,
    )

    // Marcus Vance is 15-1253.00 (QA), not 15-1252.00 (Software Developers)
    expect(results.some((e) => e.name === 'Marcus Vance')).toBe(false)
    expect(results.some((e) => e.name === 'Dr. Sarah Chen')).toBe(true)
  })

  it('includes Marcus Vance when filtering for Quality Engineering & Assurance and 15-1253.00', () => {
    const results = getEligibleExpertsForJobPosition(
      '15-1253.00',
      'comp-technova',
      {
        id: '4bb9ce13-f65a-349e-803d-017fd495a62f',
        name: 'Quality Engineering & Assurance',
      },
      mockExperts,
    )

    expect(results.some((e) => e.name === 'Marcus Vance')).toBe(true)
    expect(results.some((e) => e.name === 'Dr. Sarah Chen')).toBe(false)
    expect(results).toHaveLength(1)
  })
})

