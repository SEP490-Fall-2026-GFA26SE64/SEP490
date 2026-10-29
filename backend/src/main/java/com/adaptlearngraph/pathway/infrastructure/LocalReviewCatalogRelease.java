package com.adaptlearngraph.pathway.infrastructure;

import com.adaptlearngraph.pathway.application.InitialCatalogPort.*;
import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.assessment.infrastructure.LocalCatalogBootstrap;
import java.util.*;
import org.neo4j.driver.*;

/** Explicit local review-data exception, not production publication or an Expert approval. */
public final class LocalReviewCatalogRelease implements ReleaseAuthority {
    private final Driver driver;private final UUID organization;private final LocalCatalogBootstrap source;
    private final Release release;
    public LocalReviewCatalogRelease(Driver driver,UUID organization,byte[] seed) {
        this(driver,organization,seed,null,false);
    }
    public LocalReviewCatalogRelease(Driver driver,UUID organization,byte[] seed,String readinessVersion) {
        this(driver,organization,seed,readinessVersion,false);
    }
    public LocalReviewCatalogRelease(Driver driver,UUID organization,byte[] seed,String readinessVersion,boolean softwareDevelopment) {
        this.driver=driver;this.organization=organization;
        try {source=softwareDevelopment ? LocalCatalogBootstrap.forExistingDevelopment(driver,seed) : new LocalCatalogBootstrap(seed);source.verifySealed(driver);}
        catch(Exception invalid){throw new IllegalStateException("Local review catalog is not the exact sealed source release",invalid);}
        var versions=new TreeMap<>(Map.of(
                "catalog",LocalCatalogBootstrap.VERSION,"publication","LOCAL_REVIEW_EXCEPTION_V1",
                "requirements",LocalCatalogBootstrap.SOURCE_HASH,"compatibility",LocalSeedSemantics.VERSION,
                "suitability",com.adaptlearngraph.recommendation.domain.InitialSuitability.VERSION));
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
    public Session open(Scope scope,RoleReference ref) {
        assertCurrent(scope,ref);
        // Administrative unsealing/drift is detected before a read; operators must stop API before cutover.
        try{source.verifySealed(driver);}catch(RuntimeException invalid){throw new Failure(503,"CATALOG_RELEASE_CHANGED",false);}
        return driver.session(SessionConfig.builder().withDefaultAccessMode(AccessMode.READ).build());
    }
    private void check(Scope scope){if(!organization.equals(scope.organizationId()))throw new Failure(403,"FORBIDDEN",false);}
}
