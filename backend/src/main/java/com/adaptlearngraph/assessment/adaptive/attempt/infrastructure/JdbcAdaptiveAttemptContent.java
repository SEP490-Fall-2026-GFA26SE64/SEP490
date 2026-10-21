package com.adaptlearngraph.assessment.adaptive.attempt.infrastructure;

import com.adaptlearngraph.assessment.adaptive.attempt.application.port.out.AdaptiveAttemptContentPort;
import com.adaptlearngraph.assessment.adaptive.attempt.application.port.in.AdaptiveAttemptUseCase.*;
import com.adaptlearngraph.assessment.adaptive.attempt.domain.AdaptiveAttempt.Scope;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

/** Exact immutable content, including superseded publications; never query latest/current on resume. */
public final class JdbcAdaptiveAttemptContent implements AdaptiveAttemptContentPort {
    private final NamedParameterJdbcTemplate jdbc;
    private final UUID bankId;
    private final ObjectMapper json = new ObjectMapper();
    public JdbcAdaptiveAttemptContent(NamedParameterJdbcTemplate jdbc, UUID bankId) {
        this.jdbc = jdbc; this.bankId = Objects.requireNonNull(bankId);
    }
    @Override public Item read(Scope scope, UUID itemVersionId) {
        var items = jdbc.query("""
                SELECT item.item_version_id,item.prompt,item.response_schema->'options' AS options
                FROM platform.item_version item JOIN platform.question_bank bank USING(question_bank_id)
                JOIN platform.account owner ON owner.account_id=bank.created_by AND owner.organization_id=:org
                WHERE item.item_version_id=:item AND item.question_bank_id=:bank AND item.publication_state='PUBLISHED'
                """, Map.of("org", scope.organizationId(), "item", itemVersionId, "bank", bankId),
                (rs, row) -> new Item(rs.getObject(1, UUID.class), rs.getString(2), options(rs.getString(3))));
        if (items.size() != 1 || items.getFirst().prompt() == null || items.getFirst().prompt().isBlank()) {
            throw new Failure(Code.DEPENDENCY_UNAVAILABLE);
        }
        return items.getFirst();
    }
    private Map<String, String> options(String payload) {
        try {
            var nodes = json.readTree(payload);
            if (nodes == null || !nodes.isArray() || nodes.size() < 2) throw new Failure(Code.DEPENDENCY_UNAVAILABLE);
            var result = new TreeMap<String, String>();
            for (var node : nodes) {
                if (!node.path("id").isTextual() || node.path("id").textValue().isBlank()
                        || !node.path("id").textValue().equals(node.path("id").textValue().strip())
                        || !node.path("text").isTextual() || node.path("text").textValue().isBlank()
                        || result.putIfAbsent(node.get("id").textValue(), node.get("text").textValue()) != null) {
                    throw new Failure(Code.DEPENDENCY_UNAVAILABLE);
                }
            }
            return result;
        } catch (JsonProcessingException | IllegalArgumentException invalid) {
            throw new Failure(Code.DEPENDENCY_UNAVAILABLE);
        }
    }
}
