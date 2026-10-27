import { Combobox } from '../../../shared/components/ui/Combobox'
import { Text } from '../../../shared/components/typography/Text'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import type { CurrentLevel } from './currentRoleFlowApi'

export function RoleLevelPicker({ levels, value, onChange, disabled }: { levels: CurrentLevel[]; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const { t } = useTranslation()
  return <div role="group" aria-label={t('initialPathway.level')} className="space-y-2">
    <Text variant="body-sm">{t('initialPathway.level')}</Text>
    <Combobox clearable={false} wrapOptions disabled={disabled} value={value} onChange={onChange}
      options={[...levels].sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id)).map(level => ({ value: level.id, label: level.name }))}
      placeholder={t('initialPathway.chooseLevel')} searchPlaceholder={t('initialPathway.chooseLevel')} emptyMessage={t('roleFlow.empty')} />
    {!value && <Text variant="caption">{t('initialPathway.levelRequired')}</Text>}
  </div>
}
