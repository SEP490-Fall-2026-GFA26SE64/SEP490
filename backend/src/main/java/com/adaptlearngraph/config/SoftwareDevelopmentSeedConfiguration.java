package com.adaptlearngraph.config;

import com.adaptlearngraph.dtos.OfficialQuestionBankManifest;
import com.adaptlearngraph.entities.IrtParameterSetEntity;
import com.adaptlearngraph.repository.DevelopmentSeedRepositories;
import com.adaptlearngraph.services.OfficialQuestionBankImporter;
import com.adaptlearngraph.constants.DevelopmentWorkspace;
import com.adaptlearngraph.utility.RegistrationCryptography;
import com.adaptlearngraph.utility.AdaptiveIrtPolicy;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;
import org.springframework.beans.factory.BeanFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.env.Environment;
import org.springframework.transaction.support.TransactionTemplate;
import static com.adaptlearngraph.config.SoftwareDevelopmentSeed.*;
import static com.adaptlearngraph.dtos.OfficialQuestionBankManifest.*;

/** Shared insert-only SE inputs; never creates Blueprint, activation, attempt, mastery or approval. */
@Configuration(proxyBeanMethods=false)
@Profile("local & workspace-development & software-development-seed & !prod & !local-baseline-demo")
@ConditionalOnProperty(name="workspace.development-fixtures.enabled",havingValue="true")
@Import(PersistenceConfiguration.class)
public class SoftwareDevelopmentSeedConfiguration {
    private static final String DECLARED_DIAGNOSTICS="{\"origin\":\"DECLARED_SYNTHETIC\",\"operationalPromotionEligible\":false}";
    @Bean ApplicationRunner softwareDevelopmentSeed(BeanFactory beans,com.adaptlearngraph.repository.Neo4jCypher catalogGraph,Environment env,ConfigurableApplicationContext context,
            @org.springframework.beans.factory.annotation.Qualifier(com.adaptlearngraph.constants.TransactionManagers.JPA)
            org.springframework.transaction.PlatformTransactionManager transactionManager) {
        return args -> {
            if(!DevelopmentWorkspace.enabled(env))throw new IllegalStateException("Development fixture gate required");
            var graph=Files.readAllBytes(Path.of(env.getProperty("pathway.initial.catalog.seed-file","/seed/ontology_seed.json")));
            var catalog=LocalCatalogBootstrap.forExistingDevelopment(catalogGraph,graph);
            if(!catalog.hasSoftwareDevelopment())System.out.println("SE bank ready; existing sealed graph retained. Three additional prerequisite edges remain pending approved catalog import.");
            var manifest=MainDevelopmentBankSeed.project(bank(graph));
            var seeds=DevelopmentSeedRepositories.from(beans::getBean);
            var currentItems=seeds.technical().itemVersionIds(MainDevelopmentBankSeed.seId("bank"));
            var expectedItems=manifest.items().stream().map(OfficialQuestionBankManifest.Item::itemVersionId).collect(java.util.stream.Collectors.toSet());
            require(currentItems.isEmpty() || currentItems.size()==360 && expectedItems.equals(new HashSet<>(currentItems)),"SE bank item inventory drift");
            var importer=new OfficialQuestionBankImporter(seeds.imports(),seeds.banks(),seeds.items(),seeds.locks(),transactionManager);
            importer.importManifest(manifest,new OfficialQuestionBankImporter.Owner(
                    MainDevelopmentBankSeed.id("bank-owner"),MainDevelopmentBankSeed.ORGANIZATION,importer.targetUrl()),OfficialQuestionBankImporter.Mode.LOCAL_SEED);
            new TransactionTemplate(transactionManager).executeWithoutResult(tx -> {
                seeds.locks().lock("WORKSPACE_SE");
                provision(seeds,manifest,env.getRequiredProperty("workspace.development-fixtures.password"));
            });
            context.close();
        };
    }
    private static void provision(DevelopmentSeedRepositories repositories,OfficialQuestionBankManifest bank,String password) {
        require(password.length()>=12,"Development password must contain at least twelve characters");
        var seeds=repositories.identities();var technical=repositories.technical();
        var org=MainDevelopmentBankSeed.ORGANIZATION;
        var now=Instant.parse("2026-01-01T00:00:00Z");
        UUID department=MainDevelopmentBankSeed.seId("department"),reference=MainDevelopmentBankSeed.seId("reference"),jobPosition=MainDevelopmentBankSeed.seId("jobPosition");
        seeds.insertDepartmentIgnoringConflicts(department,org,"Development Software Engineering");
        seeds.insertJobPositionReferenceIgnoringConflicts(reference,jobPosition,org,department,"Software Developers");
        require(seeds.activeJobPositionReference(reference,jobPosition,org,department,"Software Developers","Development Software Engineering"),"SE department/job-position drift");
        var account=MainDevelopmentBankSeed.id("employee-se");var membership=MainDevelopmentBankSeed.id("membership:employee-se");
        var crypto=new RegistrationCryptography("","");
        seeds.insertAccountIgnoringConflicts(account,org,"employee-se@workspace.dev.invalid","employee-se@workspace.dev.invalid",crypto.hashPassword(password));
        var existing=seeds.accountState(account).stream().findFirst()
                .orElseThrow(()->new org.springframework.dao.EmptyResultDataAccessException(1));
        require(org.equals(existing.organizationId()) && "employee-se@workspace.dev.invalid".equals(existing.identifier())
                && "employee-se@workspace.dev.invalid".equals(existing.normalizedIdentifier())
                && Boolean.TRUE.equals(existing.active()) && crypto.passwordMatches(password,existing.passwordHash()),"SE account/password drift");
        seeds.insertProfileIgnoringConflicts(account,"Development SE employee",now);
        seeds.insertEmployeeMembershipIgnoringConflicts(membership,account,org,department,reference,now);
        seeds.insertMembershipRoleIfAbsent(membership,"EMPLOYEE");
        require(seeds.activeEmployeeMembershipRoles(membership,account,org,department,reference).equals(List.of("EMPLOYEE")),"SE membership drift");
        try {
            var model=canonical(JSON.valueToTree(AdaptiveIrtPolicy.referenceModelV1()));
            var mapping=canonical(JSON.valueToTree(AdaptiveIrtPolicy.referenceMappingV1()));
            var mappingHash=sha256(mapping.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            UUID modelId=MainDevelopmentBankSeed.seId("model"),mappingId=MainDevelopmentBankSeed.seId("mapping"),parameters=MainDevelopmentBankSeed.seId("parameters");
            String hash=MainDevelopmentBankSeed.seTechnicalHash();UUID ld=MainDevelopmentBankSeed.id("ld");
            technical.insertModelIgnoringConflicts(modelId,"WORKSPACE_SE_SYNTHETIC",hash,model,"development:SE:DECLARED_SYNTHETIC");
            technical.insertMappingIfAbsent(mappingId,mapping,mappingHash);
            require(technical.declaredModelMatches(modelId,"WORKSPACE_SE_SYNTHETIC",hash,model,"development:SE:DECLARED_SYNTHETIC"),"SE model drift");
            require(technical.logisticMappingMatches(mappingId,mapping,mappingHash),"SE mapping drift");
            boolean assemble=!technical.setExists(parameters);
            if(assemble)technical.insert(new IrtParameterSetEntity(parameters,modelId,"SEEDED","BUILDING",hash,null,null,null));
            require(technical.seededSetInState(parameters,modelId,hash,assemble ? "BUILDING" : "CANDIDATE",!assemble,ld),"SE parameter-set drift");
            for(var item:bank.items()) {
                var b=switch(item.difficulty()){case "EASY" -> -1;case "MEDIUM" -> 0;default -> 1;};
                if(assemble)technical.insertDeclaredParameterIfAbsent(parameters,item.itemVersionId(),item.microSkillId(),b,DECLARED_DIAGNOSTICS);
                require(technical.declaredParameterMatches(parameters,item.itemVersionId(),item.microSkillId(),b,DECLARED_DIAGNOSTICS),"SE item-parameter drift");
            }
            if(assemble)technical.markBuildingCandidate(parameters);
            require(technical.parameterCount(parameters)==360,"SE parameter coverage drift");
            // Existing Blueprint persistence requires PROMOTED even for this explicit SEEDED fixture.
            // Keep synthetic provenance/model approval untouched; operational production lookup still denies SEEDED.
            require(seeds.activeMemberWithRole(ld,org,"LD_MANAGER"),"SE technical fixture actor unavailable");
            technical.promoteSeededCandidate(parameters,ld,hash);
            require(technical.seededSetPromoted(parameters,modelId,hash,ld),"SE fixture promotion incomplete");
        } catch(RuntimeException invalid) { throw invalid; }
        repositories.resources().seedIfAbsent(org,reference,JOB_POSITION,MainDevelopmentBankSeed.seId("bank"),MainDevelopmentBankSeed.seId("model"),MainDevelopmentBankSeed.seId("mapping"));
        require(repositories.resources().boundReference(org,reference,JOB_POSITION,MainDevelopmentBankSeed.seId("bank"),MainDevelopmentBankSeed.seId("model"),MainDevelopmentBankSeed.seId("mapping")),"SE resource binding drift");
    }
}