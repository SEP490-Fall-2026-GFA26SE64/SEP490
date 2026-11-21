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
  if (['REVIEW_RULE_PATHWAY_REQUESTED','REVIEW_CERTIFICATE_EVIDENCE_SUBMITTED','REVIEW_RULE_PATHWAY_APPROVED','REVIEW_RULE_PATHWAY_REJECTED','REVIEW_CERTIFICATE_APPROVED','REVIEW_CERTIFICATE_REJECTED'].includes(n.kind)) {
    const certificate = n.kind.includes('CERTIFICATE'), requested = n.kind.includes('REQUESTED') || n.kind.includes('SUBMITTED'), rejected = n.kind.endsWith('REJECTED')
    const title = requested ? certificate ? vi ? 'Minh chứng mới cần duyệt' : 'Certificate evidence awaiting review' : vi ? 'Yêu cầu lộ trình mới' : 'New pathway request' : rejected ? vi ? 'Đã từ chối yêu cầu' : 'Request rejected' : vi ? 'Đã duyệt yêu cầu' : 'Request approved'
    const role = n.body.split('\n').find(line => line.startsWith('Role / '))?.split(': ').slice(1).join(': ') ?? ''
    return { title, description: [role, requested ? vi ? 'Mở yêu cầu để kiểm tra và xử lý.' : 'Open the request to review and respond.' : vi ? 'Kết quả xử lý đã được lưu và thông báo tới nhân viên.' : 'Decision saved and the employee notified.'].filter(Boolean).join(' · '), variant: requested ? 'info' as ToastVariant : rejected ? 'destructive' as ToastVariant : 'success' as ToastVariant, accent: requested ? 'border-primary text-primary' : rejected ? 'border-destructive text-destructive' : 'border-success text-success' }
  }
  if (n.kind.startsWith('REVIEW_') && n.kind.endsWith('_SUBMITTED')) {
    const count = n.body.match(/^(\d+)/)?.[1] ?? ''
    const noun = n.kind === 'REVIEW_MODULES_SUBMITTED' ? (vi ? 'module' : 'modules') : n.kind === 'REVIEW_QUESTIONS_SUBMITTED' ? (vi ? 'câu hỏi' : 'questions') : (vi ? 'chứng chỉ' : 'certificates')
    return { title: vi ? 'Nội dung chờ duyệt' : 'Content awaiting review', description: vi ? `${count} ${noun} vừa được gửi. Bấm để kiểm tra và duyệt.` : `${count} ${noun} submitted. Open to review.`, variant: 'info' as ToastVariant, accent: 'border-primary text-primary' }
  }
  if (n.kind.startsWith('CERTIFICATE_DEFINITION')) {
    const submitted = n.kind === 'CERTIFICATE_DEFINITIONS_SUBMITTED', rejected = n.kind.endsWith('REJECTED'), failed = n.kind.endsWith('PUBLISH_FAILED')
    const title = submitted ? vi ? 'Chứng chỉ vừa được nộp' : 'Certificates submitted' : rejected ? vi ? 'Chứng chỉ bị từ chối' : 'Certificate rejected' : failed ? vi ? 'Chứng chỉ cần xử lý' : 'Certificate needs attention' : vi ? 'Chứng chỉ đã phát hành' : 'Certificate published'
    const count = n.body.match(/^(\d+)/)?.[1]
    const name = n.body.split('\n')[0]
    const description = submitted && count ? vi ? `${count} chứng chỉ đang chờ duyệt.` : `${count} certificates awaiting review.` : rejected ? (vi ? `${name}. Vui lòng xem lý do và cập nhật.` : `${name}. Open to view the reason and update.`) : failed ? (vi ? `${name}. Cần kiểm tra trước khi phát hành.` : `${name}. Review is required before publication.`) : (vi ? `${name}. Chỉ áp dụng cho lộ trình tạo mới.` : `${name}. Applies to new pathways only.`)
    const variant: ToastVariant = rejected || failed ? 'destructive' : submitted ? 'info' : 'success'
    return { title, description, variant, accent: rejected || failed ? 'border-destructive text-destructive' : submitted ? 'border-primary text-primary' : 'border-success text-success' }
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
    const requirement = value('Requirement / Yêu cầu: ') || lines.find(line => !line.includes(':') && line.includes(' · ')) || ''
    const content = n.kind === 'BYPASS_PROVISION_ADDED' ? lines.filter(line => line.startsWith('Module: ') || line.startsWith('Certificate / Chứng chỉ: ')).map(line => line.replace(/^(Module: |Certificate \/ Chứng chỉ: )/, '')).join(', ') : ''
    description = [requirement || role, content || summary].filter(Boolean).join(' · ')
  } else if (titles[n.kind]) {
    description = [n.kind.includes('REJECTED') ? reason : '', certificate || role].filter(Boolean).join(' · ')
  }
  const variant: ToastVariant = n.kind.includes('REJECTED') ? 'destructive'
    : n.kind.includes('APPROVED') || n.kind.includes('COMPLETED') ? 'success' : 'info'
  const accent = variant === 'destructive' ? 'border-destructive text-destructive'
    : variant === 'success' ? 'border-success text-success' : 'border-primary text-primary'
  return { title, description, variant, accent }
}
