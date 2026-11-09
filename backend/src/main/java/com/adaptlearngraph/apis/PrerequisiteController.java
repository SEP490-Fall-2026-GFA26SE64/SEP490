package com.adaptlearngraph.apis;

import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.dtos.CreatePrerequisiteRequest;
import com.adaptlearngraph.dtos.PrerequisiteResponse;
import com.adaptlearngraph.services.PrerequisiteApplicationService;
import com.adaptlearngraph.exception.PrerequisiteCycleException;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping(ApiEndpoints.PREREQUISITE)
public class PrerequisiteController {

    private final PrerequisiteApplicationService prerequisites;

    public PrerequisiteController(PrerequisiteApplicationService prerequisites) {
        this.prerequisites = prerequisites;
    }

    @GetMapping
    public ResponseEntity<List<PrerequisiteResponse>> listPrerequisites(
            @PathVariable("organizationId") String organizationId) {
        List<PrerequisiteResponse> response = prerequisites.listPrerequisites(organizationId);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<?> createPrerequisite(
            @PathVariable("organizationId") String organizationId,
            @RequestHeader(value = "X-User-Role", required = false, defaultValue = "DOMAIN_EXPERT") String userRole,
            @Valid @RequestBody CreatePrerequisiteRequest request) {

        if (!isAuthorizedExpert(userRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden", "message", "Only Domain Experts can edit prerequisite relationships"));
        }

        PrerequisiteResponse edge = prerequisites.createPrerequisite(organizationId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(edge);
    }

    @DeleteMapping
    public ResponseEntity<?> deletePrerequisite(
            @PathVariable("organizationId") String organizationId,
            @RequestParam("sourceSkillId") String sourceSkillId,
            @RequestParam("targetSkillId") String targetSkillId,
            @RequestParam(value = "dependentKnowledgeLevel", required = false) String dependentKnowledgeLevel,
            @RequestParam(value = "prerequisiteKnowledgeLevel", required = false) String prerequisiteKnowledgeLevel,
            @RequestHeader(value = "X-User-Role", required = false, defaultValue = "DOMAIN_EXPERT") String userRole) {

        if (!isAuthorizedExpert(userRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden", "message", "Only Domain Experts can edit prerequisite relationships"));
        }

        prerequisites.deletePrerequisite(organizationId, sourceSkillId, targetSkillId,dependentKnowledgeLevel,prerequisiteKnowledgeLevel);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reverse")
    public ResponseEntity<?> reversePrerequisite(@PathVariable("organizationId") String organizationId,
            @RequestHeader(value="X-User-Role",required=false,defaultValue="") String userRole,
            @Valid @RequestBody CreatePrerequisiteRequest request) {
        if(!isAuthorizedExpert(userRole))return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message","Expert required"));
        return ResponseEntity.ok(prerequisites.reversePrerequisite(organizationId,request));
    }

    @ExceptionHandler(PrerequisiteCycleException.class)
    public ResponseEntity<?> handleCycle(PrerequisiteCycleException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "error", "Bad Request",
                "message", ex.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "error", "Bad Request",
                "message", ex.getMessage()));
    }

    private boolean isAuthorizedExpert(String role) {
        if (role == null) return false;
        String normalized = role.trim().toUpperCase();
        return normalized.equals("DOMAIN_EXPERT") || normalized.equals("EXPERT")
                || normalized.equals("ROLE_DOMAIN_EXPERT") || normalized.equals("ROLE_EXPERT")
                || normalized.equals("LD_MANAGER") || normalized.equals("ROLE_LD_MANAGER")
                || normalized.equals("ADMINISTRATOR") || normalized.equals("ROLE_ADMINISTRATOR")
                || normalized.equals("ADMIN") || normalized.equals("ROLE_ADMIN")
                || normalized.equals("MANAGER") || normalized.equals("ROLE_MANAGER");
    }
}
