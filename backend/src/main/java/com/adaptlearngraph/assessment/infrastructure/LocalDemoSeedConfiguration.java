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
    @Bean ApplicationRunner localDemoSeed(DataSource source, Driver driver, ConfigurableApplicationContext context,org.springframework.core.env.Environment environment) {
        return args -> {
            byte[] graph=Files.readAllBytes(Path.of(environment.getProperty("assessment.baseline.local-demo.catalog-seed-file","/seed/ontology_seed.json")));
            byte[] scope=Files.readAllBytes(Path.of(environment.getProperty("assessment.baseline.local-demo.bank-scope-file","/seed/catalog-scope.json")));
            byte[] manifest;
            try(var in=new org.springframework.core.io.ClassPathResource("db/seed/question-bank-15-1212.00-v1-ontology-v09.json").getInputStream()){manifest=in.readAllBytes();}
            require(sha256(scope).equals("454b5531a43dba70c29597d866cb29f5e614a02de5e6e596c379bb2712c667a6"),"Scope seed drift");
            require(sha256(manifest).equals("ca4fb71cc4a167e9d37d7133d9fe62a0cf8e9400ca9a5faeb22b4264a51b0bb6"),"Bank seed drift");
            var bank=parse(manifest,OfficialQuestionBankManifest.class);var catalog=parse(scope,OfficialQuestionBankCatalog.Scope.class);
            bank.validate(catalog);
            var latest=new LocalCatalogBootstrap(graph);
            latest.requireBaselineCompatibility(catalog);
            latest.bootstrap(driver);
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
