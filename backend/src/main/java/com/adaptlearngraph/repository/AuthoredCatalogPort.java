package com.adaptlearngraph.repository;

import java.util.*;
import static com.adaptlearngraph.services.RoleBaselineFlow.*;

/** Explicit temporary integration source; no inferred catalog membership or publication authority. */
public interface AuthoredCatalogPort {
    Set<String> jobPositions(UUID organization);
    Optional<Projection> find(UUID organization, String jobPosition);
    /** Binding/visibility is not operational publication; owner adapters must supply genuine proof. */
    default Optional<Projection> findPublished(UUID organization,String jobPosition) {
        throw new IllegalStateException("Authored catalog publication source not configured");
    }
    AuthoredCatalogPort NONE = new AuthoredCatalogPort() {
        public Set<String> jobPositions(UUID organization) { return Set.of(); }
        public Optional<Projection> find(UUID organization,String jobPosition) { return Optional.empty(); }
    };
    record Binding(UUID organizationId,String jobPositionId,String bindingRevision,String sourceFormat,String provenanceRef,
                   List<String> roleIds,List<String> legacyOrganizationAliases) {
        public Binding {
            Objects.requireNonNull(organizationId); text(jobPositionId);text(bindingRevision);text(provenanceRef);
            if(!"AUTHORED_ROLE_V1".equals(sourceFormat) || jobPositionId.length()>200)throw invalid();
            roleIds=List.copyOf(roleIds);legacyOrganizationAliases=legacyOrganizationAliases==null?List.of():List.copyOf(legacyOrganizationAliases);
            if(roleIds.isEmpty() || roleIds.size()>1000 || new HashSet<>(roleIds).size()!=roleIds.size())throw invalid();
            roleIds.forEach(id->{text(id);if(id.length()>200)throw invalid();});
            if(legacyOrganizationAliases.size()>10 || new HashSet<>(legacyOrganizationAliases).size()!=legacyOrganizationAliases.size())throw invalid();
            for(String alias:legacyOrganizationAliases) {
                text(alias);
                if(alias.matches("[0-9a-fA-F-]{36}") && !alias.equalsIgnoreCase(organizationId.toString()))throw invalid();
            }
        }
        public Set<String> sourceOwners(){var owners=new HashSet<>(legacyOrganizationAliases);owners.add(organizationId.toString());return Set.copyOf(owners);}
    }
    record Projection(UUID organization,String jobPosition,String name,String fingerprint,String bindingRevision,
                      List<Role> roles,Map<String,String> roleVersions,Map<String,String> skillVersions) {
        public Projection {
            Objects.requireNonNull(organization);text(jobPosition);text(name);text(fingerprint);text(bindingRevision);
            roles=List.copyOf(roles);roleVersions=Map.copyOf(roleVersions);skillVersions=Map.copyOf(skillVersions);
            if(roles.isEmpty() || roles.size()>1000)throw invalid();
            var ids=new HashSet<String>();
            for(var role:roles) {
                if(!ids.add(role.id()) || !jobPosition.equals(role.jobPositionId()) || !fingerprint.equals(role.fingerprint()))throw invalid();
                text(roleVersions.get(role.id()));
                if(role.levels().isEmpty() || role.levels().size()>100)throw invalid();
                var levels=new HashSet<String>();
                for(var level:role.levels()) {
                    text(level.id());
                    if(!level.id().equals(level.name()) || !levels.add(level.id().toLowerCase(Locale.ROOT)) || level.skills().isEmpty())throw invalid();
                    var skills=new HashSet<String>();
                    for(var skill:level.skills()) {
                        text(skill.id());text(skill.name());text(skillVersions.get(skill.id()));
                        if(!skills.add(skill.id()) || !skill.mandatory() || skill.requiredKnowledgeLevels().isEmpty())throw invalid();
                    }
                }
            }
        }
    }
    static Projection scoped(Projection projection,UUID organization,String jobPosition) {
        if(!projection.organization().equals(organization) || !projection.jobPosition().equals(jobPosition))throw invalid();
        return projection;
    }
    private static void text(String value){if(value==null || value.isBlank() || !value.equals(value.strip()) || value.length()>2000)throw invalid();}
    private static IllegalStateException invalid(){return new IllegalStateException("Invalid explicit authored catalog source/binding");}
}
