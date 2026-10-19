import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../../shared/i18n/LanguageContext'
import { AssessmentManifestEditor } from './AssessmentManifestEditor'
import type { ManagedAssessmentItem } from './baselineAssessmentManagementApi'

describe('AssessmentManifestEditor', () => {
  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('keeps answers absent until an explicit reveal payload is supplied', () => {
    localStorage.setItem('app_language', 'en')
    const { rerender } = renderEditor({})
    expect(screen.queryByText('Correct answer:')).toBeNull()

    rerender(<LanguageProvider><AssessmentManifestEditor
      title="Baseline" items={items} editable={false}
      revealedAnswers={{ 'item-1': { correctOptionId: 'b' } }}
    /></LanguageProvider>)

    expect(screen.getByText('Correct answer:').parentElement?.textContent).toContain('Option B')
  })

  it('reorders only in editable mode and renumbers the manifest', () => {
    localStorage.setItem('app_language', 'en')
    const onItemsChange = vi.fn()
    renderEditor({}, true, onItemsChange)

    fireEvent.click(screen.getAllByLabelText('Move question down')[0])

    expect(onItemsChange).toHaveBeenCalledWith([
      expect.objectContaining({ itemVersionId: 'item-2', position: 1 }),
      expect.objectContaining({ itemVersionId: 'item-1', position: 2 }),
    ])
  })
})

function renderEditor(
  revealedAnswers: Record<string, unknown>,
  editable = false,
  onItemsChange?: (value: ManagedAssessmentItem[]) => void,
) {
  return render(<LanguageProvider><AssessmentManifestEditor
    title="Baseline" items={items} editable={editable}
    revealedAnswers={revealedAnswers} onItemsChange={onItemsChange}
  /></LanguageProvider>)
}

const items: ManagedAssessmentItem[] = [
  item('item-1', 1, 'Question one'),
  item('item-2', 2, 'Question two'),
]

function item(itemVersionId: string, position: number, prompt: string): ManagedAssessmentItem {
  return {
    itemVersionId, position, prompt,
    roleId: 'role-1', roleNameSnapshot: 'Java Engineer',
    microSkillId: 'skill-1', microSkillNameSnapshot: 'Java Core',
    difficulty: 'EASY', scoringWeight: 0.5,
    responseSchema: { options: [
      { id: 'a', label: 'Option A' },
      { id: 'b', label: 'Option B' },
    ] },
  }
}
