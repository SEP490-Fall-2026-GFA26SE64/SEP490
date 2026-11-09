package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.*;
import com.adaptlearngraph.entities.domain.CertificateCatalog.*;
import com.adaptlearngraph.repository.InitialPathwayPorts.Failure;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.neo4j.driver.Value;

/** Single owned Skill write lock serializes exact provision cardinality; definitions/history are never deleted. */
public final class CertificateCatalogRepository {
    private final Neo4jCypher graph;private final ObjectMapper json;
    private final int timeout;
    public CertificateCatalogRepository(Neo4jCypher graph,ObjectMapper json){this(graph,json,5);}
    public CertificateCatalogRepository(Neo4jCypher graph,ObjectMapper json,int timeout){if(timeout<1 || timeout>60)throw new IllegalArgumentException("Invalid catalog transaction budget");this.graph=graph;this.json=json;this.timeout=timeout;}
    public List<Definition> list(UUID organization,int offset,int limit) {
        return list(organization,offset,limit,"","");
    }
    public List<Definition> list(UUID organization,int offset,int limit,String query,String level) {
        if(offset<0 || offset>10000 || limit<1 || limit>100)throw new Failure(400,"INVALID_PAGINATION");
        if(query==null || query.length()>300 || level==null || !Set.of("","FOUNDATION","INTERMEDIATE","ADVANCED").contains(level))throw new Failure(400,"INVALID_REQUEST");
        return graph.read(timeout,tx->tx.list("""
                MATCH (s:MicroSkill {organizationId:$org})-[a:REQUIRES_CERTIFICATE]->(c:Certificate {organizationId:$org})
                WHERE a.status='ACTIVE' AND a.organizationId=$org AND c.status='ACTIVE' AND c.reviewStatus='APPROVED'
                    AND ($query='' OR toLower(c.name) CONTAINS $query OR toLower(s.name) CONTAINS $query)
                    AND ($level='' OR c.knowledgeLevel=$level)
                RETURN s.id AS skillId,s.name AS skillName,properties(c) AS certificate ORDER BY s.name,c.knowledgeLevel,c.id SKIP $offset LIMIT $limit
                """,Map.of("org",organization.toString(),"offset",offset,"limit",limit,"query",query.trim().toLowerCase(Locale.ROOT),"level",level)).stream().map(this::definition).toList());
    }
    public Definition create(UUID organization,UUID expert,UUID retry,Create command) {
        String hash;
        try{hash=com.adaptlearngraph.services.RoleBaselineFlow.hash(json.writeValueAsString(command));}
        catch(Exception invalid){throw new Failure(400,"INVALID_REQUEST");}
        String id="cert-"+UUID.nameUUIDFromBytes((organization+"\n"+expert+"\n"+retry).getBytes(StandardCharsets.UTF_8));
        return graph.write(timeout,tx->{
            var skills=tx.list("MATCH (s:MicroSkill {id:$skill,organizationId:$org}) SET s.version=s.version RETURN properties(s) AS skill LIMIT 2",
                    Map.of("skill",command.skillId(),"org",organization.toString()));
            if(skills.size()!=1)throw new Failure(404,"OWNED_SKILL_NOT_FOUND");var skill=skills.getFirst().get("skill");
            var replay=tx.list("""
                    MATCH (c:Certificate {id:$id,organizationId:$org})<-[:REQUIRES_CERTIFICATE]-(s:MicroSkill {organizationId:$org})
                    RETURN s.id AS skillId,s.name AS skillName,properties(c) AS certificate LIMIT 2
                    """,Map.of("id",id,"org",organization.toString()));
            if(!replay.isEmpty()) {
                if(replay.size()!=1 || !hash.equals(replay.getFirst().get("certificate").get("commandHash").asString("")))throw new Failure(409,"IDEMPOTENCY_CONFLICT");
                return definition(replay.getFirst());
            }
            if(!"ACTIVE".equals(skill.get("status").asString("")) || !"APPROVED".equals(skill.get("reviewStatus").asString("")))throw new Failure(409,"OWNED_SKILL_NOT_APPROVED");
            if(!command.expectedSkillVersion().equals(skill.get("version").asString("")))throw new Failure(409,"SKILL_VERSION_CHANGED");
            var modules=strings(skill,"moduleOnlyKnowledgeLevels");var certificates=strings(skill,"certificateOnlyKnowledgeLevels");
            if(modules.stream().anyMatch(certificates::contains) || !certificates.contains(command.knowledgeLevel().name()))throw new Failure(409,"CERTIFICATE_PROVISION_REQUIRED");
            String property=switch(command.knowledgeLevel()){case FOUNDATION->"foundationOutcomeCodes";case INTERMEDIATE->"intermediateOutcomeCodes";case ADVANCED->"advancedOutcomeCodes";};
            var outcomes=CertificateCatalog.outcomes(strings(skill,property));
            var existing=tx.list("""
                    MATCH (s:MicroSkill {id:$skill,organizationId:$org})-[a:REQUIRES_CERTIFICATE]->(c:Certificate {organizationId:$org})
                    WHERE a.status='ACTIVE' AND c.status='ACTIVE' AND c.knowledgeLevel=$level RETURN c.id AS id LIMIT 2
                    """,Map.of("org",organization.toString(),"skill",command.skillId(),"level",command.knowledgeLevel().name()));
            if(existing.size()>1)throw new Failure(409,"DUPLICATE_CERTIFICATE_ASSIGNMENT");
            if(command.replacesDefinitionId()==null && !existing.isEmpty())throw new Failure(409,"CERTIFICATE_ALREADY_ASSIGNED");
            if(command.replacesDefinitionId()!=null) {
                if(existing.size()!=1 || !command.replacesDefinitionId().equals(existing.getFirst().get("id").asString()))throw new Failure(409,"CERTIFICATE_ASSIGNMENT_CHANGED");
                tx.execute("""
                        MATCH (s:MicroSkill {id:$skill,organizationId:$org})-[a:REQUIRES_CERTIFICATE]->(c:Certificate {id:$previous,organizationId:$org})
                        WHERE a.status='ACTIVE' AND c.knowledgeLevel=$level
                        SET a.status='INACTIVE',a.replacedBy=$next,a.replacedByActor=$expert,a.replacedAt=toString(datetime())
                        """,Map.of("org",organization.toString(),"skill",command.skillId(),"previous",command.replacesDefinitionId(),"level",command.knowledgeLevel().name(),"next",id,"expert",expert.toString()));
            }
            return definition(tx.single("""
                    MATCH (s:MicroSkill {id:$skill,organizationId:$org})
                    CREATE (c:Certificate {id:$id,organizationId:$org,version:'1',name:$name,description:'',knowledgeLevel:$level,
                        skillVersion:$skillVersion,outcomeCodes:$outcomes,referenceUrl:$url,status:'ACTIVE',reviewStatus:'APPROVED',
                        authoredBy:$expert,authoredAt:toString(datetime()),approvedBy:$expert,approvedAt:toString(datetime()),commandHash:$hash})
                    CREATE (s)-[:REQUIRES_CERTIFICATE {organizationId:$org,status:'ACTIVE',createdBy:$expert,createdAt:toString(datetime())}]->(c)
                    RETURN s.id AS skillId,s.name AS skillName,properties(c) AS certificate
                    """,Map.of("org",organization.toString(),"skill",command.skillId(),"id",id,"name",command.name(),"level",command.knowledgeLevel().name(),
                    "skillVersion",command.expectedSkillVersion(),"outcomes",outcomes,"url",command.referenceUrl(),"expert",expert.toString(),"hash",hash)));
        });
    }
    private Definition definition(org.neo4j.driver.Record row) {
        var c=row.get("certificate");return new Definition(c.get("id").asString(),c.get("version").asString(),row.get("skillId").asString(),row.get("skillName").asString(),
                KnowledgeLevel.valueOf(c.get("knowledgeLevel").asString()),c.get("skillVersion").asString(),strings(c,"outcomeCodes"),c.get("name").asString(),c.get("referenceUrl").asString(),
                c.get("status").asString(),c.get("authoredBy").asString(),c.get("authoredAt").asString());
    }
    private static List<String> strings(Value value,String field){return value.get(field).isNull()?List.of():value.get(field).asList(Value::asString);}
}
