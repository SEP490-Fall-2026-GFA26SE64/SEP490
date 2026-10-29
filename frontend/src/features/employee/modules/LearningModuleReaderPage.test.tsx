import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { LearningModuleReaderPage } from './LearningModuleReaderPage'
import {
  moduleRequest,
  type LearningView,
  type LessonProgress,
} from '../../../shared/api/moduleAuthoringApi'
vi.mock('../../../shared/layouts/WorkspaceLayout', () => ({
  WorkspaceLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}))
vi.mock('../../../shared/i18n/LanguageContext', () => ({
  useTranslation: () => ({ language: 'en' }),
}))
vi.mock('../../../shared/api/moduleAuthoringApi', () => ({
  moduleRequest: vi.fn(),
}))
const view: LearningView = {
  revision: {
    number: 1,
    state: 'RELEASED',
    editedBy: 'expert',
    editedAt: '2026-10-29T00:00:00Z',
    decidedBy: 'reviewer',
    decidedAt: '2026-10-29T00:00:00Z',
    feedback: null,
    payload: {
      metadata: {
        id: 'real-module',
        version: '1',
        status: 'ACTIVE',
        reviewStatus: 'APPROVED',
        reviewedBy: 'reviewer',
        reviewedAt: '2026-10-29T00:00:00Z',
      },
      title: 'Actual approved module',
      moduleType: 'LESSON_AND_PRACTICE',
      contentUri: 'module-content:c',
      contentType: 'application/vnd.adapt-learning.lessons+json',
      contentVersion: '1',
      duration: 4,
      price: 0,
      teachings: [
        {
          metadata: {
            id: 'mapping',
            version: '1',
            status: 'ACTIVE',
            reviewStatus: 'APPROVED',
            reviewedBy: 'reviewer',
            reviewedAt: '2026-10-29T00:00:00Z',
          },
          skillId: 'skill',
          skillName: 'Actual skill',
          teachingFocus: 'PRIMARY',
          difficultyLevel: 'LOW',
        },
      ],
      content: {
        id: 'c',
        title: 'Content',
        markdown: '',
        contentType: 'application/vnd.adapt-learning.lessons+json',
        contentVersion: '1',
        occupationIds: [],
        createdBy: 'expert',
        createdAt: '2026-10-29T00:00:00Z',
        lessons: [
          {
            id: 'one',
            title: 'Read',
            type: 'TEXT',
            body: '<p>Read</p>',
            bodyFormat: 'HTML',
            durationSeconds: 60,
            durationSource: 'ESTIMATED',
            videoSource: null,
            assetId: null,
            videoUrl: null,
          },
          {
            id: 'two',
            title: 'Watch',
            type: 'VIDEO',
            body: null,
            bodyFormat: null,
            durationSeconds: 100,
            durationSource: 'MEDIA',
            videoSource: 'UPLOAD',
            assetId: 'asset',
            videoUrl: null,
          },
        ],
      },
    },
  },
  latestRevision: 1,
  activeLessonId: 'one',
  progress: [
    {
      lessonId: 'one',
      positionSeconds: 0,
      watchedIntervals: [],
      reachedEnd: true,
      completedAt: '2026-10-29T00:01:00Z',
      updatedAt: '2026-10-29T00:01:00Z',
      coverageUpdatedAt: null,
    },
  ],
}

let progress: LessonProgress[]
function mount() {
  render(
    <MemoryRouter initialEntries={['/employee/modules/real-module']}>
      <Routes>
        <Route
          path="/employee/modules/:moduleId"
          element={<LearningModuleReaderPage />}
        />
      </Routes>
    </MemoryRouter>,
  )
}
beforeEach(() => {
  progress = []
  vi.mocked(moduleRequest).mockReset()
  vi.mocked(moduleRequest).mockImplementation(async (path, method, body) => {
    if (path.endsWith('/begin'))
      return { ...view, progress: [], activeLessonId: 'one' }
    if (path === '/text/preview') return { html: '<p>Actual reading body</p>' }
    if (method === 'PUT' && path.includes('/progress')) {
      const patch = body as {
        reachedEnd?: boolean
        complete?: boolean
        positionSeconds: number
      }
      const id = path.includes('/one/') ? 'one' : 'two'
      const old = progress.find((p) => p.lessonId === id)
      const result: LessonProgress = {
        lessonId: id,
        positionSeconds: patch.positionSeconds,
        watchedIntervals: [],
        reachedEnd: Boolean(old?.reachedEnd || patch.reachedEnd),
        completedAt: patch.complete
          ? '2026-10-29T00:00:00Z'
          : (old?.completedAt ?? null),
        updatedAt: '2026-10-29T00:00:00Z',
        coverageUpdatedAt: null,
      }
      progress = [...progress.filter((p) => p.lessonId !== id), result]
      return result
    }
    throw new Error('Unexpected request')
  })
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      private callback: (entries: { isIntersecting: boolean }[]) => void
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        this.callback = callback
      }
      observe() {
        this.callback([{ isIntersecting: true }])
      }
      disconnect() {}
    },
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
describe('R6 original lesson reader frame', () => {
  it('uses the original top bar, syllabus, large reading area and next-item footer with real completion writes', async () => {
    mount()
    await screen.findByRole('heading', { name: 'Read' })
    expect(screen.getByTestId('original-lesson-reader')).toBeTruthy()
    const syllabus = screen.getByRole('complementary', {
      name: 'Module syllabus',
    })
    expect(
      within(syllabus).getByRole('heading', { name: 'Actual approved module' }),
    ).toBeTruthy()
    await within(
      screen.getByRole('region', { name: 'Lesson content' }),
    ).findByText('Actual reading body')
    expect(
      (
        screen.getByRole('button', {
          name: 'Take Module Exam',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true)
    expect(
      screen
        .getByRole('link', { name: 'Back to Pathway' })
        .getAttribute('href'),
    ).toBe('/employee/pathway')
    await waitFor(() =>
      expect(
        (
          screen.getByRole('button', {
            name: 'Mark as completed',
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Mark as completed' }))
    await screen.findByRole('button', { name: 'Lesson completed' })
    expect(progress.find((p) => p.lessonId === 'one')?.completedAt).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Go to next item' }))
    await screen.findByRole('heading', { name: 'Watch' })
    expect(
      (
        screen.getByRole('button', {
          name: 'Mark as completed',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true)
    expect(screen.getByText(/Watched 0%/)).toBeTruthy()
    expect(
      screen
        .getAllByRole('button', { name: 'Take Module Exam' })
        .every((button) => (button as HTMLButtonElement).disabled),
    ).toBe(true)
  })
  it('resumes the server-selected lesson instead of a sample lesson', async () => {
    const implementation = vi.mocked(moduleRequest).getMockImplementation()!
    vi.mocked(moduleRequest).mockImplementation(async (path, ...args) =>
      path.endsWith('/begin')
        ? { ...view, activeLessonId: 'two', progress: [] }
        : implementation(path, ...args),
    )
    mount()
    await screen.findByRole('heading', { name: 'Watch' })
    expect(screen.queryByRole('heading', { name: 'Read' })).toBeNull()
    expect(screen.queryByText(/Property Graph Core|MOD-CYP/)).toBeNull()
  })
  it('shows load failure with retry and never falls back to mock content', async () => {
    vi.mocked(moduleRequest).mockRejectedValueOnce(
      new Error('Access unavailable'),
    )
    mount()
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Access unavailable',
    )
    expect(screen.queryByRole('complementary')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await screen.findByRole('heading', { name: 'Read' })
  })
})
