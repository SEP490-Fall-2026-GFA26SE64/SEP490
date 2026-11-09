package com.adaptlearngraph.config;

import com.adaptlearngraph.repository.BaselineBlueprintValidationAdapter;
import com.adaptlearngraph.repository.JpaBaselineAnswerReviewStore;
import com.adaptlearngraph.repository.JpaBaselineAssessmentDraftStore;
import com.adaptlearngraph.repository.JpaBaselineAssessmentManagementStore;
import com.adaptlearngraph.repository.JpaBaselineBlueprintStore;
import com.adaptlearngraph.repository.Neo4jBaselineJobPositionCatalogAdapter;
import com.adaptlearngraph.services.TransactionalBaselineAssessmentManagementUseCase;
import com.adaptlearngraph.services.BaselineAssessmentDraftService;
import com.adaptlearngraph.services.BaselineAnswerReviewService;
import com.adaptlearngraph.services.BaselineAssessmentManagementService;
import com.adaptlearngraph.services.BaselineBlueprintCapacityService;
import com.adaptlearngraph.services.BaselineJobPositionCatalogService;
import com.adaptlearngraph.services.BaselineBlueprintService;
import com.adaptlearngraph.services.BaselineAssessmentDraftUseCase;
import com.adaptlearngraph.services.BaselineAnswerReviewUseCase;
import com.adaptlearngraph.services.BaselineAssessmentManagementUseCase;
import com.adaptlearngraph.services.BaselineBlueprintCapacityUseCase;
import com.adaptlearngraph.services.BaselineJobPositionCatalogUseCase;
import com.adaptlearngraph.services.BaselineBlueprintUseCase;
import com.adaptlearngraph.repository.BaselineAssessmentDraftStore;
import com.adaptlearngraph.repository.BaselineAnswerReviewAuthorizer;
import com.adaptlearngraph.repository.BaselineAnswerReviewStore;
import com.adaptlearngraph.repository.BaselineAssessmentManagementStore;
import com.adaptlearngraph.repository.BaselineBlueprintStore;
import com.adaptlearngraph.repository.BaselineBlueprintStore.Actor;
import com.adaptlearngraph.repository.BaselineBlueprintStore.ActorPort;
import com.adaptlearngraph.repository.BaselineBlueprintValidationPort;
import com.adaptlearngraph.repository.BaselineJobPositionCatalogPort;
import com.adaptlearngraph.repository.TargetRoleCatalogPort;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.transaction.PlatformTransactionManager;

@Configuration(proxyBeanMethods = false)
@Profile("local & !workspace-baseline & !prod")
@ConditionalOnProperty(prefix = "assessment.baseline.legacy-authoring", name = "enabled", havingValue = "true")
@ConditionalOnProperty(prefix = "catalog.local-actor", name = "enabled", havingValue = "true")
@org.springframework.context.annotation.Import({PersistenceConfiguration.class, ModelMapperConfiguration.class})
public class LocalBaselineBlueprintConfiguration {
    @Bean
    com.adaptlearngraph.helper.ModelMapperRegistrar baselineAuthoringMappings(ObjectMapper objectMapper) {
        return new com.adaptlearngraph.helper.BaselineAuthoringMappings(objectMapper);
    }

    @Bean
    com.adaptlearngraph.services.BaselineBlueprintApplicationService baselineBlueprintApplicationService(
            BaselineBlueprintUseCase blueprints, BaselineAssessmentDraftUseCase drafts,
            ObjectProvider<BaselineAssessmentManagementUseCase> management, org.modelmapper.ModelMapper modelMapper) {
        return new com.adaptlearngraph.services.BaselineBlueprintApplicationService(blueprints, drafts, management, modelMapper);
    }

    @Bean
    @ConditionalOnProperty(
            prefix = "assessment.baseline.jobPosition-catalog", name = "enabled", havingValue = "true")
    com.adaptlearngraph.services.BaselineAssessmentManagementApplicationService baselineAssessmentManagementApplicationService(
            BaselineAssessmentManagementUseCase management, org.modelmapper.ModelMapper modelMapper) {
        return new com.adaptlearngraph.services.BaselineAssessmentManagementApplicationService(management, modelMapper);
    }

    @Bean
    BaselineBlueprintStore baselineBlueprintStore(com.adaptlearngraph.repository.BaselineBlueprintJpaRepository identities,
            com.adaptlearngraph.repository.BaselineBlueprintVersionJpaRepository versions,
            com.adaptlearngraph.repository.BaselineBlueprintRoleJpaRepository roles,
            com.adaptlearngraph.repository.BaselineBlueprintSkillJpaRepository skills) {
        return new JpaBaselineBlueprintStore(identities, versions, roles, skills);
    }

    @Bean
    BaselineAssessmentDraftStore baselineAssessmentDraftStore(com.adaptlearngraph.repository.ItemVersionJpaRepository items,
            com.adaptlearngraph.repository.AssessmentVersionJpaRepository assessments,
            com.adaptlearngraph.repository.AssessmentItemJpaRepository manifests,
            com.adaptlearngraph.repository.BaselineAssessmentSeriesJpaRepository series,
            com.adaptlearngraph.repository.BaselineBlueprintJpaRepository identities,
            com.adaptlearngraph.repository.BaselineBlueprintVersionJpaRepository versions) {
        return new JpaBaselineAssessmentDraftStore(items, assessments, manifests, series, identities, versions);
    }

