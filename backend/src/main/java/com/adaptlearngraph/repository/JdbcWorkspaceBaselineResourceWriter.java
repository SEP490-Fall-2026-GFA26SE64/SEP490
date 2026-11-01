package com.adaptlearngraph.repository;

import com.adaptlearngraph.services.WorkspaceBaselineResourceUseCase.*;
import com.adaptlearngraph.entities.AdaptiveBlueprint.Scope;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.function.Supplier;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

/** Explicit existing-resource binding only; it never creates/promotes a bank, model or parameter set. */
public final class JdbcWorkspaceBaselineResourceWriter implements WorkspaceBaselineResourcePort {
    private final NamedParameterJdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final AdaptiveBaselineCatalogPort catalog;
    private final AdaptiveTechnicalVersionPort technical;
    private final ObjectMapper json;
    private final java.util.function.BiPredicate<Scope,Tuple> fixture;
    private final java.util.function.Predicate<Scope> ownedCatalog;
    public JdbcWorkspaceBaselineResourceWriter(NamedParameterJdbcTemplate jdbc, TransactionTemplate transactions,
            AdaptiveBaselineCatalogPort catalog, AdaptiveTechnicalVersionPort technical, ObjectMapper json) {
        this(jdbc,transactions,catalog,technical,json,(scope,tuple)->false);
    }
    public JdbcWorkspaceBaselineResourceWriter(NamedParameterJdbcTemplate jdbc, TransactionTemplate transactions,
            AdaptiveBaselineCatalogPort catalog, AdaptiveTechnicalVersionPort technical, ObjectMapper json,java.util.function.BiPredicate<Scope,Tuple> fixture) {
        this(jdbc,transactions,catalog,technical,json,fixture,scope->false);
    }
    public JdbcWorkspaceBaselineResourceWriter(NamedParameterJdbcTemplate jdbc, TransactionTemplate transactions,
            AdaptiveBaselineCatalogPort catalog, AdaptiveTechnicalVersionPort technical, ObjectMapper json,
            java.util.function.BiPredicate<Scope,Tuple> fixture,java.util.function.Predicate<Scope> ownedCatalog) {
        this.jdbc=jdbc;this.transactions=transactions;this.catalog=catalog;this.technical=technical;this.json=json;
        this.fixture=fixture;
        this.ownedCatalog=ownedCatalog;
    }
    private Map<String,Object> key(Scope scope) { return Map.of("org",scope.organizationId(),"occupation",scope.occupationId()); }
    @Override public <T> T locked(Scope scope, Supplier<T> work) {
        return transactions.execute(status-> {
            jdbc.query("SELECT pg_advisory_xact_lock(hashtextextended(:key,0))",
                    Map.of("key","workspace-baseline-resource:"+scope.organizationId()+":"+scope.occupationId()),(rs,n)->true);
            var found=jdbc.query("SELECT 1 FROM platform.workspace_baseline_resource WHERE organization_id=:org AND graph_occupation_id=:occupation FOR UPDATE",
                    key(scope),(rs,n)->true);
            if(found.isEmpty() && ownedCatalog.test(scope)) {
                jdbc.update("""
                        INSERT INTO platform.workspace_baseline_resource(organization_id,graph_occupation_id,occupation_reference_id)
                        VALUES(:org,:occupation,NULL)
                        """,key(scope));
            } else if (found.size()!=1) throw new Failure(404,"RESOURCE_BINDING_NOT_FOUND");
            return work.get();
        });
    }
    @Override public Tuple read(Scope scope) {
        return jdbc.query("""
                SELECT question_bank_id,model_version_id,mastery_mapping_version_id FROM platform.workspace_baseline_resource
                WHERE organization_id=:org AND graph_occupation_id=:occupation
                """,key(scope),(rs,n)->new Tuple(rs.getObject(1,UUID.class),rs.getObject(2,UUID.class),rs.getObject(3,UUID.class)))
                .stream().findFirst().orElseGet(()->{
                    if(ownedCatalog.test(scope))return new Tuple(null,null,null);
                    throw new Failure(404,"RESOURCE_BINDING_NOT_FOUND");
                });
    }
    @Override public Optional<AdaptiveBlueprintEligibilityPort.Snapshot> candidate(Scope scope, Tuple tuple) {
        var settings=new JdbcAdaptiveBlueprintEligibilityAdapter.Properties(true,scope.organizationId(),Set.of(scope.occupationId()),
                tuple.bankId(),tuple.modelId(),tuple.mappingId());
        // Only the exact explicitly declared own-bank fixture can admit draft inputs; default remains operational.
        return new JdbcAdaptiveBlueprintEligibilityAdapter(jdbc,catalog,technical,json,settings,fixture.test(scope,tuple)).resolve(scope);
    }
    @Override public void replace(Scope scope, Tuple expected, Tuple desired, UUID actor) {
        var p=new org.springframework.jdbc.core.namedparam.MapSqlParameterSource(key(scope))
                .addValue("bank",desired.bankId()).addValue("model",desired.modelId()).addValue("mapping",desired.mappingId())
                .addValue("oldBank",expected.bankId()).addValue("oldModel",expected.modelId()).addValue("oldMapping",expected.mappingId());
        int changed=jdbc.update("""
                UPDATE platform.workspace_baseline_resource SET question_bank_id=:bank,model_version_id=:model,mastery_mapping_version_id=:mapping
                WHERE organization_id=:org AND graph_occupation_id=:occupation
                  AND question_bank_id IS NOT DISTINCT FROM CAST(:oldBank AS uuid)
                  AND model_version_id IS NOT DISTINCT FROM CAST(:oldModel AS uuid)
                  AND mastery_mapping_version_id IS NOT DISTINCT FROM CAST(:oldMapping AS uuid)
                """,p);
        if (changed!=1) throw new Failure(409,"STALE_RESOURCE_BINDING");
        UUID resource=UUID.nameUUIDFromBytes((scope.organizationId()+"\n"+scope.occupationId()).getBytes(StandardCharsets.UTF_8));
        jdbc.update("""
                INSERT INTO platform.audit_event(audit_event_id,actor_id,service_name,action,resource_id,resource_revision,outcome,correlation_id)
                VALUES(:audit,:actor,'workspace-baseline-resources','BASELINE_RESOURCES_CONFIGURED',:resource,:revision,'SUCCEEDED',:correlation)
                """,new org.springframework.jdbc.core.namedparam.MapSqlParameterSource("audit",UUID.randomUUID()).addValue("actor",actor)
                .addValue("resource",resource).addValue("revision",desired.bankId()+":"+desired.modelId()+":"+desired.mappingId())
                .addValue("correlation",UUID.randomUUID()));
    }
}
