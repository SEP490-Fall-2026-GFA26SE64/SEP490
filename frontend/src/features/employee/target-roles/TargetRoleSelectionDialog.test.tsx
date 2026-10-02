import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TargetRoleSelectionApiError } from './targetRoleSelectionApi'
import { TargetRoleSelectionDialog } from './TargetRoleSelectionDialog'

const CHOICE = {
  role: {
    id: '10000000-0000-0000-0000-000000000001',
    code: 'JAVA_P3',
    name: 'Java Backend Developer',
    track: 'PROFESSIONAL' as const,
    seniority: 'P3' as const,
  },
  command: {
    roleId: '10000000-0000-0000-0000-000000000001',
    expectedCurrentSelectionId: null,
    idempotencyKey: '30000000-0000-0000-0000-000000000001',
  },
}

describe('TargetRoleSelectionDialog', () => {
  afterEach(cleanup)

  it('disables cancel and confirm while a request is pending', () => {
    render(<TargetRoleSelectionDialog
      choice={CHOICE}
      currentSelection={null}
      error={null}
      isPending
      onCancel={vi.fn()}
      onConfirm={vi.fn()}
    />)

    const dialog = screen.getByRole('dialog', { name: 'Choose target role' })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect((screen.getByRole('button', { name: 'Cancel' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Confirm target role' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it.each([
    ['ASSESSMENT_IN_PROGRESS', 'finish or exit the active assessment'],
    ['STALE_SELECTION', 'changed in another request'],
    ['SELECTION_STATE_CONFLICT', 'changed in another request'],
    ['ROLE_NOT_AVAILABLE', 'no longer available'],
    ['IDEMPOTENCY_CONFLICT', 'can no longer be reused'],
  ])('blocks reuse after terminal %s and explains the next action', (code, message) => {
    const onConfirm = vi.fn()
    render(<TargetRoleSelectionDialog
      choice={CHOICE}
      currentSelection={null}
      error={new TargetRoleSelectionApiError(409, code, 'terminal')}
      isPending={false}
      onCancel={vi.fn()}
      onConfirm={onConfirm}
    />)

    expect(screen.getByRole('alert').textContent).toContain(message)
    const confirm = screen.getByRole('button', { name: 'Confirm target role' }) as HTMLButtonElement
    expect(confirm.disabled).toBe(true)
    fireEvent.click(confirm)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it.each([
    ['REQUEST_IN_PROGRESS', 'already being processed'],
    ['CATALOG_UNAVAILABLE', 'temporarily unavailable'],
    ['DEPENDENCY_UNAVAILABLE', 'temporarily unavailable'],
  ])('keeps retryable %s actionable', (code, message) => {
    render(<TargetRoleSelectionDialog
      choice={CHOICE}
      currentSelection={null}
      error={new TargetRoleSelectionApiError(503, code, 'down')}
      isPending={false}
      onCancel={vi.fn()}
      onConfirm={vi.fn()}
    />)

    expect(screen.getByRole('alert').textContent).toContain(message)
    expect((screen.getByRole('button', { name: 'Confirm target role' }) as HTMLButtonElement).disabled).toBe(false)
  })
})
