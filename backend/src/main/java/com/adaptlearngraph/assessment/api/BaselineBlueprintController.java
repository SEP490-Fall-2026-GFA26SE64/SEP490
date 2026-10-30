package com.adaptlearngraph.assessment.api;

import com.adaptlearngraph.assessment.application.port.in.BaselineAssessmentDraftUseCase;
import com.adaptlearngraph.assessment.application.port.in.BaselineAssessmentManagementUseCase;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.BlueprintDraft;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.Failure;
import com.adaptlearngraph.assessment.application.port.out.BaselineAssessmentManagementStore;
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
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.context.annotation.Profile;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@Profile("local")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(prefix = "catalog.local-actor", name = "enabled", havingValue = "true")
@ConditionalOnProperty(prefix = "assessment.baseline.legacy-authoring", name = "enabled", havingValue = "true")
@RequestMapping("/api/v1/ld/baseline-blueprints")
public class BaselineBlueprintController {
    private final BaselineBlueprintUseCase blueprints;
    private final BaselineAssessmentDraftUseCase drafts;
    private final BaselineAssessmentManagementUseCase management;
    private final ObjectMapper objectMapper;

    @Autowired
    public BaselineBlueprintController(
            BaselineBlueprintUseCase blueprints,
            BaselineAssessmentDraftUseCase drafts,
            ObjectProvider<BaselineAssessmentManagementUseCase> management,
            ObjectMapper objectMapper) {
        this.blueprints = blueprints;
        this.drafts = drafts;
        this.management = management.getIfAvailable();
        this.objectMapper = objectMapper;
    }

