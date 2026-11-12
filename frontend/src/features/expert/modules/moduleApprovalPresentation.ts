import type { ModuleDocument } from '../../../shared/api/moduleAuthoringApi'

export function approvalRequest(doc: ModuleDocument) {
  const revision = doc.revisions[doc.revisions.length - 1]
  const archive = ['ARCHIVE_REQUESTED', 'ARCHIVE_PENDING'].includes(revision.state)
  const event = [...doc.history].reverse().find(event => event.revision === revision.number && event.action.replaceAll('-', '_') === (archive ? 'REQUEST_ARCHIVE' : 'SUBMIT'))
  return { revision, archive, event, retry: ['PUBLISH_PENDING', 'ARCHIVE_PENDING'].includes(revision.state) }
}

export function releasedComparison(doc: ModuleDocument) {
  if (doc.releasedRevision == null) return null
  return doc.revisions.find(revision => revision.number === doc.releasedRevision) ?? null
}
