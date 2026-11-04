import { Navigate, useSearchParams } from 'react-router-dom'

/**
 * Keeps pre-management bookmarks usable without reviving the legacy editor.
 * Authoring state is loaded by the destination workspace from the backend.
 */
export function LegacyBaselineAssessmentRedirect() {
  const [searchParams] = useSearchParams()
  const jobPositionId = searchParams.get('jobPositionId')?.trim()
  const destination = jobPositionId
    ? `/ld-manager/baseline-assessments/${encodeURIComponent(jobPositionId)}/blueprints`
    : '/ld-manager/baseline-assessments'

  return <Navigate to={destination} replace />
}
