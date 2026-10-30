import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../../shared/i18n/LanguageContext'
import type { BlueprintRole } from './baselineBlueprintApi'
import { BaselineWeightControl } from './BaselineWeightControl'
import type { ScoreWeights } from './baselineBlueprintWeights'

const pending = vi.fn()

describe('BaselineWeightControl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('app_language', 'en')
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('uses integer text inputs without slider/spinner and keeps invalid raw text', async () => {
    const user = userEvent.setup()
    renderControl()
    const easy = screen.getByLabelText('Easy score weight (%)') as HTMLInputElement

    expect(easy.type).toBe('text')
    expect(easy.inputMode).toBe('numeric')
    expect(screen.queryAllByRole('spinbutton')).toHaveLength(0)
    expect(screen.queryAllByRole('slider')).toHaveLength(0)

    await user.clear(easy)
    await user.type(easy, '040')
    await user.tab()

    expect(easy.value).toBe('040')
    expect(easy.getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByText(/from 1% to 32%/)).toBeTruthy()
    expect(pending).toHaveBeenLastCalledWith(true)
  })

  it('commits one input and synchronizes all three displayed weights', async () => {
    const user = userEvent.setup()
    renderControl()
    const easy = screen.getByLabelText('Easy score weight (%)') as HTMLInputElement

    await user.clear(easy)
    await user.type(easy, '25')
    await user.keyboard('{Enter}')

    expect(easy.value).toBe('25')
    expect(Number((screen.getByLabelText('Medium score weight (%)') as HTMLInputElement).value))
      .toBeLessThan(Number((screen.getByLabelText('Hard score weight (%)') as HTMLInputElement).value))
    expect(pending).toHaveBeenLastCalledWith(false)
  })

  it('keeps Hard 40 when Medium 35 is entered and derives Easy 25', async () => {
    const user = userEvent.setup()
    renderControl()
    const hard = screen.getByLabelText('Hard score weight (%)') as HTMLInputElement
    const medium = screen.getByLabelText('Medium score weight (%)') as HTMLInputElement
    await user.clear(hard)
    await user.type(hard, '40')
    await user.keyboard('{Enter}')
    await user.clear(medium)
    await user.type(medium, '35')
    await user.keyboard('{Enter}')
    expect((screen.getByLabelText('Easy score weight (%)') as HTMLInputElement).value).toBe('25')
    expect(medium.value).toBe('35')
    expect(hard.value).toBe('40')
    expect(pending).toHaveBeenLastCalledWith(false)
  })

  it('disables weight editing for a zero-question role', () => {
    renderControl(0)

    expect((screen.getByLabelText('Easy score weight (%)') as HTMLInputElement).disabled).toBe(true)
    expect(screen.queryAllByRole('slider')).toHaveLength(0)
  })
})

function renderControl(totalQuestionCount = 3) {
  return render(
    <LanguageProvider>
      <Harness totalQuestionCount={totalQuestionCount} />
    </LanguageProvider>,
  )
}

function Harness({ totalQuestionCount }: { totalQuestionCount: number }) {
  const [role, setRole] = useState<BlueprintRole>({
    roleId: 'role-java',
    roleNameSnapshot: 'Java Engineer',
    enabled: totalQuestionCount > 0,
    totalQuestionCount,
    easyScoreWeight: totalQuestionCount > 0 ? 0.2 : 0,
    mediumScoreWeight: totalQuestionCount > 0 ? 0.3 : 0,
    hardScoreWeight: totalQuestionCount > 0 ? 0.5 : 0,
    skills: [{
      microSkillId: 'skill-java',
      microSkillNameSnapshot: 'Java Core',
      easyQuestionCount: totalQuestionCount > 0 ? 1 : 0,
      mediumQuestionCount: totalQuestionCount > 0 ? 1 : 0,
      hardQuestionCount: totalQuestionCount > 0 ? 1 : 0,
    }],
  })
  const apply = (weights: ScoreWeights) => setRole((current) => ({ ...current, ...weights }))
  return <BaselineWeightControl
    role={role}
    disabled={false}
    onChange={apply}
    onPendingChange={pending}
  />
}
