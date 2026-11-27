package com.adaptlearngraph.helper;

import com.adaptlearngraph.entities.domain.TargetRoleDetail;
import com.adaptlearngraph.entities.domain.TargetRoleRequirement;
import com.adaptlearngraph.entities.domain.TargetRoleSummary;
import java.util.List;

public final class TargetRoleResponseMapper {
    private TargetRoleResponseMapper() {}

    public static SummaryResponse toResponse(TargetRoleSummary role) {
        return new SummaryResponse(
                role.id(), role.code(), role.name(),
                role.description(), role.requirementCount());
    }

    public static DetailResponse toResponse(TargetRoleDetail role) {
        return new DetailResponse(
                role.id(), role.code(), role.name(),
                role.description(), role.responsibilities(),
                role.requirements().stream().map(TargetRoleResponseMapper::toResponse).toList());
    }

    private static RequirementResponse toResponse(TargetRoleRequirement requirement) {
        return new RequirementResponse(
                requirement.skillId(), requirement.skillCode(), requirement.skillName(), requirement.targetMastery());
    }

    public record SummaryResponse(
            String id,
            String code,
            String name,
            String description,
            int requirementCount) {}

    public record DetailResponse(
            String id,
            String code,
            String name,
            String description,
            List<String> responsibilities,
            List<RequirementResponse> requirements) {}

    record RequirementResponse(
            String skillId,
            String skillCode,
            String skillName,
            Double targetMastery) {}
}
