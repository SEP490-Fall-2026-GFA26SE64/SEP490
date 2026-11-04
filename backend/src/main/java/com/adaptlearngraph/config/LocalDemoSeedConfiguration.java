package com.adaptlearngraph.config;

import com.adaptlearngraph.dtos.OfficialQuestionBankManifest;
import com.adaptlearngraph.helper.OfficialQuestionBankCatalog;
import com.adaptlearngraph.repository.DevelopmentSeedRepositories;
import com.adaptlearngraph.services.OfficialQuestionBankImporter;
import com.fasterxml.jackson.databind.*;
import java.nio.file.*;
import java.util.*;
import org.springframework.beans.factory.BeanFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.transaction.PlatformTransactionManager;
import static com.adaptlearngraph.dtos.OfficialQuestionBankManifest.*;

/** Insert-only local bootstrap. Never creates learner state, blueprints or assessment history. */
@Configuration(proxyBeanMethods=false)
@Profile("local-demo-seed & local & !prod & !migrate")
@ConditionalOnProperty(name="assessment.baseline.local-demo.seed-enabled",havingValue="true")
@Import(PersistenceConfiguration.class)
public class LocalDemoSeedConfiguration {
    @Bean ApplicationRunner localDemoSeed(BeanFactory beans, com.adaptlearngraph.repository.Neo4jCypher catalogGraph, ConfigurableApplicationContext context,org.springframework.core.env.Environment environment,
            @Qualifier(com.adaptlearngraph.constants.TransactionManagers.JPA) PlatformTransactionManager transactionManager) {
        return args -> {
            byte[] graph=Files.readAllBytes(Path.of(environment.getProperty("assessment.baseline.local-demo.catalog-seed-file","/seed/ontology_seed.json")));
            byte[] scope=Files.readAllBytes(Path.of(environment.getProperty("assessment.baseline.local-demo.bank-scope-file","/seed/catalog-scope.json")));
            byte[] manifest;
            try(var in=new org.springframework.core.io.ClassPathResource("db/seed/question-bank-15-1212.00-v1-ontology-v09.json").getInputStream()){manifest=in.readAllBytes();}
            require(sha256(scope).equals("56b831ca0594d93ed89b62bec6d7d95c332d632e9ca2439ec7bd316c89961c20"),"Scope seed drift");
            require(sha256(manifest).equals("08349b4cf50c4e12ff5700cb428606c09377298516c968f3c5fc42d23aaaf221"),"Bank seed drift");
            var bank=parse(manifest,OfficialQuestionBankManifest.class);var catalog=parse(scope,OfficialQuestionBankCatalog.Scope.class);
            bank.validate(catalog);
            var latest=com.adaptlearngraph.constants.DevelopmentWorkspace.enabled(environment)
                    ? LocalCatalogBootstrap.withSoftwareDevelopment(graph) : new LocalCatalogBootstrap(graph);
            latest.requireBaselineCompatibility(catalog);
            var seeds=DevelopmentSeedRepositories.from(beans::getBean);
            var importer=new OfficialQuestionBankImporter(seeds.imports(),seeds.banks(),seeds.items(),seeds.locks(),transactionManager);
            if(com.adaptlearngraph.constants.DevelopmentWorkspace.enabled(environment))MainDevelopmentBankSeed.requireFreshOrProjected(seeds.technical());
            latest.bootstrap(catalogGraph);
            if(com.adaptlearngraph.constants.DevelopmentWorkspace.enabled(environment)){
                MainDevelopmentBankSeed.prepareOwner(seeds.identities());
                var projected=MainDevelopmentBankSeed.project(bank);
                projected.validate(catalog);
                importer.importManifest(projected,new OfficialQuestionBankImporter.Owner(
                        MainDevelopmentBankSeed.id("bank-owner"),MainDevelopmentBankSeed.ORGANIZATION,importer.targetUrl()),OfficialQuestionBankImporter.Mode.LOCAL_SEED);
                context.close();return;
            }
            var id=UUID.fromString("00000000-0000-0000-0000-000000000001");
            seeds.identities().insertOrganizationIfAbsent(id,"LOCAL-DEMO","Local Demo");
            seeds.identities().insertAccountIfAbsent(id,id,"local-demo-bank-owner","local-demo-bank-owner","DEMO_NO_PASSWORD_LOGIN");
            importer.importManifest(bank,new OfficialQuestionBankImporter.Owner(id,id,importer.targetUrl()),OfficialQuestionBankImporter.Mode.LOCAL_SEED);
            context.close();
        };
    }
}