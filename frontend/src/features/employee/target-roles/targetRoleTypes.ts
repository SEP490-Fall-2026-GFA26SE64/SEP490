export type CareerTrack = 'PROFESSIONAL' | 'MANAGEMENT'

export type Seniority = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'M3' | 'M4'

export interface TargetRoleFilters {
  search?: string
  seniority?: Seniority | null
}

export interface TargetRoleSummary {
  id: string
  code: string
  name: string
  track: CareerTrack
  seniority: Seniority
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
  seniority: Seniority
  description: string | null
  responsibilities: string[]
  requirements: TargetRoleRequirement[]
}
