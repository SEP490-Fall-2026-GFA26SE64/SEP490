package com.adaptlearngraph.catalog.api;

import com.adaptlearngraph.catalog.domain.TargetRole;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record TargetRoleResponse(
        String id,
        String organizationId,
        String code,
        String name,
        String domainCode,
        String familyCode,
        String track,
        String seniority,
        String assignedExpertId,
        String description,
        List<String> responsibilities,
        String status,
        String version,
        List<Map<String, Object>> skillTargets,
        Instant createdAt,
        Instant updatedAt,
        String rejectionReason,
        List<String> levels) {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    public static TargetRoleResponse fromDomain(TargetRole role) {
        List<Map<String, Object>> skills = List.of();
        if (role.getSkillTargets() != null && !role.getSkillTargets().isBlank()) {
            try {
                skills = OBJECT_MAPPER.readValue(role.getSkillTargets(), new TypeReference<List<Map<String, Object>>>() {});
            } catch (Exception ignored) {
                skills = List.of();
            }
        }

        return new TargetRoleResponse(
                role.getId().toString(),
                role.getOrganizationId(),
                role.getCode(),
                role.getName(),
                role.getDomainCode(),
                role.getFamilyCode(),
                role.getTrack().name(),
                role.getSeniority() != null ? role.getSeniority().name() : null,
                role.getAssignedExpertId(),
                role.getDescription(),
                role.getResponsibilities() != null ? role.getResponsibilities() : List.of(),
                role.getStatus().name(),
                role.getVersion(),
                skills,
                role.getCreatedAt(),
                role.getUpdatedAt(),
                role.getRejectionReason(),
                role.getLevels() != null && !role.getLevels().isEmpty() ? role.getLevels() : List.of("Junior", "Middle", "Senior"));
    }
}

