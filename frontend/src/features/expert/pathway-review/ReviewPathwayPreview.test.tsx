import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import type { PathwayView } from '../../../shared/api/initialPathway'
import { ReviewPathwayPreview } from './ReviewPathwayPreview'
import { reviewFixture } from './reviewTestFixtures'
const observed = vi.hoisted(() => ({ roadmap: [] as PathwayView[], timeline: [] as PathwayView[] }))
vi.mock('../../../shared/i18n/LanguageContext', () => ({ useTranslation: () => ({ language: 'en', t: (key: string) => key }) }))
vi.mock('../../employee/components/InteractiveRoleRoadmap', () => ({ InteractiveRoleRoadmap: ({ pathway }: { pathway: PathwayView }) => { observed.roadmap.push(pathway); return <div>roadmap fixture</div> } }))
vi.mock('../../employee/components/AdaptivePathwayTimeline', () => ({ AdaptivePathwayTimeline: ({ pathway }: { pathway: PathwayView }) => { observed.timeline.push(pathway); return <div>timeline fixture</div> } }))
afterEach(() => { cleanup(); observed.roadmap = []; observed.timeline = []; vi.unstubAllGlobals() })
it('R09 E03 preview maps saved ordinal order, dependencies and PREVIEW/null entries in both tabs without HTTP', async () => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
  const detail = reviewFixture(); detail.revision.plan.modules.reverse()
  detail.revision.plan.dependencies = [{ moduleId: 'M-B', providerModuleId: 'M-A', dependentSkillId: 'S', prerequisiteSkillId: 'P', internalGateId: null }]
  render(<ReviewPathwayPreview detail={detail} />)
  const roadmap = observed.roadmap.at(-1)!
  expect(roadmap.modules.map(m => m.module.id)).toEqual(['M-A', 'M-B'])
  expect(roadmap.status?.revisionContentHash).toBe('a'.repeat(64)); expect(roadmap.status?.revision).toBe(4)
  expect(roadmap.modules.every(m => m.accessState === 'PREVIEW' && m.entry === null)).toBe(true)
  await userEvent.click(screen.getByRole('button', { name: 'pathway.adaptiveTimeline' }))
  expect(observed.timeline.at(-1)).toEqual(roadmap)
  expect(roadmap.dependencies).toEqual([{ ...detail.revision.plan.dependencies[0], internal: false }])
  expect(fetcher).not.toHaveBeenCalled()
})
