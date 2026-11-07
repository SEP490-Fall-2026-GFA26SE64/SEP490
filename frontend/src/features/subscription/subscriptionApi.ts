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
  workspaceSlug: string | null
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
export interface Workspace {
  organizationId: string; name: string; status: string; setupState: string
  subscription: { status: string; current: { name: string; startsAt: string; endsAt: string } | null }
  administrators: { accountId: string; fullName: string | null; email: string; active: boolean; accountActive: boolean }[]
}
export interface Member {
  membershipId: string; fullName: string | null; email: string; active: boolean; roles: string[]; revision: number
  accountId: string; accountActive: boolean; departmentId: string | null; departmentName: string | null
  jobPositionReferenceId: string | null; jobPositionName: string | null
  targetRoleId?: string | null
  targetRoleCode?: string | null
  targetRoleName?: string | null
  targetRoleLevel?: string | null
}
export interface PendingActivation {
  activationId: string; fullName: string; email: string; roles: string[]; departmentId: string | null; departmentName: string | null
  jobPositionReferenceId: string | null; jobPositionName: string | null; createdAt: string; expiresAt: string; state: string; deliveryStatus: string
  targetRoleId?: string | null
  targetRoleCode?: string | null
  targetRoleName?: string | null
  targetRoleLevel?: string | null
}
export interface MemberProfileInput {
  fullName: string; roles: string[]; departmentId: string | null; jobPositionReferenceId: string | null; revision: number
  departmentName?: string | null
  jobPositionName?: string | null
  targetRoleId?: string | null
  targetRoleCode?: string | null
  targetRoleName?: string | null
  targetRoleLevel?: string | null
}
export interface Reference { departmentId: string; departmentName: string; jobPositionReferenceId: string; jobPositionName: string }
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
    fullName: nullable(v.fullName, text), roles: list(v.roles, text), stage: text(v.stage), workspaceReady: boolean(v.workspaceReady),
    workspaceSlug: v.workspaceSlug === undefined ? null : nullable(v.workspaceSlug, text) }
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
export async function request(path: string, method = 'GET', payload?: unknown, customHeaders?: Record<string, string>): Promise<unknown> {
  const headers: Record<string, string> = { ...customHeaders }
  if (method !== 'GET') {
    const base = path.startsWith('/api/v1/registration/') ? '/api/v1/registration' : '/api/v1/workspace-auth'
    const csrf = object(await read(await fetch(`${base}/csrf`, { credentials: 'same-origin', cache: 'no-store' })))
    headers[text(csrf.headerName)] = text(csrf.token)
    if (payload !== undefined) {
      headers['Content-Type'] = 'application/json'
    }
  }
  return read(await fetch(path, { method, headers, credentials: 'same-origin', cache: 'no-store',
    body: method === 'GET' || payload === undefined ? undefined : JSON.stringify(payload ?? {}) }))
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
    const subscription = object(v.subscription)
    return {
      organizationId: text(v.organizationId), name: text(v.name), status: text(v.status), setupState: text(v.setupState),
      subscription: { status: text(subscription.status), current: nullable(subscription.current, value => {
        const period = object(value)
        return { name: text(period.name), startsAt: text(period.startsAt), endsAt: text(period.endsAt) }
      }) },
      administrators: list(v.administrators, value => {
        const admin = object(value)
        return { accountId: text(admin.accountId), fullName: nullable(admin.fullName, text), email: text(admin.email),
          active: boolean(admin.active), accountActive: boolean(admin.accountActive) }
      }),
    }
  })
}
const TR_DELIMITER = ' || TR:'

export interface DecodedJobPositionTargetRole {
  cleanJobPositionName: string | null
  targetRoleId: string | null
  targetRoleCode: string | null
  targetRoleName: string | null
  targetRoleLevel: string | null
}

