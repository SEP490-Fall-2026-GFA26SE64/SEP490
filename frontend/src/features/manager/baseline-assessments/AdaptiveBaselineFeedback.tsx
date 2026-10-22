import { LoadingCard } from '../../../shared/components/ui/LoadingCard'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import type { AdaptiveBaselineApiError, AdaptiveShortage } from './adaptiveBaselineApi'

export function AdaptiveLoading() {
  const { t } = useTranslation()
  return <LoadingCard label={t('adaptiveBaseline.loading')} />
}
export function AdaptiveShortages({ values, skillNames = {} }: { values: AdaptiveShortage[]; skillNames?: Record<string, string> }) {
  const { t } = useTranslation(), tr = (key: string) => t(`adaptiveBaseline.${key}`)
  if (!values.length) return null
  return <ul className="list-disc space-y-1 pl-5 text-body-sm">{values.map((item, index) => <li key={`${item.kind}-${item.microSkillId}-${index}`}>
    {tr(`shortage.${item.kind}`)}{item.microSkillId && skillNames[item.microSkillId] ? ` · ${skillNames[item.microSkillId]}` : ''}
    {`: ${tr('required')} ${item.required}, ${tr('available')} ${item.available}`}
  </li>)}</ul>
}
export function AdaptiveErrorNotice({ error }: { error: AdaptiveBaselineApiError }) {
  const { t } = useTranslation()
  return <div role="alert" className="space-y-2 rounded-lg border border-destructive bg-card p-4 text-destructive">
    <Text>{t(`adaptiveBaseline.errors.${error.code}`, t('adaptiveBaseline.errors.REQUEST_FAILED'))}</Text>
    <AdaptiveShortages values={error.shortages} />
  </div>
}
