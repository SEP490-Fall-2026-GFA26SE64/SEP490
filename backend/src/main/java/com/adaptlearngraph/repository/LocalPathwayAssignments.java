package com.adaptlearngraph.repository;

import com.adaptlearngraph.repository.InitialPathwayPorts.*;
import com.adaptlearngraph.entities.InitialIdentity;
import java.util.*;

/** TMP-REQ001-09. Configured local scope only; never creates assignments or approvals in storage. */
public final class LocalPathwayAssignments implements ReviewAssignments {
    private final InitialPathwayRepositories data;
    private final UUID organization,expert;
    private final Set<String> roles;
    private final int maximum;
    private final String version;
    private final boolean workspaceIdentity;
    public LocalPathwayAssignments(InitialPathwayRepositories data,UUID organization,UUID expert,Set<String> roles,int maximum) {
        this(data,organization,expert,roles,maximum,false);
    }
    public LocalPathwayAssignments(InitialPathwayRepositories data,UUID organization,UUID expert,Set<String> roles,int maximum,boolean workspaceIdentity) {
        if(maximum<1 || maximum==Integer.MAX_VALUE)throw new IllegalArgumentException("Explicit assignment query bound required");
        this.data=data;this.organization=organization;this.expert=expert;this.roles=Set.copyOf(roles);this.maximum=maximum;
        this.workspaceIdentity=workspaceIdentity;
        version=(workspaceIdentity?"workspace-development-assignment-v1:":"local-assignment-v1:")+InitialIdentity.hash("local-review-scope",List.of(organization,expert,new TreeSet<>(roles).stream().toList()));
    }
    private void activeExpert() {
        boolean active=workspaceIdentity?data.actors().isActiveMemberExpert(organization,expert)
                :data.actors().hasActiveRole(organization,expert,"DOMAIN_EXPERT");
        if(!active)throw new Failure(403,"FORBIDDEN",false);
    }
    private void authorize(Actor actor) {
        actor.require(Role.DOMAIN_EXPERT);
        if(!organization.equals(actor.organizationId()) || !expert.equals(actor.accountId()))throw new Failure(403,"FORBIDDEN",false);
        activeExpert();
    }
    @Override public Assignment require(Actor actor,UUID id) {
        authorize(actor);
        boolean allowed=roles.isEmpty()?data.requests().exists(organization,id):data.requests().existsForRoles(organization,id,roles);
        if(!allowed)throw new Failure(404,"PATHWAY_NOT_FOUND",false);
        return new Assignment("local-review:"+organization+":"+expert,version,expert);
    }
    @Override public Set<UUID> assignedPathways(Actor actor) {
        authorize(actor);
        var rows=roles.isEmpty()?data.requests().reviewable(organization,new OffsetPage(0,maximum+1))
                :data.requests().reviewableForRoles(organization,roles,(long)maximum+1);
        if(rows.size()>maximum)throw new Failure(503,"REVIEW_ASSIGNMENT_QUERY_LIMIT",false);
        return Set.copyOf(rows);
    }
    @Override public void requireApprovalValid(Scope scope,UUID id,long revision,String hash) {
        if(!organization.equals(scope.organizationId()))throw new Failure(403,"FORBIDDEN",false);
        activeExpert();
        String assignment="local-review:"+organization+":"+expert;
        boolean approved=roles.isEmpty()
                ?data.approvals().assignedApproval(organization,scope.learnerId(),id,revision,hash,expert,assignment,version)
                :data.approvals().assignedApprovalForRoles(organization,scope.learnerId(),id,revision,hash,expert,assignment,version,roles);
        if(!approved)throw new Failure(403,"PATHWAY_APPROVAL_INVALID",false);
    }
}
