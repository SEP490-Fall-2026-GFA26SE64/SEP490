import type { LearningNotification } from './moduleAuthoringApi'
import type { ToastVariant } from '../hooks/useToast'

export function isVisibleLearningNotification(n: LearningNotification) {
  return !(n.kind === 'PATHWAY_RECALCULATED' && n.body.split('\n').some(line =>
    line.trim() === 'No modules or certificates were added. / Không bổ sung module hoặc chứng chỉ.'))
}

/** Compact presentation only; stored event details and mail content remain available. */
export function learningNotificationPresentation(n: LearningNotification, language: string) {
  const vi = language === 'vi'
  const titles: Record<string, [string, string]> = {
    RULE_PATHWAY_APPROVED: ['Pathway approved', 'Lộ trình đã được duyệt'],
    RULE_PATHWAY_REJECTED: ['Pathway rejected', 'Lộ trình bị từ chối'],
    RULE_PATHWAY_COMPLETED: ['Pathway completed', 'Đã hoàn tất lộ trình'],
    CERTIFICATE_APPROVED: ['Certificate approved', 'Chứng chỉ đã được duyệt'],
    CERTIFICATE_REJECTED: ['Certificate rejected', 'Chứng chỉ bị từ chối'],
    PATHWAY_RECALCULATED: ['Pathway updated', 'Đã cập nhật lộ trình'],
    BYPASS_PROVISION_ADDED: ['Learning content added', 'Đã bổ sung nội dung học'],
  }
  const title = titles[n.kind]?.[vi ? 1 : 0] ?? n.title
  const lines = n.body.split('\n').map(line => line.trim()).filter(Boolean)
  const value = (prefix: string) => lines.find(line => line.startsWith(prefix))?.slice(prefix.length).trim() ?? ''
  const role = value('Role / Vị trí: ')
  const reason = value('Reason / Lý do: ')
  const certificate = value('Certificate / Chứng chỉ: ')
  let description = n.body
  if (n.kind === 'PATHWAY_RECALCULATED' || n.kind === 'BYPASS_PROVISION_ADDED') {
    const modules = lines.filter(line => line.startsWith('Module: ')).length
    const certificates = lines.filter(line => line.startsWith('Certificate / Chứng chỉ: ')).length
    const additions = [
      modules ? vi ? `${modules} học phần` : `${modules} module${modules === 1 ? '' : 's'}` : '',
      certificates ? vi ? `${certificates} chứng chỉ` : `${certificates} certificate${certificates === 1 ? '' : 's'}` : '',
    ].filter(Boolean).join(', ')
    const summary = n.body.includes('No modules or certificates were added.')
      ? (vi ? 'Không có nội dung học mới.' : 'No new learning content.')
      : modules + certificates > 0
        ? vi ? `Thêm ${additions}.` : `Added ${additions}.`
        : vi ? 'Nội dung học đã được cập nhật.' : 'Learning content updated.'
    description = [role, summary].filter(Boolean).join(' · ')
  } else if (titles[n.kind]) {
    description = [n.kind.includes('REJECTED') ? reason : '', certificate || role].filter(Boolean).join(' · ')
  }
  const variant: ToastVariant = n.kind.includes('REJECTED') ? 'destructive'
    : n.kind.includes('APPROVED') || n.kind.includes('COMPLETED') ? 'success' : 'info'
  const accent = variant === 'destructive' ? 'border-destructive text-destructive'
    : variant === 'success' ? 'border-success text-success' : 'border-primary text-primary'
  return { title, description: description.length > 160 ? description.slice(0, 157).trimEnd() + '…' : description, variant, accent }
}
