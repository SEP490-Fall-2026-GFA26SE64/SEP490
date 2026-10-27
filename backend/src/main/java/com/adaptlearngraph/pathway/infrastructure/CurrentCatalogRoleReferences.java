package com.adaptlearngraph.pathway.infrastructure;

import com.adaptlearngraph.pathway.application.InitialCatalogPort;
import com.adaptlearngraph.pathway.application.InitialCatalogPort.*;
import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.learning.application.RoleBaselineFlow.Catalog;
import java.util.*;

/** Current string-ID Role + explicitly selected member Level; no separate business mapping or inferred rank. */
public final class CurrentCatalogRoleReferences implements RoleReferences {
    private final Catalog catalog;private final ReleaseAuthority releases;
    public CurrentCatalogRoleReferences(Catalog catalog,ReleaseAuthority releases){this.catalog=catalog;this.releases=releases;}
    @Override public RoleReference require(Actor actor,String roleId,String levelId) {
        var scope=Scope.own(actor);var release=releases.require(scope);
        if(!release.organizationId().equals(scope.organizationId()))throw new Failure(503,"CATALOG_SCOPE_INVALID",false);
        var roles=catalog.roles(scope.organizationId()).stream().filter(r->r.id().equals(roleId)).toList();
        if(roles.size()!=1)throw new Failure(404,"ROLE_NOT_AVAILABLE",false);
        var role=roles.getFirst();
        if(role.levels().stream().filter(l->l.id().equals(levelId)).count()!=1)throw new Failure(404,"LEVEL_NOT_AVAILABLE",false);
        if(!role.catalogVersion().equals(release.versions().get("catalog")))throw new Failure(503,"INCOHERENT_CATALOG_VERSION",false);
        var versions=new TreeMap<>(release.versions());versions.put("binding","role-level-choice-v1");
        return new RoleReference(scope.organizationId(),InitialCatalogPort.choiceId(roleId,levelId),roleId,levelId,role.occupationId(),
                role.fingerprint(),release.token(),versions);
    }
    @Override public void assertCurrent(Scope scope,RoleReference reference){
        if(!scope.organizationId().equals(reference.organizationId()))throw new Failure(503,"CATALOG_SCOPE_INVALID",false);
        releases.assertCurrent(scope,reference);
    }
}
