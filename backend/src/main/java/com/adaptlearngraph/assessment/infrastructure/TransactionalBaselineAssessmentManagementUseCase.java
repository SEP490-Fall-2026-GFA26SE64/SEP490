package com.adaptlearngraph.assessment.infrastructure;

import com.adaptlearngraph.assessment.application.port.in.BaselineAssessmentManagementUseCase;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase.BlueprintDraft;
import com.adaptlearngraph.assessment.domain.BaselineAssessmentDraft;
import com.adaptlearngraph.assessment.domain.BaselineBlueprint;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Keeps Spring transaction policy outside the application core. */
final class TransactionalBaselineAssessmentManagementUseCase
        implements BaselineAssessmentManagementUseCase {
    private final BaselineAssessmentManagementUseCase delegate;
    private final TransactionTemplate transactions;

    TransactionalBaselineAssessmentManagementUseCase(
            BaselineAssessmentManagementUseCase delegate,
            PlatformTransactionManager transactionManager) {
        this.delegate = delegate;
        this.transactions = new TransactionTemplate(transactionManager);
    }

    @Override
    public OccupationPage listOccupations(OccupationQuery query) {
        return delegate.listOccupations(query);
    }

    @Override
    public Workspace getWorkspace(String occupationId) {
        return delegate.getWorkspace(occupationId);
    }

    @Override
    public WorkingRevision startBlueprintRevision(String occupationId, String idempotencyKey) {
        return write(() -> delegate.startBlueprintRevision(occupationId, idempotencyKey));
    }

    @Override
    public WorkingRevision saveBlueprintRevision(
            UUID workingRevisionId, long expectedRevision, String idempotencyKey, BlueprintDraft draft) {
        return write(() -> delegate.saveBlueprintRevision(
                workingRevisionId, expectedRevision, idempotencyKey, draft));
    }

    @Override
    public BaselineBlueprint finalizeBlueprintRevision(
            UUID workingRevisionId, long expectedRevision, String idempotencyKey) {
        return write(() -> delegate.finalizeBlueprintRevision(
                workingRevisionId, expectedRevision, idempotencyKey));
    }

    @Override
    public BaselineAssessmentDraft generateAssessmentDraft(String occupationId, String idempotencyKey) {
        return write(() -> delegate.generateAssessmentDraft(occupationId, idempotencyKey));
    }

    @Override
    public BaselineAssessmentDraft getAssessmentVersion(UUID assessmentVersionId) {
        return delegate.getAssessmentVersion(assessmentVersionId);
    }

    @Override
    public BaselineAssessmentDraft reviewAssessmentDraft(
            UUID assessmentVersionId, String expectedContentHash) {
        return write(() -> delegate.reviewAssessmentDraft(assessmentVersionId, expectedContentHash));
    }

    @Override
    public BaselineAssessmentDraft publishAssessment(
            UUID assessmentVersionId, String expectedContentHash) {
        return write(() -> delegate.publishAssessment(assessmentVersionId, expectedContentHash));
    }

    @Override
    public BaselineAssessmentDraft editAssessmentDraft(
            UUID assessmentVersionId, long expectedRevision, String idempotencyKey, ManifestEdit edit) {
        return write(() -> delegate.editAssessmentDraft(
                assessmentVersionId, expectedRevision, idempotencyKey, edit));
    }

    @Override
    public BaselineAssessmentDraft replaceReviewedCandidate(
            UUID assessmentVersionId, String idempotencyKey) {
        return write(() -> delegate.replaceReviewedCandidate(assessmentVersionId, idempotencyKey));
    }

    @Override
    public BaselineAssessmentDraft restoreHistoricalAssessment(
            UUID assessmentVersionId, String idempotencyKey) {
        return write(() -> delegate.restoreHistoricalAssessment(assessmentVersionId, idempotencyKey));
    }

    @Override
    public Workspace disableActiveAssessment(UUID assessmentVersionId, String reason) {
        return write(() -> delegate.disableActiveAssessment(assessmentVersionId, reason));
    }

    @Override
    public Workspace abandonPendingChange(String occupationId, String reason) {
        return write(() -> delegate.abandonPendingChange(occupationId, reason));
    }

    private <T> T write(Supplier<T> operation) {
        T result = transactions.execute(status -> operation.get());
        if (result == null) throw new IllegalStateException("Transactional command returned no result");
        return result;
    }
}
