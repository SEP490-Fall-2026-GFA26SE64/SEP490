export const INDUSTRIES = [
  'Software Engineering & AI',
  'Cloud Infrastructure & DevOps',
  'Data Engineering & Analytics',
  'Cybersecurity & Network Systems',
  'Enterprise Financial Technology',
] as const

export const HEADCOUNTS = [
  '1 - 20 employees', '21 - 50 employees', '51 - 200 employees', '200+ employees',
] as const

export interface RegistrationFields {
  organizationName: string
  subdomain: string | null
  industry: string | null
  headcount: string | null
  adminName: string
  adminEmail: string
}

export interface RegistrationInput extends RegistrationFields {
  password: string
}

export type RegistrationStage =
  | 'VERIFY_EMAIL' | 'SETUP_MFA' | 'CHALLENGE_MFA'
  | 'RECOVERY_REQUIRED' | 'SETUP_MFA_RECOVERY' | 'COMPLETE'

export interface RegistrationView {
  registrationId: string | null
  stage: RegistrationStage
  email: string
  fields: RegistrationFields | null
  deliveryStatus: 'NOT_REQUESTED' | 'PENDING' | 'SENT' | 'FAILED'
  resendAvailableAt: string | null
  emailVerifiedAt: string | null
  completedAt: string | null
}

export interface Enrollment {
  manualSecret: string
  email: string
}

export interface EnrollmentCompletion {
  registration: RegistrationView
  recoveryCodes: string[]
}

export class RegistrationApiError extends Error {
  readonly status: number
  readonly code: string
  readonly field: string | null
  readonly retryAfterSeconds: number

  constructor(
    status: number,
    code: string,
    message: string,
    field: string | null = null,
    retryAfterSeconds = 0,
  ) {
    super(message)
    this.name = 'RegistrationApiError'
    this.status = status
    this.code = code
    this.field = field
    this.retryAfterSeconds = retryAfterSeconds
  }
}

const BASE = '/api/v1/registration'

export async function getRegistration(signal?: AbortSignal): Promise<RegistrationView | null> {
  const response = await fetch(`${BASE}/current`, { signal, credentials: 'same-origin', cache: 'no-store' })
  if (response.status === 401) return null
  return parseRegistration(await readResponse(response))
}

export async function registerOrganization(input: RegistrationInput): Promise<RegistrationView> {
  return parseRegistration(await post('', input))
}

export async function signInRegistration(email: string, password: string): Promise<RegistrationView> {
  return parseRegistration(await post('/sign-in', { email, password }))
}

export async function resendRegistrationEmail(): Promise<RegistrationView> {
  return parseRegistration(await post('/email/resend', {}))
}

export async function verifyRegistrationEmail(code: string): Promise<RegistrationView> {
  return parseRegistration(await post('/email/verify', { code }))
}

export async function setupRegistrationTotp(): Promise<Enrollment> {
  const value = record(await post('/totp/setup', {}))
  const manualSecret = text(value.manualSecret)
  if (!/^[A-Z2-7]{32}$/.test(manualSecret)) throw invalidResponse()
  return { manualSecret, email: text(value.email) }
}

export async function confirmRegistrationTotp(code: string): Promise<EnrollmentCompletion> {
  const value = record(await post('/totp/confirm', { code }))
  if (!Array.isArray(value.recoveryCodes) || value.recoveryCodes.length !== 10) throw invalidResponse()
  const recoveryCodes = value.recoveryCodes.map(text)
  if (new Set(recoveryCodes).size !== 10 || recoveryCodes.some(code => !/^[a-f0-9]{32}$/.test(code))) throw invalidResponse()
  const registration = parseRegistration(value.registration)
  if (registration.stage !== 'COMPLETE') throw invalidResponse()
  return { registration, recoveryCodes }
}

export async function verifyRegistrationTotp(code: string): Promise<RegistrationView> {
  return parseRegistration(await post('/totp/verify', { code }))
}

export async function recoverRegistrationTotp(code: string): Promise<RegistrationView> {
  return parseRegistration(await post('/recovery', { code }))
}

