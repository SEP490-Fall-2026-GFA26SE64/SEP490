package com.adaptlearngraph.repository;

import com.adaptlearngraph.repository.InitialCatalogPort.*;
import com.adaptlearngraph.repository.InitialPathwayPorts.*;
import com.adaptlearngraph.config.WorkspaceCatalogFixture;
import java.util.*;

/** Test-only dispatch over exact existing seed artifacts, never a production publication protocol. */
public final class WorkspaceFixtureCatalogRelease implements ReleaseAuthority {
    public record Sessions(WorkspaceFixtureCatalogRelease release) implements Neo4jInitialGraph.PublishedSessions {
        @Override public Neo4jCypher open(Scope scope,RoleReference ref){return release.open(scope,ref);}
    }
    private final WorkspaceCatalogFixture fixture;
    private final Map<UUID,LocalReviewCatalogRelease> sources;
    public WorkspaceFixtureCatalogRelease(Neo4jCypher graph,WorkspaceCatalogFixture fixture,byte[] seed,String readiness) {
        this.fixture=fixture;var sources=new HashMap<UUID,LocalReviewCatalogRelease>();
        for(UUID org:fixture.organizations().keySet())sources.put(org,new LocalReviewCatalogRelease(graph,org,seed,readiness,true));
        this.sources=Map.copyOf(sources);
    }
    private LocalReviewCatalogRelease source(Scope scope) {
        var source=sources.get(scope.organizationId());
        if(source==null)throw new Failure(403,"FORBIDDEN",false);
        return source;
    }
    @Override public Release require(Scope scope) {
        var original=source(scope).require(scope);var versions=new TreeMap<>(original.versions());
        versions.put("workspaceFixture",fixture.fingerprint());
        if(source(scope).hasSoftwareDevelopment())versions.put("developmentSeed",com.adaptlearngraph.config.SoftwareDevelopmentSeed.MODULES_HASH);
        return new Release(scope.organizationId(),"workspace-fixture:"+fixture.id()+":"+scope.organizationId()+":"+fixture.fingerprint(),versions);
    }
    @Override public void assertCurrent(Scope scope,RoleReference ref) {
        var release=require(scope);
        if(!scope.organizationId().equals(ref.organizationId()) || !fixture.permits(scope.organizationId(),ref.occupationId()))
            throw new Failure(403,"FORBIDDEN",false);
        if(!fixture.matches(scope.organizationId(),ref.occupationId(),ref.catalogFingerprint())
                || !release.token().equals(ref.releaseToken()) || release.versions().entrySet().stream()
                .anyMatch(entry->!entry.getValue().equals(ref.versions().get(entry.getKey()))))
            throw new Failure(409,"CATALOG_RELEASE_CHANGED",false);
        source(scope).assertCurrent(scope,original(scope,ref));
    }
    private RoleReference original(Scope scope,RoleReference ref) {
        return new RoleReference(ref.organizationId(),ref.businessRoleId(),ref.roleId(),ref.levelId(),ref.occupationId(),
                ref.catalogFingerprint(),source(scope).require(scope).token(),ref.versions());
    }
    public Neo4jCypher open(Scope scope,RoleReference ref) {
        assertCurrent(scope,ref);
        return source(scope).open(scope,original(scope,ref));
    }
}
