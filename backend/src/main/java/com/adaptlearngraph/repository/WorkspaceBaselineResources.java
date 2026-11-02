package com.adaptlearngraph.repository;

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
        public JpaAdaptiveBlueprintEligibilityAdapter.Properties settings() {
            if (!ready()) throw new IllegalStateException("Baseline question bank/model is not configured");
            return new JpaAdaptiveBlueprintEligibilityAdapter.Properties(true, organizationId,
                    Set.of(occupationId), bankId, modelId, mappingId);
        }
    }

    private final NamedParameterJdbcTemplate jdbc;
    private final WorkspaceBaselineOccupationPort catalog;
    public WorkspaceBaselineResources(NamedParameterJdbcTemplate jdbc) { this(jdbc,null); }
    public WorkspaceBaselineResources(NamedParameterJdbcTemplate jdbc,WorkspaceBaselineOccupationPort catalog) { this.jdbc=jdbc;this.catalog=catalog; }
    private record Stored(Binding binding,boolean enabled,boolean referenceGrant) {}

    public List<Binding> list(UUID organization) {
        return merged(organization,false);
    }
    /** L&D may discover own active Occupations before a resource tuple/binding exists. GET never provisions. */
    public List<Binding> configurable(UUID organization){return merged(organization,true);}
    public Set<String> configurableOccupations(UUID organization){return configurable(organization).stream().map(Binding::occupationId).collect(Collectors.toUnmodifiableSet());}
    private List<Binding> merged(UUID organization,boolean unconfigured) {
        var stored=jdbc.query("""
                SELECT r.*,coalesce(o.name,r.graph_occupation_id) AS name,(r.occupation_reference_id IS NOT NULL) AS reference_grant,
                  (r.occupation_reference_id IS NULL OR coalesce(o.active AND d.active,false)) AS enabled
                FROM platform.workspace_baseline_resource r
                LEFT JOIN platform.occupation_department_reference o
                  ON o.occupation_reference_id=r.occupation_reference_id AND o.organization_id=r.organization_id
                LEFT JOIN platform.department_reference d ON d.department_id=o.department_id AND d.organization_id=o.organization_id
                WHERE r.organization_id=:org
                ORDER BY r.graph_occupation_id
                """, Map.of("org", organization), (rs, row) -> new Stored(new Binding(organization,
                rs.getString("graph_occupation_id"), rs.getString("name"),
                rs.getObject("question_bank_id", UUID.class), rs.getObject("model_version_id", UUID.class),
                rs.getObject("mastery_mapping_version_id", UUID.class)),rs.getBoolean("enabled"),rs.getBoolean("reference_grant")));
        var enabled=stored.stream().filter(Stored::enabled).map(Stored::binding).collect(Collectors.toMap(Binding::occupationId,b->b));
        if(catalog==null)return stored.stream().filter(Stored::enabled).map(Stored::binding).toList();
        var blocked=stored.stream().filter(s->!s.enabled()).map(s->s.binding().occupationId()).collect(Collectors.toSet());
        var shared=stored.stream().filter(s->s.enabled() && s.referenceGrant()).map(s->s.binding().occupationId()).collect(Collectors.toSet());
        return catalog.list(organization,shared).stream().filter(o->!blocked.contains(o.id()) && (unconfigured || enabled.containsKey(o.id())))
                .map(o->{var b=enabled.get(o.id());return b==null?new Binding(organization,o.id(),o.name(),null,null,null)
                        :new Binding(organization,o.id(),o.name(),b.bankId(),b.modelId(),b.mappingId());}).toList();
    }
    public Set<String> occupations(UUID organization) {
        return list(organization).stream().map(Binding::occupationId).collect(Collectors.toUnmodifiableSet());
    }
    public Optional<Binding> find(UUID organization, String occupation) {
        return configurable(organization).stream().filter(binding -> binding.occupationId().equals(occupation)).findFirst();
    }
    public boolean owned(UUID organization,String occupation) {
        return catalog!=null && catalog.list(organization,Set.of()).stream().anyMatch(o->o.owned() && o.id().equals(occupation));
    }
    public UUID itemBank(UUID organization, UUID item) {
        return jdbc.query("""
                SELECT i.question_bank_id FROM platform.item_version i
                JOIN platform.question_bank b USING(question_bank_id)
                JOIN platform.account a ON a.account_id=b.created_by
                WHERE i.item_version_id=:item AND a.organization_id=:org
                """, Map.of("item", item, "org", organization), (rs, row) -> rs.getObject(1, UUID.class))
                .stream().findFirst().orElseThrow(() ->
                        new com.adaptlearngraph.services.AdaptiveAttemptUseCase.Failure(
                                com.adaptlearngraph.services.AdaptiveAttemptUseCase.Code.DEPENDENCY_UNAVAILABLE));
    }
}
