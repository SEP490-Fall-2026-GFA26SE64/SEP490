import type { Member, PendingActivation, Summary } from '../../subscription/subscriptionApi'

export type AlertLevel = 'ok' | 'warning' | 'critical'

export const SEAT_WARNING_RATIO = 0.9
export const EXPIRY_WARNING_DAYS = 14
const DAY_MS = 24 * 60 * 60 * 1000

export const DASHBOARD_ROLES = ['ORGANIZATION_ADMINISTRATOR', 'LD_MANAGER', 'DOMAIN_EXPERT', 'EMPLOYEE'] as const

// Matches the backend catalog rule: ACTIVE and PUBLISHED target roles are both available to employees.
const PUBLISHED_TARGET_ROLE_STATUSES = new Set(['ACTIVE', 'PUBLISHED'])

export function publishedTargetRoleCount(statuses: string[]) {
  return statuses.filter(status => PUBLISHED_TARGET_ROLE_STATUSES.has(status.toUpperCase())).length
}

export function isActiveMember(member: Member) {
  return member.active && member.accountActive
}

export function memberStats(members: Member[]) {
  const active = members.filter(isActiveMember)
  const byRole = Object.fromEntries(DASHBOARD_ROLES.map(role => [role, 0])) as Record<(typeof DASHBOARD_ROLES)[number], number>
  for (const member of active) {
    for (const role of member.roles) {
      if (role in byRole) byRole[role as keyof typeof byRole] += 1
    }
  }
  return { total: members.length, active: active.length, inactive: members.length - active.length, byRole }
}

export function seatStatus(summary: Pick<Summary, 'usedSeats' | 'allocatedSeats'>) {
  const { usedSeats: used, allocatedSeats: allocated } = summary
  const ratio = allocated > 0 ? used / allocated : null
  let level: AlertLevel = 'ok'
  if (allocated > 0 && used >= allocated) level = 'critical'
  else if (ratio !== null && ratio >= SEAT_WARNING_RATIO) level = 'warning'
  return { used, allocated, percent: ratio === null ? null : Math.round(ratio * 100), level }
}

export function subscriptionStatus(
  summary: Pick<Summary, 'subscriptionStatus' | 'current' | 'scheduled'>,
  now: Date = new Date(),
) {
  const endsAt = summary.current ? new Date(summary.current.endsAt) : null
  const daysRemaining = endsAt && !Number.isNaN(endsAt.getTime())
    ? Math.ceil((endsAt.getTime() - now.getTime()) / DAY_MS)
    : null
  let level: AlertLevel = 'ok'
  if (summary.subscriptionStatus !== 'ACTIVE' || daysRemaining === null || daysRemaining <= 0) level = 'critical'
  else if (daysRemaining <= EXPIRY_WARNING_DAYS && !summary.scheduled) level = 'warning'
  return { planName: summary.current?.terms.name ?? null, endsAt: summary.current?.endsAt ?? null, daysRemaining, level }
}

export function actionItems(members: Member[], invitations: PendingActivation[]) {
  const pending = invitations.filter(invitation => invitation.state === 'PENDING')
  return {
    pendingInvitations: pending.length,
    expiredInvitations: invitations.filter(invitation => invitation.state === 'EXPIRED').length,
    failedDeliveries: pending.filter(invitation => invitation.deliveryStatus === 'FAILED').length,
    employeesMissingAssignment: members.filter(member =>
      isActiveMember(member) && member.roles.includes('EMPLOYEE') &&
      (!member.departmentId || !member.jobPositionReferenceId || !member.targetRoleId)).length,
  }
}

export function membersByDepartment(members: Member[]) {
  const counts = new Map<string | null, number>()
  for (const member of members.filter(isActiveMember)) {
    const key = member.departmentName?.trim() || null
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => (a.name === null ? 1 : b.name === null ? -1 : b.count - a.count || a.name.localeCompare(b.name)))
}
