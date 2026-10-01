package com.adaptlearngraph.catalog.api;

import com.adaptlearngraph.catalog.application.DuplicateTargetRoleException;
import com.adaptlearngraph.catalog.application.port.in.CreateTargetRoleCommand;
import com.adaptlearngraph.catalog.application.port.in.CreateTargetRoleUseCase;
import com.adaptlearngraph.catalog.application.port.in.ManageTargetRoleUseCase;
import com.adaptlearngraph.catalog.application.port.in.TargetRoleFilter;
import com.adaptlearngraph.catalog.application.port.in.UpdateTargetRoleCommand;
import com.adaptlearngraph.catalog.application.port.in.ViewTargetRolesUseCase;
import com.adaptlearngraph.catalog.domain.RoleStatus;
import com.adaptlearngraph.catalog.domain.RoleTrack;
import com.adaptlearngraph.catalog.domain.TargetRole;
import com.adaptlearngraph.catalog.domain.TargetRoleId;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/organizations/{organizationId}/target-roles")
public class OrganizationTargetRoleController {

    private final CreateTargetRoleUseCase createTargetRoleUseCase;
    private final ViewTargetRolesUseCase viewTargetRolesUseCase;
    private final ManageTargetRoleUseCase manageTargetRoleUseCase;

    public OrganizationTargetRoleController(
            CreateTargetRoleUseCase createTargetRoleUseCase,
            ViewTargetRolesUseCase viewTargetRolesUseCase,
            ManageTargetRoleUseCase manageTargetRoleUseCase) {
        this.createTargetRoleUseCase = createTargetRoleUseCase;
        this.viewTargetRolesUseCase = viewTargetRolesUseCase;
        this.manageTargetRoleUseCase = manageTargetRoleUseCase;
    }

    private static final com.fasterxml.jackson.databind.ObjectMapper OBJECT_MAPPER = new com.fasterxml.jackson.databind.ObjectMapper();

    @PostMapping
    public ResponseEntity<?> createTargetRole(
            @PathVariable("organizationId") String organizationId,
            @RequestHeader(value = "X-User-Role", required = false, defaultValue = "LD_MANAGER") String userRole,
            @Valid @RequestBody CreateTargetRoleRequest request) {

        if (!isAuthorizedManager(userRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden", "message", "Only L&D Managers and Administrators can create target roles"));
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

        CreateTargetRoleCommand command = new CreateTargetRoleCommand(
                organizationId,
                request.code(),
                request.name(),
                request.domainCode(),
                request.familyCode(),
                track,
                request.assignedExpertId(),
                request.description(),
                request.version() != null && !request.version().isBlank() ? request.version().trim() : "1.0",
                status,
                skillTargetsJson);

        TargetRole created = createTargetRoleUseCase.createTargetRole(command);
        TargetRoleResponse response = TargetRoleResponse.fromDomain(created);

        return ResponseEntity.created(URI.create("/api/v1/organizations/" + organizationId + "/target-roles/" + response.id()))
                .body(response);
    }

    @GetMapping
    public ResponseEntity<?> listTargetRoles(
            @PathVariable("organizationId") String organizationId,
            @RequestHeader(value = "X-User-Role", required = false, defaultValue = "LD_MANAGER") String userRole,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "track", required = false) String track,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "domainCode", required = false) String domainCode,
            @RequestParam(value = "assignedExpertId", required = false) String assignedExpertId) {

        boolean isManager = isAuthorizedManager(userRole);
        boolean isExpert = isDomainExpert(userRole);

        if (!isManager && !isExpert) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden", "message", "Only L&D Managers, Administrators, and assigned Domain Experts can view organization target roles"));
        }

        String effectiveExpertFilter = assignedExpertId;
        if (isExpert && !isManager) {
            if (userId != null && !userId.isBlank()) {
                effectiveExpertFilter = userId.trim();
            }
        }

        RoleTrack trackEnum = track != null && !track.isBlank() ? RoleTrack.fromString(track) : null;
        RoleStatus statusEnum = status != null && !status.isBlank() ? RoleStatus.fromString(status) : null;

        TargetRoleFilter filter = new TargetRoleFilter(search, trackEnum, statusEnum, domainCode, effectiveExpertFilter);
        List<TargetRole> roles = viewTargetRolesUseCase.listTargetRoles(organizationId, filter);

