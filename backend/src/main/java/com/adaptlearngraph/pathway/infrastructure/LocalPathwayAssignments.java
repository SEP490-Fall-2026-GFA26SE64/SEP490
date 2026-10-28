package com.adaptlearngraph.pathway.infrastructure;

import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.recommendation.domain.InitialIdentity;
import java.util.*;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

/** TMP-REQ001-09. Configured local scope only; never creates assignments or approvals in storage. */
final class LocalPathwayAssignments implements ReviewAssignments {
    private final NamedParameterJdbcTemplate jdbc;
    private final UUID organization,expert;
    private final Set<String> roles;
    private final int maximum;
    private final String version;
    LocalPathwayAssignments(NamedParameterJdbcTemplate jdbc,UUID organization,UUID expert,Set<String> roles,int maximum) {
        if(maximum<1 || maximum==Integer.MAX_VALUE)throw new IllegalArgumentException("Explicit assignment query bound required");
        this.jdbc=jdbc;this.organization=organization;this.expert=expert;this.roles=Set.copyOf(roles);this.maximum=maximum;
        version="local-assignment-v1:"+InitialIdentity.hash("local-review-scope",List.of(organization,expert,new TreeSet<>(roles).stream().toList()));
    }
    private Map<String,Object> parameters(){return Map.of("org",organization,"expert",expert,"roles",roles,"maximum",(long)maximum+1);}
    private String roleFilter(){return roles.isEmpty()?"":" AND r.frozen_input #>> '{input,binding,roleId}' IN (:roles) ";}
    private void activeExpert() {
        if(!Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM platform.account a JOIN platform.account_role g USING(account_id)
                    WHERE a.organization_id=:org AND a.account_id=:expert AND a.active AND g.role_code='DOMAIN_EXPERT')
                """,parameters(),Boolean.class)))throw new Failure(403,"FORBIDDEN",false);
    }
    private void authorize(Actor actor) {
        actor.require(Role.DOMAIN_EXPERT);
        if(!organization.equals(actor.organizationId()) || !expert.equals(actor.accountId()))throw new Failure(403,"FORBIDDEN",false);
        activeExpert();
    }
    @Override public Assignment require(Actor actor,UUID id) {
        authorize(actor);var p=new HashMap<>(parameters());p.put("id",id);
        boolean allowed=Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM platform.initial_pathway_request r "
                +"WHERE r.organization_id=:org AND r.request_id=:id "+roleFilter()+")",p,Boolean.class));
        if(!allowed)throw new Failure(404,"PATHWAY_NOT_FOUND",false);
        return new Assignment("local-review:"+organization+":"+expert,version,expert);
    }
    @Override public Set<UUID> assignedPathways(Actor actor) {
        authorize(actor);
        var rows=jdbc.query("""
                SELECT r.request_id FROM platform.initial_pathway_request r
                JOIN platform.initial_pathway_current c ON c.request_id=r.request_id
                  AND c.organization_id=r.organization_id AND c.learner_id=r.learner_id
                WHERE r.organization_id=:org AND c.archived_at IS NULL AND c.current_revision IS NOT NULL
                """+roleFilter()+" ORDER BY r.created_at,r.request_id LIMIT :maximum",parameters(),(rs,n)->rs.getObject(1,UUID.class));
        if(rows.size()>maximum)throw new Failure(503,"REVIEW_ASSIGNMENT_QUERY_LIMIT",false);
        return Set.copyOf(rows);
    }
    @Override public void requireApprovalValid(Scope scope,UUID id,long revision,String hash) {
        if(!organization.equals(scope.organizationId()))throw new Failure(403,"FORBIDDEN",false);
        activeExpert();var p=new HashMap<>(parameters());p.put("learner",scope.learnerId());p.put("id",id);p.put("revision",revision);p.put("hash",hash);
        p.put("assignment","local-review:"+organization+":"+expert);p.put("version",version);
        boolean approved=Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM platform.initial_pathway_approval a
                  JOIN platform.initial_pathway_revision v ON v.request_id=a.request_id AND v.revision=a.revision AND v.content_hash=a.content_hash
                  JOIN platform.initial_pathway_request r ON r.request_id=v.request_id AND r.organization_id=v.organization_id AND r.learner_id=v.learner_id
                  WHERE a.organization_id=:org AND v.organization_id=:org AND v.learner_id=:learner
                    AND a.request_id=:id AND a.revision=:revision AND a.content_hash=:hash AND v.validation_status='VALID'
                    AND a.expert_id=:expert AND a.assignment_id=:assignment AND a.assignment_version=:version
                """+roleFilter()+")",p,Boolean.class));
        if(!approved)throw new Failure(403,"PATHWAY_APPROVAL_INVALID",false);
    }
}
