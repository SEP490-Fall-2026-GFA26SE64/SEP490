import type { ReactNode } from 'react'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import type { CertificateInput } from '../../../shared/api/certificateAuthoringApi'

export function CertificateFacts({ input, skillName, version, versionLabel, status }: { input: Pick<CertificateInput, 'name' | 'description' | 'referenceUrl' | 'knowledgeLevel'>; skillName: string; version?: string; versionLabel?: string; status?: ReactNode }) {
 const { language, t } = useTranslation(), vi = language === 'vi'
 const label = 'text-xs font-semibold text-foreground'
 return <div className="space-y-4">
  <div className="rounded-lg border border-primary/25 bg-secondary/40 p-4"><p className="mb-1 text-xs font-bold text-primary">{vi ? 'Tên chứng chỉ' : 'Certificate name'}</p><p className="break-words text-lg font-semibold text-foreground">{input.name}</p></div>
  <dl className="grid gap-4 sm:grid-cols-2">
   <div><dt className={label}>{vi ? 'Kỹ năng' : 'Skill'}</dt><dd className="mt-1 font-medium text-foreground">{skillName}</dd></div>
   <div><dt className={label}>{vi ? 'Mức kiến thức' : 'Knowledge level'}</dt><dd className="mt-1 font-medium text-foreground">{t('knowledgeLevel.'+input.knowledgeLevel)}</dd></div>
   {version && <div><dt className={label}>{versionLabel ?? (vi ? 'Phiên bản nội dung' : 'Content revision')}</dt><dd className="mt-1 font-semibold text-primary">{version}</dd></div>}
   {status && <div><dt className={label}>{vi ? 'Trạng thái' : 'Status'}</dt><dd className="mt-1">{status}</dd></div>}
   <div className="sm:col-span-2"><dt className={label}>{vi ? 'Nội dung chứng chỉ' : 'Certificate description'}</dt><dd className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">{input.description || (vi ? 'Chưa có mô tả.' : 'No description provided.')}</dd></div>
   <div className="sm:col-span-2"><dt className={label}>{vi ? 'Liên kết tham chiếu' : 'Reference URL'}</dt><dd className="mt-2"><a className="break-all text-sm font-medium text-primary underline underline-offset-2" href={input.referenceUrl} target="_blank" rel="noopener noreferrer">{input.referenceUrl}</a></dd></div>
  </dl>
 </div>
}
