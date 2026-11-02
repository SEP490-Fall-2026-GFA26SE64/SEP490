package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.AdaptiveAttempt.Scope;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/** Exact published key lookup, including superseded versions. Only a boolean crosses the port. */
public final class JpaAdaptiveAttemptScoring implements AdaptiveAttemptScoringPort {
    private final ItemVersionJpaRepository items;
    private final UUID bankId;
    private final boolean demoDraft;
    private final ObjectMapper json = new ObjectMapper();

    public JpaAdaptiveAttemptScoring(ItemVersionJpaRepository items, UUID bankId) {
        this(items, bankId, false);
    }

    public JpaAdaptiveAttemptScoring(ItemVersionJpaRepository items, UUID bankId, boolean demoDraft) {
        this.items = items;
        this.bankId = Objects.requireNonNull(bankId);
        this.demoDraft = demoDraft;
    }

    @Override
    public boolean correct(Scope scope, UUID itemVersionId, String selectedOptionId, List<String> presentedOptions) {
        var keys = items.owned(scope.organizationId(), bankId, itemVersionId, demoDraft).stream().map(row -> correctOption(row.protectedKey())).toList();
        if (keys.size() != 1 || keys.getFirst() == null || !presentedOptions.contains(keys.getFirst())) throw new TechnicalFailure();
        return keys.getFirst().equals(selectedOptionId);
    }

    /** Former {@code CASE WHEN jsonb_typeof(protected_key->'correctOptionId')='string' THEN ->> ELSE NULL END}. */
    private String correctOption(String protectedKey) {
        try {
            var key = json.readTree(protectedKey).path("correctOptionId");
            return key.isTextual() ? key.textValue() : null;
        } catch (Exception unreadable) {
            return null;
        }
    }
}