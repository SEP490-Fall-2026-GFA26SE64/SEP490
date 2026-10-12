package com.adaptlearngraph.competency.api;

import com.adaptlearngraph.competency.application.port.in.CreatePrerequisiteCommand;
import com.adaptlearngraph.competency.application.port.in.ManagePrerequisiteUseCase;
import com.adaptlearngraph.competency.domain.PrerequisiteCycleException;
import com.adaptlearngraph.competency.domain.PrerequisiteEdge;
import com.adaptlearngraph.competency.domain.SkillStatus;
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
@RequestMapping("/api/v1/organizations/{organizationId}/prerequisites")
public class PrerequisiteController {

    private final ManagePrerequisiteUseCase managePrerequisiteUseCase;

    public PrerequisiteController(ManagePrerequisiteUseCase managePrerequisiteUseCase) {
        this.managePrerequisiteUseCase = managePrerequisiteUseCase;
    }

    @GetMapping
    public ResponseEntity<List<PrerequisiteResponse>> listPrerequisites(
            @PathVariable("organizationId") String organizationId) {
        List<PrerequisiteEdge> edges = managePrerequisiteUseCase.listPrerequisites(organizationId);
        List<PrerequisiteResponse> response = edges.stream()
                .map(PrerequisiteResponse::fromDomain)
                .toList();
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

        CreatePrerequisiteCommand command = new CreatePrerequisiteCommand(
                organizationId,
                request.sourceSkillId(),
                request.targetSkillId(),
                request.minMastery(),
                request.status() != null ? request.status() : SkillStatus.ACTIVE);

        PrerequisiteEdge edge = managePrerequisiteUseCase.createPrerequisite(command);
        return ResponseEntity.status(HttpStatus.CREATED).body(PrerequisiteResponse.fromDomain(edge));
    }

    @DeleteMapping
    public ResponseEntity<?> deletePrerequisite(
            @PathVariable("organizationId") String organizationId,
            @RequestParam("sourceSkillId") String sourceSkillId,
            @RequestParam("targetSkillId") String targetSkillId,
            @RequestHeader(value = "X-User-Role", required = false, defaultValue = "DOMAIN_EXPERT") String userRole) {

        if (!isAuthorizedExpert(userRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Forbidden", "message", "Only Domain Experts can edit prerequisite relationships"));
        }

        managePrerequisiteUseCase.deletePrerequisite(organizationId, sourceSkillId, targetSkillId);
        return ResponseEntity.noContent().build();
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
                || normalized.equals("ROLE_DOMAIN_EXPERT") || normalized.equals("ROLE_EXPERT");
    }
}
