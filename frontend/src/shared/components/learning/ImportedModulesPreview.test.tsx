import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { ModuleDocument } from '../../api/moduleAuthoringApi'
import { moduleRequest } from '../../api/moduleAuthoringApi'
import { ImportedModulesPreview } from './ImportedModulesPreview'
vi.mock('../../i18n/LanguageContext', () => ({ useTranslation: () => ({ language: 'en' }) }))
vi.mock('../../api/moduleAuthoringApi', () => ({ moduleRequest: vi.fn(async (_path, _method, input) => ({ html: input.body })) }))
afterEach(() => { cleanup(); vi.clearAllMocks() })
const docs = ['one', 'two'].map(id => ({ id, revisions: [{ number: 1, payload: { title: `Saved ${id}`, content: { lessons: [{ id: 'reading', title: `Reading ${id}`, type: 'TEXT', body: `<p>Persisted ${id} body</p>`, bodyFormat: 'HTML', durationSeconds: 60 }] } } }] })) as unknown as ModuleDocument[]
it('uses only committed snapshots and switches modules without learner mutations', async () => {
  const close = vi.fn()
  render(<ImportedModulesPreview modules={docs} onClose={close} />)
  expect(await screen.findByText('Persisted one body')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: /2\. Saved two/ }))
  expect(await screen.findByText('Persisted two body')).toBeTruthy()
  expect(screen.queryByText('Persisted one body')).toBeNull()
  expect(vi.mocked(moduleRequest).mock.calls.every(([path]) => path === '/text/preview')).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Back to modules' }))
  expect(close).toHaveBeenCalledOnce()
})
