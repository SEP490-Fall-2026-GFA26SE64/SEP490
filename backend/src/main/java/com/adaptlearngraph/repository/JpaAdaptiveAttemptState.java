package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.AdaptiveAttempt;
import com.adaptlearngraph.entities.AdaptiveAttempt.Scope;
import com.adaptlearngraph.entities.BaselineAttemptItemEntity;
import com.adaptlearngraph.entities.BaselineAttemptPoolItemEntity;
import com.adaptlearngraph.entities.BaselineAttemptResponseEntity;
import com.adaptlearngraph.entities.BaselineAttemptSkillStateEntity;
import com.fasterxml.jackson.core.type.TypeReference;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/** Child-row split of the single concrete store, not another bean/adapter. All child access checks ownership. */
public abstract class JpaAdaptiveAttemptState implements AdaptiveAttemptStore {
    private static final TypeReference<List<String>> OPTION_ORDER = new TypeReference<>() {};
    private static final TypeReference<Map<String, String>> SELECTION_TRACE = new TypeReference<>() {};
    protected final AdaptiveAttemptJpa db;
    protected final AdaptiveAttemptRows rows;
    JpaAdaptiveAttemptState(AdaptiveAttemptJpa db, AdaptiveAttemptRows rows) { this.db = db; this.rows = rows; }

    protected void initialize(AdaptiveAttempt attempt, List<SkillState> skills, PresentedItem first) {
        if (skills.size() != attempt.snapshot().microSkillIds().size()
                || !skills.stream().map(SkillState::microSkillId).collect(Collectors.toSet()).equals(attempt.snapshot().microSkillIds())
                || skills.stream().anyMatch(skill -> skill.answeredCount() != 0 || skill.revision() != 1)) {
            throw new IllegalArgumentException("Initial skill state must cover the pinned scope without responses");
        }
        db.owned(attempt.scope(), attempt.id());
        UUID org = attempt.scope().organizationId();
        for (SkillState skill : skills) db.data.skills().insert(new BaselineAttemptSkillStateEntity(attempt.id(), org,
                skill.microSkillId(), skill.theta(), skill.standardError(), skill.testInformation(), skill.answeredCount(),
                skill.revision(), skill.updatedAt()));
        UUID parameters = attempt.snapshot().blueprint().pins().parameterSetId();
        db.data.pool().insertAll(attempt.snapshot().itemSkills().entrySet().stream()
                .map(item -> new BaselineAttemptPoolItemEntity(attempt.id(), org, parameters, item.getKey(), item.getValue())).toList());
        present(attempt.scope(), attempt.id(), first);
    }

    private void present(Scope scope, UUID id, PresentedItem item) {
        db.owned(scope, id);
        db.data.items().insert(new BaselineAttemptItemEntity(id, scope.organizationId(), item.position(), item.itemVersionId(),
                item.microSkillId(), rows.write(item.optionOrder()), rows.write(item.selectionTrace()), item.presentedAt()));
    }

    @Override public Progress progress(Scope scope, UUID id) {
        db.owned(scope, id);
        UUID org = scope.organizationId();
        var items = db.data.items().items(org, id).stream().map(item -> new PresentedItem(item.position(), item.itemVersionId(),
                item.microSkillId(), rows.read(item.optionOrder(), OPTION_ORDER), rows.read(item.selectionTrace(), SELECTION_TRACE),
                item.presentedAt())).toList();
        var responses = db.data.responses().responses(org, id).stream().map(response -> new Response(response.position(),
                rows.selectedOption(response.responsePayload()), response.correct(), response.acceptedAt(), response.requestId())).toList();
        var skills = db.data.skills().skills(org, id).stream().map(skill -> new SkillState(skill.microSkillId(), skill.theta(),
                skill.standardError(), skill.testInformation(), skill.answeredCount(), skill.revision(), skill.updatedAt())).toList();
        return new Progress(items, responses, skills);
    }

    @Override public void accept(Scope scope, UUID id, Response response, long expectedSkillRevision,
                                 SkillState next, Optional<PresentedItem> nextItem) {
        if (!response.acceptedAt().equals(next.updatedAt())) throw new IllegalArgumentException("Response and estimate need one server observation");
        db.owned(scope, id);
        UUID org = scope.organizationId();
        // The response is accepted only for the item presented at this position for this skill.
        AdaptiveAttemptJpa.changed(db.data.items().countPresented(org, id, response.position(), next.microSkillId()));
        db.data.responses().insert(new BaselineAttemptResponseEntity(id, org, response.position(),
                rows.responsePayload(response.selectedOptionId()), response.correct(), response.acceptedAt(), response.requestId()));
        AdaptiveAttemptJpa.changed(db.data.skills().advance(org, id, next.microSkillId(), expectedSkillRevision, next.theta(),
                next.standardError(), next.testInformation(), next.answeredCount(), next.revision(), response.acceptedAt()));
        nextItem.ifPresent(item -> present(scope, id, item));
    }
}
