package com.adaptlearngraph.competency.api;

import com.adaptlearngraph.competency.domain.TargetRoleGraph;
import java.util.List;

public record TargetRoleGraphResponse(
        String roleId,
        String roleCode,
        String roleName,
        String track,
        String seniority,
        String status,
        List<RoleGraphSkillResponse> requiredSkills,
        List<PrerequisiteResponse> prerequisites) {

    public record RoleGraphSkillResponse(
            String skillId,
            String skillCode,
            String skillName,
            String macroCompetencyCode,
            double targetMastery,
            String status) {}

    public static TargetRoleGraphResponse fromDomain(TargetRoleGraph graph) {
        List<RoleGraphSkillResponse> skills = graph.requiredSkills().stream()
                .map(s -> new RoleGraphSkillResponse(
                        s.skillId(),
                        s.skillCode(),
                        s.skillName(),
                        s.macroCompetencyCode(),
                        s.targetMastery(),
                        s.status().name()))
                .toList();

        List<PrerequisiteResponse> edges = graph.prerequisites().stream()
                .map(PrerequisiteResponse::fromDomain)
                .toList();

        return new TargetRoleGraphResponse(
                graph.roleId(),
                graph.roleCode(),
                graph.roleName(),
                graph.track(),
                graph.seniority(),
                graph.status(),
                skills,
                edges);
    }
}
