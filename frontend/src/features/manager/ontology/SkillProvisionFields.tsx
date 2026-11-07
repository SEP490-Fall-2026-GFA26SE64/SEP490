import { FormField } from '../../../shared/components/ui/FormField'
import { Input } from '../../../shared/components/ui/Input'
import { Combobox } from '../../../shared/components/ui/Combobox'
import { Heading } from '../../../shared/components/typography/Heading'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { levels, type ProvisionForm } from './skillProvisionForm'
export function SkillProvisionFields({ value, onChange }: { value: ProvisionForm; onChange: (value: ProvisionForm) => void }) {
  const { language } = useTranslation()
  const copy = (en: string, vi: string) => language === 'vi' ? vi : en
  const names = [copy('Foundation', 'Nền tảng'), copy('Intermediate', 'Trung cấp'), copy('Advanced', 'Nâng cao')]
  return <section className="space-y-3">
    <Heading level={3} size="card">{copy('Knowledge requirements', 'Yêu cầu kiến thức')}</Heading>
    <p className="text-xs text-muted-foreground">{copy('Choose one provision mode and stable outcome codes for each configured level. Empty levels remain unconfigured.', 'Chọn một hình thức đáp ứng và mã đầu ra ổn định cho từng mức sử dụng. Mức để trống được giữ là chưa cấu hình.')}</p>
    {levels.map((level, index) => <div key={level} className="space-y-3 rounded-lg border border-border p-3">
      <FormField label={names[index]}><Combobox clearable size="sm" value={value[level].mode} onChange={mode => onChange({ ...value, [level]: { ...value[level], mode } })} placeholder={copy('Not configured', 'Chưa cấu hình')} options={[
        { value: 'MODULE_ONLY', label: copy('Module and assessment', 'Module và đánh giá') },
        { value: 'CERTIFICATE_ONLY', label: copy('Certificate', 'Chứng chỉ') },
      ]} /></FormField>
      <FormField label={copy('Required outcome codes (comma separated)', 'Mã đầu ra bắt buộc (phân cách bằng dấu phẩy)')}><Input value={value[level].outcomes} onChange={event => onChange({ ...value, [level]: { ...value[level], outcomes: event.target.value } })} /></FormField>
    </div>)}
  </section>
}
