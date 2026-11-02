package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.BaselineAnswerRevealAuditEntity;
import com.adaptlearngraph.services.BaselineAnswerReviewUseCase.AnswerItem;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.dao.DataAccessException;
import org.springframework.transaction.annotation.Transactional;

/** Reveals one organization's baseline answer keys and audits the reveal in the same transaction. */
public class JpaBaselineAnswerReviewStore implements BaselineAnswerReviewStore {
    private final AssessmentVersionJpaRepository assessments;
    private final BaselineAnswerRevealAuditJpaRepository audit;

    public JpaBaselineAnswerReviewStore(AssessmentVersionJpaRepository assessments, BaselineAnswerRevealAuditJpaRepository audit) {
        this.assessments = assessments;
        this.audit = audit;
    }

    @Override
    @Transactional(TransactionManagers.JPA)
    public List<AnswerItem> revealAndAudit(UUID organizationId, UUID assessmentVersionId, UUID actorId, Instant revealedAt) {
        try {
            List<AnswerItem> items = assessments.answerKeys(organizationId, assessmentVersionId).stream()
                    .map(key -> new AnswerItem(key.itemVersionId(), key.protectedKey())).toList();
            if (items.isEmpty()) throw new NotFound("Baseline assessment version was not found");
            audit.insert(new BaselineAnswerRevealAuditEntity(UUID.randomUUID(), organizationId, assessmentVersionId, actorId,
                    revealedAt, items.size()));
            return items;
        } catch (NotFound missing) {
            throw missing;
        } catch (DataAccessException failure) {
            throw new DependencyUnavailable("Protected answers are unavailable", failure);
        }
    }
}