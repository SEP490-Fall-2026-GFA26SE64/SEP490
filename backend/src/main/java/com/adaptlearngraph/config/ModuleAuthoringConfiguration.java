package com.adaptlearngraph.config;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.repository.JpaLearningContentAdapter;
import com.adaptlearngraph.repository.JpaModuleAuthoringAdapter;
import com.adaptlearngraph.repository.LearningModuleNodeRepository;
import com.adaptlearngraph.repository.Neo4jModuleCatalogGraph;
import com.adaptlearngraph.repository.LearningContentRepositories;
import com.adaptlearngraph.repository.LearningImportJpaRepository;
import com.adaptlearngraph.repository.LearningNotificationJpaRepository;
import com.adaptlearngraph.repository.LearningVideoVerificationJpaRepository;
import com.adaptlearngraph.repository.ModuleAuthoringRepositories;
import com.adaptlearngraph.repository.PostgresAdvisoryLocks;
import com.adaptlearngraph.repository.PrivateLearningAssets;
import com.adaptlearngraph.services.ExcelLearningImport;
import com.adaptlearngraph.services.LearningMailWorker;
import com.adaptlearngraph.services.ModuleAuthoringService;
import com.adaptlearngraph.repository.ModuleAuthoringPort;
import com.adaptlearngraph.repository.LearningContentPort;
import com.adaptlearngraph.repository.LearningAssetPort;
import com.adaptlearngraph.services.LearningContentService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.ListableBeanFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.data.neo4j.core.Neo4jClient;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Configuration(proxyBeanMethods = false)
@Profile("local")
@Import({PersistenceConfiguration.class, ModelMapperConfiguration.class})
public class ModuleAuthoringConfiguration {
    @Bean com.adaptlearngraph.helper.ModelMapperRegistrar moduleAuthoringMappings() {
        return new com.adaptlearngraph.helper.ModuleAuthoringMappings();
    }
    @Bean com.adaptlearngraph.helper.ModelMapperRegistrar learningContentMappings() {
        return new com.adaptlearngraph.helper.LearningContentMappings();
    }
    @Bean com.adaptlearngraph.services.ModuleAuthoringApplicationService moduleAuthoringApplicationService(
            ModuleAuthoringService modules, org.modelmapper.ModelMapper modelMapper) {
        return new com.adaptlearngraph.services.ModuleAuthoringApplicationService(modules, modelMapper);
    }
    @Bean com.adaptlearngraph.services.LearningContentApplicationService learningContentApplicationService(
            LearningContentService content, ModuleAuthoringPort modules, LearningAssetPort files,
            com.adaptlearngraph.services.LearningImportUseCase imports, org.modelmapper.ModelMapper modelMapper) {
        return new com.adaptlearngraph.services.LearningContentApplicationService(content, modules, files, imports, modelMapper);
    }
    @Bean ModuleAuthoringPort moduleAuthoringPort(ListableBeanFactory beans, PostgresAdvisoryLocks locks,
            @Qualifier(TransactionManagers.JPA) PlatformTransactionManager manager,
            ObjectMapper mapper, LearningModuleNodeRepository modules, Neo4jClient neo4j,
            @Qualifier(TransactionManagers.NEO4J) PlatformTransactionManager graphTransactions,
            @Value("${module-authoring.organization-id:comp-technova}") String organization) {
        return new JpaModuleAuthoringAdapter(ModuleAuthoringRepositories.from(beans::getBean, locks), new TransactionTemplate(manager),
                mapper, new Neo4jModuleCatalogGraph(modules, neo4j, graphTransactions), organization);
    }
    @Bean
    @org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name="learning.mail.enabled",havingValue="true")
    LearningMailWorker learningMailWorker(LearningNotificationJpaRepository notifications,
            @Qualifier(TransactionManagers.JPA) PlatformTransactionManager manager,
            com.adaptlearngraph.helper.TransactionalMailSender mail,
            @Value("${subscription.public-url:http://localhost:8088}") String publicUrl) {
        return new LearningMailWorker(notifications, new TransactionTemplate(manager), mail, publicUrl);
    }
    @Bean LearningAssetPort learningAssetPort(LearningContentPort content, LearningVideoVerificationJpaRepository verifications,
            @Value("${learning.assets.endpoint:http://localhost:28190}") String endpoint,
            @Value("${learning.assets.access-key:unconfigured}") String access,
            @Value("${learning.assets.secret-key:unconfigured}") String secret,
            @Value("${learning.assets.bucket:learning-content}") String bucket) {
        return new PrivateLearningAssets(endpoint, access, secret, bucket, content, verifications);
    }
    @Bean com.adaptlearngraph.services.LearningImportUseCase learningImport(
            ModuleAuthoringPort modules, LearningContentPort content, LearningAssetPort files,
            ModuleAuthoringService service, LearningImportJpaRepository imports, ObjectMapper mapper) {
        return new ExcelLearningImport(modules, content, files, service, imports, mapper);
    }
    @Bean LearningContentPort learningContentPort(ListableBeanFactory beans, ObjectMapper mapper, ModuleAuthoringPort modules,
            org.springframework.beans.factory.ObjectProvider<com.adaptlearngraph.services.InitialPathwayAccess> pathways,
            org.springframework.beans.factory.ObjectProvider<com.adaptlearngraph.services.RequirementPathwayAccess> requirements,
            org.springframework.core.env.Environment environment) {
        boolean exact=environment.acceptsProfiles(org.springframework.core.env.Profiles.of("workspace-baseline & !local-baseline-demo & !prod"));
        return new JpaLearningContentAdapter(LearningContentRepositories.from(beans::getBean),mapper,(organization,learner,module,revision)->{
            var actor=modules.actor();
            if(!organization.equals(actor.organizationId()) || !learner.equals(actor.id()) || !actor.roles().contains("EMPLOYEE")) return false;
            try {
                if(exact) {var access=requirements.getIfAvailable();return access!=null && access.permits(module,revision);}
                var access=pathways.getIfAvailable();if(access==null)return false;access.requireCurrentEntry(module);return true;
            } catch(com.adaptlearngraph.repository.InitialPathwayPorts.Failure denied){
                if(denied.status()>=500)throw new ModuleAuthoringService.Failure(503,"Pathway authorization is temporarily unavailable");return false;
            }
        },exact);
    }
    @Bean @Primary
    @org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name="pathway.initial.enabled",havingValue="true")
    com.adaptlearngraph.repository.InitialPlanningPorts.ContentAccess modulePathwayContentAccess(ModuleAuthoringPort modules) {
        return (scope,module,version,internalGates)->{
            if(!internalGates.isEmpty()) throw new com.adaptlearngraph.repository.InitialPathwayPorts.Failure(503,"CONTENT_SEGMENT_GATES_NOT_CONFIGURED");
            var document=modules.documents(scope.organizationId().toString()).stream().filter(d->d.id().equals(module)).findFirst()
                .orElseThrow(()->new com.adaptlearngraph.repository.InitialPathwayPorts.Failure(503,"CONTENT_ACCESS_NOT_CONFIGURED"));
            var pin=modules.pinned(scope.organizationId().toString(),scope.learnerId().toString(),module);
            var revision=pin.flatMap(number->document.revisions().stream().filter(r->r.number()==number).findFirst()).orElse(document.released());
            if(revision==null || !version.equals(revision.payload().contentVersion()) || revision.payload().content().lessons().isEmpty())
                throw new com.adaptlearngraph.repository.InitialPathwayPorts.Failure(503,"CONTENT_ACCESS_NOT_CONFIGURED");
            return "/employee/modules/"+module;
        };
    }
    @Bean ModuleAuthoringService moduleAuthoringService(ModuleAuthoringPort port, LearningContentPort content) { return new ModuleAuthoringService(port, content); }
    @Bean com.adaptlearngraph.services.SkillLearningApplicationService skillLearningApplicationService(com.adaptlearngraph.services.SkillLearningService learning) {
        return new com.adaptlearngraph.services.SkillLearningApplicationService(learning);
    }
    @Bean com.adaptlearngraph.services.SkillLearningService skillLearningService(ModuleAuthoringPort modules, LearningContentPort learning) {
        return new com.adaptlearngraph.services.SkillLearningService(modules,learning);
    }
    @Bean LearningContentService learningContentService(ModuleAuthoringPort port, LearningContentPort content, ModuleAuthoringService modules) { return new LearningContentService(port, content, modules); }
}
