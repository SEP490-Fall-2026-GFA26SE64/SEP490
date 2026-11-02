package com.adaptlearngraph.repository;

import com.adaptlearngraph.repository.InitialPathwayPorts.*;
import com.adaptlearngraph.entities.InitialIdentity;
import java.util.*;
import org.neo4j.driver.*;

/** Reads current owner responsibility; never creates assignments or grants every Expert a tenant queue. */
public final class CatalogRoleReviewAssignments implements ReviewAssignments {
    private record Owner(UUID expert,String id,String version) {}
    private record Candidate(UUID id,String role) {}
    private final Driver driver;private final InitialPathwayRepositories data;private final int maximum;private final Set<String> allowed;
    public CatalogRoleReviewAssignments(Driver driver,InitialPathwayRepositories data,int maximum,Set<String> allowed) {
        if(maximum<1 || maximum==Integer.MAX_VALUE || allowed.size()>maximum)throw new IllegalArgumentException("Bounded review scope required");
        allowed.forEach(CatalogRoleReviewAssignments::text);
        this.driver=driver;this.data=data;this.maximum=maximum;this.allowed=Set.copyOf(allowed);
    }
    private void activeExpert(UUID org,UUID expert) {
        if(!data.actors().isActiveMemberExpert(org,expert))throw new Failure(403,"FORBIDDEN",false);
    }
    private void authorize(Actor actor){actor.require(Role.DOMAIN_EXPERT);activeExpert(actor.organizationId(),actor.accountId());}
    private boolean allowed(String role){text(role);return allowed.isEmpty() || allowed.contains(role);}
    private Map<String,Owner> owners(UUID org,Set<String> roles) {
        if(roles.isEmpty())return Map.of();if(roles.size()>maximum)throw new Failure(503,"REVIEW_ASSIGNMENT_QUERY_LIMIT",false);
        roles.forEach(CatalogRoleReviewAssignments::text);
        try(var session=driver.session()) {
            return session.executeRead(tx->{
                var rows=tx.run("""
                        MATCH (r:TargetRole) WHERE r.organizationId=$org AND r.id IN $roles AND r.status IN ['ACTIVE','PUBLISHED']
                        RETURN r.id AS id,r.version AS version,r.assignedExpertId AS expert LIMIT $maximum
                        """,Map.of("org",org.toString(),"roles",List.copyOf(roles),"maximum",roles.size()+1)).list();
                var seen=new HashSet<String>();var result=new HashMap<String,Owner>();
                for(var row:rows) {
                    String id=row.get("id").asString();text(id);
                    if(!roles.contains(id) || !seen.add(id))throw new Failure(503,"REVIEW_ASSIGNMENT_SOURCE_INVALID",false);
                    if(row.get("expert").isNull())continue;
                    UUID expert=UUID.fromString(row.get("expert").asString());String version=row.get("version").asString();text(version);
                    result.put(id,new Owner(expert,"catalog-role-review:"+org+":"+id,
                            "catalog-role-review-v1:"+InitialIdentity.hash("role-review-assignment",List.of(org,id,version,expert))));
                }
                return Map.copyOf(result);
            });
        }catch(Failure failure){throw failure;}catch(RuntimeException unavailable){throw new Failure(503,"REVIEW_ASSIGNMENT_UNAVAILABLE",false);}
    }
    @Override public Assignment require(Actor actor,UUID id) {
        authorize(actor);
        var roles=data.requests().bindingRole(actor.organizationId(),id);
        if(roles.size()!=1 || !allowed(roles.getFirst()))throw new Failure(404,"PATHWAY_NOT_FOUND",false);
        var owner=owners(actor.organizationId(),Set.of(roles.getFirst())).get(roles.getFirst());
        if(owner==null || !actor.accountId().equals(owner.expert()))throw new Failure(404,"PATHWAY_NOT_FOUND",false);
        return new Assignment(owner.id(),owner.version(),owner.expert());
    }
    @Override public Set<UUID> assignedPathways(Actor actor) {
        authorize(actor);
        var rows=data.requests().reviewableWithRole(actor.organizationId(),(long)maximum+1).stream()
                .map(row->new Candidate(PersistenceValues.uuid(row[0]),(String)row[1])).toList();
        if(rows.size()>maximum)throw new Failure(503,"REVIEW_ASSIGNMENT_QUERY_LIMIT",false);
        var roles=new HashSet<String>();rows.stream().filter(r->allowed(r.role())).forEach(r->roles.add(r.role()));
        var owners=owners(actor.organizationId(),roles);var result=new HashSet<UUID>();
        for(var row:rows) {var owner=owners.get(row.role());if(owner!=null && actor.accountId().equals(owner.expert()))result.add(row.id());}
        return Set.copyOf(result);
    }
    @Override public void requireApprovalValid(Scope scope,UUID id,long revision,String hash) {
        record Approval(UUID expert,String assignment,String version,String role) {}
        var rows=data.approvals().approvalWithRole(scope.organizationId(),scope.learnerId(),id,revision,hash).stream()
                .map(row->new Approval(PersistenceValues.uuid(row[0]),(String)row[1],(String)row[2],(String)row[3])).toList();
        if(rows.size()!=1 || !allowed(rows.getFirst().role()))throw new Failure(403,"PATHWAY_APPROVAL_INVALID",false);
        var approval=rows.getFirst();activeExpert(scope.organizationId(),approval.expert());
        var owner=owners(scope.organizationId(),Set.of(approval.role())).get(approval.role());
        if(owner==null || !owner.expert().equals(approval.expert()) || !owner.id().equals(approval.assignment()) || !owner.version().equals(approval.version()))
            throw new Failure(403,"PATHWAY_APPROVAL_INVALID",false);
    }
    private static void text(String value){if(value==null || value.isBlank() || value.length()>200 || !value.equals(value.strip()))throw new Failure(503,"REVIEW_ASSIGNMENT_SOURCE_INVALID",false);}
}
