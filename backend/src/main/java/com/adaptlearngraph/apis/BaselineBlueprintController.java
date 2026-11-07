package com.adaptlearngraph.apis;

import com.adaptlearngraph.dtos.BaselineAuthoringDto.AssessmentDraftResponse;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.BlueprintResponse;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.ContentHashRequest;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.CreateRequest;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.ReviseRequest;
import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.services.BaselineAssessmentManagementUseCase;
import com.adaptlearngraph.services.BaselineBlueprintApplicationService;
import com.adaptlearngraph.services.BaselineBlueprintUseCase.Failure;
import com.adaptlearngraph.services.BaselineStoreFailures;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.context.annotation.Profile;
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
@Profile("local & !workspace-baseline & !prod")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(prefix = "catalog.local-actor", name = "enabled", havingValue = "true")
@ConditionalOnProperty(prefix = "assessment.baseline.legacy-authoring", name = "enabled", havingValue = "true")
@RequestMapping(ApiEndpoints.BASELINE_BLUEPRINT)
public class BaselineBlueprintController {
    private final BaselineBlueprintApplicationService blueprints;

    public BaselineBlueprintController(BaselineBlueprintApplicationService blueprints) {
        this.blueprints = blueprints;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    BlueprintResponse create(
            @RequestHeader("Idempotency-Key") @NotBlank String idempotencyKey,
            @Valid @RequestBody CreateRequest request) {
        return blueprints.create(idempotencyKey, request);
    }

    @PutMapping("/{blueprintId}")
    BlueprintResponse revise(
            @PathVariable UUID blueprintId,
            @RequestHeader("Idempotency-Key") @NotBlank String idempotencyKey,
            @Valid @RequestBody ReviseRequest request) {
        return blueprints.revise(blueprintId, idempotencyKey, request);
    }

    @GetMapping("/{blueprintId}")
    BlueprintResponse latest(@PathVariable UUID blueprintId) {
        return blueprints.latest(blueprintId);
    }

    @GetMapping("/job-positions/{jobPositionId}")
    BlueprintResponse latestByJobPosition(@PathVariable String jobPositionId) {
        return blueprints.latestByJobPosition(jobPositionId);
    }

    @GetMapping("/{blueprintId}/versions/{version}")
    BlueprintResponse version(@PathVariable UUID blueprintId, @PathVariable @Min(1) int version) {
        return blueprints.version(blueprintId, version);
    }

    @PostMapping("/{blueprintId}/versions/{blueprintVersion}/assessment-drafts")
    @ResponseStatus(HttpStatus.CREATED)
    AssessmentDraftResponse generate(
            @PathVariable UUID blueprintId,
            @PathVariable @Min(1) int blueprintVersion,
            @RequestHeader("Idempotency-Key") @NotBlank String idempotencyKey) {
        return blueprints.generate(blueprintId, blueprintVersion, idempotencyKey);
    }

    @GetMapping("/assessment-drafts/{assessmentVersionId}")
    AssessmentDraftResponse draft(@PathVariable UUID assessmentVersionId) {
        return blueprints.draft(assessmentVersionId);
    }

    @PutMapping("/assessment-drafts/{assessmentVersionId}/review")
    AssessmentDraftResponse review(
            @PathVariable UUID assessmentVersionId,
            @Valid @RequestBody ContentHashRequest request) {
        return blueprints.review(assessmentVersionId, request.contentHash());
    }

    @PutMapping("/assessment-drafts/{assessmentVersionId}/publish")
    AssessmentDraftResponse publish(
            @PathVariable UUID assessmentVersionId,
            @Valid @RequestBody ContentHashRequest request) {
        return blueprints.publish(assessmentVersionId, request.contentHash());
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

    @ExceptionHandler(BaselineStoreFailures.WriteConflict.class)
    ResponseEntity<ApiError> handleManagementWriteConflict(RuntimeException failure) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ApiError("VERSION_CONFLICT", failure.getMessage(), List.of()));
    }

    @ExceptionHandler(BaselineStoreFailures.DependencyUnavailable.class)
    ResponseEntity<ApiError> handleManagementDependency(RuntimeException failure) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new ApiError("DEPENDENCY_UNAVAILABLE", failure.getMessage(), List.of()));
    }

    @ExceptionHandler({IllegalArgumentException.class, ArithmeticException.class})
    ResponseEntity<ApiError> handleInvalidInput(RuntimeException exception) {
        return ResponseEntity.badRequest()
                .body(new ApiError("INVALID_REQUEST", exception.getMessage(), List.of()));
    }

    record CoverageShortageResponse(
            String roleId,
            String microSkillId,
            String difficulty,
            int required,
            int available,
            int missing,
            List<RoleCoverageRequirementResponse> roleRequirements) {}

    record RoleCoverageRequirementResponse(String roleId, int required) {}

    record ApiError(String code, String message, List<CoverageShortageResponse> coverageShortages) {}
}
