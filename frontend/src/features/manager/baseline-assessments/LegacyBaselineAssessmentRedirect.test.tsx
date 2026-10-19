import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { LegacyBaselineAssessmentRedirect } from './LegacyBaselineAssessmentRedirect'

describe('LegacyBaselineAssessmentRedirect', () => {
  afterEach(cleanup)

  it('opens the selected Occupation Blueprint workspace and safely encodes its identity', async () => {
    renderRoute('/ld-manager/assessment-bank?occupationId=software%2Fengineering')
    expect((await screen.findByTestId('location')).textContent).toBe(
      '/ld-manager/baseline-assessments/software%2Fengineering/blueprints',
    )
  })

  it('falls back to the management landing when no Occupation is supplied', async () => {
    renderRoute('/manager/assessment-bank')
    expect((await screen.findByTestId('location')).textContent).toBe('/ld-manager/baseline-assessments')
  })
})

function renderRoute(initialEntry: string) {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/ld-manager/assessment-bank" element={<LegacyBaselineAssessmentRedirect />} />
        <Route path="/manager/assessment-bank" element={<LegacyBaselineAssessmentRedirect />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

function LocationProbe() {
  const location = useLocation()
  return <span data-testid="location">{location.pathname}</span>
}
