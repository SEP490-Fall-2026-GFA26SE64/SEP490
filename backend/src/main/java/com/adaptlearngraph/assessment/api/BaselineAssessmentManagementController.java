package com.adaptlearngraph.assessment.api;

import com.adaptlearngraph.assessment.application.port.in.BaselineAssessmentManagementUseCase;
import com.adaptlearngraph.assessment.application.port.in.BaselineAssessmentManagementUseCase.Failure;
import com.adaptlearngraph.assessment.application.port.in.BaselineAssessmentManagementUseCase.ManifestEdit;
import com.adaptlearngraph.assessment.application.port.in.BaselineAssessmentManagementUseCase.OccupationPage;
import com.adaptlearngraph.assessment.application.port.in.BaselineAssessmentManagementUseCase.OccupationQuery;
import com.adaptlearngraph.assessment.application.port.in.BaselineAssessmentManagementUseCase.WorkingRevision;
import com.adaptlearngraph.assessment.application.port.in.BaselineAssessmentManagementUseCase.Workspace;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.BlueprintDraft;
import com.adaptlearngraph.assessment.application.port.out.BaselineAssessmentDraftStore;
import com.adaptlearngraph.assessment.application.port.out.BaselineAssessmentManagementStore;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintStore;
import com.adaptlearngraph.assessment.application.port.out.BaselineOccupationCatalogPort;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentDraft;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint.RoleConfig;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint.SkillConfig;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
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

@Validated
@RestController
@Profile("local")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(
        prefix = "assessment.baseline.occupation-catalog", name = "enabled", havingValue = "true")
@ConditionalOnProperty(prefix = "catalog.local-actor", name = "enabled", havingValue = "true")
@RequestMapping("/api/v1/ld/baseline-assessments")
public class BaselineAssessmentManagementController {
    private final BaselineAssessmentManagementUseCase management;
    private final ObjectMapper objectMapper;

