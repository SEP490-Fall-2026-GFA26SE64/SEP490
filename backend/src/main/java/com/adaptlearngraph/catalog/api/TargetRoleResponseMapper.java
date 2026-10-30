package com.adaptlearngraph.catalog.api;

import com.adaptlearngraph.catalog.domain.CareerTrack;
import com.adaptlearngraph.catalog.domain.Seniority;
import com.adaptlearngraph.catalog.domain.TargetRoleDetail;
import com.adaptlearngraph.catalog.domain.TargetRoleRequirement;
import com.adaptlearngraph.catalog.domain.TargetRoleSummary;
import java.util.List;

final class TargetRoleResponseMapper {
    private TargetRoleResponseMapper() {}

    static SummaryResponse toResponse(TargetRoleSummary role) {
        return new SummaryResponse(
                role.id(), role.code(), role.name(), role.track(), role.seniority(),
                role.description(), role.requirementCount());
    }

    static DetailResponse toResponse(TargetRoleDetail role) {
        return new DetailResponse(
                role.id(), role.code(), role.name(), role.familyCode(), role.track(), role.seniority(),
                role.description(), role.responsibilities(),
                role.requirements().stream().map(TargetRoleResponseMapper::toResponse).toList());
    }

    private static RequirementResponse toResponse(TargetRoleRequirement requirement) {
        return new RequirementResponse(
                requirement.skillId(), requirement.skillCode(), requirement.skillName(), requirement.targetMastery());
    }

    record SummaryResponse(
            String id,
            String code,
            String name,
            CareerTrack track,
            Seniority seniority,
            String description,
            int requirementCount) {}

    record DetailResponse(
            String id,
            String code,
            String name,
            String familyCode,
            CareerTrack track,
            Seniority seniority,
            String description,
            List<String> responsibilities,
            List<RequirementResponse> requirements) {}

    record RequirementResponse(
            String skillId,
            String skillCode,
            String skillName,
            double targetMastery) {}
}
