package com.adaptlearngraph.repository;

import com.adaptlearngraph.services.WorkspaceBaselineResourceUseCase.*;
import com.adaptlearngraph.entities.domain.AdaptiveBlueprint.Scope;
import com.adaptlearngraph.entities.AuditEventEntity;
import com.adaptlearngraph.entities.WorkspaceBaselineResourceEntity;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.function.Supplier;
import org.springframework.transaction.support.TransactionTemplate;

/** Explicit existing-resource binding only; it never creates/promotes a bank, model or parameter set. */
public final class JpaWorkspaceBaselineResourceWriter implements WorkspaceBaselineResourcePort {
    private final WorkspaceBaselineResourceJpaRepository resources;
    private final AuditEventJpaRepository audit;
    private final PostgresAdvisoryLocks locks;
    private final ItemVersionJpaRepository itemVersions;
    private final TransactionTemplate transactions;
    private final AdaptiveBaselineCatalogPort catalog;
    private final AdaptiveTechnicalVersionPort technical;
    private final ObjectMapper json;
    private final java.util.function.BiPredicate<Scope,Tuple> fixture;
    private final java.util.function.Predicate<Scope> ownedCatalog;
    public JpaWorkspaceBaselineResourceWriter(WorkspaceBaselineResourceJpaRepository resources, AuditEventJpaRepository audit, PostgresAdvisoryLocks locks,
            ItemVersionJpaRepository itemVersions, TransactionTemplate transactions,
            AdaptiveBaselineCatalogPort catalog, AdaptiveTechnicalVersionPort technical, ObjectMapper json) {
        this(resources,audit,locks,itemVersions,transactions,catalog,technical,json,(scope,tuple)->false);
    }
    public JpaWorkspaceBaselineResourceWriter(WorkspaceBaselineResourceJpaRepository resources, AuditEventJpaRepository audit, PostgresAdvisoryLocks locks,
            ItemVersionJpaRepository itemVersions, TransactionTemplate transactions,
            AdaptiveBaselineCatalogPort catalog, AdaptiveTechnicalVersionPort technical, ObjectMapper json,java.util.function.BiPredicate<Scope,Tuple> fixture) {
        this(resources,audit,locks,itemVersions,transactions,catalog,technical,json,fixture,scope->false);
    }
    public JpaWorkspaceBaselineResourceWriter(WorkspaceBaselineResourceJpaRepository resources, AuditEventJpaRepository audit, PostgresAdvisoryLocks locks,
            ItemVersionJpaRepository itemVersions, TransactionTemplate transactions,
            AdaptiveBaselineCatalogPort catalog, AdaptiveTechnicalVersionPort technical, ObjectMapper json,
            java.util.function.BiPredicate<Scope,Tuple> fixture,java.util.function.Predicate<Scope> ownedCatalog) {
        this.resources=resources;this.audit=audit;this.locks=locks;
        this.itemVersions=itemVersions;this.transactions=transactions;this.catalog=catalog;this.technical=technical;this.json=json;
        this.fixture=fixture;
        this.ownedCatalog=ownedCatalog;
    }
    @Override public <T> T locked(Scope scope, Supplier<T> work) {
        return transactions.execute(status-> {
            locks.lock("workspace-baseline-resource:"+scope.organizationId()+":"+scope.occupationId());
            var found=resources.lock(scope.organizationId(),scope.occupationId());
            if(found.isEmpty() && ownedCatalog.test(scope)) {
                resources.insert(new WorkspaceBaselineResourceEntity(scope.organizationId(),null,scope.occupationId(),null,null,null));
            } else if (found.size()!=1) throw new Failure(404,"RESOURCE_BINDING_NOT_FOUND");
            return work.get();
        });
    }
    @Override public Tuple read(Scope scope) {
        return resources.tuple(scope.organizationId(),scope.occupationId()).stream()
                .map(row->new Tuple(row.bankId(),row.modelId(),row.mappingId())).findFirst().orElseGet(()->{
                    if(ownedCatalog.test(scope))return new Tuple(null,null,null);
                    throw new Failure(404,"RESOURCE_BINDING_NOT_FOUND");
                });
    }
    @Override public Optional<AdaptiveBlueprintEligibilityPort.Snapshot> candidate(Scope scope, Tuple tuple) {
        var settings=new JpaAdaptiveBlueprintEligibilityAdapter.Properties(true,scope.organizationId(),Set.of(scope.occupationId()),
                tuple.bankId(),tuple.modelId(),tuple.mappingId());
        // Only the exact explicitly declared own-bank fixture can admit draft inputs; default remains operational.
        return new JpaAdaptiveBlueprintEligibilityAdapter(itemVersions,catalog,technical,json,settings,fixture.test(scope,tuple)).resolve(scope);
    }
    @Override public void replace(Scope scope, Tuple expected, Tuple desired, UUID actor) {
        int changed=resources.replace(scope.organizationId(),scope.occupationId(),desired.bankId(),desired.modelId(),desired.mappingId(),
                expected.bankId(),expected.modelId(),expected.mappingId());
        if (changed!=1) throw new Failure(409,"STALE_RESOURCE_BINDING");
        UUID resource=UUID.nameUUIDFromBytes((scope.organizationId()+"\n"+scope.occupationId()).getBytes(StandardCharsets.UTF_8));
        audit.insert(new AuditEventEntity(UUID.randomUUID(),actor,"workspace-baseline-resources","BASELINE_RESOURCES_CONFIGURED",resource,
                desired.bankId()+":"+desired.modelId()+":"+desired.mappingId(),null,"SUCCEEDED",UUID.randomUUID()));
    }
}