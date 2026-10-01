package com.adaptlearngraph.competency.api;

import com.adaptlearngraph.competency.application.DuplicateMicroSkillException;
import com.adaptlearngraph.competency.application.port.in.CreateMicroSkillCommand;
import com.adaptlearngraph.competency.application.port.in.CreateMicroSkillUseCase;
import com.adaptlearngraph.competency.application.port.in.GetMicroSkillsUseCase;
import com.adaptlearngraph.competency.domain.MicroSkill;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/organizations/{organizationId}/micro-skills")
public class MicroSkillController {

    private final CreateMicroSkillUseCase createMicroSkillUseCase;
    private final GetMicroSkillsUseCase getMicroSkillsUseCase;

    public MicroSkillController(
            CreateMicroSkillUseCase createMicroSkillUseCase,
            GetMicroSkillsUseCase getMicroSkillsUseCase) {
        this.createMicroSkillUseCase = createMicroSkillUseCase;
        this.getMicroSkillsUseCase = getMicroSkillsUseCase;
    }

    @GetMapping
    public ResponseEntity<List<MicroSkillResponse>> listMicroSkills(
            @PathVariable("organizationId") String organizationId) {
        List<MicroSkill> skills = getMicroSkillsUseCase.listMicroSkills(organizationId);
        List<MicroSkillResponse> response = skills.stream()
                .map(MicroSkillResponse::fromDomain)
                .toList();
        return ResponseEntity.ok(response);
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

    @ExceptionHandler(DuplicateMicroSkillException.class)
    public ResponseEntity<?> handleDuplicate(DuplicateMicroSkillException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "error", "Conflict",
                "message", ex.getMessage(),
                "organizationId", ex.getOrganizationId(),
                "code", ex.getCode()));
    }

    private boolean isAuthorizedExpert(String role) {
        if (role == null) return false;
        String normalized = role.trim().toUpperCase();
        return normalized.equals("DOMAIN_EXPERT") || normalized.equals("EXPERT")
                || normalized.equals("ROLE_DOMAIN_EXPERT") || normalized.equals("ROLE_EXPERT");
    }
}
