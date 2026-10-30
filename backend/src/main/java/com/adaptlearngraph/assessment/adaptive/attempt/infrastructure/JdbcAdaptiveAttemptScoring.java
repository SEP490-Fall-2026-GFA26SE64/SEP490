package com.adaptlearngraph.assessment.adaptive.attempt.infrastructure;

import com.adaptlearngraph.assessment.adaptive.attempt.application.port.out.AdaptiveAttemptScoringPort;
import com.adaptlearngraph.assessment.adaptive.attempt.domain.AdaptiveAttempt.Scope;
import java.util.*;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

/** Exact published key lookup, including superseded versions. Only a boolean crosses the port. */
public final class JdbcAdaptiveAttemptScoring implements AdaptiveAttemptScoringPort {
    private final boolean demoDraft;
    private final NamedParameterJdbcTemplate jdbc;
    private final UUID bankId;
    public JdbcAdaptiveAttemptScoring(NamedParameterJdbcTemplate jdbc, UUID bankId) { this(jdbc, bankId, false); }

    public JdbcAdaptiveAttemptScoring(NamedParameterJdbcTemplate jdbc, UUID bankId, boolean demoDraft) {
        this.demoDraft = demoDraft;
        this.jdbc = jdbc; this.bankId = Objects.requireNonNull(bankId);
    }
    @Override public boolean correct(Scope scope, UUID itemVersionId, String selectedOptionId, List<String> presentedOptions) {
        var keys = jdbc.query("""
                SELECT CASE WHEN jsonb_typeof(item.protected_key->'correctOptionId')='string'
                    THEN item.protected_key->>'correctOptionId' ELSE NULL END
                FROM platform.item_version item JOIN platform.question_bank bank USING(question_bank_id)
                JOIN platform.account owner ON owner.account_id=bank.created_by AND owner.organization_id=:org
                WHERE item.item_version_id=:item AND item.question_bank_id=:bank AND (item.publication_state='PUBLISHED' OR (:demoDraft AND item.publication_state='DRAFT'))
                """, Map.of("demoDraft", demoDraft, "org", scope.organizationId(), "item", itemVersionId, "bank", bankId), (rs, row) -> rs.getString(1));
        if (keys.size() != 1 || keys.getFirst() == null || !presentedOptions.contains(keys.getFirst())) throw new TechnicalFailure();
        return keys.getFirst().equals(selectedOptionId);
    }
}
