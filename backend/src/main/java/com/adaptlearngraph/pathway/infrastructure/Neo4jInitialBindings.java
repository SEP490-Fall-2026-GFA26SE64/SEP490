package com.adaptlearngraph.pathway.infrastructure;

import com.adaptlearngraph.pathway.application.InitialCatalogPort.*;
import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.recommendation.domain.RoleGap;
import java.util.*;
import java.util.function.IntSupplier;
import org.neo4j.driver.TransactionContext;
import static com.adaptlearngraph.pathway.infrastructure.InitialCatalogMetadata.*;

/** Reads exact bound Role/Level requirements. No Level inference, seed fallback, or review bypass. */
public final class Neo4jInitialBindings implements Bindings {
    private final RoleReferences references;private final Neo4jInitialGraph.PublishedSessions sessions;private final IntSupplier maximumRows;
    private final boolean localReview;
    public Neo4jInitialBindings(RoleReferences references,Neo4jInitialGraph.PublishedSessions sessions,IntSupplier maximumRows) {
        this(references,sessions,maximumRows,false);
    }
    public Neo4jInitialBindings(RoleReferences references,Neo4jInitialGraph.PublishedSessions sessions,IntSupplier maximumRows,boolean localReview) {
        this.references=references;this.sessions=sessions;this.maximumRows=maximumRows;this.localReview=localReview;
    }
    @Override public Binding require(Actor actor,String roleId,String levelId) {
        actor.require(Role.EMPLOYEE);var scope=Scope.own(actor);var ref=references.require(actor,roleId,levelId);
        if(!ref.organizationId().equals(scope.organizationId()) || !ref.roleId().equals(roleId) || !ref.levelId().equals(levelId)
                || !ref.businessRoleId().equals(com.adaptlearngraph.pathway.application.InitialCatalogPort.choiceId(roleId,levelId)))throw new Failure(503,"INVALID_ROLE_BINDING",false);
        int maximum=maximumRows.getAsInt();if(maximum<1 || maximum==Integer.MAX_VALUE)throw new Failure(503,"CATALOG_READ_LIMIT_NOT_CONFIGURED",false);
        try(var session=sessions.open(scope,ref)) {
            var binding=session.executeRead(tx->read(tx,scope,ref,maximum));
            references.assertCurrent(scope,ref);return binding;
        }catch(Failure failure){throw failure;}
        catch(org.neo4j.driver.exceptions.Neo4jException unavailable){throw new Failure(503,"CATALOG_UNAVAILABLE");}
        catch(RuntimeException invalid){throw new Failure(503,"CATALOG_REQUIREMENTS_INVALID",false);}
    }
    @Override public void assertCurrent(Scope scope,Binding binding) {
        references.assertCurrent(scope,RoleReference.from(scope,binding));
    }
    private Binding read(TransactionContext tx,Scope scope,RoleReference ref,int maximum) {
        var rows=tx.run("""
                MATCH (o:Occupation {id:$occupation})-[membership:HAS_ROLE]->(r:TargetRole {id:$role})
                    -[roleLevel:HAS_LEVEL]->(l:Level {id:$level})
                CALL { WITH r MATCH (parent:Occupation)-[e:HAS_ROLE]->(r)
                    WHERE parent.status='ACTIVE' AND e.status='ACTIVE'
                    WITH parent,e LIMIT 2
                    RETURN collect({id:parent.id,node:elementId(parent),edge:elementId(e)}) AS roleOwners }
                CALL { WITH l MATCH (parent:TargetRole)-[e:HAS_LEVEL]->(l)
                    WHERE parent.status='ACTIVE' AND e.status='ACTIVE'
                    WITH parent,e LIMIT 2
                    RETURN collect({id:parent.id,node:elementId(parent),edge:elementId(e)}) AS levelOwners }
                OPTIONAL MATCH (l)-[q:REQUIRES_SKILL]->(s:MicroSkill)
                WHERE q.status='ACTIVE'
                RETURN properties(o) AS o,properties(membership) AS membership,properties(r) AS r,
                    properties(roleLevel) AS roleLevel,properties(l) AS l,properties(q) AS q,properties(s) AS s,
                    elementId(o) AS oi,elementId(membership) AS mi,elementId(r) AS ri,
                    elementId(roleLevel) AS hi,elementId(l) AS li,elementId(q) AS qi,roleOwners,levelOwners
                ORDER BY s.id,qi LIMIT $maximum
                """,Map.of("occupation",ref.occupationId(),"role",ref.roleId(),"level",ref.levelId(),"maximum",maximum+1)).list();
        if(rows.isEmpty())throw new Failure(422,"BOUND_ROLE_LEVEL_UNAVAILABLE",false);
        if(rows.size()>maximum)throw new Failure(422,"CATALOG_REQUIREMENTS_LIMIT",false);
        var first=rows.getFirst();String version=ref.versions().get("catalog");
        var root=List.of("oi","mi","ri","hi","li").stream().map(k->first.get(k).asString()).toList();
        if(first.get("roleOwners").size()!=1 || first.get("levelOwners").size()!=1
                || !first.get("roleOwners").get(0).get("id").asString().equals(ref.occupationId())
                || !first.get("levelOwners").get(0).get("id").asString().equals(ref.roleId()))throw new Failure(503,"CATALOG_OWNERSHIP_AMBIGUOUS",false);
        if(!"ALL_MANDATORY_SKILLS".equals(text(first.get("l"),"attainmentRule")))throw new Failure(503,"ATTAINMENT_RULE_UNSUPPORTED",false);
        var requirements=new TreeMap<String,RoleGap.Requirement>();var edges=new HashSet<String>();
        for(var row:rows) {
            if(!root.equals(List.of("oi","mi","ri","hi","li").stream().map(k->row.get(k).asString()).toList()))throw new Failure(503,"CATALOG_IDENTITY_AMBIGUOUS",false);
            for(String key:List.of("o","membership","r","roleLevel","l"))requirePublished(row.get(key),scope,version,localReview);
            var q=row.get("q");var s=row.get("s");if(q.isNull())continue;
            requirePublished(q,scope,version,localReview);requirePublished(s,scope,version,localReview);
            if(!(q.get("isMandatory").asObject() instanceof Boolean mandatory))throw new Failure(503,"REQUIREMENT_MANDATORY_INVALID",false);
            var requirement=new RoleGap.Requirement(text(s,"id"),text(s,"name"),decimal(q,"requiredScore"),mandatory);
            if(!edges.add(text(q,"id")) || requirements.putIfAbsent(requirement.skillId(),requirement)!=null)throw new Failure(503,"DUPLICATE_REQUIREMENT",false);
        }
        if(requirements.values().stream().noneMatch(RoleGap.Requirement::mandatory))throw new Failure(422,"MANDATORY_REQUIREMENTS_MISSING",false);
        return new Binding(ref.businessRoleId(),ref.roleId(),ref.levelId(),ref.occupationId(),text(first.get("r"),"name"),text(first.get("l"),"name"),
                ref.catalogFingerprint(),ref.releaseToken(),ref.versions(),List.copyOf(requirements.values()));
    }
}
