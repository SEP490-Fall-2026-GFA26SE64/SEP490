package com.adaptlearngraph.pathway.infrastructure;

import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.recommendation.domain.InitialIdentity;
import java.util.*;
import org.neo4j.driver.*;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

/** Reads current owner responsibility; never creates assignments or grants every Expert a tenant queue. */
final class CatalogRoleReviewAssignments implements ReviewAssignments {
    private record Owner(UUID expert,String id,String version) {}
    private record Candidate(UUID id,String role) {}
    private final Driver driver;private final NamedParameterJdbcTemplate jdbc;private final int maximum;private final Set<String> allowed;
    CatalogRoleReviewAssignments(Driver driver,NamedParameterJdbcTemplate jdbc,int maximum,Set<String> allowed) {
        if(maximum<1 || maximum==Integer.MAX_VALUE || allowed.size()>maximum)throw new IllegalArgumentException("Bounded review scope required");
        allowed.forEach(CatalogRoleReviewAssignments::text);
        this.driver=driver;this.jdbc=jdbc;this.maximum=maximum;this.allowed=Set.copyOf(allowed);
    }
    private void activeExpert(UUID org,UUID expert) {
        if(!Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM platform.account a
                  JOIN platform.organization_membership m ON m.account_id=a.account_id AND m.organization_id=a.organization_id
                  JOIN platform.organization_membership_role g USING(membership_id)
                  WHERE a.organization_id=:org AND a.account_id=:expert AND a.active AND m.active AND g.role_code='DOMAIN_EXPERT')
                """,Map.of("org",org,"expert",expert),Boolean.class)))throw new Failure(403,"FORBIDDEN",false);
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
        var roles=jdbc.query("SELECT frozen_input #>> '{input,binding,roleId}' FROM platform.initial_pathway_request WHERE organization_id=:org AND request_id=:id LIMIT 2",
                Map.of("org",actor.organizationId(),"id",id),(rs,n)->rs.getString(1));
        if(roles.size()!=1 || !allowed(roles.getFirst()))throw new Failure(404,"PATHWAY_NOT_FOUND",false);
        var owner=owners(actor.organizationId(),Set.of(roles.getFirst())).get(roles.getFirst());
        if(owner==null || !actor.accountId().equals(owner.expert()))throw new Failure(404,"PATHWAY_NOT_FOUND",false);
        return new Assignment(owner.id(),owner.version(),owner.expert());
    }
    @Override public Set<UUID> assignedPathways(Actor actor) {
        authorize(actor);
        var rows=jdbc.query("""
                SELECT r.request_id,r.frozen_input #>> '{input,binding,roleId}' AS role
                FROM platform.initial_pathway_request r JOIN platform.initial_pathway_current c
                  ON c.request_id=r.request_id AND c.organization_id=r.organization_id AND c.learner_id=r.learner_id
                WHERE r.organization_id=:org AND c.archived_at IS NULL AND c.current_revision IS NOT NULL
                ORDER BY r.created_at,r.request_id LIMIT :maximum
                """,Map.of("org",actor.organizationId(),"maximum",(long)maximum+1),(rs,n)->new Candidate(rs.getObject(1,UUID.class),rs.getString(2)));
        if(rows.size()>maximum)throw new Failure(503,"REVIEW_ASSIGNMENT_QUERY_LIMIT",false);
        var roles=new HashSet<String>();rows.stream().filter(r->allowed(r.role())).forEach(r->roles.add(r.role()));
        var owners=owners(actor.organizationId(),roles);var result=new HashSet<UUID>();
        for(var row:rows) {var owner=owners.get(row.role());if(owner!=null && actor.accountId().equals(owner.expert()))result.add(row.id());}
        return Set.copyOf(result);
    }
    @Override public void requireApprovalValid(Scope scope,UUID id,long revision,String hash) {
        record Approval(UUID expert,String assignment,String version,String role) {}
        var rows=jdbc.query("""
                SELECT a.expert_id,a.assignment_id,a.assignment_version,r.frozen_input #>> '{input,binding,roleId}' AS role
                FROM platform.initial_pathway_approval a JOIN platform.initial_pathway_revision v
                  ON v.request_id=a.request_id AND v.revision=a.revision AND v.content_hash=a.content_hash
                JOIN platform.initial_pathway_request r ON r.request_id=v.request_id AND r.organization_id=v.organization_id AND r.learner_id=v.learner_id
                WHERE a.organization_id=:org AND v.organization_id=:org AND v.learner_id=:learner
                  AND a.request_id=:id AND a.revision=:revision AND a.content_hash=:hash AND v.validation_status='VALID' LIMIT 2
                """,Map.of("org",scope.organizationId(),"learner",scope.learnerId(),"id",id,"revision",revision,"hash",hash),
                (rs,n)->new Approval(rs.getObject(1,UUID.class),rs.getString(2),rs.getString(3),rs.getString(4)));
        if(rows.size()!=1 || !allowed(rows.getFirst().role()))throw new Failure(403,"PATHWAY_APPROVAL_INVALID",false);
        var approval=rows.getFirst();activeExpert(scope.organizationId(),approval.expert());
        var owner=owners(scope.organizationId(),Set.of(approval.role())).get(approval.role());
        if(owner==null || !owner.expert().equals(approval.expert()) || !owner.id().equals(approval.assignment()) || !owner.version().equals(approval.version()))
            throw new Failure(403,"PATHWAY_APPROVAL_INVALID",false);
    }
    private static void text(String value){if(value==null || value.isBlank() || value.length()>200 || !value.equals(value.strip()))throw new Failure(503,"REVIEW_ASSIGNMENT_SOURCE_INVALID",false);}
}
