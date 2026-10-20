package com.adaptlearngraph.assessment.adaptive.infrastructure;

import com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveBlueprintEligibilityPort.DependencyUnavailable;
import com.adaptlearngraph.assessment.adaptive.application.port.out.AdaptiveBlueprintPreviewPort;
import com.adaptlearngraph.assessment.adaptive.domain.AdaptiveBlueprint.Scope;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

/** TMP-REQ002-03: explicit bank + tenant, no component/bean registration until A6's authorized gated API wiring. */
public final class JdbcAdaptiveBlueprintPreviewAdapter implements AdaptiveBlueprintPreviewPort {
    private final NamedParameterJdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final UUID bankId;

    public JdbcAdaptiveBlueprintPreviewAdapter(NamedParameterJdbcTemplate jdbc, ObjectMapper mapper, UUID bankId) {
        this.jdbc = Objects.requireNonNull(jdbc);
        this.mapper = Objects.requireNonNull(mapper).copy();
        this.bankId = Objects.requireNonNull(bankId, "Explicit server question bank required");
    }

    @Override public List<Item> read(Scope scope, Set<UUID> authorizedItemVersionIds) {
        Set<UUID> ids = Set.copyOf(authorizedItemVersionIds);
        if (ids.isEmpty()) return List.of();
        try {
            return jdbc.query("""
                    SELECT item.item_version_id,item.micro_skill_id,item.prompt,item.response_schema->'options' AS options
                    FROM platform.item_version item
                    JOIN platform.question_bank bank ON bank.question_bank_id=item.question_bank_id
                    JOIN platform.account owner ON owner.account_id=bank.created_by AND owner.organization_id=:org
                    WHERE item.question_bank_id=:bank AND item.item_version_id IN (:ids) AND item.publication_state='PUBLISHED'
                      AND NOT EXISTS (SELECT 1 FROM platform.item_version newer WHERE newer.item_id=item.item_id AND newer.version>item.version)
                    ORDER BY item.item_version_id
                    """, new MapSqlParameterSource("org", scope.organizationId()).addValue("bank", bankId).addValue("ids", ids),
                    (rs, row) -> new Item(rs.getObject("item_version_id", UUID.class), rs.getString("micro_skill_id"),
                            rs.getString("prompt"), options(rs.getString("options"))));
        } catch (DataAccessException | IllegalArgumentException | IllegalStateException cause) {
            throw new DependencyUnavailable("Answer-safe preview items unavailable", cause);
        }
    }

    private java.util.Map<String, String> options(String payload) {
        try {
            var nodes = mapper.readTree(payload);
            if (nodes == null || !nodes.isArray()) throw new IllegalArgumentException("Invalid preview options");
            var result = new LinkedHashMap<String, String>();
            for (var node : nodes) {
                if (!node.path("id").isTextual() || !node.path("text").isTextual()
                        || result.putIfAbsent(node.get("id").textValue(), node.get("text").textValue()) != null) {
                    throw new IllegalArgumentException("Invalid or duplicate preview option");
                }
            }
            return result;
        } catch (JsonProcessingException failure) { throw new IllegalArgumentException("Invalid preview options", failure); }
    }
}