export function decodeJobPositionWithTargetRole(raw: string | null | undefined): DecodedJobPositionTargetRole {
  if (!raw) {
    return {
      cleanJobPositionName: null,
      targetRoleId: null,
      targetRoleCode: null,
      targetRoleName: null,
      targetRoleLevel: null,
    }
  }
  const idx = raw.indexOf(TR_DELIMITER)
  if (idx === -1) {
    return {
      cleanJobPositionName: raw,
      targetRoleId: null,
      targetRoleCode: null,
      targetRoleName: null,
      targetRoleLevel: null,
    }
  }
  const clean = raw.slice(0, idx).trim()
  const meta = raw.slice(idx + TR_DELIMITER.length).trim()
  const parts = meta.split('::')
  const roleId = parts[0]?.trim() || null
  const roleCode = parts[1]?.trim() || roleId
  const roleName = parts[2]?.trim() || roleCode
  const rawRoleLevel = parts[3]?.trim() || null
  const roleLevel = rawRoleLevel ? rawRoleLevel.replace(/^(?:rank|level)\s*\d+\s*:\s*/i, '').trim() : null
  return {
    cleanJobPositionName: clean || null,
    targetRoleId: roleId,
    targetRoleCode: roleCode,
    targetRoleName: roleName,
    targetRoleLevel: roleLevel || null,
  }
}

export function encodeJobPositionWithTargetRole(
  rawJobPositionName: string | null | undefined,
  targetRoleId?: string | null,
  targetRoleCode?: string | null,
  targetRoleName?: string | null,
  targetRoleLevel?: string | null,
): string | null {
  const base = decodeJobPositionWithTargetRole(rawJobPositionName)
  const clean = base.cleanJobPositionName
  const effRoleId = targetRoleId?.trim() || null
  if (!effRoleId) {
    return clean
  }
  const effCode = targetRoleCode?.trim() || effRoleId
  const effName = targetRoleName?.trim() || effCode
  const effLevel = (targetRoleLevel?.trim() || '').replace(/^(?:rank|level)\s*\d+\s*:\s*/i, '').trim()
  return `${clean || ''}${TR_DELIMITER}${effRoleId}::${effCode}::${effName}::${effLevel}`
}

function syncEmployeeAssignmentCache(member: Member): void {
  if (typeof localStorage === 'undefined' || !member.email) return
  try {
    const emailKey = `alg_employee_assignment_${member.email.toLowerCase().trim()}`
    const existingRaw = localStorage.getItem(emailKey)
    const existing = existingRaw ? (JSON.parse(existingRaw) as Record<string, unknown>) : null
    if (member.targetRoleId) {
      localStorage.setItem(
        emailKey,
        JSON.stringify({
          ...(existing || {}),
          roleId: member.targetRoleId,
          roleCode: member.targetRoleCode || member.targetRoleId,
          roleTitle: member.targetRoleName || member.targetRoleCode || member.targetRoleId,
          level: member.targetRoleLevel || 'Junior',
          departmentId: member.departmentId || existing?.departmentId || null,
          departmentName: member.departmentName || existing?.departmentName || null,
          jobPositionName: member.jobPositionName || existing?.jobPositionName || null,
        }),
      )
    } else if (existing && (member.departmentName || member.jobPositionName)) {
      localStorage.setItem(
        emailKey,
        JSON.stringify({
          ...existing,
          departmentId: member.departmentId || existing.departmentId || null,
          departmentName: member.departmentName || existing.departmentName || null,
          jobPositionName: member.jobPositionName || existing.jobPositionName || null,
        }),
      )
    } else if (!existing && (member.departmentName || member.jobPositionName)) {
      localStorage.setItem(
        emailKey,
        JSON.stringify({
          departmentId: member.departmentId || null,
          departmentName: member.departmentName || null,
          jobPositionName: member.jobPositionName || null,
        }),
      )
    }
  } catch {
    // ignore storage errors
  }
}

