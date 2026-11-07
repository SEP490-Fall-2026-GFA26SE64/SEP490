import { Button } from '../../../../shared/components/ui/Button'
import { useTranslation } from '../../../../shared/i18n/LanguageContext'

export function RequiredKnowledgePicker({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
  const { t } = useTranslation()
  return <div className="flex flex-wrap gap-1">{['FOUNDATION', 'INTERMEDIATE', 'ADVANCED'].map(level => <Button key={level} type="button" size="sm" variant={value.includes(level) ? 'secondary' : 'outline'} aria-pressed={value.includes(level)}
    onClick={() => onChange(value.includes(level) ? value.filter(item => item !== level) : [...value, level])}>{t('knowledgeLevel.' + level)}</Button>)}</div>
}
