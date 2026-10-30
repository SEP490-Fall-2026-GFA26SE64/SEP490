import { pathwayMessage } from '../api/initialPathwayMessages'
import { useTranslation } from '../i18n/LanguageContext'
import { Text } from './typography/Text'
import { Button } from './ui/Button'
import { Card, CardContent } from './ui/Card'

export function InitialPathwayFeedback({ error, onRetry, busy = false }: { error: unknown; onRetry: () => void; busy?: boolean }) {
  const { t } = useTranslation()
  return <Card><CardContent className="space-y-3 p-5" role="alert"><Text>{pathwayMessage(error, t)}</Text><Button variant="outline" size="sm" disabled={busy} onClick={onRetry}>{t('initialPathway.retry')}</Button></CardContent></Card>
}
