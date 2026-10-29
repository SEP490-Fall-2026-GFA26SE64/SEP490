export interface Terms {
  name: string
  description: string
  priceVnd: number
  currency: string
  durationMonths: number
  employeeSeats: number
}
export interface Plan { planId: string; versionId: string; code: string; revision: number; terms: Terms }
export interface Identity {
  accountId: string | null
  organizationId: string | null
  email: string
  fullName: string | null
  roles: string[]
  stage: string
  workspaceReady: boolean
}
export interface Order {
  orderId: string; terms: Terms; paymentStatus: string; checkoutUrl: string | null
  providerOrderCode: number; confirmedAt: string | null
  createdAt: string; expiresAt: string; failureCode: string | null; observedPaidAmount: number | null
}
export interface Setup { organizationId: string | null; state: string; failureCode: string | null }
export interface Status { order: Order | null; applicationState: string; workspace: Setup | null }
export interface Period { periodId: string; startsAt: string; endsAt: string; terms: Terms }
export interface Summary {
  organizationId: string; organizationName: string; workspaceStatus: string; subscriptionStatus: string; current: Period | null
  scheduled: Period | null; usedSeats: number; allocatedSeats: number; admissionLimit: number; paymentHistory: Order[]
}
export interface Workspace { organizationId: string; name: string; status: string; setupState: string }
export interface Member {
  membershipId: string; fullName: string | null; email: string; active: boolean; roles: string[]; revision: number
  accountId: string; accountActive: boolean; departmentId: string | null; departmentName: string | null
  occupationReferenceId: string | null; occupationName: string | null
}
export interface PendingActivation {
  activationId: string; fullName: string; email: string; roles: string[]; departmentId: string | null; departmentName: string | null
  occupationReferenceId: string | null; occupationName: string | null; createdAt: string; expiresAt: string; state: string; deliveryStatus: string
}
export interface MemberProfileInput {
  fullName: string; roles: string[]; departmentId: string | null; occupationReferenceId: string | null; revision: number
}
export interface Reference { departmentId: string; departmentName: string; occupationReferenceId: string; occupationName: string }
export class SubscriptionApiError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid server response.')
  return value as Record<string, unknown>
}
function text(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Invalid server text.')
  return value
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) throw new Error('Invalid server number.')
  return value
}
function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new Error('Invalid server state.')
  return value
}
function nullable<T>(value: unknown, parse: (value: unknown) => T): T | null { return value === null ? null : parse(value) }
function list<T>(value: unknown, parse: (value: unknown) => T): T[] {
  if (!Array.isArray(value)) throw new Error('Invalid server list.')
  return value.map(parse)
}
export function parseTerms(value: unknown): Terms {
  const v = object(value)
  return { name: text(v.name), description: text(v.description), priceVnd: number(v.priceVnd),
    currency: text(v.currency), durationMonths: number(v.durationMonths), employeeSeats: number(v.employeeSeats) }
}
export function parsePlan(value: unknown): Plan {
  const v = object(value)
  return { planId: text(v.planId), versionId: text(v.versionId), code: text(v.code), revision: number(v.revision), terms: parseTerms(v.terms) }
}
function parseIdentity(value: unknown): Identity {
  const v = object(value)
  return { accountId: nullable(v.accountId, text), organizationId: nullable(v.organizationId, text), email: text(v.email),
    fullName: nullable(v.fullName, text), roles: list(v.roles, text), stage: text(v.stage), workspaceReady: boolean(v.workspaceReady) }
}
function parseOrder(value: unknown): Order {
  const v = object(value)
  const checkoutUrl = nullable(v.checkoutUrl, text)
  if (checkoutUrl) {
    const url = new URL(checkoutUrl)
    if (url.protocol !== 'https:' || url.hostname !== 'pay.payos.vn' || url.username || url.password) throw new Error('Invalid checkout URL.')
  }
  return { orderId: text(v.orderId), terms: parseTerms(v.terms), paymentStatus: text(v.paymentStatus), checkoutUrl,
    providerOrderCode: number(v.providerOrderCode), confirmedAt: nullable(v.confirmedAt, text),
    createdAt: text(v.createdAt), expiresAt: text(v.expiresAt), failureCode: nullable(v.failureCode, text),
    observedPaidAmount: nullable(v.observedPaidAmount, number) }
}
function parseSetup(value: unknown): Setup {
  const v = object(value)
  return { organizationId: nullable(v.organizationId, text), state: text(v.state), failureCode: nullable(v.failureCode, text) }
}
export function parseStatus(value: unknown): Status {
  const v = object(value)
  return { order: nullable(v.order, parseOrder), applicationState: text(v.applicationState), workspace: nullable(v.workspace, parseSetup) }
}
function parsePeriod(value: unknown): Period {
  const v = object(value)
  return { periodId: text(v.periodId), startsAt: text(v.startsAt), endsAt: text(v.endsAt), terms: parseTerms(v.terms) }
}
function parseSummary(value: unknown): Summary {
  const v = object(value)
  return { organizationId: text(v.organizationId), organizationName: text(v.organizationName), workspaceStatus: text(v.workspaceStatus), subscriptionStatus: text(v.subscriptionStatus),
    current: nullable(v.current, parsePeriod), scheduled: nullable(v.scheduled, parsePeriod), usedSeats: number(v.usedSeats),
    allocatedSeats: number(v.allocatedSeats), admissionLimit: number(v.admissionLimit), paymentHistory: list(v.paymentHistory, parseOrder) }
}
async function read(response: Response): Promise<unknown> {
  if (response.ok && (response.status === 204 || response.headers.get('content-length') === '0')) return null
  const body = await response.text()
  let value: unknown = null
  if (body) {
    try { value = JSON.parse(body) } catch { throw new SubscriptionApiError(response.status, 'INVALID_RESPONSE', 'The server returned an invalid response.') }
  }
  if (!response.ok) {
    const error = value === null ? {} : object(value)
    throw new SubscriptionApiError(response.status, typeof error.code === 'string' ? error.code : 'REQUEST_FAILED',
      typeof error.message === 'string' ? error.message : 'The request failed.')
  }
  return value
}
export async function request(path: string, method = 'GET', payload?: unknown): Promise<unknown> {
  const headers: Record<string, string> = {}
  if (method !== 'GET') {
    const base = path.startsWith('/api/v1/registration/') ? '/api/v1/registration' : '/api/v1/workspace-auth'
    const csrf = object(await read(await fetch(`${base}/csrf`, { credentials: 'same-origin', cache: 'no-store' })))
    headers[text(csrf.headerName)] = text(csrf.token)
    headers['Content-Type'] = 'application/json'
  }
  return read(await fetch(path, { method, headers, credentials: 'same-origin', cache: 'no-store',
    body: method === 'GET' ? undefined : JSON.stringify(payload ?? {}) }))
}
export async function getIdentity(): Promise<Identity | null> {
  const response = await fetch('/api/v1/workspace-auth/current', { credentials: 'same-origin', cache: 'no-store' })
  return response.status === 401 ? null : parseIdentity(await read(response))
}
export async function authenticate(path: string, payload: unknown): Promise<Identity> {
  return parseIdentity(await request(`/api/v1/workspace-auth/${path}`, 'POST', payload))
}
export async function setupTotp(): Promise<{ manualSecret: string; email: string }> {
  const value = object(await request('/api/v1/workspace-auth/totp/setup', 'POST'))
  return { manualSecret: text(value.manualSecret), email: text(value.email) }
}
export async function completeTotp(code: string): Promise<{ identity: Identity; recoveryCodes: string[] }> {
  const value = object(await request('/api/v1/workspace-auth/totp/confirm', 'POST', { code }))
  return { identity: parseIdentity(value.identity), recoveryCodes: list(value.recoveryCodes, text) }
}
export async function enterWorkspace(): Promise<Identity> {
  return parseIdentity(await request('/api/v1/registration/workspace-session', 'POST'))
}
export async function getPlans(path: string): Promise<Plan[]> { return list(await request(path), parsePlan) }
export async function updatePlan(plan: Plan, terms: Terms): Promise<Plan> {
  return parsePlan(await request(`/api/v1/platform/subscription-plans/${plan.planId}`, 'PUT', { expectedVersionId: plan.versionId, ...terms }))
}
export async function getStatus(base: string, orderId?: string): Promise<Status> {
  return parseStatus(await request(orderId ? `/api/v1/${base.includes('/registration/') ? 'registration/' : ''}subscription/orders/${encodeURIComponent(orderId)}` :
    base.includes('/registration/') ? `${base}/current` : `${base}/current-order`))
}
export async function createOrder(base: string, plan: Plan, idempotencyKey: string, replacesOrderId?: string): Promise<Status> {
  return parseStatus(await request(`${base}/orders`, 'POST', { planId: plan.planId, expectedVersionId: plan.versionId, idempotencyKey, replacesOrderId }))
}
export async function reconcileOrder(guest: boolean, orderId: string): Promise<Status> {
  return parseStatus(await request(`/api/v1/${guest ? 'registration/' : ''}subscription/orders/${encodeURIComponent(orderId)}/reconcile`, 'POST'))
}
export async function getSummary(organization: string): Promise<Summary> { return parseSummary(await request(`/api/v1/organizations/${organization}/subscription`)) }
export async function getWorkspaces(): Promise<Workspace[]> {
  return list(await request('/api/v1/platform/workspaces'), value => {
    const v = object(value)
    return { organizationId: text(v.organizationId), name: text(v.name), status: text(v.status), setupState: text(v.setupState) }
  })
}
export async function getMembers(organization: string): Promise<Member[]> {
  return list(await request(`/api/v1/organizations/${organization}/subscription/members`), parseMember)
}
function parseMember(value: unknown): Member {
  const v = object(value)
  return { membershipId: text(v.membershipId), accountId: text(v.accountId), fullName: nullable(v.fullName, text), email: text(v.email),
    active: boolean(v.active), accountActive: boolean(v.accountActive), roles: list(v.roles, text), revision: number(v.revision),
    departmentId: nullable(v.departmentId, text), departmentName: nullable(v.departmentName, text),
    occupationReferenceId: nullable(v.occupationReferenceId, text), occupationName: nullable(v.occupationName, text) }
}
export async function updateMemberProfile(organization: string, memberId: string, input: MemberProfileInput): Promise<Member> {
  return parseMember(await request(`/api/v1/organizations/${organization}/subscription/members/${memberId}/profile`, 'PUT', input))
}
export async function getPendingActivations(organization: string): Promise<PendingActivation[]> {
  return list(await request(`/api/v1/organizations/${organization}/subscription/activations`), value => {
    const v = object(value)
    return { activationId: text(v.activationId), fullName: text(v.fullName), email: text(v.email), roles: list(v.roles, text),
      departmentId: nullable(v.departmentId, text), departmentName: nullable(v.departmentName, text),
      occupationReferenceId: nullable(v.occupationReferenceId, text), occupationName: nullable(v.occupationName, text),
      createdAt: text(v.createdAt), expiresAt: text(v.expiresAt), state: text(v.state), deliveryStatus: text(v.deliveryStatus) }
  })
}
export async function getReferences(organization: string): Promise<Reference[]> {
  return list(await request(`/api/v1/organizations/${organization}/subscription/member-references`), value => {
    const v = object(value)
    return { departmentId: text(v.departmentId), departmentName: text(v.departmentName),
      occupationReferenceId: text(v.occupationReferenceId), occupationName: text(v.occupationName) }
  })
}
