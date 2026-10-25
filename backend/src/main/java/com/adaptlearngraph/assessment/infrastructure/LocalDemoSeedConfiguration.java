package com.adaptlearngraph.assessment.infrastructure;

import com.fasterxml.jackson.databind.*;
import java.nio.file.*;
import java.util.*;
import javax.sql.DataSource;
import org.neo4j.driver.Driver;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import static com.adaptlearngraph.assessment.infrastructure.OfficialQuestionBankManifest.*;

/** Insert-only local bootstrap. Never creates learner state, blueprints or assessment history. */
@Configuration(proxyBeanMethods=false)
@Profile("local-demo-seed & local & !prod & !migrate")
@ConditionalOnProperty(name="assessment.baseline.local-demo.seed-enabled",havingValue="true")
public class LocalDemoSeedConfiguration {
    @Bean ApplicationRunner localDemoSeed(DataSource source, Driver driver, ConfigurableApplicationContext context) {
        return args -> {
            byte[] graph=Files.readAllBytes(Path.of("/seed/ontology_seed.json"));
            byte[] scope=Files.readAllBytes(Path.of("/seed/catalog-scope.json"));
            byte[] manifest;
            try(var in=new org.springframework.core.io.ClassPathResource("db/seed/question-bank-15-1212.00-v1.json").getInputStream()){manifest=in.readAllBytes();}
            require(sha256(graph).equals("0006bb11ac5c20687eb90be4807289ecea309a5657781543792e18f556eb5125"),"Catalog seed drift");
            require(sha256(scope).equals("c2454bde23764d061b6b25b54d434141715326d75eaa3201026618e7e4136231"),"Scope seed drift");
            require(sha256(manifest).equals("52d065a031aa9adca51808c59a7682872b7436343f0c300db84cfe1beb2fe882"),"Bank seed drift");
            var json=new ObjectMapper(); var data=json.readTree(graph);
            var labels=Map.of("Occupations","Occupation","TargetRoles","TargetRole","Levels","Level",
                    "Competencies","Competency","MicroSkills","MicroSkill","LearningModules","LearningModule");
            try(var session=driver.session()) {
                for(var label:labels.values()) session.run("CREATE CONSTRAINT ontology_v08_"+label.toLowerCase(Locale.ROOT)+"_id IF NOT EXISTS FOR (n:"+label+") REQUIRE n.id IS UNIQUE").consume();
                session.executeWrite(tx -> {
                    if(tx.run("MATCH (n) RETURN count(n) AS c").single().get("c").asLong()!=0) return false;
                    for(var entry:labels.entrySet()) {
                        List<Map<String,Object>> rows=new ArrayList<>();
                        for(var node:data.path(entry.getKey())) {
                            Map<String,Object> props=json.convertValue(node,new com.fasterxml.jackson.core.type.TypeReference<Map<String,Object>>(){});
                            props.values().removeIf(Objects::isNull);
                            if(entry.getValue().equals("TargetRole")) props.remove("occupationId");
                            if(entry.getValue().equals("Level")) props.remove("targetRoleId");
                            if(entry.getValue().equals("Competency")) props.remove("levelId");
                            rows.add(props);
                        }
                        tx.run("UNWIND $rows AS row CREATE (n:"+entry.getValue()+") SET n=row",Map.of("rows",rows)).consume();
                    }
                    var types=Set.of("HAS_ROLE","HAS_LEVEL","HAS_COMPETENCY","HAS_SKILL","REQUIRES_SKILL","TEACHES","HAS_SKILL_PREREQUISITE");
                    for(var type:types) {
                        List<Map<String,Object>> rows=new ArrayList<>();
                        for(var edge:data.path("relationships")) if(type.equals(edge.path("type").asText())) {
                            Map<String,Object> props=json.convertValue(edge,new com.fasterxml.jackson.core.type.TypeReference<Map<String,Object>>(){});
                            props.remove("type");props.remove("fromId");props.remove("toId");props.values().removeIf(Objects::isNull);
                            rows.add(Map.of("from",edge.path("fromId").asText(),"to",edge.path("toId").asText(),"props",props));
                        }
                        tx.run("UNWIND $rows AS row MATCH (a {id:row.from}),(b {id:row.to}) CREATE (a)-[r:"+type+"]->(b) SET r=row.props",Map.of("rows",rows)).consume();
                    }
                    require(tx.run("MATCH (n) RETURN count(n) AS c").single().get("c").asLong()==827,"Incomplete catalog nodes");
                    require(tx.run("MATCH ()-[r]->() RETURN count(r) AS c").single().get("c").asLong()==4536,"Incomplete catalog edges");
                    return true;
                });
            }
            var bank=parse(manifest,OfficialQuestionBankManifest.class);var catalog=parse(scope,OfficialQuestionBankCatalog.Scope.class);
            bank.validate(catalog);new OfficialQuestionBankCatalog().verify(driver,"neo4j",catalog);
            var jdbc=new NamedParameterJdbcTemplate(source);
            var id=UUID.fromString("00000000-0000-0000-0000-000000000001");
            jdbc.update("INSERT INTO platform.organization(organization_id,code,name) VALUES(:id,'LOCAL-DEMO','Local Demo') ON CONFLICT(organization_id) DO NOTHING",Map.of("id",id));
            jdbc.update("INSERT INTO platform.account(account_id,organization_id,identifier,normalized_identifier,password_hash) VALUES(:id,:id,'local-demo-bank-owner','local-demo-bank-owner','DEMO_NO_PASSWORD_LOGIN') ON CONFLICT(account_id) DO NOTHING",Map.of("id",id));
            String url;try(var connection=source.getConnection()){url=connection.getMetaData().getURL();}
            new OfficialQuestionBankImporter(source).importManifest(bank,new OfficialQuestionBankImporter.Owner(id,id,url),OfficialQuestionBankImporter.Mode.LOCAL_SEED);
            context.close();
        };
    }
}
