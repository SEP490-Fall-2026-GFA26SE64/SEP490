package com.adaptlearngraph.competency.api;

import com.adaptlearngraph.competency.application.DuplicateMicroSkillException;
import com.adaptlearngraph.competency.application.port.in.CreateMicroSkillCommand;
import com.adaptlearngraph.competency.application.port.in.CreateMicroSkillUseCase;
import com.adaptlearngraph.competency.application.port.in.DeleteMicroSkillUseCase;
import com.adaptlearngraph.competency.application.port.in.GetMicroSkillsUseCase;
import com.adaptlearngraph.competency.application.port.in.UpdateMicroSkillCommand;
import com.adaptlearngraph.competency.application.port.in.UpdateMicroSkillUseCase;
import com.adaptlearngraph.competency.domain.MicroSkill;
import com.adaptlearngraph.competency.domain.MicroSkillInUseException;
import com.adaptlearngraph.competency.domain.SkillStatus;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
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
@ConditionalOnProperty(prefix = "catalog.legacy-api", name = "enabled", havingValue = "true")
@RequestMapping("/api/v1/organizations/{organizationId}/micro-skills")
public class MicroSkillController {

    private final CreateMicroSkillUseCase createMicroSkillUseCase;
    private final GetMicroSkillsUseCase getMicroSkillsUseCase;
    private final UpdateMicroSkillUseCase updateMicroSkillUseCase;
    private final DeleteMicroSkillUseCase deleteMicroSkillUseCase;

    public MicroSkillController(
            CreateMicroSkillUseCase createMicroSkillUseCase,
            GetMicroSkillsUseCase getMicroSkillsUseCase,
            UpdateMicroSkillUseCase updateMicroSkillUseCase,
            DeleteMicroSkillUseCase deleteMicroSkillUseCase) {
        this.createMicroSkillUseCase = createMicroSkillUseCase;
        this.getMicroSkillsUseCase = getMicroSkillsUseCase;
        this.updateMicroSkillUseCase = updateMicroSkillUseCase;
        this.deleteMicroSkillUseCase = deleteMicroSkillUseCase;
    }

    @GetMapping
    public ResponseEntity<List<MicroSkillResponse>> listMicroSkills(
            @PathVariable("organizationId") String organizationId,
            @RequestParam(value = "query", required = false) String query,
            @RequestParam(value = "macro", required = false) String macroCode,
            @RequestParam(value = "status", required = false) SkillStatus status) {
        List<MicroSkill> skills = getMicroSkillsUseCase.searchMicroSkills(organizationId, query, macroCode, status);
        List<MicroSkillResponse> response = skills.stream()
                .map(MicroSkillResponse::fromDomain)
                .toList();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MicroSkillResponse> getMicroSkill(
            @PathVariable("organizationId") String organizationId,
            @PathVariable("id") String id) {
        return getMicroSkillsUseCase.getMicroSkill(organizationId, id)
                .map(MicroSkillResponse::fromDomain)
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

        String macroCode = request.macroCompetencyCode() != null && !request.macroCompetencyCode().isBlank()
                ? request.macroCompetencyCode().trim().toUpperCase()
                : "KNOWLEDGE";

        CreateMicroSkillCommand command = new CreateMicroSkillCommand(
                organizationId,
                request.code(),
                request.name(),
                request.description(),
                macroCode);

        MicroSkill created = createMicroSkillUseCase.createMicroSkill(command);
        MicroSkillResponse response = MicroSkillResponse.fromDomain(created);

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

        UpdateMicroSkillCommand command = new UpdateMicroSkillCommand(
                organizationId,
                id,
                request.name(),
                request.description(),
                request.macroCompetencyCode(),
                request.status() != null ? request.status() : SkillStatus.ACTIVE);

        MicroSkill updated = updateMicroSkillUseCase.updateMicroSkill(command);
        return ResponseEntity.ok(MicroSkillResponse.fromDomain(updated));
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

        deleteMicroSkillUseCase.deleteMicroSkill(organizationId, id);
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
                || normalized.equals("ROLE_DOMAIN_EXPERT") || normalized.equals("ROLE_EXPERT");
    }
}
