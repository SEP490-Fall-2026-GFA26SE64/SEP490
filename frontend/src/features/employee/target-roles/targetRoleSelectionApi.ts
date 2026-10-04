import type {
  ChooseTargetRoleCommand,
  ChooseTargetRoleInput,
  TargetRoleSelection,
  TargetRoleSelectionSnapshot,
} from './targetRoleSelectionTypes'
import type { CareerTrack, Seniority } from './targetRoleTypes'

const TARGET_ROLE_SELECTION_URL = '/api/v1/employee/target-role-selection'
const UUID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i
const NIL_UUID = '00000000-0000-0000-0000-000000000000'
const CAREER_TRACKS: ReadonlySet<string> = new Set(['PROFESSIONAL', 'MANAGEMENT'])
const SENIORITIES: ReadonlySet<string> = new Set(['P1', 'P2', 'P3', 'P4', 'P5', 'M3', 'M4'])

export class TargetRoleSelectionApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'TargetRoleSelectionApiError'
    this.status = status
    this.code = code
  }
}

export function prepareChooseTargetRoleCommand(input: ChooseTargetRoleInput): ChooseTargetRoleCommand {
  return {
    roleId: inputUuid(input.roleId, 'roleId'),
    expectedCurrentSelectionId: input.expectedCurrentSelectionId === null
      ? null
      : inputUuid(input.expectedCurrentSelectionId, 'expectedCurrentSelectionId'),
    idempotencyKey: crypto.randomUUID(),
  }
}

export async function getTargetRoleSelection(signal: AbortSignal): Promise<TargetRoleSelection | null> {
  const response = await fetch(TARGET_ROLE_SELECTION_URL, {
    signal,
    credentials: 'same-origin',
  })
  if (response.status === 204) return null
  return parseSelection(await readJsonResponse(response))
}

export async function chooseTargetRole(command: ChooseTargetRoleCommand): Promise<TargetRoleSelection> {
  const roleId = inputUuid(command.roleId, 'roleId')
  const expectedCurrentSelectionId = command.expectedCurrentSelectionId === null
    ? null
    : inputUuid(command.expectedCurrentSelectionId, 'expectedCurrentSelectionId')
  const idempotencyKey = inputString(command.idempotencyKey, 'idempotencyKey')
  const body = expectedCurrentSelectionId === null
    ? { roleId }
    : { roleId, expectedCurrentSelectionId }

  const response = await fetch(TARGET_ROLE_SELECTION_URL, {
    method: 'PUT',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(body),
  })
  return parseSelection(await readJsonResponse(response))
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const error = isRecord(payload) ? payload : {}
    throw new TargetRoleSelectionApiError(
      response.status,
      typeof error.code === 'string' ? error.code : 'REQUEST_FAILED',
      typeof error.message === 'string'
        ? error.message
        : `Target-role selection request failed (${response.status})`,
    )
  }
  return payload
}

function parseSelection(value: unknown): TargetRoleSelection {
  if (!isRecord(value)) throw invalidResponse('selection')
  const roleId = requiredUuid(value.roleId, 'roleId')
  const roleSnapshot = parseSnapshot(value.roleSnapshot)
  if (roleSnapshot.id !== roleId) throw invalidResponse('role snapshot identity')

  const targetRevision = requiredNumber(value.targetRevision, 'targetRevision')
  if (!Number.isSafeInteger(targetRevision) || targetRevision < 1) {
    throw invalidResponse('targetRevision')
  }

  return {
    selectionId: requiredUuid(value.selectionId, 'selectionId'),
    roleId,
    roleSnapshot,
    selectedAt: requiredTimestamp(value.selectedAt, 'selectedAt'),
    targetRevision,
    changed: requiredBoolean(value.changed, 'changed'),
  }
}

function parseSnapshot(value: unknown): TargetRoleSelectionSnapshot {
  if (!isRecord(value)) throw invalidResponse('roleSnapshot')
  const track = careerTrack(value.track)
  const parsedSeniority = seniority(value.seniority)
  const expectedTrack = parsedSeniority.startsWith('P') ? 'PROFESSIONAL' : 'MANAGEMENT'
  if (track !== expectedTrack) throw invalidResponse('roleSnapshot seniority')
  return {
    id: requiredUuid(value.id, 'roleSnapshot.id'),
    code: requiredString(value.code, 'roleSnapshot.code'),
    name: requiredString(value.name, 'roleSnapshot.name'),
    track,
    seniority: parsedSeniority,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw invalidResponse(field)
  return value.trim()
}

function requiredUuid(value: unknown, field: string): string {
  const normalized = requiredString(value, field)
  if (!UUID_PATTERN.test(normalized) || normalized.toLowerCase() === NIL_UUID) throw invalidResponse(field)
  return normalized.toLowerCase()
}

function inputString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TargetRoleSelectionApiError(400, 'INVALID_REQUEST', `${field} must not be blank`)
  }
  return value.trim()
}

function inputUuid(value: unknown, field: string): string {
  const normalized = inputString(value, field)
  if (!UUID_PATTERN.test(normalized) || normalized.toLowerCase() === NIL_UUID) {
    throw new TargetRoleSelectionApiError(400, 'INVALID_REQUEST', `${field} must be a non-nil UUID`)
  }
  return normalized.toLowerCase()
}

function requiredTimestamp(value: unknown, field: string): string {
  const timestamp = requiredString(value, field)
  if (!Number.isFinite(Date.parse(timestamp))) throw invalidResponse(field)
  return timestamp
}

function requiredNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw invalidResponse(field)
  return value
}

function requiredBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') throw invalidResponse(field)
  return value
}

function careerTrack(value: unknown): CareerTrack {
  if (typeof value !== 'string' || !CAREER_TRACKS.has(value)) throw invalidResponse('track')
  return value as CareerTrack
}

function seniority(value: unknown): Seniority {
  if (typeof value !== 'string' || !SENIORITIES.has(value)) throw invalidResponse('seniority')
  return value as Seniority
}

function invalidResponse(field: string): TargetRoleSelectionApiError {
  return new TargetRoleSelectionApiError(502, 'INVALID_RESPONSE', `Invalid target-role selection ${field}`)
}
