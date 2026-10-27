package com.adaptlearngraph.catalog.application.port.in;

import com.adaptlearngraph.catalog.domain.RoleStatus;
import com.adaptlearngraph.catalog.domain.RoleTrack;
import com.adaptlearngraph.catalog.domain.Seniority;

import java.util.List;

public record CreateTargetRoleCommand(
        String organizationId,
        String code,
        String name,
        String domainCode,
        String familyCode,
        RoleTrack track,
        Seniority seniority,
        String assignedExpertId,
        String description,
        List<String> responsibilities,
        String version,
        RoleStatus status,
        String skillTargets,
        List<String> levels) {

    public CreateTargetRoleCommand(
            String organizationId,
            String code,
            String name,
            String domainCode,
            String familyCode,
            RoleTrack track,
            Seniority seniority,
            String assignedExpertId,
            String description,
            List<String> responsibilities,
            String version,
            RoleStatus status,
            String skillTargets) {
        this(organizationId, code, name, domainCode, familyCode, track, seniority, assignedExpertId, description, responsibilities, version, status, skillTargets, List.of("Junior", "Middle", "Senior"));
    }

    public CreateTargetRoleCommand(
            String organizationId,
            String code,
            String name,
            String domainCode,
            String familyCode,
            RoleTrack track,
            String assignedExpertId,
            String description,
            String version,
            RoleStatus status,
            String skillTargets) {
        this(organizationId, code, name, domainCode, familyCode, track, null, assignedExpertId, description, List.of(), version, status, skillTargets);
    }

    public CreateTargetRoleCommand(
            String organizationId,
            String code,
            String name,
            String domainCode,
            String familyCode,
            RoleTrack track,
            String assignedExpertId,
            String description) {
        this(organizationId, code, name, domainCode, familyCode, track, null, assignedExpertId, description, List.of(), "1.0", RoleStatus.DRAFT, "[]");
    }

    public CreateTargetRoleCommand(
            String organizationId,
            String code,
            String name,
            String familyCode,
            RoleTrack track,
            String description) {
        this(organizationId, code, name, "ICT", familyCode, track, "", description, "1.0", RoleStatus.DRAFT, "[]");
    }
}

