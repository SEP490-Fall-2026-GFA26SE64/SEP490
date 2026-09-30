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
public class TargetRoleController {

    private final CreateTargetRoleUseCase createTargetRoleUseCase;
    private final ViewTargetRolesUseCase viewTargetRolesUseCase;
    private final ManageTargetRoleUseCase manageTargetRoleUseCase;

    public TargetRoleController(
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
                    .body(Map.of("error", "Forbidden", "message", "Only L&D Managers, Administrators, and assigned Domain Experts can view target roles"));
        }

        // Domain Expert isolation rule: experts can ONLY see target roles assigned to them
        String expertScope = assignedExpertId;
        if (isExpert && !isManager) {
            if (userId == null || userId.isBlank()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Forbidden", "message", "Domain Expert ID is required to access assigned target roles"));
            }
            expertScope = userId.trim();
        }

        RoleTrack roleTrack = (track != null && !track.isBlank()) ? RoleTrack.fromString(track) : null;
        RoleStatus roleStatus = (status != null && !status.isBlank()) ? RoleStatus.fromString(status) : null;

        TargetRoleFilter filter = new TargetRoleFilter(search, roleTrack, roleStatus, domainCode, expertScope);
        List<TargetRoleResponse> list = viewTargetRolesUseCase.listTargetRoles(organizationId, filter)
                .stream()
                .map(TargetRoleResponse::fromDomain)
                .toList();

        return ResponseEntity.ok(list);
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
                    .body(Map.of("error", "Forbidden", "message", "Access denied"));
        }

        UUID uuid;
        try {
            uuid = UUID.fromString(roleId);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid ID", "message", "Target role ID must be a valid UUID"));
        }

        return viewTargetRolesUseCase.getTargetRole(organizationId, new TargetRoleId(uuid))
                .map(role -> {
                    // Domain Expert isolation: expert can only view if assigned
                    if (isExpert && !isManager) {
                        if (userId == null || !userId.trim().equalsIgnoreCase(role.getAssignedExpertId())) {
                            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                    .body(Map.of("error", "Forbidden", "message", "Domain Expert is not assigned to this target role"));
                        }
                    }
                    return ResponseEntity.ok(TargetRoleResponse.fromDomain(role));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
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
                .map(role -> ResponseEntity.ok(TargetRoleResponse.fromDomain(role)))
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

        try {
            boolean deleted = manageTargetRoleUseCase.deleteTargetRole(organizationId, new TargetRoleId(uuid));
            if (!deleted) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.noContent().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Cannot Delete", "message", e.getMessage()));
        }
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