    @Bean
    BaselineAssessmentManagementStore baselineAssessmentManagementStore(
            com.adaptlearngraph.repository.BaselineAssessmentSeriesJpaRepository series,
            com.adaptlearngraph.repository.BaselineBlueprintWorkingRevisionJpaRepository workings,
            com.adaptlearngraph.repository.BaselineAssessmentTransitionJpaRepository transitions,
            com.adaptlearngraph.repository.BaselineManagementCommandJpaRepository commands,
            com.adaptlearngraph.repository.BaselineBlueprintJpaRepository identities,
            com.adaptlearngraph.repository.PostgresAdvisoryLocks locks, ObjectMapper objectMapper) {
        return new JpaBaselineAssessmentManagementStore(series, workings, transitions, commands, identities, locks,
                objectMapper);
    }

    @Bean
    @ConditionalOnProperty(
            prefix = "assessment.baseline.answer-review", name = "enabled", havingValue = "true")
    BaselineAnswerReviewStore baselineAnswerReviewStore(com.adaptlearngraph.repository.AssessmentVersionJpaRepository assessments,
            com.adaptlearngraph.repository.BaselineAnswerRevealAuditJpaRepository audit) {
        return new JpaBaselineAnswerReviewStore(assessments, audit);
    }

    @Bean
    @ConditionalOnProperty(
            prefix = "assessment.baseline.answer-review", name = "enabled", havingValue = "true")
    BaselineAnswerReviewAuthorizer baselineAnswerReviewAuthorizer() {
        return (actor, assessmentVersionId) -> true;
    }

    @Bean
    @ConditionalOnProperty(
            prefix = "assessment.baseline.answer-review", name = "enabled", havingValue = "true")
    BaselineAnswerReviewUseCase baselineAnswerReviewUseCase(
            ActorPort actor, BaselineAnswerReviewAuthorizer authorizer,
            BaselineAnswerReviewStore store) {
        return new BaselineAnswerReviewService(actor, authorizer, store);
    }

    @Bean
    ActorPort baselineBlueprintActor(LocalEmployeeContextProperties properties) {
        Actor actor = new Actor(
                UUID.fromString(properties.accountId()), properties.organizationId(),
                properties.active(), Set.of("LD_MANAGER"));
        return () -> Optional.of(actor);
    }

    @Bean
    BaselineBlueprintValidationPort baselineBlueprintValidation(
            TargetRoleCatalogPort catalog,
            ObjectProvider<BaselineJobPositionCatalogPort> jobPositionCatalog,
            com.adaptlearngraph.repository.ItemVersionJpaRepository items) {
        return new BaselineBlueprintValidationAdapter(catalog, jobPositionCatalog.getIfAvailable(), items);
    }

    @Bean
    BaselineBlueprintUseCase baselineBlueprintUseCase(
            ActorPort actor, BaselineBlueprintStore store, BaselineBlueprintValidationPort validation) {
        return new BaselineBlueprintService(actor, store, validation);
    }

    @Bean
    BaselineAssessmentDraftUseCase baselineAssessmentDraftUseCase(
            ActorPort actor, BaselineBlueprintStore blueprints, BaselineAssessmentDraftStore drafts) {
        return new BaselineAssessmentDraftService(actor, blueprints, drafts);
    }

    @Bean
    @ConditionalOnProperty(
            prefix = "assessment.baseline.jobPosition-catalog", name = "enabled", havingValue = "true")
    BaselineAssessmentManagementUseCase baselineAssessmentManagementUseCase(
            ActorPort actor,
            BaselineJobPositionCatalogPort catalog,
            BaselineBlueprintStore blueprints,
            BaselineBlueprintValidationPort validation,
            BaselineAssessmentDraftUseCase draftUseCase,
            BaselineAssessmentDraftStore drafts,
            BaselineAssessmentManagementStore management,
            ObjectMapper objectMapper,
            PlatformTransactionManager transactionManager) {
        var service = new BaselineAssessmentManagementService(actor, catalog, blueprints, validation,
                draftUseCase, drafts, management, objectMapper);
        return new TransactionalBaselineAssessmentManagementUseCase(service, transactionManager);
    }

    @Bean
    @ConditionalOnProperty(
            prefix = "assessment.baseline.jobPosition-catalog", name = "enabled", havingValue = "true")
    BaselineJobPositionCatalogPort baselineJobPositionCatalog(org.springframework.data.neo4j.core.Neo4jClient client,
            @org.springframework.beans.factory.annotation.Qualifier(com.adaptlearngraph.constants.TransactionManagers.NEO4J)
            PlatformTransactionManager graphTransactions) {
        return new Neo4jBaselineJobPositionCatalogAdapter(client, graphTransactions);
    }

    @Bean
    @ConditionalOnProperty(
            prefix = "assessment.baseline.jobPosition-catalog", name = "enabled", havingValue = "true")
    BaselineJobPositionCatalogUseCase baselineJobPositionCatalogUseCase(
            ActorPort actor, BaselineJobPositionCatalogPort catalog) {
        return new BaselineJobPositionCatalogService(actor, catalog);
    }

    @Bean
    @ConditionalOnProperty(
            prefix = "assessment.baseline.jobPosition-catalog", name = "enabled", havingValue = "true")
    BaselineBlueprintCapacityUseCase baselineBlueprintCapacityUseCase(
            ActorPort actor,
            BaselineJobPositionCatalogPort catalog,
            BaselineBlueprintValidationPort validation) {
        return new BaselineBlueprintCapacityService(actor, catalog, validation);
    }
}
