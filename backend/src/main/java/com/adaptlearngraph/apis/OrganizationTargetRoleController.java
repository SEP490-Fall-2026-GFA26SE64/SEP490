package com.adaptlearngraph.apis;

import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.dtos.CreateTargetRoleRequest;
import com.adaptlearngraph.dtos.TargetRoleResponse;
import com.adaptlearngraph.dtos.UpdateTargetRoleRequest;
import com.adaptlearngraph.exception.DuplicateTargetRoleException;
import com.adaptlearngraph.services.OrganizationTargetRoleApplicationService;
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

@RestController
@RequestMapping(ApiEndpoints.ORGANIZATION_TARGET_ROLE)
public class OrganizationTargetRoleController {
    private static final String DRAFT = "DRAFT";
    private static final String ACTIVE = "ACTIVE";
    private static final String REJECTED = "REJECTED";

    private final OrganizationTargetRoleApplicationService targetRoles;

    public OrganizationTargetRoleController(OrganizationTargetRoleApplicationService targetRoles) {
        this.targetRoles = targetRoles;
    }

    @PostMapping
    public ResponseEntity<?> createTargetRole(
            @PathVariable("organizationId") String organizationId,
            @RequestHeader(value = "X-User-Role", required = false, defaultValue = "LD_MANAGER") String userRole,
            @Valid @RequestBody CreateTargetRoleRequest request) {

        if (!isAuthorizedManager(userRole) && !isDomainExpert(userRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden", "message", "Only L&D Managers, Administrators, and Domain Experts can create target roles"));
        }

        TargetRoleResponse response = targetRoles.createTargetRole(organizationId, request);

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

        List<TargetRoleResponse> responses = targetRoles.listTargetRoles(organizationId, search, track, status,
                effectiveExpertFilter);

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

        Optional<TargetRoleResponse> roleOpt = targetRoles.getTargetRole(organizationId, roleId);
        if (roleOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        TargetRoleResponse role = roleOpt.get();

        if (isExpert && !isManager) {
            if (userId != null && !userId.isBlank() && !isSameExpert(userId.trim(), role.assignedExpertId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Forbidden", "message", "Domain Expert is not assigned to this target role"));
            }
        }

        return ResponseEntity.ok(role);
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

        TargetRoleResponse existingRole = targetRoles.getTargetRole(organizationId, roleId).orElse(null);

        if (isExpert && !isManager) {
            if (existingRole == null) {
                return ResponseEntity.notFound().build();
            }
            if (userId != null && !userId.isBlank() && !isSameExpert(userId.trim(), existingRole.assignedExpertId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Forbidden", "message", "Domain Expert is not assigned to this target role"));
            }
        }

        boolean rejecting = request.status() != null && !request.status().isBlank()
                && REJECTED.equals(request.status().trim().toUpperCase());
        if (isExpert && !isManager && existingRole != null && !REJECTED.equals(existingRole.status()) && rejecting) {
            return ResponseEntity.badRequest().body(Map.of("error", "Bad Request", "message", "Domain Experts can no longer reject target roles"));
        }

        return targetRoles.updateTargetRole(organizationId, roleId, request)
                .map(updated -> ResponseEntity.ok(updated))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{roleId}")
    public ResponseEntity<?> deleteTargetRole(
            @PathVariable("organizationId") String organizationId,
            @PathVariable("roleId") String roleId,
            @RequestHeader(value = "X-User-Role", required = false, defaultValue = "LD_MANAGER") String userRole) {

        if (!isAuthorizedManager(userRole) && !isDomainExpert(userRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden", "message", "You do not have permission to delete target roles"));
        }

        Optional<TargetRoleResponse> existingOpt = targetRoles.getTargetRole(organizationId, roleId);
        if (existingOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        TargetRoleResponse existing = existingOpt.get();

        if (isAuthorizedManager(userRole) && !isAdministrator(userRole)) {
            if (!DRAFT.equals(existing.status())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Forbidden", "message", "L&D Managers can only delete target roles in DRAFT status"));
            }
        } else if (isDomainExpert(userRole) && !isAdministrator(userRole)) {
            if (!DRAFT.equals(existing.status()) && !ACTIVE.equals(existing.status())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Forbidden", "message", "Experts can only delete target roles in DRAFT or PUBLISHED status"));
            }
        }

        boolean deleted = targetRoles.deleteTargetRole(organizationId, roleId);
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

    @ExceptionHandler(com.adaptlearngraph.exception.IncompleteRoleRequirementsException.class)
    public ResponseEntity<?> handleIncompleteRequirements(com.adaptlearngraph.exception.IncompleteRoleRequirementsException ex) {
        return ResponseEntity.unprocessableEntity().body(Map.of(
                "code", "INCOMPLETE_LEVEL_REQUIREMENTS",
                "message", ex.getMessage(),
                "levels", ex.getLevels()));
    }

    private boolean isAuthorizedManager(String role) {
        if (role == null) return false;
        String normalized = role.trim().toUpperCase();
        return normalized.equals("LD_MANAGER") || normalized.equals("ADMINISTRATOR") || normalized.equals("ROLE_LD_MANAGER") || normalized.equals("ROLE_ADMINISTRATOR");
    }

    private boolean isAdministrator(String role) {
        if (role == null) return false;
        String normalized = role.trim().toUpperCase();
        return normalized.equals("ADMINISTRATOR") || normalized.equals("ROLE_ADMINISTRATOR");
    }

    private boolean isDomainExpert(String role) {
        if (role == null) return false;
        String normalized = role.trim().toUpperCase();
        return normalized.equals("DOMAIN_EXPERT") || normalized.equals("ROLE_DOMAIN_EXPERT") || normalized.equals("EXPERT");
    }

    private static boolean isSameExpert(String id1, String id2) {
        if (id1 == null || id2 == null) return false;
        String s1 = id1.trim();
        String s2 = id2.trim();
        if (s1.equalsIgnoreCase(s2)) return true;
        return normalizeExpert(s1).equalsIgnoreCase(normalizeExpert(s2));
    }

    private static String normalizeExpert(String id) {
        if ("expert-chen".equalsIgnoreCase(id) || "a0000000-0000-0000-0000-000000000002".equalsIgnoreCase(id)) {
            return "a0000000-0000-0000-0000-000000000002";
        }
        if ("expert-vance".equalsIgnoreCase(id) || "a0000000-0000-0000-0000-000000000005".equalsIgnoreCase(id)) {
            return "a0000000-0000-0000-0000-000000000005";
        }
        if ("expert-rivera".equalsIgnoreCase(id) || "a0000000-0000-0000-0000-000000000006".equalsIgnoreCase(id)) {
            return "a0000000-0000-0000-0000-000000000006";
        }
        if ("expert-nguyen".equalsIgnoreCase(id) || "a0000000-0000-0000-0000-000000000007".equalsIgnoreCase(id)) {
            return "a0000000-0000-0000-0000-000000000007";
        }
        return id;
    }
}
