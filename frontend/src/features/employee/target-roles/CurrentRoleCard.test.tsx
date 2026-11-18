import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { CurrentRoleCard } from './CurrentRoleCard'
import type { CurrentRole } from './currentRoleFlowApi'
vi.mock('../../../shared/i18n/LanguageContext', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
afterEach(cleanup)
const role: CurrentRole = { id: 'role', code: 'ROLE', name: 'Developer', scope: 'Application development', jobPositionId: 'job', jobPositionName: 'Engineering', catalogVersion: 'v1', fingerprint: 'v1', levels: [] }
it('preserves active Role level selection and details actions through the shared card', () => {
  const onChoose = vi.fn(), onDetails = vi.fn()
  render(<CurrentRoleCard role={role} active disabled={false} onChoose={onChoose} onDetails={onDetails} />)
  expect(screen.getByText('roleFlow.selected')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'initialPathway.chooseLevel' }))
  fireEvent.click(screen.getByRole('button', { name: 'roleFlow.details' }))
  expect(onChoose).toHaveBeenCalledTimes(1); expect(onDetails).toHaveBeenCalledTimes(1)
})
it('retains Role action disabling when its owner blocks selection', () => {
  const onChoose = vi.fn(), onDetails = vi.fn()
  render(<CurrentRoleCard role={role} active={false} disabled onChoose={onChoose} onDetails={onDetails} />)
  fireEvent.click(screen.getByRole('button', { name: 'roleFlow.choose' }))
  expect(onChoose).not.toHaveBeenCalled(); expect(screen.queryByText('roleFlow.selected')).toBeNull()
})
