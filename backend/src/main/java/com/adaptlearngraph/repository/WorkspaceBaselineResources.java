package com.adaptlearngraph.repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

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

    private final WorkspaceBaselineResourceJpaRepository resources;
    private final WorkspaceBaselineOccupationPort catalog;
    public WorkspaceBaselineResources(WorkspaceBaselineResourceJpaRepository resources) { this(resources,null); }
    public WorkspaceBaselineResources(WorkspaceBaselineResourceJpaRepository resources,WorkspaceBaselineOccupationPort catalog) { this.resources=resources;this.catalog=catalog; }
    private record Stored(Binding binding,boolean enabled,boolean referenceGrant) {}

    public List<Binding> list(UUID organization) {
        return merged(organization,false);
    }
    /** L&D may discover own active Occupations before a resource tuple/binding exists. GET never provisions. */
    public List<Binding> configurable(UUID organization){return merged(organization,true);}
    public Set<String> configurableOccupations(UUID organization){return configurable(organization).stream().map(Binding::occupationId).collect(Collectors.toUnmodifiableSet());}
    private List<Binding> merged(UUID organization,boolean unconfigured) {
        var stored=resources.stored(organization).stream().map(row -> new Stored(new Binding(organization,row.occupationId(),row.name(),
                row.bankId(),row.modelId(),row.mappingId()),Boolean.TRUE.equals(row.enabled()),Boolean.TRUE.equals(row.referenceGrant()))).toList();
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
        return resources.itemBank(organization, item)
                .stream().findFirst().orElseThrow(() ->
                        new com.adaptlearngraph.services.AdaptiveAttemptUseCase.Failure(
                                com.adaptlearngraph.services.AdaptiveAttemptUseCase.Code.DEPENDENCY_UNAVAILABLE));
    }
}
