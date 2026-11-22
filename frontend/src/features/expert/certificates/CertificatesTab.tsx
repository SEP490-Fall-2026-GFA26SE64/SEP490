import { PathwayError } from '../../../shared/api/initialPathway'
import { useInitialPathwaySession } from '../../../shared/hooks/useInitialPathwaySession'
import { useTranslation } from '../../../shared/i18n/LanguageContext'
import { InitialPathwayFeedback } from '../../../shared/components/InitialPathwayFeedback'
import { LoadingCard } from '../../../shared/components/ui/LoadingCard'
import { CertificateReviewPanel } from './CertificateReviewPanel'
import { CertificateManagementWorkspace } from './CertificateManagementWorkspace'
export function CertificatesTab({ mode = 'manage' }: { mode?: 'manage' | 'review' }) {
 const session = useInitialPathwaySession(), { t } = useTranslation()
 if (!session.scope || session.data?.role !== 'DOMAIN_EXPERT') return session.isPending ? <LoadingCard label={t('initialPathway.loading')} /> : <InitialPathwayFeedback error={session.error ?? new PathwayError('FORBIDDEN', 403)} onRetry={() => void session.refetch()} />
 return mode === 'review' ? <CertificateReviewPanel scope={session.scope} /> : <CertificateManagementWorkspace />
}
