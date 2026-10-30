import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button } from '../../../shared/components/ui/Button'
import { Card, CardContent } from '../../../shared/components/ui/Card'
import { Text } from '../../../shared/components/typography/Text'
import { useLocalDemoSession } from '../../../shared/hooks/useLocalDemoSession'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { RoleFlowError } from '../target-roles/currentRoleFlowApi'

export function EmployeeAccessNotice({ error, message, onRetry, retrying = false }: {
  error: Error | null; message: string; onRetry: () => void; retrying?: boolean
}) {
  const { t } = useTranslation()
  const demo = useLocalDemoSession()
  const location = useLocation()
  const [switching, setSwitching] = useState(false)
  const [failed, setFailed] = useState(false)
  const denied = error instanceof RoleFlowError && (error.status === 401 || error.status === 403)
  async function openEmployee() {
    if (switching) return
    setSwitching(true); setFailed(false)
    const success = await demo.choose('employee-a', location.pathname + location.search + location.hash)
    if (!success) { setFailed(true); setSwitching(false) }
  }
  return <Card><CardContent role="alert" className="space-y-3 p-5">
    <Text variant="body-sm">{denied ? t(demo.enabled ? 'roleFlow.employeeRequired' : 'roleFlow.accessDenied') : message}</Text>
    {failed && <Text variant="body-sm" className="text-destructive">{t('roleFlow.sessionFailed')}</Text>}
    <div className="flex flex-wrap gap-2">
      {denied && demo.enabled && <Button size="sm" disabled={switching || retrying} isLoading={switching} onClick={() => void openEmployee()}>{t('roleFlow.openEmployee')}</Button>}
      <Button size="sm" variant="outline" disabled={switching || retrying} onClick={onRetry}>{t('roleFlow.retry')}</Button>
    </div>
  </CardContent></Card>
}
