package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.BaselineAuthoringDto.EditManifestRequest;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.ManagedAssessmentResponse;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.ManagedBlueprintResponse;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.SaveWorkingRequest;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.WorkingRevisionResponse;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.WorkspaceResponse;
import com.adaptlearngraph.services.BaselineAssessmentManagementUseCase.ManifestEdit;
import com.adaptlearngraph.services.BaselineAssessmentManagementUseCase.OccupationPage;
import com.adaptlearngraph.services.BaselineAssessmentManagementUseCase.OccupationQuery;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Supplier;
import org.modelmapper.ModelMapper;

/**
 * DTO boundary of the L&amp;D baseline assessment management API. Actor and organization come from trusted context;
 * Occupation, working revision and assessment version ids come from the request path.
 */
public class BaselineAssessmentManagementApplicationService {
    private final BaselineAssessmentManagementUseCase management;
    private final ModelMapper mapper;

    public BaselineAssessmentManagementApplicationService(BaselineAssessmentManagementUseCase management, ModelMapper mapper) {
        this.management = Objects.requireNonNull(management, "management");
        this.mapper = Objects.requireNonNull(mapper, "mapper");
    }

    public OccupationPage list(String search, String status, String sort, int page, int size) {
        var query = new OccupationQuery(search, status, sort, page, size);
        return call(() -> management.listOccupations(query));
    }

    public WorkspaceResponse workspace(String occupationId) {
        return map(call(() -> management.getWorkspace(occupationId)), WorkspaceResponse.class);
    }

    public WorkingRevisionResponse startRevision(String occupationId, String idempotencyKey) {
        return map(call(() -> management.startBlueprintRevision(occupationId, idempotencyKey)), WorkingRevisionResponse.class);
    }

    public WorkingRevisionResponse saveRevision(
            String occupationId, UUID workingRevisionId, String idempotencyKey, SaveWorkingRequest request) {
        if (!occupationId.equals(request.occupationId())) {
            throw new IllegalArgumentException("Path and body Occupation must match");
        }
        var draft = BaselineAuthoringRequests.draft(request.name(), request.occupationId(),
                request.occupationNameSnapshot(), request.roles());
        return map(call(() -> management.saveBlueprintRevision(workingRevisionId, request.expectedRevision(),
                idempotencyKey, draft)), WorkingRevisionResponse.class);
    }

    public ManagedBlueprintResponse finalizeRevision(UUID workingRevisionId, long expectedRevision, String idempotencyKey) {
        return map(call(() -> management.finalizeBlueprintRevision(workingRevisionId, expectedRevision, idempotencyKey)),
                ManagedBlueprintResponse.class);
    }

    public ManagedAssessmentResponse generate(String occupationId, String idempotencyKey) {
        return assessment(call(() -> management.generateAssessmentDraft(occupationId, idempotencyKey)));
    }

    public ManagedAssessmentResponse assessment(UUID assessmentVersionId) {
        return assessment(call(() -> management.getAssessmentVersion(assessmentVersionId)));
    }

    public ManagedAssessmentResponse edit(UUID assessmentVersionId, String idempotencyKey, EditManifestRequest request) {
        var edit = new ManifestEdit(request.title(), request.orderedItemVersionIds());
        return assessment(call(() -> management.editAssessmentDraft(assessmentVersionId, request.expectedRevision(),
                idempotencyKey, edit)));
    }

    public ManagedAssessmentResponse review(UUID assessmentVersionId, String contentHash) {
        return assessment(call(() -> management.reviewAssessmentDraft(assessmentVersionId, contentHash)));
    }

    public ManagedAssessmentResponse publish(UUID assessmentVersionId, String contentHash) {
        return assessment(call(() -> management.publishAssessment(assessmentVersionId, contentHash)));
    }

    public ManagedAssessmentResponse replaceReviewed(UUID assessmentVersionId, String idempotencyKey) {
        return assessment(call(() -> management.replaceReviewedCandidate(assessmentVersionId, idempotencyKey)));
    }

    public ManagedAssessmentResponse restore(UUID assessmentVersionId, String idempotencyKey) {
        return assessment(call(() -> management.restoreHistoricalAssessment(assessmentVersionId, idempotencyKey)));
    }

    public WorkspaceResponse disable(UUID assessmentVersionId, String reason) {
        return map(call(() -> management.disableActiveAssessment(assessmentVersionId, reason)), WorkspaceResponse.class);
    }

    public WorkspaceResponse abandon(String occupationId, String reason) {
        return map(call(() -> management.abandonPendingChange(occupationId, reason)), WorkspaceResponse.class);
    }

    private ManagedAssessmentResponse assessment(Object draft) {
        return map(draft, ManagedAssessmentResponse.class);
    }

    private <D> D map(Object source, Class<D> type) {
        return source == null ? null : mapper.map(source, type);
    }

    private static <T> T call(Supplier<T> work) {
        return BaselineStoreFailures.management(work);
    }
}