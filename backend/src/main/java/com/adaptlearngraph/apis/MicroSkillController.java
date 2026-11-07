package com.adaptlearngraph.apis;

import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.dtos.CreateMicroSkillRequest;
import com.adaptlearngraph.dtos.MicroSkillResponse;
import com.adaptlearngraph.dtos.SkillStatusDto;
import com.adaptlearngraph.dtos.UpdateMicroSkillRequest;
import com.adaptlearngraph.exception.DuplicateMicroSkillException;
import com.adaptlearngraph.exception.MicroSkillInUseException;
import com.adaptlearngraph.services.MicroSkillApplicationService;
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
import java.util.NoSuchElementException;

@RestController
@RequestMapping(ApiEndpoints.MICRO_SKILL)
public class MicroSkillController {

    private final MicroSkillApplicationService microSkills;

    public MicroSkillController(MicroSkillApplicationService microSkills) {
        this.microSkills = microSkills;
    }

    @GetMapping
    public ResponseEntity<List<MicroSkillResponse>> listMicroSkills(
            @PathVariable("organizationId") String organizationId,
            @RequestParam(value = "query", required = false) String query,
            @RequestParam(value = "status", required = false) SkillStatusDto status) {
        return ResponseEntity.ok(microSkills.searchMicroSkills(organizationId, query, status));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MicroSkillResponse> getMicroSkill(
            @PathVariable("organizationId") String organizationId,
            @PathVariable("id") String id) {
        return microSkills.getMicroSkill(organizationId, id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> createMicroSkill(
            @PathVariable("organizationId") String organizationId,
            @RequestHeader(value = "X-User-Role", required = false, defaultValue = "DOMAIN_EXPERT") String userRole,
            @Valid @RequestBody CreateMicroSkillRequest request) {

        if (!isAuthorizedExpert(userRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden", "message", "Only Domain Experts can create micro-skills"));
        }

        MicroSkillResponse response = microSkills.createMicroSkill(organizationId, request);

        return ResponseEntity.created(URI.create("/api/v1/organizations/" + organizationId + "/micro-skills/" + response.id()))
                .body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateMicroSkill(
            @PathVariable("organizationId") String organizationId,
            @PathVariable("id") String id,
            @RequestHeader(value = "X-User-Role", required = false, defaultValue = "DOMAIN_EXPERT") String userRole,
            @Valid @RequestBody UpdateMicroSkillRequest request) {

        if (!isAuthorizedExpert(userRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden", "message", "Only Domain Experts can update micro-skills"));
        }

        return ResponseEntity.ok(microSkills.updateMicroSkill(organizationId, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteMicroSkill(
            @PathVariable("organizationId") String organizationId,
            @PathVariable("id") String id,
            @RequestHeader(value = "X-User-Role", required = false, defaultValue = "DOMAIN_EXPERT") String userRole) {

        if (!isAuthorizedExpert(userRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden", "message", "Only Domain Experts can delete micro-skills"));
        }

        microSkills.deleteMicroSkill(organizationId, id);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(DuplicateMicroSkillException.class)
    public ResponseEntity<?> handleDuplicate(DuplicateMicroSkillException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "error", "Conflict",
                "message", ex.getMessage(),
                "organizationId", ex.getOrganizationId(),
                "code", ex.getCode()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> invalidKnowledge(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().cacheControl(org.springframework.http.CacheControl.noStore()).body(Map.of("message",ex.getMessage()));
    }

    @ExceptionHandler(MicroSkillInUseException.class)
    public ResponseEntity<?> handleInUse(MicroSkillInUseException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "error", "Conflict",
                "message", ex.getMessage()));
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<?> handleNotFound(NoSuchElementException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "error", "Not Found",
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
