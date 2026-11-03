package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.AdaptiveBlueprint.*;
import java.util.*;

/** One authored projection for configuration/union and Role/Level selection; legacy authority stays intact. */
public final class AuthoredBaselineCatalog implements AdaptiveBaselineCatalogPort {
    private final AuthoredCatalogPort authored;private final AdaptiveBaselineCatalogPort legacy;
    public AuthoredBaselineCatalog(AuthoredCatalogPort authored,AdaptiveBaselineCatalogPort legacy){this.authored=authored;this.legacy=legacy;}
    @Override public Optional<CatalogSnapshot> findAvailable(Scope scope) {
        if(!authored.occupations(scope.organizationId()).contains(scope.occupationId()))return legacy.findAvailable(scope);
        var projection=AuthoredCatalogPort.scoped(authored.findPublished(scope.organizationId(),scope.occupationId())
                .orElseThrow(()->new IllegalStateException("Authored catalog publication unavailable")),scope.organizationId(),scope.occupationId());
        return Optional.of(projection).map(p->{
            var roles=new TreeMap<String,RoleSnapshot>();
            for(var role:p.roles()) {
                var skills=new TreeMap<String,SkillSnapshot>();
                role.levels().forEach(l->l.skills().forEach(s->skills.put(s.id(),new SkillSnapshot(s.name(),p.skillVersions().get(s.id())))));
                roles.put(role.id(),new RoleSnapshot(role.name(),p.roleVersions().get(role.id()),skills));
            }
            return new CatalogSnapshot(scope,p.name(),p.fingerprint(),roles);
        });
    }
}
