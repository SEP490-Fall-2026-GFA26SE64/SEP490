import { InteractiveRoleRoadmap } from '../components/InteractiveRoleRoadmap'
import { AdaptivePathwayTimeline } from '../components/AdaptivePathwayTimeline'
import type { AssignedPathway } from './useAssignedLearningPathways'

export interface AssignedPathwayViewProps {
  items: AssignedPathway[]
  retry: () => void
}

export function AssignedPathwayViews({
  items,
  mode,
  retry,
}: AssignedPathwayViewProps & { mode: 'roadmap' | 'timeline' }) {
  return mode === 'roadmap' ? (
    <InteractiveRoleRoadmap assigned={{ items, retry }} />
  ) : (
    <AdaptivePathwayTimeline assigned={{ items, retry }} />
  )
}
