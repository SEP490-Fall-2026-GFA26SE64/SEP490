package com.adaptlearngraph.competency.domain;

import java.util.List;

public record TargetRoleGraph(
        String roleId,
        String roleCode,
        String roleName,
        String track,
        String seniority,
        String status,
        List<RoleGraphSkill> requiredSkills,
        List<PrerequisiteEdge> prerequisites) {

    public TargetRoleGraph {
        requiredSkills = requiredSkills != null ? List.copyOf(requiredSkills) : List.of();
        prerequisites = prerequisites != null ? List.copyOf(prerequisites) : List.of();
    }
}
