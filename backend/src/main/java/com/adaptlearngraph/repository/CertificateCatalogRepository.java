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
    public Definition create(UUID organization,UUID expert,UUID retry,Create command) {return publish(organization,expert,expert,retry,command);}
    public Definition publish(UUID organization,UUID expert,UUID reviewer,UUID retry,Create command) {
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
                    CREATE (c:Certificate {id:$id,organizationId:$org,version:'1',name:$name,description:$description,knowledgeLevel:$level,
                        skillVersion:$skillVersion,referenceUrl:$url,status:'ACTIVE',reviewStatus:'APPROVED',
                        authoredBy:$expert,authoredAt:toString(datetime()),approvedBy:$reviewer,approvedAt:toString(datetime()),commandHash:$hash})
                    CREATE (s)-[:REQUIRES_CERTIFICATE {organizationId:$org,status:'ACTIVE',createdBy:$expert,createdAt:toString(datetime())}]->(c)
                    RETURN s.id AS skillId,s.name AS skillName,properties(c) AS certificate
                    """,Map.ofEntries(Map.entry("org",organization.toString()),Map.entry("skill",command.skillId()),Map.entry("id",id),Map.entry("name",command.name()),Map.entry("level",command.knowledgeLevel().name()),
                    Map.entry("skillVersion",command.expectedSkillVersion()),Map.entry("url",command.referenceUrl()),Map.entry("expert",expert.toString()),Map.entry("hash",hash),Map.entry("reviewer",reviewer.toString()),Map.entry("description",Objects.toString(command.description(),"")))));
        });
    }
    public record SkillChoice(String skillId,String skillCode,String skillName,String version,List<String> levels) {}
    public List<SkillChoice> choices(UUID org) {
        var result=graph.read(timeout,tx->tx.list("MATCH (s:MicroSkill {organizationId:$org}) WHERE s.status='ACTIVE' AND s.reviewStatus='APPROVED' AND size(coalesce(s.certificateOnlyKnowledgeLevels,[]))>0 RETURN properties(s) AS s ORDER BY s.name,s.id LIMIT 501",Map.of("org",org.toString())).stream().map(r->{var v=r.get("s");return new SkillChoice(v.get("id").asString(),v.get("code").asString(v.get("id").asString()),v.get("name").asString(),v.get("version").asString(),strings(v,"certificateOnlyKnowledgeLevels"));}).toList());
        if(result.size()>500)throw new Failure(422,"CERTIFICATE_SKILL_CAPACITY");return result;
    }
    public void validate(UUID org,Create c) {
        var skill=choices(org).stream().filter(s->s.skillId().equals(c.skillId())).findFirst().orElseThrow(()->new Failure(409,"CERTIFICATE_PROVISION_REQUIRED"));
        if(!skill.version().equals(c.expectedSkillVersion()))throw new Failure(409,"SKILL_VERSION_CHANGED");
        if(!skill.levels().contains(c.knowledgeLevel().name()))throw new Failure(409,"CERTIFICATE_PROVISION_REQUIRED");
    }
    public void requireReplacement(UUID org,Create c) {
        var ids=graph.read(timeout,tx->tx.list("MATCH (:MicroSkill {id:$skill,organizationId:$org})-[a:REQUIRES_CERTIFICATE]->(c:Certificate {organizationId:$org}) WHERE a.status='ACTIVE' AND c.status='ACTIVE' AND c.knowledgeLevel=$level RETURN c.id AS id LIMIT 2",Map.of("org",org.toString(),"skill",c.skillId(),"level",c.knowledgeLevel().name())).stream().map(r->r.get("id").asString()).toList());
        if(ids.size()>1)throw new Failure(409,"DUPLICATE_CERTIFICATE_ASSIGNMENT");
        if(c.replacesDefinitionId()==null ? !ids.isEmpty() : ids.size()!=1||!c.replacesDefinitionId().equals(ids.getFirst()))throw new Failure(409,"CERTIFICATE_ASSIGNMENT_CHANGED");
    }
    private Definition definition(org.neo4j.driver.Record row) {
        var c=row.get("certificate");return new Definition(c.get("id").asString(),c.get("version").asString(),row.get("skillId").asString(),row.get("skillName").asString(),
                KnowledgeLevel.valueOf(c.get("knowledgeLevel").asString()),c.get("skillVersion").asString(),List.of(),c.get("name").asString(),c.get("referenceUrl").asString(),
                c.get("status").asString(),c.get("authoredBy").asString(),c.get("authoredAt").asString(),c.get("description").asString(""));
    }
    private static List<String> strings(Value value,String field){return value.get(field).isNull()?List.of():value.get(field).asList(Value::asString);}
}
