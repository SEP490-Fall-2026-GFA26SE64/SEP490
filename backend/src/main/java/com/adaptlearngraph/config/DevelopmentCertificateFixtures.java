package com.adaptlearngraph.config;

import com.adaptlearngraph.entities.domain.*;
import com.adaptlearngraph.repository.Neo4jCypher;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;

/** Two explicit development provisions, applied after the module seed; never enabled by the normal API. */
final class DevelopmentCertificateFixtures {
    static final UUID ORGANIZATION=UUID.fromString("e0000000-0000-0000-0000-000000000001");
    static final String SOURCE="DEVELOPMENT_APPLICATION_DEVELOPER_CERTIFICATES_V1";
    /** Normalize only this exact opt-in fixture for the original sealed import comparison. No graph write. */
    static void sealedComparison(String id,Map<String,Object> props) {
        if(!SOURCE.equals(props.get("certificateFixtureSource")))return;
        String certificate=switch(id){case "MS-FS12"->"INTERMEDIATE";case "MS-FS08"->"ADVANCED";default->throw new IllegalStateException("Unknown certificate fixture Skill");};
        var modules=new ArrayList<>(List.of("FOUNDATION","INTERMEDIATE","ADVANCED"));modules.remove(certificate);
        require("0.12.1".equals(props.get("version")) && !props.containsKey("provisionMode")
                && modules.equals(props.get("moduleOnlyKnowledgeLevels")) && List.of(certificate).equals(props.get("certificateOnlyKnowledgeLevels")),"Certificate fixture provision drift");
        props.put("provisionMode","MODULE_ONLY");props.remove("moduleOnlyKnowledgeLevels");props.remove("certificateOnlyKnowledgeLevels");
    }
    record Definition(String id,String skillId,KnowledgeLevel knowledgeLevel,String skillVersion,String name,String referenceUrl) {}
    record Manifest(String format,UUID organizationId,List<Definition> definitions) {}
    static List<Definition> read(ObjectMapper json) throws java.io.IOException {
        try(var stream=DevelopmentCertificateFixtures.class.getResourceAsStream("/db/seed/application-developer-certificates.json")) {
            require(stream!=null,"Certificate fixture missing");var manifest=json.readValue(stream,Manifest.class);
            require(SOURCE.equals(manifest.format()) && ORGANIZATION.equals(manifest.organizationId()) && manifest.definitions().size()==2,"Certificate fixture owner/count drift");
            require(manifest.definitions().stream().map(d->d.skillId()+":"+d.knowledgeLevel()).collect(java.util.stream.Collectors.toSet())
                    .equals(Set.of("MS-FS12:INTERMEDIATE","MS-FS08:ADVANCED")),"Certificate fixture scope drift");
            for(var d:manifest.definitions()) {HttpsReference.require(d.referenceUrl());require("0.12.1".equals(d.skillVersion()),"Certificate Skill version missing");}
            return List.copyOf(manifest.definitions());
        }
    }
    static void apply(Neo4jCypher graph,List<Definition> definitions) {
        graph.write(tx->{
            for(var d:definitions) {
                var parameters=new HashMap<String,Object>();parameters.put("org",ORGANIZATION.toString());parameters.put("skill",d.skillId());parameters.put("id",d.id());parameters.put("level",d.knowledgeLevel().name());
                var skills=tx.list("MATCH (s:MicroSkill {organizationId:$org,id:$skill}) SET s.version=s.version RETURN properties(s) AS skill",parameters);
                require(skills.size()==1,"Exact owned Skill required");var skill=skills.getFirst().get("skill");
                require(d.skillVersion().equals(skill.get("version").asString()) && "ACTIVE".equals(skill.get("status").asString()) && "APPROVED".equals(skill.get("reviewStatus").asString()),"Skill fixture version/lifecycle drift");
                var existing=tx.list("MATCH (s:MicroSkill {organizationId:$org,id:$skill})-[r:REQUIRES_CERTIFICATE]->(c:Certificate) WHERE r.status='ACTIVE' AND c.knowledgeLevel=$level RETURN c.id AS id,c.source AS source",parameters);
                require(existing.isEmpty() || existing.size()==1 && d.id().equals(existing.getFirst().get("id").asString()) && SOURCE.equals(existing.getFirst().get("source").asString("")),"Preserve existing authored certificate");
                var modules=skill.get("moduleOnlyKnowledgeLevels").isNull()?new ArrayList<String>():new ArrayList<>(skill.get("moduleOnlyKnowledgeLevels").asList(v->v.asString()));
                var certificates=skill.get("certificateOnlyKnowledgeLevels").isNull()?new ArrayList<String>():new ArrayList<>(skill.get("certificateOnlyKnowledgeLevels").asList(v->v.asString()));
                String common=skill.get("provisionMode").asString("");
                require(common.isEmpty() || common.equals("MODULE_ONLY"),"Preserve changed provision");
                if(common.equals("MODULE_ONLY"))modules=new ArrayList<>(List.of("FOUNDATION","INTERMEDIATE","ADVANCED"));
                require(existing.isEmpty()?certificates.isEmpty():certificates.equals(List.of(d.knowledgeLevel().name())),"Preserve changed certificate scope");
                modules.remove(d.knowledgeLevel().name());if(!certificates.contains(d.knowledgeLevel().name()))certificates.add(d.knowledgeLevel().name());
                parameters.putAll(Map.of("modules",modules,"certificates",certificates,"source",SOURCE,"version",d.skillVersion(),"name",d.name(),"url",d.referenceUrl()));
                var collisions=tx.list("MATCH (c:Certificate {id:$id}) RETURN c.organizationId AS org,c.source AS source,c.name AS name,c.referenceUrl AS url,c.skillVersion AS version",parameters);
                require(collisions.isEmpty() || collisions.size()==1 && ORGANIZATION.toString().equals(collisions.getFirst().get("org").asString(""))
                        && SOURCE.equals(collisions.getFirst().get("source").asString("")) && d.name().equals(collisions.getFirst().get("name").asString(""))
                        && d.referenceUrl().equals(collisions.getFirst().get("url").asString("")) && d.skillVersion().equals(collisions.getFirst().get("version").asString("")),"Certificate fixture identity drift");
                tx.execute("""
                        MATCH (s:MicroSkill {organizationId:$org,id:$skill})
                        REMOVE s.provisionMode
                        SET s.moduleOnlyKnowledgeLevels=$modules,s.certificateOnlyKnowledgeLevels=$certificates,s.certificateFixtureSource=$source
                        MERGE (c:Certificate {id:$id})
                        ON CREATE SET c.organizationId=$org,c.version='1',c.name=$name,c.description='Development reference only; no employee achievement or human approval is claimed.',
                            c.knowledgeLevel=$level,c.skillVersion=$version,c.referenceUrl=$url,
                            c.status='ACTIVE',c.reviewStatus='APPROVED',c.authoredBy='DEVELOPMENT_SEED',c.authoredAt='2026-11-09T00:00:00Z',c.source=$source,c.reviewSource=$source
                        MERGE (s)-[r:REQUIRES_CERTIFICATE]->(c)
                        ON CREATE SET r.organizationId=$org,r.status='ACTIVE',r.createdBy='DEVELOPMENT_SEED',r.source=$source
                        """,parameters);
            }
            return true;
        });
    }
    static void require(boolean condition,String message){if(!condition)throw new IllegalStateException(message);}
}
