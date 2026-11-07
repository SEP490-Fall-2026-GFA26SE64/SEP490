package com.adaptlearngraph.apis;

import com.adaptlearngraph.dtos.BaselineAuthoringDto.ContentHashRequest;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.EditManifestRequest;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.ExpectedRevisionRequest;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.ManagedAssessmentResponse;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.ManagedBlueprintResponse;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.ReasonRequest;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.SaveWorkingRequest;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.WorkingRevisionResponse;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.WorkspaceResponse;
import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.services.BaselineAssessmentManagementApplicationService;
import com.adaptlearngraph.services.BaselineAssessmentManagementUseCase.Failure;
import com.adaptlearngraph.services.BaselineAssessmentManagementUseCase.JobPositionPage;
import com.adaptlearngraph.services.BaselineStoreFailures;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.net.URI;
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
@Profile("local & !workspace-baseline & !prod")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(
        prefix = "assessment.baseline.jobPosition-catalog", name = "enabled", havingValue = "true")
@ConditionalOnProperty(prefix = "catalog.local-actor", name = "enabled", havingValue = "true")
@ConditionalOnProperty(prefix = "assessment.baseline.legacy-authoring", name = "enabled", havingValue = "true")
@RequestMapping(ApiEndpoints.BASELINE_ASSESSMENT_MANAGEMENT)
public class BaselineAssessmentManagementController {
    private final BaselineAssessmentManagementApplicationService management;

    public BaselineAssessmentManagementController(BaselineAssessmentManagementApplicationService management) {
        this.management = management;
    }

