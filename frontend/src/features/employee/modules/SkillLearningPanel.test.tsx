import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { SkillLearningPanel } from './SkillLearningPanel'
import { readSkillEligibility, readSkillModules, startSkillModule } from '../../../shared/api/skillLearningApi'
vi.mock('../../../shared/api/skillLearningApi', () => ({ readSkillEligibility: vi.fn(), readSkillModules: vi.fn(), startSkillModule: vi.fn() }))
vi.mock('../../../shared/i18n/LanguageContext', () => ({ useTranslation: () => ({ language: 'en' }) }))
function Location() { return <output data-testid="location">{useLocation().pathname}</output> }
const props = { skillId: 'skill', skillName: 'SQL', moduleId: 'm1', completedLessons: 0 }
beforeEach(() => {
  vi.mocked(readSkillEligibility).mockResolvedValue({ skillId: 'skill', eligible: false, reason: 'NO_COMPLETED_MODULE', qualifyingCompletion: null })
  vi.mocked(readSkillModules).mockResolvedValue([{ moduleId: 'm1', title: 'Current', contentVersion: '1', started: true, completed: false }, { moduleId: 'm2', title: 'Alternative SQL', contentVersion: '1', started: false, completed: false }])
  vi.mocked(startSkillModule).mockResolvedValue(undefined)
})
afterEach(() => { cleanup(); vi.resetAllMocks() })
function mount() { return render(<MemoryRouter><Location /><SkillLearningPanel {...props} /></MemoryRouter>) }
it('shows unmet learning prerequisite and offers an optional module before assessment readiness', async () => {
  mount(); expect(await screen.findByText('Learning prerequisite not met')).toBeTruthy()
  expect(screen.getByText('Alternative SQL')).toBeTruthy()
  expect(screen.queryByRole('button', { name: /Exam|Assessment/ })).toBeNull()
  expect(readSkillEligibility).toHaveBeenCalledWith('skill', expect.any(AbortSignal))
})
it('keeps optional learning after one module completes and displays original completion provenance', async () => {
  vi.mocked(readSkillEligibility).mockResolvedValue({ skillId: 'skill', eligible: true, reason: 'MODULE_COMPLETED', qualifyingCompletion: { skillId: 'skill', moduleId: 'old-module', revision: 2, contentVersion: 'old', completedAt: '2026-11-01T00:00:00Z', knowledgeLevel: 'FOUNDATION', skillVersion: '1', outcomeCodes: [], skillName: 'Skill Name' } })
  mount(); expect(await screen.findByText('Learning prerequisite met for Skill Assessment')).toBeTruthy()
  expect(screen.getByText(/old-module/)).toBeTruthy();expect(screen.getByRole('button', { name: 'Study module' })).toBeTruthy()
})
it('requests authorized self-study before navigating to the real lesson reader', async () => {
  mount();fireEvent.click(await screen.findByRole('button', { name: 'Study module' }))
  await waitFor(() => expect(startSkillModule).toHaveBeenCalledWith('skill', 'm2'))
  await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/employee/modules/m2'))
})
it('does not navigate or fabricate eligibility when self-study admission is denied', async () => {
  vi.mocked(startSkillModule).mockRejectedValue(new Error('No approved learning package'))
  mount();fireEvent.click(await screen.findByRole('button', { name: 'Study module' }))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'No approved learning package')
  expect(screen.getByTestId('location').textContent).toBe('/')
})
it('keeps an eligibility API failure explicit and supports retry', async () => {
  vi.mocked(readSkillEligibility).mockRejectedValueOnce(new Error('Storage unavailable'))
  mount();expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Storage unavailable')
  expect(screen.queryByText('Learning prerequisite met for Skill Assessment')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  expect(await screen.findByText('Learning prerequisite not met')).toBeTruthy()
})
it('shows a real empty alternative list without substituting sample modules', async () => {
  vi.mocked(readSkillModules).mockResolvedValue([])
  mount();expect(await screen.findByText('No other approved modules are available for this skill.')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Study module' })).toBeNull()
})
