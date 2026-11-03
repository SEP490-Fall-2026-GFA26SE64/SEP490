package com.adaptlearngraph.helper;

import com.adaptlearngraph.dtos.TargetRoleResponse;
import com.adaptlearngraph.entities.domain.TargetRole;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.modelmapper.ModelMapper;

/** TypeMaps for the organization target-role management API. */
public final class TargetRoleMappings implements ModelMapperRegistrar {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final List<String> DEFAULT_LEVELS = List.of("Junior", "Middle", "Senior");

    @Override
    public void register(ModelMapper mapper) {
        mapper.typeMap(TargetRole.class, TargetRoleResponse.class).setConverter(context -> toResponse(context.getSource()));
    }

    private static TargetRoleResponse toResponse(TargetRole role) {
        List<Map<String, Object>> skills = List.of();
        if (role.getSkillTargets() != null && !role.getSkillTargets().isBlank()) {
            try {
                skills = OBJECT_MAPPER.readValue(role.getSkillTargets(), new TypeReference<List<Map<String, Object>>>() {});
            } catch (Exception ignored) {
                skills = List.of();
            }
        }
        Map<String, List<String>> levelCompetencies = Map.of();
        if (role.getLevelCompetencies() != null && !role.getLevelCompetencies().isBlank()
                && !role.getLevelCompetencies().equals("{}")) {
            try {
                levelCompetencies = OBJECT_MAPPER.readValue(role.getLevelCompetencies(),
                        new TypeReference<Map<String, List<String>>>() {});
            } catch (Exception ignored) {
                levelCompetencies = Map.of();
            }
        }
        List<String> competencyIds = role.getCompetencyIds() != null ? role.getCompetencyIds() : List.of();
        return new TargetRoleResponse(
                role.getId().toString(),
                role.getOrganizationId(),
                role.getCode(),
                role.getName(),
                role.getFamilyCode(),
                role.getTrack().name(),
                role.getAssignedExpertId(),
                role.getDescription(),
                role.getResponsibilities() != null ? role.getResponsibilities() : List.of(),
                role.getStatus().name(),
                role.getVersion(),
                skills,
                role.getCreatedAt(),
                role.getUpdatedAt(),
                role.getRejectionReason(),
                role.getLevels() != null && !role.getLevels().isEmpty() ? role.getLevels() : DEFAULT_LEVELS,
                levelCompetencies,
                competencyIds);
    }
}