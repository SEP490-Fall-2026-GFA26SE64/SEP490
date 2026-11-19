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
  | 'staged'

export const getExpertEffectiveStatus = (
  role: TargetRoleModel,
): ExpertRoleStatus => {
  const s = (role.status || '').toLowerCase()
  if (s === 'published' || s === 'active') return 'published'
  if (s === 'unpublished') return 'unpublished'
  if (s === 'submitted' || s === 'approved') return 'submitted'
  if (s === 'rejected' || s === 'feedback') return 'rejected'
  if (s === 'staged' || Boolean(role.isStaffingEnabled)) return 'staged'
  if (s === 'sent') return 'draft'

  return 'draft'
}

export const formatRoleVersion = (version?: string): string => {
  const v = String(version || '1.0').trim()
  return v === '1' ? '1.0' : (v || '1.0')
}


