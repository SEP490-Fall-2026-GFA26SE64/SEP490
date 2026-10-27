import type { CareerTrack, Seniority } from './targetRoleTypes'

export interface TargetRoleSelectionSnapshot {
  id: string
  code: string
  name: string
  track: CareerTrack
  seniority: Seniority
  requirementCount?: number
}

export interface TargetRoleSelection {
  selectionId: string
  roleId: string
  roleSnapshot: TargetRoleSelectionSnapshot
  selectedAt: string
  targetRevision: number
  changed: boolean
}

export interface ChooseTargetRoleInput {
  roleId: string
  expectedCurrentSelectionId: string | null
}

export interface ChooseTargetRoleCommand extends ChooseTargetRoleInput {
  idempotencyKey: string
}
