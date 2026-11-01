export type CareerTrack = 'PROFESSIONAL' | 'MANAGEMENT'

export interface TargetRoleFilters {
  search?: string
}

export interface TargetRoleSummary {
  id: string
  code: string
  name: string
  track: CareerTrack
  description: string | null
  requirementCount: number
}

export interface TargetRoleRequirement {
  skillId: string
  skillCode: string
  skillName: string
  targetMastery: number
}

export interface TargetRoleDetail {
  id: string
  code: string
  name: string
  familyCode: string
  track: CareerTrack
  description: string | null
  responsibilities: string[]
  requirements: TargetRoleRequirement[]
}
