import {
type TargetRoleModel
} from '../../manager/data/ldManagerMockData'

export type ExpertRoleStatus =
  | 'published'
  | 'unpublished'
  | 'submitted'
  | 'sent'
  | 'approved'
  | 'draft'
  | 'feedback'
  | 'rejected'

export const getExpertEffectiveStatus = (
  role: TargetRoleModel,
): ExpertRoleStatus => {
  if (role.status === 'published') return 'published'
  if (role.status === 'unpublished') return 'unpublished'

  if (role.status === 'submitted') return 'submitted'

  // When L&D manager sends to expert, expert sees status draft (not dispatched)

  if (role.status === 'sent') return 'draft'

  if (role.status === 'rejected') {
    return 'rejected'
  }

  return 'draft'
}

