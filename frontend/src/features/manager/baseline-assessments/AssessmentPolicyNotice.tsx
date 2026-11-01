import { useContext, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { WorkspaceSessionContext } from '../../../shared/auth/workspaceSession'
import { Button } from '../../../shared/components/ui/Button'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { AdaptiveBaselineApiError } from './adaptiveBaselineApi'
import { AdaptiveErrorNotice } from './AdaptiveBaselineFeedback'
import { getAssessmentPolicy } from './assessmentPolicyApi'
import { assessmentPolicyPath } from './assessmentPolicyNavigation'

/** A missing policy also matters for baselines that were activated before this prerequisite existed. */
export function AssessmentPolicyNotice({ occupationId, disabled = false, required = false }: { occupationId?: string; disabled?: boolean; required?: boolean }) {
  const { t } = useTranslation(), navigate = useNavigate(), [params] = useSearchParams()
  const session = useContext(WorkspaceSessionContext), identity = session?.identity
  const scope = `${identity?.organizationId}:${identity?.accountId}`
  const [reload, setReload] = useState(0)
  const [result, setResult] = useState<{ scope: string; missing: boolean; error: AdaptiveBaselineApiError | null } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    void getAssessmentPolicy(controller.signal)
      .then(state => { if (!controller.signal.aborted) setResult({ scope, missing: state.active === null, error: null }) })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setResult({ scope, missing: false, error: cause instanceof AdaptiveBaselineApiError ? cause : new AdaptiveBaselineApiError(0, 'NETWORK_ERROR') }) })
    return () => controller.abort()
  }, [scope, reload])
  const current = result?.scope === scope ? result : null
  if (current?.error && !required) return <div className="space-y-2"><AdaptiveErrorNotice error={current.error} /><Button variant="outline" disabled={disabled} onClick={() => setReload(value => value + 1)}>{t('assessmentPolicy.refresh')}</Button></div>
  if (!required && !current?.missing) return null
  return <div role="alert" className="space-y-3 rounded-lg border border-warning/40 bg-warning/5 p-4">
    <Text variant="body-sm">{t('assessmentPolicy.requiredForBaseline')}</Text>
    <Button variant="outline" disabled={disabled} onClick={() => navigate(assessmentPolicyPath(occupationId, params))}>{t('assessmentPolicy.configure')}</Button>
  </div>
}
