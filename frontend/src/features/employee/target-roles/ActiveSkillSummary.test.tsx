import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ActiveSkillSummary } from './ActiveSkillSummary'
import { getActiveCompanyId } from '../../../shared/stores/companyStore'

describe('ActiveSkillSummary', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(cleanup)

  it('renders empty state when there are no active tracked skills', () => {
    localStorage.setItem(
      `alg_learner_learning_profile_${getActiveCompanyId()}`,
      JSON.stringify({
        learnerId: 'lrn-1',
        learnerName: 'Test Learner',
        currentRole: 'Junior',
        targetSkill: null,
        trackedSkills: [],
        previousSkills: [],
      })
    )
    render(<ActiveSkillSummary />)
    expect(screen.getByText('No active tracked skills')).toBeTruthy()
  })

  it('does not track skills that have been completed / done', () => {
    localStorage.setItem(
      `alg_learner_learning_profile_${getActiveCompanyId()}`,
      JSON.stringify({
        learnerId: 'lrn-1',
        learnerName: 'Test Learner',
        currentRole: 'Junior',
        targetSkill: 'Python Async',
        trackedSkills: [
          {
            skillName: 'Python Async',
            macroCode: 'PROGRAMMING',
            level: 'Advanced',
            assignedAt: '2026-09-01',
          },
        ],
        previousSkills: [
          {
            skillKey: 'python-async',
            skillName: 'Python Async',
            macroCode: 'PROGRAMMING',
            completedAt: '2026-09-10',
            masteryScore: 92,
            status: 'completed',
          },
        ],
      })
    )
    render(<ActiveSkillSummary />)
    expect(screen.getByText('No active tracked skills')).toBeTruthy()
    expect(screen.queryByText('1 Skill Tracked')).toBeNull()
  })

  it('tracks in-progress skills while filtering out completed skills', () => {
    localStorage.setItem(
      `alg_learner_learning_profile_${getActiveCompanyId()}`,
      JSON.stringify({
        learnerId: 'lrn-1',
        learnerName: 'Test Learner',
        currentRole: 'Junior',
        targetSkill: 'Docker Orchestration',
        trackedSkills: [
          {
            skillName: 'Python Async',
            macroCode: 'PROGRAMMING',
            level: 'Advanced',
            assignedAt: '2026-09-01',
          },
          {
            skillName: 'Docker Orchestration',
            macroCode: 'DEVOPS',
            level: 'Intermediate',
            assignedAt: '2026-09-05',
          },
        ],
        previousSkills: [
          {
            skillKey: 'python-async',
            skillName: 'Python Async',
            completedAt: '2026-09-10',
            masteryScore: 90,
            status: 'completed',
          },
        ],
      })
    )
    render(<ActiveSkillSummary />)
    expect(screen.getByText('Active Tracked Skills')).toBeTruthy()
    expect(screen.getByText('1 Skill Tracked')).toBeTruthy()
    expect(screen.getByText('Docker Orchestration')).toBeTruthy()
    expect(screen.queryByText(/Python Async/)).toBeNull()
  })
})