export async function signOutRegistration(): Promise<void> {
  await post('/sign-out', {})
}

async function post(path: string, body: object): Promise<unknown> {
  const csrf = record(await readResponse(await fetch(`${BASE}/csrf`, {
    credentials: 'same-origin', cache: 'no-store',
  })))
  const header = text(csrf.headerName)
  if (header !== 'X-CSRF-TOKEN') throw invalidResponse()
  return readResponse(await fetch(`${BASE}${path}`, {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', [header]: text(csrf.token) },
    body: JSON.stringify(body),
  }))
}

async function readResponse(response: Response): Promise<unknown> {
  if (response.status === 204) return null
  let payload: unknown
  try {
    payload = JSON.parse(await response.text())
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
    if (response.ok) throw invalidResponse()
    throw new RegistrationApiError(response.status, 'REQUEST_FAILED',
      `Registration request failed (${response.status}). Please retry.`)
  }
  if (!response.ok) {
    const data = isRecord(payload) ? payload : {}
    throw new RegistrationApiError(response.status,
      typeof data.code === 'string' ? data.code : 'REQUEST_FAILED',
      typeof data.message === 'string' ? data.message : `Registration request failed (${response.status}).`,
      typeof data.field === 'string' ? data.field : null,
      typeof data.retryAfterSeconds === 'number' && Number.isFinite(data.retryAfterSeconds)
        ? Math.max(0, data.retryAfterSeconds) : 0,
    )
  }
  return payload
}

function parseRegistration(payload: unknown): RegistrationView {
  const value = record(payload)
  const stage = value.stage
  if (stage !== 'VERIFY_EMAIL' && stage !== 'SETUP_MFA' && stage !== 'CHALLENGE_MFA'
    && stage !== 'RECOVERY_REQUIRED' && stage !== 'SETUP_MFA_RECOVERY' && stage !== 'COMPLETE') throw invalidResponse()
  const deliveryStatus = value.deliveryStatus
  if (deliveryStatus !== 'NOT_REQUESTED' && deliveryStatus !== 'PENDING'
    && deliveryStatus !== 'SENT' && deliveryStatus !== 'FAILED') throw invalidResponse()
  const fields = value.fields === null ? null : parseFields(value.fields)
  const registrationId = nullableText(value.registrationId)
  const completedAt = timestamp(value.completedAt)
  const emailVerifiedAt = timestamp(value.emailVerifiedAt)
  const email = text(value.email)
  if (stage === 'COMPLETE' && (!fields || !registrationId || !completedAt
    || fields.adminEmail !== email || fields.subdomain === null)) throw invalidResponse()
  if (stage !== 'COMPLETE' && fields !== null) throw invalidResponse()
  return {
    registrationId, stage, email, fields, deliveryStatus,
    resendAvailableAt: timestamp(value.resendAvailableAt), emailVerifiedAt, completedAt,
  }
}

function parseFields(payload: unknown): RegistrationFields {
  const value = record(payload)
  const industry = nullableText(value.industry)
  const headcount = nullableText(value.headcount)
  if (industry !== null && !INDUSTRIES.some(choice => choice === industry)) throw invalidResponse()
  if (headcount !== null && !HEADCOUNTS.some(choice => choice === headcount)) throw invalidResponse()
  return {
    organizationName: text(value.organizationName), subdomain: nullableText(value.subdomain),
    industry, headcount, adminName: text(value.adminName), adminEmail: text(value.adminEmail),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw invalidResponse()
  return value
}

function text(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) throw invalidResponse()
  return value
}

function nullableText(value: unknown): string | null {
  return value === null ? null : text(value)
}

function timestamp(value: unknown): string | null {
  const parsed = nullableText(value)
  if (parsed !== null && !Number.isFinite(Date.parse(parsed))) throw invalidResponse()
  return parsed
}

function invalidResponse(): RegistrationApiError {
  return new RegistrationApiError(502, 'INVALID_RESPONSE', 'The registration service returned an invalid response. Please retry.')
}
