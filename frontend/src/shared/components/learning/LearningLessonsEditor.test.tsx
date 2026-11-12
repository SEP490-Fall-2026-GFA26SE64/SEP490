import { useState } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { LearningLesson } from '../../api/moduleAuthoringApi'
import { moduleRequest } from '../../api/moduleAuthoringApi'
import { newLesson } from '../../lib/learningLessons'
import { LearningLessonsEditor } from './LearningLessonsEditor'
vi.mock('../../i18n/LanguageContext', () => ({ useTranslation: () => ({ language: 'en' }) }))
vi.mock('../../api/moduleAuthoringApi', () => ({ moduleRequest: vi.fn(), uploadLearningFile: vi.fn() }))
vi.mock('./RichLessonEditor', () => ({ RichLessonEditor: ({ html, onChange }: { html: string; onChange: (value: string) => void }) => <textarea aria-label="Reading content" value={html} onChange={event => onChange(event.target.value)} /> }))
const first: LearningLesson = { ...newLesson('TEXT'), id: 'one', title: 'First topic', body: '<p>First body</p>' }
const second: LearningLesson = { ...newLesson('TEXT'), id: 'two', title: 'Second topic', body: '<p>Second body</p>' }
const changed = vi.fn<(lessons: LearningLesson[]) => void>()
const latestLessons = () => changed.mock.calls.at(-1)![0]
function Editor() {
  const [lessons, setLessons] = useState([first, second])
  return <LearningLessonsEditor lessons={lessons} onChange={next => { changed(next); setLessons(next) }} />
}
beforeEach(() => { vi.mocked(moduleRequest).mockImplementation(async (_path, _method, input) => ({ html: (input as { body: string }).body }) as never) })
afterEach(() => { cleanup(); vi.clearAllMocks() })
it('edits one stable lesson at a time and retains unsaved body when selecting another lesson', async () => {
  render(<Editor />)
  await screen.findByLabelText('Reading content', {}, { timeout: 10000 })
  expect(screen.getAllByLabelText('Lesson title')).toHaveLength(1)
  fireEvent.change(screen.getByLabelText('Reading content'), { target: { value: '<p>Unsaved first body</p>' } })
  fireEvent.click(screen.getByRole('button', { name: /2\. Second topic/ }))
  expect((await screen.findByLabelText('Reading content', {}, { timeout: 10000 }) as HTMLTextAreaElement).value).toBe('<p>Second body</p>')
  fireEvent.click(screen.getByRole('button', { name: /1\. First topic/ }))
  expect((await screen.findByLabelText('Reading content', {}, { timeout: 10000 }) as HTMLTextAreaElement).value).toBe('<p>Unsaved first body</p>')
  expect(latestLessons()[0].body).toBe('<p>Unsaved first body</p>')
})
it('keeps selected identity through reorder, handles removal and selects newly added lessons', async () => {
  render(<Editor />)
  await screen.findByLabelText('Reading content', {}, { timeout: 10000 })
  fireEvent.click(screen.getByRole('button', { name: /2\. Second topic/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Move lesson up' }))
  expect(latestLessons().map(lesson => lesson.id)).toEqual(['two', 'one'])
  expect((screen.getByLabelText('Lesson title') as HTMLInputElement).value).toBe('Second topic')
  fireEvent.click(screen.getByRole('button', { name: 'Remove lesson' }))
  expect((screen.getByLabelText('Lesson title') as HTMLInputElement).value).toBe('First topic')
  fireEvent.click(screen.getByRole('button', { name: 'Add Video lesson' }))
  expect(latestLessons().at(-1)?.type).toBe('VIDEO')
  expect(screen.getByLabelText('Upload MP4 video')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Add Text lesson' }))
  expect(latestLessons().at(-1)?.type).toBe('TEXT')
  expect((await screen.findByLabelText('Lesson title') as HTMLInputElement).value).toBe('')
})
it('collapses navigation and previews the selected lesson without a third column or progress writes', async () => {
  render(<Editor />)
  await screen.findByLabelText('Reading content', {}, { timeout: 10000 })
  fireEvent.click(screen.getByRole('button', { name: /2\. Second topic/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Collapse lesson list' }))
  expect(screen.queryByRole('complementary', { name: 'Authoring lessons' })).toBeNull()
  fireEvent.click(screen.getByRole('tab', { name: 'View as learner' }))
  await screen.findByText('Second body')
  expect(screen.queryByRole('navigation', { name: 'Preview lessons' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Open full preview' }))
  const dialog = screen.getByRole('dialog', { name: 'View as learner' })
  await within(dialog).findByText('Second body')
  expect(within(dialog).getByRole('navigation', { name: 'Preview lessons' })).toBeTruthy()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close dialog' }))
  fireEvent.click(screen.getByRole('button', { name: 'Show lesson list' }))
  expect(screen.getByRole('complementary', { name: 'Authoring lessons' })).toBeTruthy()
  expect(vi.mocked(moduleRequest).mock.calls.every(([path]) => path === '/text/preview')).toBe(true)
})
