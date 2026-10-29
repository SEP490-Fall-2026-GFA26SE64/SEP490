package com.adaptlearngraph.assessment.adaptive.infrastructure;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

public final class WorkspaceBaselineResources {
    public record Binding(UUID organizationId, String occupationId, String name, UUID bankId,
                          UUID modelId, UUID mappingId) {
        public boolean ready() { return bankId != null && modelId != null && mappingId != null; }
        public JdbcAdaptiveBlueprintEligibilityAdapter.Properties settings() {
            if (!ready()) throw new IllegalStateException("Baseline question bank/model is not configured");
            return new JdbcAdaptiveBlueprintEligibilityAdapter.Properties(true, organizationId,
                    Set.of(occupationId), bankId, modelId, mappingId);
        }
    }

    private final NamedParameterJdbcTemplate jdbc;
    public WorkspaceBaselineResources(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<Binding> list(UUID organization) {
        return jdbc.query("""
                SELECT r.*, o.name FROM platform.workspace_baseline_resource r
                JOIN platform.occupation_department_reference o
                  ON o.occupation_reference_id=r.occupation_reference_id AND o.organization_id=r.organization_id
                JOIN platform.department_reference d ON d.department_id=o.department_id AND d.organization_id=o.organization_id
                WHERE r.organization_id=:org AND o.active AND d.active
                ORDER BY r.graph_occupation_id
                """, Map.of("org", organization), (rs, row) -> new Binding(organization,
                rs.getString("graph_occupation_id"), rs.getString("name"),
                rs.getObject("question_bank_id", UUID.class), rs.getObject("model_version_id", UUID.class),
                rs.getObject("mastery_mapping_version_id", UUID.class)));
    }
    public Set<String> occupations(UUID organization) {
        return list(organization).stream().map(Binding::occupationId).collect(Collectors.toUnmodifiableSet());
    }
    public Optional<Binding> find(UUID organization, String occupation) {
        return list(organization).stream().filter(binding -> binding.occupationId().equals(occupation)).findFirst();
    }
    public UUID itemBank(UUID organization, UUID item) {
        return jdbc.query("""
                SELECT i.question_bank_id FROM platform.item_version i
                JOIN platform.question_bank b USING(question_bank_id)
                JOIN platform.account a ON a.account_id=b.created_by
                WHERE i.item_version_id=:item AND a.organization_id=:org
                """, Map.of("item", item, "org", organization), (rs, row) -> rs.getObject(1, UUID.class))
                .stream().findFirst().orElseThrow(() ->
                        new com.adaptlearngraph.assessment.adaptive.attempt.application.port.in.AdaptiveAttemptUseCase.Failure(
                                com.adaptlearngraph.assessment.adaptive.attempt.application.port.in.AdaptiveAttemptUseCase.Code.DEPENDENCY_UNAVAILABLE));
    }
}
