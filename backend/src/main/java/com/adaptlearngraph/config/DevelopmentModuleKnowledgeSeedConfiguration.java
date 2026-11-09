package com.adaptlearngraph.config;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.domain.ModuleAuthoring.Document;
import com.adaptlearngraph.repository.*;
import com.fasterxml.jackson.databind.*;
import java.nio.file.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.*;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Explicit one-time dev release, never a production startup or a user-controlled seed. */
@Configuration(proxyBeanMethods=false)
@Profile("local & workspace-development & module-knowledge-seed & !prod")
@ConditionalOnProperty(name="modules.development-seed.enabled",havingValue="true")
public class DevelopmentModuleKnowledgeSeedConfiguration {
    private static final String HASH="22d08d80691257e44f2ef6afbd9b15c385f12f9b8f429d5fa7e1ff43f32e3cda";
    private static final String COMPLETE_HASH="f455b6cf4d17aac8b32feeff59ab09f017c68537450bdc36bb67d45987764e15";
    private static final Set<String> ADDED_SKILLS=Set.of("MS-DE09","MS-DE10","MS-FS01","MS-FS10","MS-FS15","MS-QA09","MS-QA12","MS-QA15");
    private static final String ORG="e0000000-0000-0000-0000-000000000001";
    @Bean ApplicationRunner moduleKnowledgeSeed(ObjectMapper json,Neo4jCypher graph,JdbcTemplate jdbc,Environment env,
            @Qualifier(TransactionManagers.JPA) PlatformTransactionManager manager,ConfigurableApplicationContext context) {
        return args->{
            require(com.adaptlearngraph.constants.DevelopmentWorkspace.enabled(env),"Development fixture gate required");
            var bytes=Files.readAllBytes(Path.of(env.getRequiredProperty("modules.development-seed.manifest")));
            String manifestHash=java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(bytes));
            require(Set.of(HASH,COMPLETE_HASH).contains(manifestHash),"Module seed source drift");
            boolean supplement=COMPLETE_HASH.equals(manifestHash) && jdbc.queryForObject("SELECT count(*) FROM platform.development_module_seed_release WHERE organization_id=CAST(? AS uuid) AND manifest_hash=?",Long.class,ORG,HASH)>0;
            var release=json.readTree(bytes);
            require(ORG.equals(release.path("organizationId").asText()) && "DEVELOPMENT_SEED".equals(release.path("source").asText()),"Unexpected module fixture owner");
            var documents=new ArrayList<Document>();
            for(var row:release.path("documents")) {
                var document=json.treeToValue(row,Document.class);
                if(!supplement || ADDED_SKILLS.contains(document.revisions().getFirst().payload().teachings().getFirst().skillId()))documents.add(document);
            }
            int expected=supplement?24:COMPLETE_HASH.equals(manifestHash)?270:246;
            require(documents.size()==expected && documents.stream().map(Document::id).distinct().count()==expected,"Module inventory mismatch");
            var old=new ArrayList<String>();release.path("oldToNew").fieldNames().forEachRemaining(old::add);
            if(supplement)old.clear();
            var newIds=documents.stream().map(Document::id).toList();
            new TransactionTemplate(manager).executeWithoutResult(tx->{
                jdbc.execute("SELECT pg_advisory_xact_lock(hashtext('DEVELOPMENT_MODULE_KNOWLEDGE_V1'))");
                if(jdbc.queryForObject("SELECT count(*) FROM platform.development_module_seed_release WHERE organization_id=CAST(? AS uuid) AND manifest_hash=?",Long.class,ORG,manifestHash)>0)return;
                String ids=release.path("oldToNew").toString();
                for(String table:List.of("module_learning_pin","learning_module_completion","initial_pathway_module","pathway_requirement_option","module_authoring"))
                    require(jdbc.queryForObject("SELECT count(*) FROM platform."+table+" WHERE module_id IN (SELECT jsonb_object_keys(CAST(? AS jsonb)))",Long.class,ids)==0,
                            "Old module is referenced or authored; preserve it: "+table);
                try {
                    for(var document:documents) {
                        require(ORG.equals(document.organizationId()) && "DEVELOPMENT_SEED".equals(document.createdBy()),"Unexpected document owner");
                        var payload=document.revisions().getFirst().payload();
                        require(payload.knowledgeLevel()!=null && payload.teachings().size()==1 && payload.content().lessons().stream().allMatch(com.adaptlearngraph.entities.domain.LearningContent.Lesson::complete),"Incomplete module content");
                        jdbc.update("INSERT INTO platform.module_authoring_content(organization_id,content_id,document) VALUES(?,?,CAST(? AS jsonb)) ON CONFLICT DO NOTHING",ORG,payload.content().id(),json.writeValueAsString(payload.content()));
                        jdbc.update("INSERT INTO platform.module_authoring(organization_id,module_id,document) VALUES(?,?,CAST(? AS jsonb)) ON CONFLICT DO NOTHING",ORG,document.id(),json.writeValueAsString(document));
                    }
                }catch(java.io.IOException invalid){throw new IllegalStateException("Invalid module document",invalid);}
                var modules=new ArrayList<Map<String,Object>>();var teachings=new ArrayList<Map<String,Object>>();
                for(var document:documents) {
                    var p=document.revisions().getFirst().payload();var props=new HashMap<String,Object>();
                    props.putAll(Map.of("id",document.id(),"organizationId",ORG,"version",p.metadata().version(),"status","ACTIVE","reviewStatus","APPROVED","reviewSource","DEVELOPMENT_SEED"));
                    props.putAll(Map.of("title",p.title(),"moduleType",p.moduleType(),"contentUri",p.contentUri(),"contentType",p.contentType(),"contentVersion",p.contentVersion(),"duration",p.duration(),
                            "knowledgeLevel",p.knowledgeLevel().name(),"outcomeCodes",p.outcomeCodes(),"skillVersion",p.skillVersion()));
                    modules.add(Map.of("id",document.id(),"props",props));
                    var teaching=p.teachings().getFirst();
                    teachings.add(Map.of("module",document.id(),"skill",teaching.skillId(),"props",Map.of("id",teaching.metadata().id(),"organizationId",ORG,"version","0.12.0","status","ACTIVE","reviewStatus","APPROVED","reviewSource","DEVELOPMENT_SEED")));
                }
                graph.write(g->{
                    if(COMPLETE_HASH.equals(manifestHash)) {
                        require(g.single("MATCH (s:MicroSkill {organizationId:$org}) WHERE s.id IN $ids AND s.version='0.12.1' AND (s.provisionMode IS NULL OR s.provisionMode='MODULE_ONLY') RETURN count(s) AS c",Map.of("org",ORG,"ids",List.copyOf(ADDED_SKILLS))).get("c").asLong()==8,"Changed Skill provision; preserve authored data");
                        g.execute("MATCH (s:MicroSkill {organizationId:$org}) WHERE s.id IN $ids SET s.provisionMode='MODULE_ONLY'",Map.of("org",ORG,"ids",List.copyOf(ADDED_SKILLS)));
                    }
                    require(g.single("MATCH (m:LearningModule) WHERE m.id IN $ids AND (m.organizationId IS NULL OR m.organizationId<>$org) RETURN count(m) AS c",Map.of("ids",newIds,"org",ORG)).get("c").asLong()==0,"Module identity is not owned");
                    require(g.single("MATCH (m:LearningModule {organizationId:$org})-[r]-() WHERE m.id IN $ids AND type(r)<>'TEACHES' RETURN count(r) AS c",Map.of("ids",old,"org",ORG)).get("c").asLong()==0,"Unmapped graph reference to old module");
                    g.execute("MATCH (m:LearningModule {organizationId:$org}) WHERE m.id IN $ids DETACH DELETE m",Map.of("org",ORG,"ids",old));
                    g.execute("UNWIND $rows AS row MERGE (m:LearningModule {id:row.id}) SET m=row.props",Map.of("rows",modules));
                    g.execute("UNWIND $rows AS row MATCH (m:LearningModule {id:row.module,organizationId:$org}),(s:MicroSkill {id:row.skill,organizationId:$org}) MERGE (m)-[t:TEACHES]->(s) SET t=row.props",Map.of("rows",teachings,"org",ORG));
                    require(g.single("MATCH (m:LearningModule {organizationId:$org}) WHERE m.id IN $ids RETURN count(m) AS c",Map.of("ids",newIds,"org",ORG)).get("c").asLong()==expected,"Incomplete module projection");return true;
                });
                jdbc.update("INSERT INTO platform.development_module_seed_release(organization_id,manifest_hash) VALUES(CAST(? AS uuid),?)",ORG,manifestHash);
            });
            DevelopmentCertificateFixtures.apply(graph,DevelopmentCertificateFixtures.read(json));
            System.out.println("Development module release ready:"+expected+" modules and 2 certificate provisions; explicit seed provenance; learner progress preserved.");
            context.close();
        };
    }
    private static void require(boolean condition,String message){if(!condition)throw new IllegalStateException(message);}
}
