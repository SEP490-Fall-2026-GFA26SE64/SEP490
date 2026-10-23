import { useState } from 'react'
import { Button } from '../../../shared/components/ui/Button'
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from '../../../shared/components/ui/Dialog'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'

export function MasteryHelp() {
  const [open, setOpen] = useState(false)
  const { t } = useTranslation(), tr = (key: string) => t(`baselineUi.${key}`)
  return <>
    <Button variant="outline" size="icon" className="shrink-0 rounded-full" aria-label={tr('helpTitle')} title={tr('helpTitle')} onClick={() => setOpen(true)}>?</Button>
    <Dialog open={open} onOpenChange={setOpen} ariaLabel={tr('helpTitle')} closeLabel={t('employeeBaseline.cancel')}>
      <DialogHeader><DialogTitle>{tr('helpTitle')}</DialogTitle><DialogDescription>{tr('confidenceHint')}</DialogDescription></DialogHeader>
      <div tabIndex={0} className="min-h-0 overflow-y-auto space-y-4">
        <section className="space-y-1"><Text className="font-semibold">{tr('score')}</Text><Text variant="body-sm">{tr('scoreHint')}</Text></section>
        <section className="space-y-1"><Text className="font-semibold">{tr('mastery')}</Text><Text variant="body-sm">{tr('masteryHelp')}</Text></section>
        <dl className="space-y-3">{(['LOW', 'MEDIUM', 'HIGH'] as const).map(level => <div key={level}><dt className="font-semibold text-body-sm">{t(`employeeBaseline.${level}`)}</dt><dd className="text-body-sm text-muted-foreground">{tr(`help${level}`)}</dd></div>)}</dl>
        <section className="space-y-1"><Text className="font-semibold">{tr('improveTitle')}</Text><Text variant="body-sm">{tr('improveHelp')}</Text></section>
        <Text variant="caption" className="text-muted-foreground">{tr('profileUpdateHelp')}</Text>
      </div>
    </Dialog>
  </>
}
