import { useSearchParams } from 'react-router-dom'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../shared/components/ui/Tabs'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { CertificatesTab } from './CertificatesTab'

export function CertificatesPage() {
  const { language } = useTranslation(), vi = language === 'vi'
  const [params, setParams] = useSearchParams(), tab = params.get('tab') === 'review' ? 'review' : 'manage'
  return <WorkspaceLayout><div className="space-y-6 pb-12">
    <h1 className="sr-only">{vi ? 'Chứng chỉ' : 'Certificates'}</h1>
    <Tabs value={tab} onValueChange={value => setParams({ tab: value })} className="space-y-5">
      <TabsList className="w-auto border border-primary/20 bg-secondary/40 gap-1 [&_button[data-state=active]]:bg-primary [&_button[data-state=active]]:text-primary-foreground"><TabsTrigger value="manage">{vi ? 'Quản lý certificate' : 'Certificate catalog'}</TabsTrigger><TabsTrigger value="review">{vi ? 'Review bài nộp' : 'Evidence review'}</TabsTrigger></TabsList>
      <TabsContent value="manage"><CertificatesTab /></TabsContent>
      <TabsContent value="review"><CertificatesTab mode="review" /></TabsContent>
    </Tabs>
  </div></WorkspaceLayout>
}
