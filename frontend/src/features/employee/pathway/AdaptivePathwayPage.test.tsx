import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type {
  LearningView,
  ManualPathway,
} from '../../../shared/api/moduleAuthoringApi'
import { moduleRequest } from '../../../shared/api/moduleAuthoringApi'
import { AdaptivePathwayPage } from './AdaptivePathwayPage'
import { assignedModuleProgress } from '../modules/useAssignedLearningPathways'
vi.mock('../../../shared/layouts/WorkspaceLayout', () => ({
  WorkspaceLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}))
let language = 'en'
vi.mock('../../../shared/i18n/LanguageContext', () => ({
  useTranslation: () => ({ language }),
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
const pathway: ManualPathway = {
  id: 'path',
  learnerId: 'employee',
  expertId: 'expert',
  title: 'My real assignment',
  moduleIds: ['real-module'],
  confirmedAt: '2026-10-29T00:00:00Z',
}
function mount() {
  return render(
    <MemoryRouter>
      <AdaptivePathwayPage />
    </MemoryRouter>,
  )
}
beforeEach(() => {
  language = 'en'
  vi.mocked(moduleRequest).mockReset()
  vi.mocked(moduleRequest).mockImplementation(async (path) => {
    if (path === '/pathways') return [pathway]
    if (path === '/learning/real-module/view') return view
    throw new Error('Unexpected request')
  })
})
afterEach(cleanup)
describe('R6 original pathway UI with actual assignments', () => {
  it('opens original-style module details with actual lessons and progress, then switches to the original timeline', async () => {
    mount()
    fireEvent.click(
      await screen.findByRole('button', { name: /Actual approved module/ }),
    )
    const dialog = screen.getByRole('dialog', { name: 'Module details' })
    expect(within(dialog).getByText('1/2 lessons completed')).toBeTruthy()
    expect(within(dialog).getByText('50%')).toBeTruthy()
    expect(
      within(dialog)
        .getByRole('link', { name: 'Open module lessons' })
        .getAttribute('href'),
    ).toBe('/employee/modules/real-module')
    expect(within(dialog).getByText(/1. Read/)).toBeTruthy()
    fireEvent.keyDown(dialog, { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: 'Learning timeline' }))
    expect(screen.getByTestId('original-timeline')).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: 'Actual approved module' }),
    ).toBeTruthy()
    expect(screen.getByText('Actual skill')).toBeTruthy()
    expect(
      screen.queryByText(/Quick Unlock|Simulate|Next Best Action|AI-Driven/),
    ).toBeNull()
    expect(
      vi
        .mocked(moduleRequest)
        .mock.calls.every(([, method]) => method === 'GET'),
    ).toBe(true)
  })
  it('counts only lessons in the displayed snapshot and does not infer mastery from watch position', () => {
    expect(
      assignedModuleProgress({
        ...view,
        progress: [
          ...view.progress,
          { ...view.progress[0], lessonId: 'old-lesson' },
          {
            ...view.progress[0],
            lessonId: 'two',
            positionSeconds: 100,
            completedAt: null,
          },
        ],
      }),
    ).toMatchObject({ completed: 1, total: 2, percent: 50 })
    expect(assignedModuleProgress({ ...view, progress: [] })).toMatchObject({
      started: false,
      completed: 0,
    })
  })
  it('loads only the selected pathway and refreshes its real snapshot when switching', async () => {
    vi.mocked(moduleRequest).mockImplementation(async (path) =>
      path === '/pathways'
        ? [pathway, { ...pathway, id: 'second', title: 'Another assignment' }]
        : view,
    )
    mount()
    await screen.findByRole('region', { name: 'My real assignment' })
    fireEvent.change(screen.getByLabelText('Learning pathway'), {
      target: { value: 'second' },
    })
    await screen.findByRole('region', { name: 'Another assignment' })
    expect(
      screen.queryByRole('region', { name: 'My real assignment' }),
    ).toBeNull()
    expect(
      vi
        .mocked(moduleRequest)
        .mock.calls.filter(([path]) => path.includes('/view')),
    ).toHaveLength(2)
  })
  it('does not wait for an unavailable module in an unselected pathway', async () => {
    vi.mocked(moduleRequest).mockImplementation(async (path) => {
      if (path === '/pathways')
        return [
          pathway,
          {
            ...pathway,
            id: 'other',
            title: 'Unselected',
            moduleIds: ['unselected'],
          },
        ]
      if (path.includes('/unselected/'))
        return new Promise<LearningView>(() => {})
      return view
    })
    mount()
    await screen.findByRole('button', { name: /Actual approved module/ })
    expect(
      vi
        .mocked(moduleRequest)
        .mock.calls.some(([path]) => path.includes('/unselected/')),
    ).toBe(false)
  })
  it('leaves the pathway body blank when no assignments exist, without sample modules or a substitute empty card', async () => {
    vi.mocked(moduleRequest).mockResolvedValue([])
    mount()
    const empty = await screen.findByTestId('empty-pathway')
    expect(empty.childElementCount).toBe(0)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.queryByText(/No assigned|Contact your Expert/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Learning timeline' }))
    expect(screen.getByTestId('empty-pathway').childElementCount).toBe(0)
  })
  it('offers retry for request failure and recovers', async () => {
    vi.mocked(moduleRequest).mockRejectedValueOnce(
      new Error('Network unavailable'),
    )
    mount()
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Network unavailable',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await screen.findByRole('button', { name: /Actual approved module/ })
  })
  it('isolates unavailable modules and allows retry without hiding other modules', async () => {
    vi.mocked(moduleRequest).mockImplementation(async (path) => {
      if (path === '/pathways')
        return [{ ...pathway, moduleIds: ['real-module', 'unavailable'] }]
      if (path.includes('unavailable'))
        throw new Error('Module no longer available')
      return view
    })
    mount()
    await screen.findByRole('button', { name: /Actual approved module/ })
    expect(screen.getByRole('alert').textContent).toContain(
      'Module no longer available',
    )
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
  })
  it('shows actual skill details with no fabricated mastery', async () => {
    mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Actual skill' }))
    const dialog = screen.getByRole('dialog', { name: 'Skill details' })
    expect(
      within(dialog).getByRole('heading', { name: 'Actual skill' }),
    ).toBeTruthy()
    expect(within(dialog).getByText('Primary')).toBeTruthy()
    expect(within(dialog).queryByText(/mastery|achieved/i)).toBeNull()
  })
  it('uses Vietnamese labels and shows loading before the real response', async () => {
    language = 'vi'
    mount()
    expect(screen.getByRole('status').textContent).toContain('Đang tải')
    fireEvent.click(
      await screen.findByRole('button', { name: /Actual approved module/ }),
    )
    expect(
      screen.getByRole('button', { name: 'Tiến trình học tập' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('link', { name: 'Mở bài học trong module' }),
    ).toBeTruthy()
  })
})
