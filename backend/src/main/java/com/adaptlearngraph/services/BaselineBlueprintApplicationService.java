package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.BaselineAuthoringDto.AssessmentDraftResponse;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.BlueprintResponse;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.CreateRequest;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.ReviseRequest;
import com.adaptlearngraph.entities.domain.BaselineBlueprint;
import com.adaptlearngraph.services.BaselineBlueprintUseCase.BlueprintDraft;
import com.adaptlearngraph.services.BaselineBlueprintUseCase.Failure;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Supplier;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.ObjectProvider;

/**
 * DTO boundary of the legacy baseline blueprint API. When the JobPosition-scoped management capability is present,
 * legacy writes are routed through its working revision lifecycle; otherwise the legacy use cases are used directly.
 */
public class BaselineBlueprintApplicationService {
    private final BaselineBlueprintUseCase blueprints;
    private final BaselineAssessmentDraftUseCase drafts;
    private final BaselineAssessmentManagementUseCase management;
    private final ModelMapper mapper;

    public BaselineBlueprintApplicationService(BaselineBlueprintUseCase blueprints, BaselineAssessmentDraftUseCase drafts,
            ObjectProvider<BaselineAssessmentManagementUseCase> management, ModelMapper mapper) {
        this.blueprints = Objects.requireNonNull(blueprints, "blueprints");
        this.drafts = Objects.requireNonNull(drafts, "drafts");
        this.management = management.getIfAvailable();
        this.mapper = Objects.requireNonNull(mapper, "mapper");
    }

    public BlueprintResponse create(String idempotencyKey, CreateRequest request) {
        return call(() -> {
            if (management == null) {
                return blueprint(blueprints.create(idempotencyKey, draft(request)));
            }
            if (!management.getWorkspace(request.jobPositionId()).blueprintVersions().isEmpty()) {
                throw new Failure(BaselineBlueprintUseCase.Code.VERSION_CONFLICT,
                        "This JobPosition already has a baseline blueprint");
            }
            return blueprint(finalizeLegacyDraft(idempotencyKey, draft(request)));
        });
    }

    public BlueprintResponse revise(UUID blueprintId, String idempotencyKey, ReviseRequest request) {
        return call(() -> {
            if (management == null) {
                var draft = BaselineAuthoringRequests.draft(request.name(), request.jobPositionId(),
                        request.jobPositionNameSnapshot(), request.roles());
                return blueprint(blueprints.revise(blueprintId, request.expectedLatestVersion(), idempotencyKey, draft));
            }
            BaselineBlueprint latest = blueprints.getLatest(blueprintId);
            if (latest.version() != request.expectedLatestVersion()) {
                throw new Failure(BaselineBlueprintUseCase.Code.VERSION_CONFLICT, "Baseline blueprint has a newer version");
            }
            return blueprint(finalizeLegacyDraft(idempotencyKey, BaselineAuthoringRequests.draft(request.name(),
                    request.jobPositionId(), request.jobPositionNameSnapshot(), request.roles())));
        });
    }

    public BlueprintResponse latest(UUID blueprintId) {
        return call(() -> blueprint(blueprints.getLatest(blueprintId)));
    }

    public BlueprintResponse latestByJobPosition(String jobPositionId) {
        return call(() -> blueprint(blueprints.getLatestByJobPosition(jobPositionId)));
    }

    public BlueprintResponse version(UUID blueprintId, int version) {
        return call(() -> blueprint(blueprints.getVersion(blueprintId, version)));
    }

    public AssessmentDraftResponse generate(UUID blueprintId, int blueprintVersion, String idempotencyKey) {
        return call(() -> {
            if (management == null) {
                return assessment(drafts.generate(blueprintId, blueprintVersion, idempotencyKey));
            }
            BaselineBlueprint blueprint = blueprints.getVersion(blueprintId, blueprintVersion);
            return assessment(management.generateAssessmentDraft(blueprint.jobPositionId(), idempotencyKey));
        });
    }

    public AssessmentDraftResponse draft(UUID assessmentVersionId) {
        return call(() -> assessment(management == null
                ? drafts.get(assessmentVersionId)
                : management.getAssessmentVersion(assessmentVersionId)));
    }

    public AssessmentDraftResponse review(UUID assessmentVersionId, String contentHash) {
        return call(() -> assessment(management == null
                ? drafts.review(assessmentVersionId, contentHash)
                : management.reviewAssessmentDraft(assessmentVersionId, contentHash)));
    }

    public AssessmentDraftResponse publish(UUID assessmentVersionId, String contentHash) {
        return call(() -> assessment(management == null
                ? drafts.publish(assessmentVersionId, contentHash)
                : management.publishAssessment(assessmentVersionId, contentHash)));
    }

    private static BlueprintDraft draft(CreateRequest request) {
        return BaselineAuthoringRequests.draft(request.name(), request.jobPositionId(), request.jobPositionNameSnapshot(),
                request.roles());
    }

    private BaselineBlueprint finalizeLegacyDraft(String idempotencyKey, BlueprintDraft draft) {
        var working = management.startBlueprintRevision(draft.jobPositionId(), idempotencyKey + ":start");
        var saved = management.saveBlueprintRevision(working.workingRevisionId(), working.revision(),
                idempotencyKey + ":save", draft);
        return management.finalizeBlueprintRevision(saved.workingRevisionId(), saved.revision(), idempotencyKey);
    }

    private BlueprintResponse blueprint(BaselineBlueprint blueprint) {
        return blueprint == null ? null : mapper.map(blueprint, BlueprintResponse.class);
    }

    private AssessmentDraftResponse assessment(Object draft) {
        return draft == null ? null : mapper.map(draft, AssessmentDraftResponse.class);
    }

    private static <T> T call(Supplier<T> work) {
        return BaselineStoreFailures.legacy(work);
    }
}