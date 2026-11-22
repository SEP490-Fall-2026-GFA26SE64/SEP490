import { useSearchParams } from 'react-router-dom'
import { WorkspaceLayout } from '../../../shared/layouts/WorkspaceLayout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../shared/components/ui/Tabs'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { CertificatesTab } from './CertificatesTab'
import { CertificateManagementWorkspace } from './CertificateManagementWorkspace'

export function CertificatesPage({ manager = false }: { manager?: boolean }) {
  const { language } = useTranslation(), vi = language === 'vi'
  const [params, setParams] = useSearchParams(), tab = params.get('tab') === 'review' ? 'review' : 'manage'
  return <WorkspaceLayout><div className="space-y-6 pb-12">
    <h1 className="sr-only">{vi ? 'Chứng chỉ' : 'Certificates'}</h1>
    {manager ? <CertificateManagementWorkspace manager /> : <Tabs value={tab} onValueChange={value => setParams({ tab: value })} className="space-y-5">
      <CertificateManagementWorkspace navigation={<TabsList className="h-auto flex-wrap gap-1 border border-border p-1"><TabsTrigger value="manage">{vi ? 'Danh mục chứng chỉ' : 'Certificate catalog'}</TabsTrigger><TabsTrigger value="review">{vi ? 'Duyệt minh chứng' : 'Evidence review'}</TabsTrigger></TabsList>} evidenceReview={tab === 'review' ? <TabsContent value="review"><CertificatesTab mode="review" /></TabsContent> : undefined} />
    </Tabs>}
  </div></WorkspaceLayout>
}
