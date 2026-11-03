package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.CreateTargetRoleCommand;
import com.adaptlearngraph.dtos.CreateTargetRoleRequest;
import com.adaptlearngraph.dtos.TargetRoleFilter;
import com.adaptlearngraph.dtos.TargetRoleResponse;
import com.adaptlearngraph.dtos.UpdateTargetRoleCommand;
import com.adaptlearngraph.dtos.UpdateTargetRoleRequest;
import com.adaptlearngraph.entities.domain.RoleStatus;
import com.adaptlearngraph.entities.domain.RoleTrack;
import com.adaptlearngraph.entities.domain.TargetRole;
import com.adaptlearngraph.entities.domain.TargetRoleId;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.modelmapper.ModelMapper;

/**
 * DTO boundary of the organization target-role API. The organization and role ids always come from the request path;
 * request bodies are translated into commands explicitly.
 */
public class OrganizationTargetRoleApplicationService {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private final CreateTargetRoleUseCase createTargetRole;
    private final ViewTargetRolesUseCase viewTargetRoles;
    private final ManageTargetRoleUseCase manageTargetRole;
    private final ModelMapper mapper;

    public OrganizationTargetRoleApplicationService(CreateTargetRoleUseCase createTargetRole,
            ViewTargetRolesUseCase viewTargetRoles, ManageTargetRoleUseCase manageTargetRole, ModelMapper mapper) {
        this.createTargetRole = Objects.requireNonNull(createTargetRole, "createTargetRole");
        this.viewTargetRoles = Objects.requireNonNull(viewTargetRoles, "viewTargetRoles");
        this.manageTargetRole = Objects.requireNonNull(manageTargetRole, "manageTargetRole");
        this.mapper = Objects.requireNonNull(mapper, "mapper");
    }

    public TargetRoleResponse createTargetRole(String organizationId, CreateTargetRoleRequest request) {
        String effectiveCode = request.code();
        if (effectiveCode == null || effectiveCode.isBlank()) {
            String sanitized = request.name().replaceAll("[^A-Za-z0-9]", "_").toUpperCase();
            effectiveCode = "ROLE-" + (sanitized.length() > 40 ? sanitized.substring(0, 40) : sanitized) + "-"
                    + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        }

        RoleTrack track = request.track() != null && !request.track().isBlank()
                ? RoleTrack.fromString(request.track())
                : RoleTrack.PROFESSIONAL;

        RoleStatus status = request.status() != null && !request.status().isBlank()
                ? RoleStatus.fromString(request.status())
                : RoleStatus.DRAFT;

        String skillTargetsJson = "[]";
        if (request.skillTargets() != null && !request.skillTargets().isEmpty()) {
            try {
                skillTargetsJson = OBJECT_MAPPER.writeValueAsString(request.skillTargets());
            } catch (Exception ignored) {}
        }

        String levelCompetenciesJson = null;
        if (request.levelCompetencies() != null && !request.levelCompetencies().isEmpty()) {
            try {
                levelCompetenciesJson = OBJECT_MAPPER.writeValueAsString(request.levelCompetencies());
            } catch (Exception ignored) {}
        }

        List<String> competencyIds = request.competencyIds() != null ? new ArrayList<>(request.competencyIds()) : new ArrayList<>();
        if (competencyIds.isEmpty() && request.levelCompetencies() != null) {
            request.levelCompetencies().values().forEach(competencyIds::addAll);
            competencyIds = competencyIds.stream().distinct().toList();
        }

        CreateTargetRoleCommand command = new CreateTargetRoleCommand(
                organizationId,
                effectiveCode,
                request.name(),
                request.familyCode(),
                track,
                request.assignedExpertId(),
                request.description(),
                request.responsibilities() != null ? request.responsibilities() : List.of(),
                request.version() != null && !request.version().isBlank() ? request.version().trim() : "1.0",
                status,
                skillTargetsJson,
                request.levels(),
                levelCompetenciesJson != null ? levelCompetenciesJson : "{}",
                competencyIds);

        return toResponse(createTargetRole.createTargetRole(command));
    }

    public List<TargetRoleResponse> listTargetRoles(String organizationId, String search, String track, String status,
            String assignedExpertId) {
        RoleTrack trackEnum = track != null && !track.isBlank() ? RoleTrack.fromString(track) : null;
        RoleStatus statusEnum = status != null && !status.isBlank() ? RoleStatus.fromString(status) : null;
        TargetRoleFilter filter = new TargetRoleFilter(search, trackEnum, statusEnum, assignedExpertId);
        return viewTargetRoles.listTargetRoles(organizationId, filter).stream().map(this::toResponse).toList();
    }

    public Optional<TargetRoleResponse> getTargetRole(String organizationId, String roleId) {
        return viewTargetRoles.getTargetRole(organizationId, TargetRoleId.fromString(roleId)).map(this::toResponse);
    }

    public Optional<TargetRoleResponse> updateTargetRole(String organizationId, String roleId, UpdateTargetRoleRequest request) {
        TargetRoleId targetRoleId = TargetRoleId.fromString(roleId);

        RoleTrack track = request.track() != null && !request.track().isBlank()
                ? RoleTrack.fromString(request.track())
                : null;

        String skillTargetsJson = null;
        if (request.skillTargets() != null) {
            try {
                skillTargetsJson = OBJECT_MAPPER.writeValueAsString(request.skillTargets());
            } catch (Exception ignored) {}
        }

        RoleStatus status = request.status() != null && !request.status().isBlank()
                ? RoleStatus.fromString(request.status())
                : null;

        String levelCompetenciesJson = null;
        if (request.levelCompetencies() != null) {
            try {
                levelCompetenciesJson = OBJECT_MAPPER.writeValueAsString(request.levelCompetencies());
            } catch (Exception ignored) {}
        }

        List<String> competencyIds = request.competencyIds() != null ? new ArrayList<>(request.competencyIds()) : null;
        if ((competencyIds == null || competencyIds.isEmpty()) && request.levelCompetencies() != null) {
            List<String> derived = new ArrayList<>();
            request.levelCompetencies().values().forEach(derived::addAll);
            competencyIds = derived.stream().distinct().toList();
        }

        UpdateTargetRoleCommand command = new UpdateTargetRoleCommand(
                organizationId,
                targetRoleId,
                request.name(),
                request.familyCode(),
                track,
                request.assignedExpertId(),
                request.description(),
                request.responsibilities(),
                status,
                request.version(),
                skillTargetsJson,
                request.rejectionReason(),
                request.levels(),
                levelCompetenciesJson,
                competencyIds);

        return manageTargetRole.updateTargetRole(command).map(this::toResponse);
    }

    public boolean deleteTargetRole(String organizationId, String roleId) {
        return manageTargetRole.deleteTargetRole(organizationId, TargetRoleId.fromString(roleId));
    }

    private TargetRoleResponse toResponse(TargetRole role) {
        return mapper.map(role, TargetRoleResponse.class);
    }
}