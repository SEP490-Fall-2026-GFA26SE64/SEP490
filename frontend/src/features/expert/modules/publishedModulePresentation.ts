import type { ModuleCatalogItem } from '../../../shared/api/moduleAuthoringApi'

export function publishedModuleRevision(item: ModuleCatalogItem) {
  if (item.module.metadata.status !== 'ACTIVE' || item.module.metadata.reviewStatus !== 'APPROVED') return null
  const doc = item.authoring
  if (doc?.releasedRevision == null) return null
  const revision = doc.revisions.find(revision => revision.number === doc.releasedRevision)
  if (!revision || revision.payload.contentUri !== item.module.contentUri || revision.payload.contentVersion !== item.module.contentVersion) return null
  return revision
}
