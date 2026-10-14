import type { BlueprintRole } from './baselineBlueprintApi'

type CatalogRole = Omit<BlueprintRole, 'totalQuestionCount'>

const skills = {
  java: ['40000000-0000-0000-0000-000000000001', 'Java Core'],
  spring: ['40000000-0000-0000-0000-000000000002', 'Spring Boot'],
  docker: ['40000000-0000-0000-0000-000000000005', 'Containerization with Docker'],
  kubernetes: ['40000000-0000-0000-0000-000000000006', 'Kubernetes Cluster Orchestration'],
  leadership: ['40000000-0000-0000-0000-000000000011', 'Engineering Leadership'],
  postgres: ['40000000-0000-0000-0000-000000000012', 'PostgreSQL Data Persistence'],
  rest: ['40000000-0000-0000-0000-000000000013', 'REST API Design'],
  linux: ['40000000-0000-0000-0000-000000000014', 'Linux Systems'],
  cicd: ['40000000-0000-0000-0000-000000000015', 'CI/CD Delivery Automation'],
  observability: ['40000000-0000-0000-0000-000000000016', 'System Observability'],
} as const

function role(roleId: string, roleNameSnapshot: string, selected: (readonly [string, string])[]): CatalogRole {
  return {
    roleId,
    roleNameSnapshot,
    enabled: true,
    easyScoreWeight: 0.3,
    mediumScoreWeight: 0.4,
    hardScoreWeight: 0.3,
    skills: selected.map(([microSkillId, microSkillNameSnapshot]) => ({
      microSkillId,
      microSkillNameSnapshot,
      easyQuestionCount: 1,
      mediumQuestionCount: 1,
      hardQuestionCount: 1,
    })),
  }
}

const developmentRoles: CatalogRole[] = [
  role('20000000-0000-0000-0000-000000000001', 'Java Backend Developer P3', [
    skills.java, skills.spring, skills.postgres, skills.rest, skills.leadership,
  ]),
  role('20000000-0000-0000-0000-000000000002', 'Platform Engineer P4', [
    skills.docker, skills.kubernetes, skills.linux, skills.cicd, skills.observability,
  ]),
]

export function developmentBaselineRoles(): BlueprintRole[] {
  if (!import.meta.env.DEV) return []
  return structuredClone(developmentRoles)
}
