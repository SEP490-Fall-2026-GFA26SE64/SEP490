package com.adaptlearngraph.repository;

import com.adaptlearngraph.repository.InitialCatalogPort.*;
import com.adaptlearngraph.repository.InitialPathwayPorts.*;
import com.adaptlearngraph.config.LocalCatalogBootstrap;
import java.util.*;

/** Explicit local review-data exception, not production publication or an Expert approval. */
public final class LocalReviewCatalogRelease implements ReleaseAuthority {
    private final Neo4jCypher graph;private final UUID organization;private final LocalCatalogBootstrap source;
    private final Release release;
    public LocalReviewCatalogRelease(Neo4jCypher graph,UUID organization,byte[] seed) {
        this(graph,organization,seed,null,false);
    }
    public LocalReviewCatalogRelease(Neo4jCypher graph,UUID organization,byte[] seed,String readinessVersion) {
        this(graph,organization,seed,readinessVersion,false);
    }
    public LocalReviewCatalogRelease(Neo4jCypher graph,UUID organization,byte[] seed,String readinessVersion,boolean softwareDevelopment) {
        this.graph=graph;this.organization=organization;
        try {source=softwareDevelopment ? LocalCatalogBootstrap.forExistingDevelopment(graph,seed) : new LocalCatalogBootstrap(seed);source.verifySealed(graph);}
        catch(Exception invalid){throw new IllegalStateException("Local review catalog is not the exact sealed source release",invalid);}
        var versions=new TreeMap<>(Map.of(
                "catalog",LocalCatalogBootstrap.VERSION,"publication","LOCAL_REVIEW_EXCEPTION_V1",
                "requirements",LocalCatalogBootstrap.SOURCE_HASH,"compatibility",LocalSeedSemantics.VERSION,
                "suitability",com.adaptlearngraph.entities.domain.InitialSuitability.VERSION));
        if(readinessVersion!=null && !readinessVersion.isBlank())versions.put("readiness",readinessVersion);
        release=new Release(organization,"local-review:"+LocalCatalogBootstrap.SOURCE_HASH,versions);
    }
    public boolean hasSoftwareDevelopment() { return source.hasSoftwareDevelopment(); }
    @Override public Release require(Scope scope){check(scope);return release;}
    @Override public void assertCurrent(Scope scope,RoleReference ref) {
        check(scope);
        if(!organization.equals(ref.organizationId()) || !release.token().equals(ref.releaseToken())
                || release.versions().entrySet().stream().anyMatch(e->!e.getValue().equals(ref.versions().get(e.getKey()))))throw new Failure(409,"CATALOG_RELEASE_CHANGED",false);
    }
    /** Read access to the sealed release; callers read through {@link Neo4jCypher#read} (read-only transactions). */
    public Neo4jCypher open(Scope scope,RoleReference ref) {
        assertCurrent(scope,ref);
        // Administrative unsealing/drift is detected before a read; operators must stop API before cutover.
        try{source.verifySealed(graph);}catch(RuntimeException invalid){throw new Failure(503,"CATALOG_RELEASE_CHANGED",false);}
        return graph;
    }
    private void check(Scope scope){if(!organization.equals(scope.organizationId()))throw new Failure(403,"FORBIDDEN",false);}
}
