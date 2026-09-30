package com.adaptlearngraph.catalog.api;

import com.adaptlearngraph.catalog.domain.TargetRole;

import java.time.Instant;

public record TargetRoleResponse(
        String id,
        String organizationId,
        String code,
        String name,
        String domainCode,
        String familyCode,
        String track,
        String assignedExpertId,
        String description,
        String status,
        Instant createdAt,
        Instant updatedAt) {

    public static TargetRoleResponse fromDomain(TargetRole role) {
        return new TargetRoleResponse(
                role.getId().toString(),
                role.getOrganizationId(),
                role.getCode(),
                role.getName(),
                role.getDomainCode(),
                role.getFamilyCode(),
                role.getTrack().name(),
                role.getAssignedExpertId(),
                role.getDescription(),
                role.getStatus().name(),
                role.getCreatedAt(),
                role.getUpdatedAt());
    }
}

