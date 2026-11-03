package com.adaptlearngraph.repository;

import com.adaptlearngraph.repository.InitialCatalogPort.*;
import com.adaptlearngraph.repository.InitialPathwayPorts.*;
import com.adaptlearngraph.entities.RoleGap;
import java.util.*;
import java.util.function.IntSupplier;
import static com.adaptlearngraph.helper.InitialCatalogMetadata.*;

/** Reads exact bound Role/Level requirements. No Level inference, seed fallback, or review bypass. */
public final class Neo4jInitialBindings implements Bindings {
    private final RoleReferences references;private final Neo4jInitialGraph.PublishedSessions sessions;private final IntSupplier maximumRows;
    private final boolean localReview;
    private final com.adaptlearngraph.repository.AuthoredCatalogPort authored;
    public Neo4jInitialBindings(RoleReferences references,Neo4jInitialGraph.PublishedSessions sessions,IntSupplier maximumRows) {
        this(references,sessions,maximumRows,false);
    }
    public Neo4jInitialBindings(RoleReferences references,Neo4jInitialGraph.PublishedSessions sessions,IntSupplier maximumRows,boolean localReview) {
        this(references,sessions,maximumRows,localReview,com.adaptlearngraph.repository.AuthoredCatalogPort.NONE);
    }
    public Neo4jInitialBindings(RoleReferences references,Neo4jInitialGraph.PublishedSessions sessions,IntSupplier maximumRows,boolean localReview,
                               com.adaptlearngraph.repository.AuthoredCatalogPort authored) {
        this.references=references;this.sessions=sessions;this.maximumRows=maximumRows;this.localReview=localReview;
        this.authored=Objects.requireNonNull(authored);
    }
    @Override public Binding require(Actor actor,String roleId,String levelId) {
        actor.require(Role.EMPLOYEE);var scope=Scope.own(actor);var ref=references.require(actor,roleId,levelId);
        if(!ref.organizationId().equals(scope.organizationId()) || !ref.roleId().equals(roleId) || !ref.levelId().equals(levelId)
                || !ref.businessRoleId().equals(com.adaptlearngraph.repository.InitialCatalogPort.choiceId(roleId,levelId)))throw new Failure(503,"INVALID_ROLE_BINDING",false);
        int maximum=maximumRows.getAsInt();if(maximum<1 || maximum==Integer.MAX_VALUE)throw new Failure(503,"CATALOG_READ_LIMIT_NOT_CONFIGURED",false);
        if("authored-role-level-member-v1".equals(ref.versions().get("binding"))) {
            var p=com.adaptlearngraph.repository.AuthoredCatalogPort.scoped(authored.find(scope.organizationId(),ref.occupationId()).orElseThrow(()->new Failure(503,"CATALOG_BINDING_UNAVAILABLE",false)),scope.organizationId(),ref.occupationId());
            if(!p.fingerprint().equals(ref.catalogFingerprint()) || !p.bindingRevision().equals(ref.versions().get("catalogBinding")))throw new Failure(409,"CATALOG_SOURCE_CHANGED",false);
            var role=p.roles().stream().filter(r->r.id().equals(roleId)).findFirst().orElseThrow(()->new Failure(404,"ROLE_NOT_AVAILABLE",false));
            var level=role.levels().stream().filter(l->l.id().equals(levelId)).findFirst().orElseThrow(()->new Failure(404,"LEVEL_NOT_AVAILABLE",false));
            if(level.skills().size()>maximum)throw new Failure(422,"CATALOG_REQUIREMENTS_LIMIT",false);
            var requirements=level.skills().stream().map(s->new RoleGap.Requirement(s.id(),s.name(),java.math.BigDecimal.valueOf(s.requiredScore()),true)).toList();
            references.assertCurrent(scope,ref);
            return new Binding(ref.businessRoleId(),roleId,levelId,ref.occupationId(),role.name(),level.name(),ref.catalogFingerprint(),ref.releaseToken(),ref.versions(),requirements);
        }
        try {
            var graph=sessions.open(scope,ref);
            var binding=graph.read(tx->read(tx,scope,ref,maximum));
            references.assertCurrent(scope,ref);return binding;
        }catch(Failure failure){throw failure;}
        catch(org.neo4j.driver.exceptions.Neo4jException | org.springframework.dao.DataAccessException
              | org.springframework.transaction.TransactionException unavailable){throw new Failure(503,"CATALOG_UNAVAILABLE");}
        catch(RuntimeException invalid){throw new Failure(503,"CATALOG_REQUIREMENTS_INVALID",false);}
    }
    @Override public void assertCurrent(Scope scope,Binding binding) {
        references.assertCurrent(scope,RoleReference.from(scope,binding));
    }
    // Neo4jClient: bound Role/Level rows with ownership subqueries, raw properties and elementIds validated field by field.
    private Binding read(Neo4jCypher.Statements tx,Scope scope,RoleReference ref,int maximum) {
        var rows=tx.list("""
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
                """,Map.of("occupation",ref.occupationId(),"role",ref.roleId(),"level",ref.levelId(),"maximum",maximum+1));
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