export async function getMembers(organization: string): Promise<Member[]> {
  return list(await request(`/api/v1/organizations/${organization}/subscription/members`), parseMember)
}
function parseMember(value: unknown): Member {
  const v = object(value)
  const rawJpName = nullable(v.jobPositionName, text)
  const decoded = decodeJobPositionWithTargetRole(rawJpName)
  const directRoleId = v.targetRoleId !== undefined && v.targetRoleId !== null ? String(v.targetRoleId) : null
  const directRoleCode = v.targetRoleCode !== undefined && v.targetRoleCode !== null ? String(v.targetRoleCode) : null
  const directRoleName = v.targetRoleName !== undefined && v.targetRoleName !== null ? String(v.targetRoleName) : null
  const directRoleLevel = v.targetRoleLevel !== undefined && v.targetRoleLevel !== null ? String(v.targetRoleLevel) : null

  const email = text(v.email)
  let fallbackRoleId: string | null = null
  let fallbackRoleCode: string | null = null
  let fallbackRoleName: string | null = null
  let fallbackRoleLevel: string | null = null
  if (typeof localStorage !== 'undefined' && email) {
    try {
      const savedRaw = localStorage.getItem(`alg_employee_assignment_${email.toLowerCase().trim()}`)
      if (savedRaw) {
        const saved = JSON.parse(savedRaw) as {
          roleId?: string
          roleCode?: string
          roleTitle?: string
          level?: string
        }
        fallbackRoleId = saved.roleId || null
        fallbackRoleCode = saved.roleCode || saved.roleId || null
        fallbackRoleName = saved.roleTitle || saved.roleCode || null
        fallbackRoleLevel = saved.level || null
      }
    } catch {
      // ignore storage errors
    }
  }

  const member: Member = {
    membershipId: text(v.membershipId),
    accountId: text(v.accountId),
    fullName: nullable(v.fullName, text),
    email,
    active: boolean(v.active),
    accountActive: boolean(v.accountActive),
    roles: list(v.roles, text),
    revision: number(v.revision),
    departmentId: nullable(v.departmentId, text),
    departmentName: nullable(v.departmentName, text),
    jobPositionReferenceId: nullable(v.jobPositionReferenceId, text),
    jobPositionName: decoded.cleanJobPositionName,
    targetRoleId: directRoleId || decoded.targetRoleId || fallbackRoleId,
    targetRoleCode: directRoleCode || decoded.targetRoleCode || fallbackRoleCode,
    targetRoleName: directRoleName || decoded.targetRoleName || fallbackRoleName,
    targetRoleLevel: directRoleLevel || decoded.targetRoleLevel || fallbackRoleLevel,
  }
  syncEmployeeAssignmentCache(member)
  return member
}
export async function updateMemberProfile(organization: string, memberId: string, input: MemberProfileInput): Promise<Member> {
  const isEmployee = input.roles.includes('EMPLOYEE')
  const encodedJobPositionName = isEmployee
    ? encodeJobPositionWithTargetRole(
        input.jobPositionName,
        input.targetRoleId,
        input.targetRoleCode,
        input.targetRoleName,
        input.targetRoleLevel,
      )
    : decodeJobPositionWithTargetRole(input.jobPositionName).cleanJobPositionName
  const scopedJobPositionReferenceId =
    input.jobPositionReferenceId && isEmployee && input.targetRoleId
      ? `${input.departmentId || organization}:${input.jobPositionReferenceId}:${memberId}`
      : input.jobPositionReferenceId
  const payload: MemberProfileInput = {
    ...input,
    jobPositionReferenceId: scopedJobPositionReferenceId,
    jobPositionName: encodedJobPositionName,
  }
  return parseMember(await request(`/api/v1/organizations/${organization}/subscription/members/${memberId}/profile`, 'PUT', payload))
}
export async function getPendingActivations(organization: string): Promise<PendingActivation[]> {
  return list(await request(`/api/v1/organizations/${organization}/subscription/activations`), value => {
    const v = object(value)
    const rawJpName = nullable(v.jobPositionName, text)
    const decoded = decodeJobPositionWithTargetRole(rawJpName)
    return { activationId: text(v.activationId), fullName: text(v.fullName), email: text(v.email), roles: list(v.roles, text),
      departmentId: nullable(v.departmentId, text), departmentName: nullable(v.departmentName, text),
      jobPositionReferenceId: nullable(v.jobPositionReferenceId, text), jobPositionName: decoded.cleanJobPositionName,
      createdAt: text(v.createdAt), expiresAt: text(v.expiresAt), state: text(v.state), deliveryStatus: text(v.deliveryStatus),
      targetRoleId: decoded.targetRoleId, targetRoleCode: decoded.targetRoleCode,
      targetRoleName: decoded.targetRoleName, targetRoleLevel: decoded.targetRoleLevel }
  })
}
export async function getReferences(organization: string): Promise<Reference[]> {
  return list(await request(`/api/v1/organizations/${organization}/subscription/member-references`), value => {
    const v = object(value)
    const decoded = decodeJobPositionWithTargetRole(text(v.jobPositionName))
    return { departmentId: text(v.departmentId), departmentName: text(v.departmentName),
      jobPositionReferenceId: text(v.jobPositionReferenceId), jobPositionName: decoded.cleanJobPositionName || text(v.jobPositionName) }
  })
}
