import { describe, expect, it } from 'vitest'
import type { Member, PendingActivation } from '../../subscription/subscriptionApi'
import { actionItems, memberStats, membersByDepartment, publishedTargetRoleCount, seatStatus, subscriptionStatus } from './adminDashboardMetrics'

function member(overrides: Partial<Member> = {}): Member {
  return {
    membershipId: crypto.randomUUID(), fullName: 'User', email: 'u@example.com', active: true, roles: ['EMPLOYEE'], revision: 1,
    accountId: crypto.randomUUID(), accountActive: true, departmentId: 'd1', departmentName: 'Engineering',
    jobPositionReferenceId: 'jp1', jobPositionName: 'Developer', targetRoleId: 'tr1', ...overrides,
  }
}

function invitation(overrides: Partial<PendingActivation> = {}): PendingActivation {
  return {
    activationId: crypto.randomUUID(), fullName: 'Invitee', email: 'i@example.com', roles: ['EMPLOYEE'], departmentId: null,
    departmentName: null, jobPositionReferenceId: null, jobPositionName: null, createdAt: '2026-11-01T00:00:00Z',
    expiresAt: '2026-11-08T00:00:00Z', state: 'PENDING', deliveryStatus: 'SENT', ...overrides,
  }
}

const terms = { name: 'Growth', description: '', priceVnd: 1, currency: 'VND', durationMonths: 1, employeeSeats: 10 }
const now = new Date('2026-11-19T00:00:00Z')
const period = (endsAt: string) => ({ periodId: 'p', startsAt: '2026-11-01T00:00:00Z', endsAt, terms, planId: null, addonSeats: 0, totalSeats: 10 })

describe('adminDashboardMetrics', () => {
  it('counts only active memberships by role', () => {
    const stats = memberStats([
      member({ roles: ['ORGANIZATION_ADMINISTRATOR'] }), member(), member({ active: false }), member({ accountActive: false, roles: ['LD_MANAGER'] }),
    ])
    expect(stats).toMatchObject({ total: 4, active: 2, inactive: 2 })
    expect(stats.byRole).toEqual({ ORGANIZATION_ADMINISTRATOR: 1, LD_MANAGER: 0, DOMAIN_EXPERT: 0, EMPLOYEE: 1 })
  })

  it.each([
    [8, 10, 'ok', 80], [9, 10, 'warning', 90], [10, 10, 'critical', 100], [0, 0, 'ok', null],
  ])('rates %i of %i seats as %s', (usedSeats, allocatedSeats, level, percent) => {
    expect(seatStatus({ usedSeats, allocatedSeats })).toMatchObject({ level, percent })
  })

  it('warns 14 days before expiry only when no period is scheduled', () => {
    const current = period('2026-12-03T00:00:00Z')
    expect(subscriptionStatus({ subscriptionStatus: 'ACTIVE', current, scheduled: null }, now)).toMatchObject({ daysRemaining: 14, level: 'warning', planName: 'Growth' })
    expect(subscriptionStatus({ subscriptionStatus: 'ACTIVE', current, scheduled: period('2027-01-03T00:00:00Z') }, now).level).toBe('ok')
    expect(subscriptionStatus({ subscriptionStatus: 'ACTIVE', current: period('2026-12-04T00:00:00Z'), scheduled: null }, now).level).toBe('ok')
  })

  it('marks missing, expired or inactive subscriptions as critical', () => {
    expect(subscriptionStatus({ subscriptionStatus: 'NONE', current: null, scheduled: null }, now)).toMatchObject({ level: 'critical', daysRemaining: null })
    expect(subscriptionStatus({ subscriptionStatus: 'ACTIVE', current: period('2026-11-18T00:00:00Z'), scheduled: null }, now).level).toBe('critical')
    expect(subscriptionStatus({ subscriptionStatus: 'EXPIRED', current: period('2027-01-01T00:00:00Z'), scheduled: null }, now).level).toBe('critical')
  })

  it('collects invitation and employee assignment action items', () => {
    const items = actionItems(
      [member(), member({ targetRoleId: null }), member({ departmentId: null }), member({ roles: ['DOMAIN_EXPERT'], departmentId: null }), member({ active: false, targetRoleId: null })],
      [invitation(), invitation({ deliveryStatus: 'FAILED' }), invitation({ state: 'EXPIRED' })],
    )
    expect(items).toEqual({ pendingInvitations: 2, expiredInvitations: 1, failedDeliveries: 1, employeesMissingAssignment: 2 })
  })

  it('groups active members by department with unassigned last', () => {
    expect(membersByDepartment([
      member({ departmentName: null }), member({ departmentName: 'Sales' }), member(), member(), member({ active: false, departmentName: 'Sales' }),
    ])).toEqual([{ name: 'Engineering', count: 2 }, { name: 'Sales', count: 1 }, { name: null, count: 1 }])
  })

  it('counts ACTIVE and PUBLISHED target roles as published', () => {
    expect(publishedTargetRoleCount(['ACTIVE', 'published', 'DRAFT', 'IN_REVIEW', 'ARCHIVED'])).toBe(2)
  })
})
