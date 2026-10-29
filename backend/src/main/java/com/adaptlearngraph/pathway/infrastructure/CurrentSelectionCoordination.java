package com.adaptlearngraph.pathway.infrastructure;

import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.learning.application.RoleBaselineFlow;
import com.adaptlearngraph.learning.infrastructure.CurrentRoleSelectionStore;
import java.util.*;
import java.util.function.Supplier;

/** Adapter extends the existing string-ID selection owner; it does not clone its write algorithm. */
public final class CurrentSelectionCoordination implements Coordination {
    private final CurrentRoleSelectionStore store; private final RoleBaselineFlow.Catalog catalog;
    public CurrentSelectionCoordination(CurrentRoleSelectionStore store,RoleBaselineFlow.Catalog catalog) { this.store=store; this.catalog=catalog; }
    private RoleBaselineFlow.Actor actor(Scope scope) { return new RoleBaselineFlow.Actor(scope.organizationId(),scope.learnerId()); }
    private Selection selected(RoleBaselineFlow.Selection s) { return new Selection(s.selectionId(),s.revision(),s.role().id(),s.levelId()); }
    @Override public <T> T transaction(Scope scope,Supplier<T> work) { return store.transaction(actor(scope),work); }
    @Override public Optional<Selection> current(Scope scope) { return store.current(actor(scope)).map(this::selected); }
    @Override public boolean assessmentActive(Scope scope) { return store.assessmentActive(actor(scope)); }
    @Override public PreparedSelection prepare(Scope scope,Binding binding) {
        // Remote preparation precedes the short PostgreSQL transaction. Binding owner revalidates the token at commit.
        var role=catalog.roles(scope.organizationId()).stream().filter(r -> r.id().equals(binding.roleId())).findFirst()
                .orElseThrow(()->new Failure(404,"ROLE_NOT_AVAILABLE"));
        if (!role.occupationId().equals(binding.occupationId()) || !role.fingerprint().equals(binding.catalogFingerprint())
                || role.levels().stream().noneMatch(l->l.id().equals(binding.levelId()))) throw new Failure(503,"INCOHERENT_ROLE_BINDING");
        var level=role.levels().stream().filter(l->l.id().equals(binding.levelId())).findFirst().orElseThrow();
        if(!role.name().equals(binding.roleName()) || !level.name().equals(binding.levelName()) || level.skills().size()!=binding.requirements().size())
            throw new Failure(503,"INCOHERENT_ROLE_BINDING");
        var seen=new HashSet<String>();
        for(var skill:level.skills()) {
            var requirement=binding.requirements().stream().filter(r->r.skillId().equals(skill.id())).findFirst();
            if(!seen.add(skill.id()) || requirement.isEmpty() || !Double.isFinite(skill.requiredScore())
                    || java.math.BigDecimal.valueOf(skill.requiredScore()).compareTo(requirement.get().requiredScore())!=0
                    || skill.mandatory()!=requirement.get().mandatory())throw new Failure(503,"INCOHERENT_ROLE_BINDING");
        }
        return (key,hash) -> selected(store.selectForPathway(actor(scope),role,binding.levelId()));
    }
}
