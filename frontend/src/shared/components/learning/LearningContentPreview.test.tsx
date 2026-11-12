import { useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { LearningLesson } from '../../api/moduleAuthoringApi'
import { moduleRequest } from '../../api/moduleAuthoringApi'
import { LearningContentPreview } from './LearningContentPreview'
import { LearningLessonsEditor } from './LearningLessonsEditor'

vi.mock('../../i18n/LanguageContext', () => ({ useTranslation: () => ({ language: 'en' }) }))
vi.mock('../../api/moduleAuthoringApi', () => ({ moduleRequest: vi.fn(), uploadLearningFile: vi.fn() }))
const image = '/api/v1/module-management/assets/12345678-1234-1234-1234-123456789012'
const reading: LearningLesson = { id: 'read', title: 'Real reading', type: 'TEXT', body: `<h2>First section</h2><p>Actual body</p><img src="${image}" alt="Actual diagram"><pre><code class="language-cypher">MATCH (n) RETURN n</code></pre>`, bodyFormat: 'HTML', durationSeconds: 120, durationSource: 'MANUAL', videoSource: null, assetId: null, videoUrl: null }
const video: LearningLesson = { ...reading, id: 'video', title: 'Real video', type: 'VIDEO', body: null, bodyFormat: null, assetId: 'uploaded-video', videoSource: 'UPLOAD' }
beforeEach(() => {
  vi.mocked(moduleRequest).mockReset()
  vi.mocked(moduleRequest).mockImplementation(async (path, method, input) => {
    if (path !== '/text/preview' || method !== 'POST') throw new Error('Unexpected write')
    return { html: (input as { body: string }).body } as never
  })
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })
it('uses the real document and asset URL, supports reading/video navigation without progress writes', async () => {
  const { container } = render(<LearningContentPreview lessons={[reading, video]} label="Revision 2" />)
  await screen.findByText('Actual body')
  expect(screen.getByRole('img', { name: 'Actual diagram' }).getAttribute('src')).toBe(image)
  expect(container.querySelector('.hljs-keyword')?.textContent).toBe('MATCH')
  expect((screen.getByRole('button', { name: 'Previous lesson' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Next lesson' }))
  expect(screen.getByRole('heading', { name: 'Real video' })).toBeTruthy()
  expect(container.querySelector('video')?.getAttribute('src')).toContain('/assets/uploaded-video')
  expect((screen.getByRole('button', { name: 'Next lesson' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Previous lesson' }))
  await screen.findByText('Actual body')
  expect(screen.queryByRole('button', { name: /complete/i })).toBeNull()
  expect(vi.mocked(moduleRequest).mock.calls.every(([path]) => path === '/text/preview')).toBe(true)
})
it('switches mobile width and opens a read-only full preview', async () => {
  render(<LearningContentPreview lessons={[reading, { ...reading, id: 'second', title: 'Second reading' }]} />)
  fireEvent.click(screen.getByRole('button', { name: 'Next lesson' }))
  await screen.findByRole('heading', { name: 'Second reading' })
  await screen.findByText('Actual body')
  fireEvent.click(screen.getByRole('button', { name: 'Mobile' }))
  expect(document.querySelector('[data-preview-viewport="mobile"]')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Open full preview' }))
  const dialog = screen.getByRole('dialog', { name: 'View as learner' })
  await within(dialog).findByText('Actual body')
  expect(within(dialog).getByRole('heading', { name: 'Second reading' })).toBeTruthy()
  expect(dialog.querySelector('[data-preview-viewport="mobile"]')).toBeTruthy()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close dialog' }))
  expect(screen.queryByRole('dialog')).toBeNull()
})
it('previews the current unsaved authoring values and preserves them when returning to edit', async () => {
  function Editor() {
    const [lessons, setLessons] = useState<LearningLesson[]>([{ ...reading, bodyFormat: 'MARKDOWN' }])
    return <LearningLessonsEditor lessons={lessons} onChange={setLessons} />
  }
  render(<Editor />)
  fireEvent.change(screen.getByLabelText('Lesson title'), { target: { value: 'Unsaved lesson title' } })
  fireEvent.click(screen.getByRole('tab', { name: 'View as learner' }))
  await screen.findByRole('heading', { name: 'Unsaved lesson title' })
  await screen.findByText('Actual body')
  expect(screen.getByText(/Current draft/)).toBeTruthy()
  fireEvent.click(screen.getByRole('tab', { name: 'Edit content' }))
  expect((screen.getByLabelText('Lesson title') as HTMLInputElement).value).toBe('Unsaved lesson title')
  expect(vi.mocked(moduleRequest).mock.calls.every(([path]) => path === '/text/preview')).toBe(true)
})
it('shows empty state and retries failed sanitised rendering without inventing content', async () => {
  const mounted = render(<LearningContentPreview lessons={[]} />)
  expect(screen.getByText('No lessons to preview.')).toBeTruthy()
  vi.mocked(moduleRequest).mockRejectedValueOnce(new Error('Preview temporarily unavailable'))
  mounted.rerender(<LearningContentPreview lessons={[reading]} />)
  await screen.findByText('Preview temporarily unavailable')
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  await screen.findByText('Actual body')
  mounted.rerender(<LearningContentPreview lessons={[{ ...reading, body: '' }]} />)
  await waitFor(() => expect(screen.getByText('This reading lesson has no content yet.')).toBeTruthy())
})