    BaselineBlueprintController(
            BaselineBlueprintUseCase blueprints,
            BaselineAssessmentDraftUseCase drafts,
            ObjectMapper objectMapper) {
        this.blueprints = blueprints;
        this.drafts = drafts;
        this.management = null;
        this.objectMapper = objectMapper;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    BlueprintResponse create(
            @RequestHeader("Idempotency-Key") @NotBlank String idempotencyKey,
            @Valid @RequestBody CreateRequest request) {
        if (management == null) {
            return toResponse(blueprints.create(idempotencyKey, request.toDraft()));
        }
        if (!management.getWorkspace(request.occupationId()).blueprintVersions().isEmpty()) {
            throw new Failure(BaselineBlueprintUseCase.Code.VERSION_CONFLICT,
                    "This Occupation already has a baseline blueprint");
        }
        return toResponse(finalizeLegacyDraft(idempotencyKey, request.toDraft()));
    }

    @PutMapping("/{blueprintId}")
    BlueprintResponse revise(
            @PathVariable UUID blueprintId,
            @RequestHeader("Idempotency-Key") @NotBlank String idempotencyKey,
            @Valid @RequestBody ReviseRequest request) {
        if (management == null) {
            return toResponse(blueprints.revise(
                    blueprintId, request.expectedLatestVersion(), idempotencyKey, request.toDraft()));
        }
        BaselineBlueprint latest = blueprints.getLatest(blueprintId);
        if (latest.version() != request.expectedLatestVersion()) {
            throw new Failure(BaselineBlueprintUseCase.Code.VERSION_CONFLICT,
                    "Baseline blueprint has a newer version");
        }
        return toResponse(finalizeLegacyDraft(idempotencyKey, request.toDraft()));
    }

    @GetMapping("/{blueprintId}")
    BlueprintResponse latest(@PathVariable UUID blueprintId) {
        return toResponse(blueprints.getLatest(blueprintId));
    }

    @GetMapping("/occupations/{occupationId}")
    BlueprintResponse latestByOccupation(@PathVariable String occupationId) {
        return toResponse(blueprints.getLatestByOccupation(occupationId));
    }

    @GetMapping("/{blueprintId}/versions/{version}")
    BlueprintResponse version(@PathVariable UUID blueprintId, @PathVariable @Min(1) int version) {
        return toResponse(blueprints.getVersion(blueprintId, version));
    }

    @PostMapping("/{blueprintId}/versions/{blueprintVersion}/assessment-drafts")
    @ResponseStatus(HttpStatus.CREATED)
    AssessmentDraftResponse generate(
            @PathVariable UUID blueprintId,
            @PathVariable @Min(1) int blueprintVersion,
            @RequestHeader("Idempotency-Key") @NotBlank String idempotencyKey) {
        if (management == null) {
            return toResponse(drafts.generate(blueprintId, blueprintVersion, idempotencyKey));
        }
        BaselineBlueprint blueprint = blueprints.getVersion(blueprintId, blueprintVersion);
        return toResponse(management.generateAssessmentDraft(
                blueprint.occupationId(), idempotencyKey));
    }

    @GetMapping("/assessment-drafts/{assessmentVersionId}")
    AssessmentDraftResponse draft(@PathVariable UUID assessmentVersionId) {
        return toResponse(management == null
                ? drafts.get(assessmentVersionId)
                : management.getAssessmentVersion(assessmentVersionId));
    }

    @PutMapping("/assessment-drafts/{assessmentVersionId}/review")
    AssessmentDraftResponse review(
            @PathVariable UUID assessmentVersionId,
            @Valid @RequestBody ContentHashRequest request) {
        return toResponse(management == null
                ? drafts.review(assessmentVersionId, request.contentHash())
                : management.reviewAssessmentDraft(assessmentVersionId, request.contentHash()));
    }

    @PutMapping("/assessment-drafts/{assessmentVersionId}/publish")
    AssessmentDraftResponse publish(
            @PathVariable UUID assessmentVersionId,
            @Valid @RequestBody ContentHashRequest request) {
        return toResponse(management == null
                ? drafts.publish(assessmentVersionId, request.contentHash())
                : management.publishAssessment(assessmentVersionId, request.contentHash()));
    }

    @ExceptionHandler(Failure.class)
    ResponseEntity<ApiError> handleFailure(Failure failure) {
        HttpStatus status = switch (failure.code()) {
            case UNAUTHENTICATED -> HttpStatus.UNAUTHORIZED;
            case FORBIDDEN -> HttpStatus.FORBIDDEN;
            case INVALID_REQUEST -> HttpStatus.BAD_REQUEST;
            case CATALOG_REFERENCE_INVALID, INSUFFICIENT_QUESTION_COVERAGE ->
                    HttpStatus.UNPROCESSABLE_ENTITY;
            case DEPENDENCY_UNAVAILABLE -> HttpStatus.SERVICE_UNAVAILABLE;
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case REVIEW_REQUIRED, VERSION_CONFLICT, IDEMPOTENCY_CONFLICT -> HttpStatus.CONFLICT;
        };
        List<CoverageShortageResponse> shortages = failure.coverageShortages().stream()
                .map(shortage -> new CoverageShortageResponse(
                        shortage.roleId(), shortage.microSkillId(), shortage.difficulty(),
                        shortage.required(), shortage.available(), shortage.missing(),
                        shortage.roleRequirements().stream()
                                .map(requirement -> new RoleCoverageRequirementResponse(
                                        requirement.roleId(), requirement.required()))
                                .toList()))
                .toList();
        return ResponseEntity.status(status)
                .body(new ApiError(failure.code().name(), failure.getMessage(), shortages));
    }

    @ExceptionHandler(BaselineAssessmentManagementUseCase.Failure.class)
    ResponseEntity<ApiError> handleManagementFailure(
            BaselineAssessmentManagementUseCase.Failure failure) {
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
        return ResponseEntity.status(status)
                .body(new ApiError(failure.code().name(), failure.getMessage(), List.of()));
    }

    @ExceptionHandler(BaselineAssessmentManagementStore.WriteConflict.class)
    ResponseEntity<ApiError> handleManagementWriteConflict(RuntimeException failure) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ApiError("VERSION_CONFLICT", failure.getMessage(), List.of()));
    }

    @ExceptionHandler(BaselineAssessmentManagementStore.DependencyUnavailable.class)
    ResponseEntity<ApiError> handleManagementDependency(RuntimeException failure) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new ApiError("DEPENDENCY_UNAVAILABLE", failure.getMessage(), List.of()));
    }

    @ExceptionHandler({IllegalArgumentException.class, ArithmeticException.class})
    ResponseEntity<ApiError> handleInvalidInput(RuntimeException exception) {
        return ResponseEntity.badRequest()
                .body(new ApiError("INVALID_REQUEST", exception.getMessage(), List.of()));
    }

    private static BlueprintResponse toResponse(BaselineBlueprint blueprint) {
        return new BlueprintResponse(
                blueprint.blueprintId(), blueprint.version(), blueprint.name(), blueprint.occupationId(),
                blueprint.occupationNameSnapshot(), blueprint.createdAt(), blueprint.roles().stream()
                        .map(role -> new RoleResponse(
                                role.roleId(), role.roleNameSnapshot(), role.enabled(), role.totalQuestionCount(),
                                role.easyScoreWeight(), role.mediumScoreWeight(), role.hardScoreWeight(),
                                role.skills().stream().map(skill -> new SkillResponse(
                                        skill.microSkillId(), skill.microSkillNameSnapshot(),
                                        skill.easyQuestionCount(), skill.mediumQuestionCount(),
                                        skill.hardQuestionCount())).toList()))
                        .toList());
    }

    private BaselineBlueprint finalizeLegacyDraft(String idempotencyKey, BlueprintDraft draft) {
        var working = management.startBlueprintRevision(
                draft.occupationId(), idempotencyKey + ":start");
        var saved = management.saveBlueprintRevision(
                working.workingRevisionId(), working.revision(),
                idempotencyKey + ":save", draft);
        return management.finalizeBlueprintRevision(
                saved.workingRevisionId(), saved.revision(), idempotencyKey);
    }

    private AssessmentDraftResponse toResponse(BaselineAssessmentDraft draft) {
        return new AssessmentDraftResponse(
                draft.assessmentVersionId(), draft.assessmentId(), draft.version(), draft.title(),
                draft.blueprintId(), draft.blueprintVersion(), draft.generationSeed(),
                draft.createdAt(), draft.contentHash(), draft.draftRevision(),
                draft.publicationState().name(),
                draft.reviewedBy(), draft.reviewedAt(), draft.reviewedContentHash(),
                draft.items().stream()
                        .map(item -> new AssessmentItemResponse(
                                item.position(), item.itemVersionId(), item.roleId(),
                                item.roleNameSnapshot(), item.microSkillId(),
                                item.microSkillNameSnapshot(), item.difficulty(),
                                item.scoringWeight(), item.prompt(), parseJson(item.responseSchemaJson())))
                        .toList());
    }

    private JsonNode parseJson(String value) {
        try {
            return objectMapper.readTree(value);
        } catch (JsonProcessingException invalidStoredJson) {
            throw new IllegalStateException("Stored response schema is invalid JSON", invalidStoredJson);
        }
    }

    record CreateRequest(
            @NotBlank String name,
            String occupationId,
            String occupationNameSnapshot,
            @NotEmpty List<@Valid RoleRequest> roles) {
        BlueprintDraft toDraft() {
            return new BlueprintDraft(name, occupationId, occupationNameSnapshot,
                    roles.stream().map(RoleRequest::toDomain).toList());
        }
    }

    record ReviseRequest(
            @Min(1) int expectedLatestVersion,
            @NotBlank String name,
            String occupationId,
            String occupationNameSnapshot,
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

    record ContentHashRequest(@NotBlank String contentHash) {}

    record BlueprintResponse(
            UUID blueprintId,
            int version,
            String name,
            String occupationId,
            String occupationNameSnapshot,
            Instant createdAt,
            List<RoleResponse> roles) {}

    record RoleResponse(
            String roleId,
            String roleNameSnapshot,
            boolean enabled,
            int totalQuestionCount,
            BigDecimal easyScoreWeight,
            BigDecimal mediumScoreWeight,
            BigDecimal hardScoreWeight,
            List<SkillResponse> skills) {}

    record SkillResponse(
            String microSkillId,
            String microSkillNameSnapshot,
            int easyQuestionCount,
            int mediumQuestionCount,
            int hardQuestionCount) {}

    record CoverageShortageResponse(
            String roleId,
            String microSkillId,
            String difficulty,
            int required,
            int available,
            int missing,
            List<RoleCoverageRequirementResponse> roleRequirements) {}

    record RoleCoverageRequirementResponse(String roleId, int required) {}

    record AssessmentDraftResponse(
            UUID assessmentVersionId,
            UUID assessmentId,
            int version,
            String title,
            UUID blueprintId,
            int blueprintVersion,
            long generationSeed,
            Instant createdAt,
            String contentHash,
            long draftRevision,
            String publicationState,
            UUID reviewedBy,
            Instant reviewedAt,
            String reviewedContentHash,
            List<AssessmentItemResponse> items) {}

    record AssessmentItemResponse(
            int position,
            UUID itemVersionId,
            String roleId,
            String roleNameSnapshot,
            String microSkillId,
            String microSkillNameSnapshot,
            String difficulty,
            BigDecimal scoringWeight,
            String prompt,
            JsonNode responseSchema) {}

    record ApiError(String code, String message, List<CoverageShortageResponse> coverageShortages) {}
}