    public BaselineAssessmentManagementController(
            BaselineAssessmentManagementUseCase management, ObjectMapper objectMapper) {
        this.management = management;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    OccupationPage list(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "") String status,
            @RequestParam(defaultValue = "name_asc") String sort,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) int size) {
        return management.listOccupations(new OccupationQuery(search, status, sort, page, size));
    }

    @GetMapping("/occupations/{occupationId}")
    Workspace workspace(@PathVariable String occupationId) {
        return management.getWorkspace(occupationId);
    }

    @PostMapping("/occupations/{occupationId}/blueprint-working-revisions")
    ResponseEntity<WorkingRevision> startRevision(
            @PathVariable String occupationId,
            @RequestHeader("Idempotency-Key") @NotBlank String idempotencyKey) {
        WorkingRevision created = management.startBlueprintRevision(occupationId, idempotencyKey);
        return ResponseEntity.created(workingLocation(occupationId, created.workingRevisionId()))
                .body(created);
    }

    @PutMapping("/occupations/{occupationId}/blueprint-working-revisions/{workingRevisionId}")
    WorkingRevision saveRevision(
            @PathVariable String occupationId,
            @PathVariable UUID workingRevisionId,
            @RequestHeader("Idempotency-Key") @NotBlank String idempotencyKey,
            @Valid @RequestBody SaveWorkingRequest request) {
        if (!occupationId.equals(request.occupationId())) {
            throw new IllegalArgumentException("Path and body Occupation must match");
        }
        return management.saveBlueprintRevision(workingRevisionId, request.expectedRevision(),
                idempotencyKey, request.toDraft());
    }

    @PostMapping("/occupations/{occupationId}/blueprint-working-revisions/{workingRevisionId}/finalize")
    ResponseEntity<BlueprintResponse> finalizeRevision(
            @PathVariable String occupationId,
            @PathVariable UUID workingRevisionId,
            @RequestHeader("Idempotency-Key") @NotBlank String idempotencyKey,
            @Valid @RequestBody ExpectedRevisionRequest request) {
        BaselineBlueprint created = management.finalizeBlueprintRevision(
                workingRevisionId, request.expectedRevision(), idempotencyKey);
        return ResponseEntity.created(URI.create("/api/v1/ld/baseline-blueprints/"
                        + created.blueprintId() + "/versions/" + created.version()))
                .body(toResponse(created));
    }

    @PostMapping("/occupations/{occupationId}/assessment-drafts")
    ResponseEntity<AssessmentResponse> generate(
            @PathVariable String occupationId,
            @RequestHeader("Idempotency-Key") @NotBlank String idempotencyKey) {
        BaselineAssessmentDraft created = management.generateAssessmentDraft(
                occupationId, idempotencyKey);
        return ResponseEntity.created(assessmentLocation(created.assessmentVersionId()))
                .body(toResponse(created));
    }

    @GetMapping("/assessment-versions/{assessmentVersionId}")
    AssessmentResponse assessment(@PathVariable UUID assessmentVersionId) {
        return toResponse(management.getAssessmentVersion(assessmentVersionId));
    }

    @PutMapping("/assessment-versions/{assessmentVersionId}")
    AssessmentResponse edit(
            @PathVariable UUID assessmentVersionId,
            @RequestHeader("Idempotency-Key") @NotBlank String idempotencyKey,
            @Valid @RequestBody EditManifestRequest request) {
        return toResponse(management.editAssessmentDraft(
                assessmentVersionId, request.expectedRevision(), idempotencyKey,
                new ManifestEdit(request.title(), request.orderedItemVersionIds())));
    }

    @PutMapping("/assessment-versions/{assessmentVersionId}/review")
    AssessmentResponse review(
            @PathVariable UUID assessmentVersionId,
            @Valid @RequestBody ContentHashRequest request) {
        return toResponse(management.reviewAssessmentDraft(
                assessmentVersionId, request.contentHash()));
    }

    @PutMapping("/assessment-versions/{assessmentVersionId}/publish")
    AssessmentResponse publish(
            @PathVariable UUID assessmentVersionId,
            @Valid @RequestBody ContentHashRequest request) {
        return toResponse(management.publishAssessment(
                assessmentVersionId, request.contentHash()));
    }

    @PostMapping("/assessment-versions/{assessmentVersionId}/replacement-draft")
    ResponseEntity<AssessmentResponse> replaceReviewed(
            @PathVariable UUID assessmentVersionId,
            @RequestHeader("Idempotency-Key") @NotBlank String idempotencyKey) {
        BaselineAssessmentDraft created = management.replaceReviewedCandidate(
                assessmentVersionId, idempotencyKey);
        return ResponseEntity.created(assessmentLocation(created.assessmentVersionId()))
                .body(toResponse(created));
    }

    @PostMapping("/assessment-versions/{assessmentVersionId}/restore")
    ResponseEntity<AssessmentResponse> restore(
            @PathVariable UUID assessmentVersionId,
            @RequestHeader("Idempotency-Key") @NotBlank String idempotencyKey) {
        BaselineAssessmentDraft created = management.restoreHistoricalAssessment(
                assessmentVersionId, idempotencyKey);
        return ResponseEntity.created(assessmentLocation(created.assessmentVersionId()))
                .body(toResponse(created));
    }

    @PostMapping("/assessment-versions/{assessmentVersionId}/disable")
    Workspace disable(
            @PathVariable UUID assessmentVersionId,
            @Valid @RequestBody ReasonRequest request) {
        return management.disableActiveAssessment(assessmentVersionId, request.reason());
    }

    @PostMapping("/occupations/{occupationId}/abandon-pending-change")
    Workspace abandon(
            @PathVariable String occupationId,
            @Valid @RequestBody ReasonRequest request) {
        return management.abandonPendingChange(occupationId, request.reason());
    }

    @ExceptionHandler(Failure.class)
    ResponseEntity<ApiError> handleFailure(Failure failure) {
        HttpStatus status = switch (failure.code()) {
            case UNAUTHENTICATED -> HttpStatus.UNAUTHORIZED;
            case FORBIDDEN -> HttpStatus.FORBIDDEN;
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case INVALID_REQUEST -> HttpStatus.BAD_REQUEST;
            case DEPENDENCY_UNAVAILABLE -> HttpStatus.SERVICE_UNAVAILABLE;
            case PENDING_CHANGE_EXISTS, OPEN_ASSESSMENT_CANDIDATE_EXISTS,
                    ACTIVE_ASSESSMENT_CONFLICT, STALE_WORKING_REVISION,
                    STALE_ASSESSMENT_REVISION, IDEMPOTENCY_CONFLICT,
                    REVIEW_REQUIRED, REVIEW_HASH_MISMATCH -> HttpStatus.CONFLICT;
        };
        return ResponseEntity.status(status).body(new ApiError(
                failure.code().name(), failure.getMessage(), failure.existingResourceId()));
    }

    @ExceptionHandler(com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.Failure.class)
    ResponseEntity<ApiError> handleAuthoringFailure(
            com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.Failure failure) {
        HttpStatus status = switch (failure.code()) {
            case UNAUTHENTICATED -> HttpStatus.UNAUTHORIZED;
            case FORBIDDEN -> HttpStatus.FORBIDDEN;
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case INVALID_REQUEST -> HttpStatus.BAD_REQUEST;
            case CATALOG_REFERENCE_INVALID, INSUFFICIENT_QUESTION_COVERAGE ->
                    HttpStatus.UNPROCESSABLE_ENTITY;
            case DEPENDENCY_UNAVAILABLE -> HttpStatus.SERVICE_UNAVAILABLE;
            case REVIEW_REQUIRED, VERSION_CONFLICT, IDEMPOTENCY_CONFLICT -> HttpStatus.CONFLICT;
        };
        return ResponseEntity.status(status).body(
                new ApiError(failure.code().name(), failure.getMessage(), null));
    }

    @ExceptionHandler({BaselineAssessmentManagementStore.WriteConflict.class,
            BaselineAssessmentDraftStore.WriteConflict.class,
            BaselineBlueprintStore.WriteConflict.class})
    ResponseEntity<ApiError> handleWriteConflict(RuntimeException failure) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(
                new ApiError("VERSION_CONFLICT", failure.getMessage(), null));
    }

    @ExceptionHandler({BaselineAssessmentManagementStore.DependencyUnavailable.class,
            BaselineAssessmentDraftStore.DependencyUnavailable.class,
            BaselineOccupationCatalogPort.DependencyUnavailable.class})
    ResponseEntity<ApiError> handleDependency(RuntimeException failure) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(
                new ApiError("DEPENDENCY_UNAVAILABLE", failure.getMessage(), null));
    }

    @ExceptionHandler({IllegalArgumentException.class, ArithmeticException.class})
    ResponseEntity<ApiError> handleInvalid(RuntimeException failure) {
        return ResponseEntity.badRequest().body(
                new ApiError("INVALID_REQUEST", failure.getMessage(), null));
    }

    private static URI workingLocation(String occupationId, UUID workingId) {
        return URI.create("/api/v1/ld/baseline-assessments/occupations/" + occupationId
                + "/blueprint-working-revisions/" + workingId);
    }

    private static URI assessmentLocation(UUID assessmentVersionId) {
        return URI.create("/api/v1/ld/baseline-assessments/assessment-versions/"
                + assessmentVersionId);
    }

    private static BlueprintResponse toResponse(BaselineBlueprint blueprint) {
        return new BlueprintResponse(blueprint.blueprintId(), blueprint.version(), blueprint.name(),
                blueprint.occupationId(), blueprint.occupationNameSnapshot(), blueprint.createdAt(),
                blueprint.roles());
    }

    private AssessmentResponse toResponse(BaselineAssessmentDraft draft) {
        return new AssessmentResponse(draft.assessmentVersionId(), draft.assessmentId(),
                draft.version(), draft.title(), draft.blueprintId(), draft.blueprintVersion(),
                draft.createdAt(), draft.contentHash(), draft.draftRevision(),
                draft.publicationState().name(), draft.reviewedAt(),
                draft.items().stream().map(item -> new AssessmentItemResponse(
                        item.position(), item.itemVersionId(), item.roleId(),
                        item.roleNameSnapshot(), item.microSkillId(),
                        item.microSkillNameSnapshot(), item.difficulty(), item.scoringWeight(),
                        item.prompt(), parseJson(item.responseSchemaJson()))).toList());
    }

    private JsonNode parseJson(String value) {
        try {
            return objectMapper.readTree(value);
        } catch (JsonProcessingException invalid) {
            throw new IllegalStateException("Stored response schema is invalid JSON", invalid);
        }
    }

    record ExpectedRevisionRequest(@Min(1) long expectedRevision) {}

    record SaveWorkingRequest(
            @Min(1) long expectedRevision,
            @NotBlank String name,
            @NotBlank String occupationId,
            @NotBlank String occupationNameSnapshot,
            @NotEmpty List<@Valid RoleRequest> roles) {
        BlueprintDraft toDraft() {
            return new BlueprintDraft(name, occupationId, occupationNameSnapshot,
                    roles.stream().map(RoleRequest::toDomain).toList());
        }
    }

    record RoleRequest(
            @NotBlank String roleId,
            @NotBlank String roleNameSnapshot,
            boolean enabled,
            @NotNull @DecimalMin("0") @DecimalMax("1") BigDecimal easyScoreWeight,
            @NotNull @DecimalMin("0") @DecimalMax("1") BigDecimal mediumScoreWeight,
            @NotNull @DecimalMin("0") @DecimalMax("1") BigDecimal hardScoreWeight,
            @NotEmpty List<@Valid SkillRequest> skills) {
        RoleConfig toDomain() {
            return new RoleConfig(roleId, roleNameSnapshot, enabled,
                    easyScoreWeight, mediumScoreWeight, hardScoreWeight,
                    skills.stream().map(SkillRequest::toDomain).toList());
        }
    }

    record SkillRequest(
            @NotBlank String microSkillId,
            @NotBlank String microSkillNameSnapshot,
            @Min(0) int easyQuestionCount,
            @Min(0) int mediumQuestionCount,
            @Min(0) int hardQuestionCount) {
        SkillConfig toDomain() {
            return new SkillConfig(microSkillId, microSkillNameSnapshot,
                    easyQuestionCount, mediumQuestionCount, hardQuestionCount);
        }
    }

    record EditManifestRequest(
            @Min(1) long expectedRevision,
            @NotBlank String title,
            @NotEmpty List<@NotNull UUID> orderedItemVersionIds) {}

    record ContentHashRequest(@NotBlank String contentHash) {}

    record ReasonRequest(@NotBlank String reason) {}

    record ApiError(String code, String message, UUID existingResourceId) {}

    record BlueprintResponse(
            UUID blueprintId, int version, String name, String occupationId,
            String occupationNameSnapshot, Instant createdAt, List<RoleConfig> roles) {}

    record AssessmentResponse(
            UUID assessmentVersionId, UUID assessmentId, int version, String title,
            UUID blueprintId, int blueprintVersion, Instant createdAt, String contentHash,
            long draftRevision, String publicationState, Instant reviewedAt,
            List<AssessmentItemResponse> items) {}

    record AssessmentItemResponse(
            int position, UUID itemVersionId, String roleId, String roleNameSnapshot,
            String microSkillId, String microSkillNameSnapshot, String difficulty,
            BigDecimal scoringWeight, String prompt, JsonNode responseSchema) {}
}
