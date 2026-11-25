import type { Plan } from './subscriptionApi'

export type RenewalAddon = { planId: string; seats: number }

/** Renewal add-on for a plan: same-plan renewals keep the additional seats at the full-period seat price; other plans reset them. */
export function renewalAddon(plan: Plan, addon?: RenewalAddon): { seats: number; amountVnd: number } | null {
  if (!addon) return null
  const seats = addon.planId === plan.planId ? addon.seats : 0
  const { priceVnd, employeeSeats } = plan.terms
  return { seats, amountVnd: seats === 0 ? 0 : Math.ceil((priceVnd * seats) / employeeSeats) }
}
