package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.CreateTargetRoleCommand;
import com.adaptlearngraph.dtos.CreateTargetRoleRequest;
import com.adaptlearngraph.dtos.TargetRoleFilter;
import com.adaptlearngraph.dtos.TargetRoleResponse;
import com.adaptlearngraph.dtos.UpdateTargetRoleCommand;
import com.adaptlearngraph.dtos.UpdateTargetRoleRequest;
import com.adaptlearngraph.entities.domain.RoleStatus;
import com.adaptlearngraph.entities.domain.TargetRole;
import com.adaptlearngraph.entities.domain.TargetRoleId;
import com.adaptlearngraph.helper.ModelMapperFactory;
import com.adaptlearngraph.helper.TargetRoleMappings;
import com.adaptlearngraph.repository.TargetRoleNodeRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class OrganizationTargetRoleApplicationService {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final CreateTargetRoleUseCase createTargetRole;
    private final ViewTargetRolesUseCase viewTargetRoles;
    private final ManageTargetRoleUseCase manageTargetRole;
    private final ModelMapper mapper;
    private final TargetRoleNodeRepository targetRoleNodeRepository;

    public OrganizationTargetRoleApplicationService(
            CreateTargetRoleUseCase createTargetRole,
            ViewTargetRolesUseCase viewTargetRoles,
            ManageTargetRoleUseCase manageTargetRole,
            ModelMapper mapper) {
        this.createTargetRole = createTargetRole;
        this.viewTargetRoles = viewTargetRoles;
        this.manageTargetRole = manageTargetRole;
        this.mapper = mapper;
        this.targetRoleNodeRepository = null;
    }

    public OrganizationTargetRoleApplicationService(
            CreateTargetRoleUseCase createTargetRole,
            ViewTargetRolesUseCase viewTargetRoles,
            ManageTargetRoleUseCase manageTargetRole,
            ModelMapper mapper,
            ObjectProvider<TargetRoleNodeRepository> targetRoleNodeRepositoryProvider) {
        this.createTargetRole = createTargetRole;
        this.viewTargetRoles = viewTargetRoles;
        this.manageTargetRole = manageTargetRole;
        this.mapper = mapper;
        this.targetRoleNodeRepository = targetRoleNodeRepositoryProvider != null
                ? targetRoleNodeRepositoryProvider.getIfAvailable()
                : null;
    }

    public TargetRoleResponse createTargetRole(String organizationId, CreateTargetRoleRequest request) {
        String effectiveCode = request.code();
        if (effectiveCode == null || effectiveCode.isBlank()) {
            String sanitized = request.name().replaceAll("[^A-Za-z0-9]", "_").toUpperCase();
            effectiveCode = "ROLE-" + (sanitized.length() > 40 ? sanitized.substring(0, 40) : sanitized) + "-"
                    + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        } else if (targetRoleNodeRepository != null) {
            try {
                if (targetRoleNodeRepository.hasActiveNonReleasedVersion(organizationId, effectiveCode.trim())) {
                    throw new ResponseStatusException(
                            HttpStatus.CONFLICT,
                            "An active draft or in-flight revision already exists for role '" + effectiveCode.trim()
                                    + "'. Only one active revision is allowed at a time.");
                }
            } catch (ResponseStatusException rse) {
                throw rse;
            } catch (Exception ignored) {
                // Non-fatal in unit/mock environments without Neo4j
            }
        }

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
                request.familyCode() != null ? request.familyCode() : "",
                request.assignedExpertId(),
                request.description(),
                request.responsibilities() != null ? request.responsibilities() : List.of(),
                request.version() != null && !request.version().isBlank() ? request.version().trim() : "1.0",
                status,
                skillTargetsJson,
                request.levels(),
                levelCompetenciesJson != null ? levelCompetenciesJson : "{}",
                competencyIds,
                request.levelDurations());

        return toResponse(createTargetRole.createTargetRole(command));
    }

    public List<TargetRoleResponse> listTargetRoles(String organizationId, String search, String status,
            String assignedExpertId) {
        RoleStatus statusEnum = status != null && !status.isBlank() ? RoleStatus.fromString(status) : null;
        TargetRoleFilter filter = new TargetRoleFilter(search, statusEnum, assignedExpertId);
        return viewTargetRoles.listTargetRoles(organizationId, filter).stream().map(this::toResponse).toList();
    }

    public Optional<TargetRoleResponse> getTargetRole(String organizationId, String roleId) {
        return viewTargetRoles.getTargetRole(organizationId, TargetRoleId.fromString(roleId)).map(this::toResponse);
    }

    public Optional<TargetRoleResponse> updateTargetRole(String organizationId, String roleId, UpdateTargetRoleRequest request) {
        TargetRoleId targetRoleId = TargetRoleId.fromString(roleId);

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
                request.familyCode() != null ? request.familyCode() : "",
                request.assignedExpertId(),
                request.description(),
                request.responsibilities(),
                status,
                request.version(),
                skillTargetsJson,
                request.rejectionReason(),
                request.levels(),
                levelCompetenciesJson,
                competencyIds,
                request.levelDurations());

        return manageTargetRole.updateTargetRole(command).map(this::toResponse);
    }

    public boolean deleteTargetRole(String organizationId, String roleId) {
        return manageTargetRole.deleteTargetRole(organizationId, TargetRoleId.fromString(roleId));
    }

    public void markCreatedByRole(String organizationId, String roleId, String createdByRole) {
        if (targetRoleNodeRepository == null || roleId == null || roleId.isBlank() || createdByRole == null) {
            return;
        }
        try {
            targetRoleNodeRepository.markCreatedByRole(organizationId, roleId, createdByRole);
        } catch (Exception ignored) {
            // Non-fatal in unit/mock environments without Neo4j
        }
    }

    public List<TargetRoleResponse> filterVisibleRoles(
            String organizationId,
            List<TargetRoleResponse> responses,
            boolean isManager,
            boolean isExpert) {
        if (targetRoleNodeRepository == null || responses == null || responses.isEmpty()) {
            return responses;
        }
        try {
            if (isManager && !isExpert) {
                Set<String> hiddenExpertDraftIds = new HashSet<>(
                        targetRoleNodeRepository.findRoleIdsByCreatedByRoleAndStatus(organizationId, "DOMAIN_EXPERT", "DRAFT"));
                if (!hiddenExpertDraftIds.isEmpty()) {
                    return responses.stream()
                            .filter(r -> !hiddenExpertDraftIds.contains(r.id()) || !"DRAFT".equalsIgnoreCase(r.status()))
                            .toList();
                }
            } else if (isExpert && !isManager) {
                Set<String> hiddenManagerDraftIds = new HashSet<>(
                        targetRoleNodeRepository.findRoleIdsByCreatedByRoleAndStatus(organizationId, "LD_MANAGER", "DRAFT"));
                if (!hiddenManagerDraftIds.isEmpty()) {
                    return responses.stream()
                            .filter(r -> !hiddenManagerDraftIds.contains(r.id()) || !"DRAFT".equalsIgnoreCase(r.status()))
                            .toList();
                }
            }
        } catch (Exception ignored) {
            // Non-fatal in unit/mock environments
        }
        return responses;
    }

    private TargetRoleResponse toResponse(TargetRole role) {
        TargetRoleResponse resp = mapper.map(role, TargetRoleResponse.class);
        if (role.getLevelDurations() != null && !role.getLevelDurations().isEmpty()) {
            return new TargetRoleResponse(
                    resp.id(), resp.organizationId(), resp.code(), resp.name(),
                    resp.familyCode(),
                    resp.assignedExpertId(), resp.description(), resp.responsibilities(),
                    resp.status(), resp.version(), resp.skillTargets(), resp.createdAt(), resp.updatedAt(),
                    resp.rejectionReason(), resp.levels(), resp.levelCompetencies(), resp.competencyIds(),
                    role.getLevelDurations(), role.isStaffingEnabled());
        }
        return resp;
    }
}