    @GetMapping
    JobPositionPage list(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "") String status,
            @RequestParam(defaultValue = "name_asc") String sort,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) int size) {
        return management.list(search, status, sort, page, size);
    }

    @GetMapping("/job-positions/{jobPositionId}")
    WorkspaceResponse workspace(@PathVariable String jobPositionId) {
        return management.workspace(jobPositionId);
    }

    @PostMapping("/job-positions/{jobPositionId}/blueprint-working-revisions")
    ResponseEntity<WorkingRevisionResponse> startRevision(
            @PathVariable String jobPositionId,
            @RequestHeader("Idempotency-Key") @NotBlank String idempotencyKey) {
        WorkingRevisionResponse created = management.startRevision(jobPositionId, idempotencyKey);
        return ResponseEntity.created(workingLocation(jobPositionId, created.workingRevisionId()))
                .body(created);
    }

    @PutMapping("/job-positions/{jobPositionId}/blueprint-working-revisions/{workingRevisionId}")
    WorkingRevisionResponse saveRevision(
            @PathVariable String jobPositionId,
            @PathVariable UUID workingRevisionId,
            @RequestHeader("Idempotency-Key") @NotBlank String idempotencyKey,
            @Valid @RequestBody SaveWorkingRequest request) {
        return management.saveRevision(jobPositionId, workingRevisionId, idempotencyKey, request);
    }

    @PostMapping("/job-positions/{jobPositionId}/blueprint-working-revisions/{workingRevisionId}/finalize")
    ResponseEntity<ManagedBlueprintResponse> finalizeRevision(
            @PathVariable String jobPositionId,
            @PathVariable UUID workingRevisionId,
            @RequestHeader("Idempotency-Key") @NotBlank String idempotencyKey,
            @Valid @RequestBody ExpectedRevisionRequest request) {
        ManagedBlueprintResponse created = management.finalizeRevision(
                workingRevisionId, request.expectedRevision(), idempotencyKey);
        return ResponseEntity.created(URI.create("/api/v1/ld/baseline-blueprints/"
                        + created.blueprintId() + "/versions/" + created.version()))
                .body(created);
    }

    @PostMapping("/job-positions/{jobPositionId}/assessment-drafts")
    ResponseEntity<ManagedAssessmentResponse> generate(
            @PathVariable String jobPositionId,
            @RequestHeader("Idempotency-Key") @NotBlank String idempotencyKey) {
        ManagedAssessmentResponse created = management.generate(jobPositionId, idempotencyKey);
        return ResponseEntity.created(assessmentLocation(created.assessmentVersionId()))
                .body(created);
    }

    @GetMapping("/assessment-versions/{assessmentVersionId}")
    ManagedAssessmentResponse assessment(@PathVariable UUID assessmentVersionId) {
        return management.assessment(assessmentVersionId);
    }

    @PutMapping("/assessment-versions/{assessmentVersionId}")
    ManagedAssessmentResponse edit(
            @PathVariable UUID assessmentVersionId,
            @RequestHeader("Idempotency-Key") @NotBlank String idempotencyKey,
            @Valid @RequestBody EditManifestRequest request) {
        return management.edit(assessmentVersionId, idempotencyKey, request);
    }

    @PutMapping("/assessment-versions/{assessmentVersionId}/review")
    ManagedAssessmentResponse review(
            @PathVariable UUID assessmentVersionId,
            @Valid @RequestBody ContentHashRequest request) {
        return management.review(assessmentVersionId, request.contentHash());
    }

    @PutMapping("/assessment-versions/{assessmentVersionId}/publish")
    ManagedAssessmentResponse publish(
            @PathVariable UUID assessmentVersionId,
            @Valid @RequestBody ContentHashRequest request) {
        return management.publish(assessmentVersionId, request.contentHash());
    }

    @PostMapping("/assessment-versions/{assessmentVersionId}/replacement-draft")
    ResponseEntity<ManagedAssessmentResponse> replaceReviewed(
            @PathVariable UUID assessmentVersionId,
            @RequestHeader("Idempotency-Key") @NotBlank String idempotencyKey) {
        ManagedAssessmentResponse created = management.replaceReviewed(assessmentVersionId, idempotencyKey);
        return ResponseEntity.created(assessmentLocation(created.assessmentVersionId()))
                .body(created);
    }

    @PostMapping("/assessment-versions/{assessmentVersionId}/restore")
    ResponseEntity<ManagedAssessmentResponse> restore(
            @PathVariable UUID assessmentVersionId,
            @RequestHeader("Idempotency-Key") @NotBlank String idempotencyKey) {
        ManagedAssessmentResponse created = management.restore(assessmentVersionId, idempotencyKey);
        return ResponseEntity.created(assessmentLocation(created.assessmentVersionId()))
                .body(created);
    }

    @PostMapping("/assessment-versions/{assessmentVersionId}/disable")
    WorkspaceResponse disable(
            @PathVariable UUID assessmentVersionId,
            @Valid @RequestBody ReasonRequest request) {
        return management.disable(assessmentVersionId, request.reason());
    }

    @PostMapping("/job-positions/{jobPositionId}/abandon-pending-change")
    WorkspaceResponse abandon(
            @PathVariable String jobPositionId,
            @Valid @RequestBody ReasonRequest request) {
        return management.abandon(jobPositionId, request.reason());
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

    @ExceptionHandler(com.adaptlearngraph.services.BaselineBlueprintUseCase.Failure.class)
    ResponseEntity<ApiError> handleAuthoringFailure(
            com.adaptlearngraph.services.BaselineBlueprintUseCase.Failure failure) {
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

    @ExceptionHandler(BaselineStoreFailures.WriteConflict.class)
    ResponseEntity<ApiError> handleWriteConflict(RuntimeException failure) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(
                new ApiError("VERSION_CONFLICT", failure.getMessage(), null));
    }

    @ExceptionHandler(BaselineStoreFailures.DependencyUnavailable.class)
    ResponseEntity<ApiError> handleDependency(RuntimeException failure) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(
                new ApiError("DEPENDENCY_UNAVAILABLE", failure.getMessage(), null));
    }

    @ExceptionHandler({IllegalArgumentException.class, ArithmeticException.class})
    ResponseEntity<ApiError> handleInvalid(RuntimeException failure) {
        return ResponseEntity.badRequest().body(
                new ApiError("INVALID_REQUEST", failure.getMessage(), null));
    }

    private static URI workingLocation(String jobPositionId, UUID workingId) {
        return URI.create("/api/v1/ld/baseline-assessments/job-positions/" + jobPositionId
                + "/blueprint-working-revisions/" + workingId);
    }

    private static URI assessmentLocation(UUID assessmentVersionId) {
        return URI.create("/api/v1/ld/baseline-assessments/assessment-versions/"
                + assessmentVersionId);
    }

    record ApiError(String code, String message, UUID existingResourceId) {}
}
