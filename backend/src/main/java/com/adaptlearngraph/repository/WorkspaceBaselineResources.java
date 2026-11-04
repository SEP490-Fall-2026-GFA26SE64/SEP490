package com.adaptlearngraph.repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

public final class WorkspaceBaselineResources {
    public record Binding(UUID organizationId, String jobPositionId, String name, UUID bankId,
                          UUID modelId, UUID mappingId) {
        public boolean ready() { return bankId != null && modelId != null && mappingId != null; }
        public JpaAdaptiveBlueprintEligibilityAdapter.Properties settings() {
            if (!ready()) throw new IllegalStateException("Baseline question bank/model is not configured");
            return new JpaAdaptiveBlueprintEligibilityAdapter.Properties(true, organizationId,
                    Set.of(jobPositionId), bankId, modelId, mappingId);
        }
    }

    private final WorkspaceBaselineResourceJpaRepository resources;
    private final WorkspaceBaselineJobPositionPort catalog;
    public WorkspaceBaselineResources(WorkspaceBaselineResourceJpaRepository resources) { this(resources,null); }
    public WorkspaceBaselineResources(WorkspaceBaselineResourceJpaRepository resources,WorkspaceBaselineJobPositionPort catalog) { this.resources=resources;this.catalog=catalog; }
    private record Stored(Binding binding,boolean enabled,boolean referenceGrant) {}

    public List<Binding> list(UUID organization) {
        return merged(organization,false);
    }
    /** L&D may discover own active JobPositions before a resource tuple/binding exists. GET never provisions. */
    public List<Binding> configurable(UUID organization){return merged(organization,true);}
    public Set<String> configurableJobPositions(UUID organization){return configurable(organization).stream().map(Binding::jobPositionId).collect(Collectors.toUnmodifiableSet());}
    private List<Binding> merged(UUID organization,boolean unconfigured) {
        var stored=resources.stored(organization).stream().map(row -> new Stored(new Binding(organization,row.jobPositionId(),row.name(),
                row.bankId(),row.modelId(),row.mappingId()),Boolean.TRUE.equals(row.enabled()),Boolean.TRUE.equals(row.referenceGrant()))).toList();
        var enabled=stored.stream().filter(Stored::enabled).map(Stored::binding).collect(Collectors.toMap(Binding::jobPositionId,b->b));
        if(catalog==null)return stored.stream().filter(Stored::enabled).map(Stored::binding).toList();
        var blocked=stored.stream().filter(s->!s.enabled()).map(s->s.binding().jobPositionId()).collect(Collectors.toSet());
        var shared=stored.stream().filter(s->s.enabled() && s.referenceGrant()).map(s->s.binding().jobPositionId()).collect(Collectors.toSet());
        return catalog.list(organization,shared).stream().filter(o->!blocked.contains(o.id()) && (unconfigured || enabled.containsKey(o.id())))
                .map(o->{var b=enabled.get(o.id());return b==null?new Binding(organization,o.id(),o.name(),null,null,null)
                        :new Binding(organization,o.id(),o.name(),b.bankId(),b.modelId(),b.mappingId());}).toList();
    }
    public Set<String> jobPositions(UUID organization) {
        return list(organization).stream().map(Binding::jobPositionId).collect(Collectors.toUnmodifiableSet());
    }
    public Optional<Binding> find(UUID organization, String jobPosition) {
        return configurable(organization).stream().filter(binding -> binding.jobPositionId().equals(jobPosition)).findFirst();
    }
    public boolean owned(UUID organization,String jobPosition) {
        return catalog!=null && catalog.list(organization,Set.of()).stream().anyMatch(o->o.owned() && o.id().equals(jobPosition));
    }
    public UUID itemBank(UUID organization, UUID item) {
        return resources.itemBank(organization, item)
                .stream().findFirst().orElseThrow(() ->
                        new com.adaptlearngraph.services.AdaptiveAttemptUseCase.Failure(
                                com.adaptlearngraph.services.AdaptiveAttemptUseCase.Code.DEPENDENCY_UNAVAILABLE));
    }
}
