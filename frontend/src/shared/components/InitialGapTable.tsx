import type { GapResult } from '../api/initialPathway'
import { useTranslation } from '../i18n/LanguageContext'
import { Text } from './typography/Text'
import { Badge } from './ui/Badge'

export function InitialGapTable({ result }: { result: GapResult }) {
  const { t, language } = useTranslation(), tr = (key: string) => t('initialPathway.' + key)
  const percent = (value: number | null) => value === null ? tr('unknown') : new Intl.NumberFormat(language, { style: 'percent', maximumFractionDigits: 1 }).format(value)
  return <div className="space-y-3">{result.skills.some(skill => skill.evidenceState === 'UNKNOWN') && <Text variant="body-sm">{tr('unknownHelp')}</Text>}<div className="overflow-x-auto rounded-lg border border-border"><table className="w-full text-left text-body-sm">
    <thead className="bg-muted"><tr>{['skill', 'required', 'mastery', 'gap'].map(key => <th key={key} scope="col" className="px-3 py-2 font-semibold">{tr(key)}</th>)}</tr></thead>
    <tbody className="divide-y divide-border">{result.skills.map(skill => <tr key={skill.skillId}>
      <th scope="row" className="min-w-40 px-3 py-3 font-medium"><Text className="break-words">{skill.name}</Text><Badge variant={skill.mandatory ? 'secondary' : 'outline'}>{tr(skill.mandatory ? 'mandatory' : 'optional')}</Badge></th>
      <td className="px-3 py-3">{percent(skill.requiredScore)}</td><td className="px-3 py-3">{percent(skill.mastery)}{skill.confidence && <Text variant="caption">{tr('confidence')}: {t('employeeBaseline.' + skill.confidence, skill.confidence)}</Text>}</td>
      <td className="px-3 py-3">{percent(skill.gap)}</td>
    </tr>)}</tbody>
  </table></div></div>
}
