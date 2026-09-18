export interface TeamMemberGap {
  id: string
  name: string
  currentRole: string
  targetRole: string
  readinessScore: number
  criticalGap: string
  hoursSaved: number
  status: 'ready' | 'on_track' | 'needs_attention'
}

export const TEAM_MEMBERS: TeamMemberGap[] = [
  {
    id: 'emp-1',
    name: 'Sarah Chen',
    currentRole: 'Data Engineer',
    targetRole: 'AI Knowledge Architect',
    readinessScore: 78,
    criticalGap: 'Graph Neural Networks (GNN)',
    hoursSaved: 32.5,
    status: 'on_track',
  },
  {
    id: 'emp-2',
    name: 'Marcus Vance',
    currentRole: 'Backend Developer',
    targetRole: 'Machine Learning Engineer',
    readinessScore: 42,
    criticalGap: 'Linear Algebra & Deep Learning',
    hoursSaved: 16.0,
    status: 'needs_attention',
  },
  {
    id: 'emp-3',
    name: 'Elena Rostova',
    currentRole: 'Frontend Specialist',
    targetRole: 'Full-Stack Knowledge Engineer',
    readinessScore: 92,
    criticalGap: 'Neo4j Bolt Driver Optimization',
    hoursSaved: 54.0,
    status: 'ready',
  },
]

export const TOTAL_HOURS_SAVED = TEAM_MEMBERS.reduce((acc, m) => acc + m.hoursSaved, 0)
export const AVERAGE_READINESS = Math.round(
  TEAM_MEMBERS.reduce((acc, m) => acc + m.readinessScore, 0) / TEAM_MEMBERS.length,
)