        List<TargetRoleResponse> responses = roles.stream()
                .map(TargetRoleResponse::fromDomain)
                .toList();

        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{roleId}")
    public ResponseEntity<?> getTargetRole(
            @PathVariable("organizationId") String organizationId,
            @PathVariable("roleId") String roleId,
            @RequestHeader(value = "X-User-Role", required = false, defaultValue = "LD_MANAGER") String userRole,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {

        boolean isManager = isAuthorizedManager(userRole);
        boolean isExpert = isDomainExpert(userRole);

        if (!isManager && !isExpert) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden", "message", "Only L&D Managers, Administrators, and assigned Domain Experts can view target roles"));
        }

        UUID uuid;
        try {
            uuid = UUID.fromString(roleId);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid ID", "message", "Target role ID must be a valid UUID"));
        }

        Optional<TargetRole> roleOpt = viewTargetRolesUseCase.getTargetRole(organizationId, new TargetRoleId(uuid));
        if (roleOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        TargetRole role = roleOpt.get();

        if (isExpert && !isManager) {
            if (userId != null && !userId.isBlank() && !userId.trim().equalsIgnoreCase(role.getAssignedExpertId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Forbidden", "message", "Domain Expert is not assigned to this target role"));
            }
        }

        return ResponseEntity.ok(TargetRoleResponse.fromDomain(role));
    }

    @PutMapping("/{roleId}")
    public ResponseEntity<?> updateTargetRole(
            @PathVariable("organizationId") String organizationId,
            @PathVariable("roleId") String roleId,
            @RequestHeader(value = "X-User-Role", required = false, defaultValue = "LD_MANAGER") String userRole,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @Valid @RequestBody UpdateTargetRoleRequest request) {

        boolean isManager = isAuthorizedManager(userRole);
        boolean isExpert = isDomainExpert(userRole);

        if (!isManager && !isExpert) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden", "message", "Only L&D Managers, Administrators, and assigned Domain Experts can update target roles"));
        }

        UUID uuid;
        try {
            uuid = UUID.fromString(roleId);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid ID", "message", "Target role ID must be a valid UUID"));
        }

        if (isExpert && !isManager) {
            Optional<TargetRole> existingOpt = viewTargetRolesUseCase.getTargetRole(organizationId, new TargetRoleId(uuid));
            if (existingOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            TargetRole existingRole = existingOpt.get();
            if (userId != null && !userId.isBlank() && !userId.trim().equalsIgnoreCase(existingRole.getAssignedExpertId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Forbidden", "message", "Domain Expert is not assigned to this target role"));
            }
        }

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

        UpdateTargetRoleCommand command = new UpdateTargetRoleCommand(
                organizationId,
                new TargetRoleId(uuid),
                request.name(),
                request.domainCode(),
                request.familyCode(),
                track,
                request.assignedExpertId(),
                request.description(),
                status,
                request.version(),
                skillTargetsJson);

        return manageTargetRoleUseCase.updateTargetRole(command)
                .map(updated -> ResponseEntity.ok(TargetRoleResponse.fromDomain(updated)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{roleId}")
    public ResponseEntity<?> deleteTargetRole(
            @PathVariable("organizationId") String organizationId,
            @PathVariable("roleId") String roleId,
            @RequestHeader(value = "X-User-Role", required = false, defaultValue = "LD_MANAGER") String userRole) {

        if (!isAuthorizedManager(userRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden", "message", "Only L&D Managers and Administrators can delete target roles"));
        }

        UUID uuid;
        try {
            uuid = UUID.fromString(roleId);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid ID", "message", "Target role ID must be a valid UUID"));
        }

        boolean deleted = manageTargetRoleUseCase.deleteTargetRole(organizationId, new TargetRoleId(uuid));
        if (deleted) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    @ExceptionHandler(DuplicateTargetRoleException.class)
    public ResponseEntity<?> handleDuplicate(DuplicateTargetRoleException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "error", "Conflict",
                "message", ex.getMessage(),
                "organizationId", ex.getOrganizationId(),
                "code", ex.getCode()));
    }

    private boolean isAuthorizedManager(String role) {
        if (role == null) return false;
        String normalized = role.trim().toUpperCase();
        return normalized.equals("LD_MANAGER") || normalized.equals("ADMINISTRATOR") || normalized.equals("ROLE_LD_MANAGER") || normalized.equals("ROLE_ADMINISTRATOR");
    }

    private boolean isDomainExpert(String role) {
        if (role == null) return false;
        String normalized = role.trim().toUpperCase();
        return normalized.equals("DOMAIN_EXPERT") || normalized.equals("ROLE_DOMAIN_EXPERT");
    }
}
