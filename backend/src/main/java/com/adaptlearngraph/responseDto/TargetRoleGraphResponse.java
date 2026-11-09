package com.adaptlearngraph.responseDto;

import com.adaptlearngraph.dtos.PrerequisiteResponse;
import com.adaptlearngraph.entities.domain.TargetRoleGraph;
import java.util.List;

public record TargetRoleGraphResponse(
        String roleId,
        String roleCode,
        String roleName,
        String track,
        String status,
        List<RoleGraphSkillResponse> requiredSkills,
        List<PrerequisiteResponse> prerequisites) {

    public record RoleGraphSkillResponse(
            String skillId,
            String skillCode,
            String skillName,
            List<String> requiredKnowledgeLevels,
            String status,
            String level) {}

    public static TargetRoleGraphResponse fromDomain(TargetRoleGraph graph) {
        List<RoleGraphSkillResponse> skills = graph.requiredSkills().stream()
                .map(s -> new RoleGraphSkillResponse(
                        s.skillId(),
                        s.skillCode(),
                        s.skillName(),
                        s.requiredKnowledgeLevels(),
                        s.status().name(),
                        s.level()))
                .toList();

        List<PrerequisiteResponse> edges = graph.prerequisites().stream()
                .map(PrerequisiteResponse::fromDomain)
                .toList();

        return new TargetRoleGraphResponse(
                graph.roleId(),
                graph.roleCode(),
                graph.roleName(),
                graph.track(),
                graph.status(),
                skills,
                edges);
    }
}
