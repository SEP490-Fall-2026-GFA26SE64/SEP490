import type { AssessmentBankIssue } from '../api/assessmentBankIssues'
import { useTranslation } from '../i18n/LanguageContext'
import { Text } from './typography/Text'

export function AssessmentBankIssues({ issues }: { issues?: AssessmentBankIssue[] }) {
  const { t, language } = useTranslation()
  if (!issues?.length) return null
  return <div className="space-y-2"><Text variant="body-sm">{language === 'vi' ? 'Cần bổ sung câu hỏi đủ điều kiện cho các nhóm sau:' : 'Add eligible questions for the following required groups:'}</Text><ul className="space-y-1 text-body-sm">{issues.map(issue => <li key={`${issue.roleLevelId}:${issue.skillId}:${issue.knowledgeLevel}`}>{issue.roleLevelName} · {issue.skillName} · {t('knowledgeLevel.' + issue.knowledgeLevel)}</li>)}</ul></div>
}
