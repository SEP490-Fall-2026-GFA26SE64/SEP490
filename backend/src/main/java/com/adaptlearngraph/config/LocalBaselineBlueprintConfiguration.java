package com.adaptlearngraph.config;

import com.adaptlearngraph.repository.BaselineBlueprintValidationAdapter;
import com.adaptlearngraph.repository.JpaBaselineAnswerReviewStore;
import com.adaptlearngraph.repository.JpaBaselineAssessmentDraftStore;
import com.adaptlearngraph.repository.JpaBaselineAssessmentManagementStore;
import com.adaptlearngraph.repository.JpaBaselineBlueprintStore;
import com.adaptlearngraph.repository.Neo4jBaselineOccupationCatalogAdapter;
import com.adaptlearngraph.services.TransactionalBaselineAssessmentManagementUseCase;
import com.adaptlearngraph.services.BaselineAssessmentDraftService;
import com.adaptlearngraph.services.BaselineAnswerReviewService;
import com.adaptlearngraph.services.BaselineAssessmentManagementService;
import com.adaptlearngraph.services.BaselineBlueprintCapacityService;
import com.adaptlearngraph.services.BaselineOccupationCatalogService;
import com.adaptlearngraph.services.BaselineBlueprintService;
import com.adaptlearngraph.services.BaselineAssessmentDraftUseCase;
import com.adaptlearngraph.services.BaselineAnswerReviewUseCase;
import com.adaptlearngraph.services.BaselineAssessmentManagementUseCase;
import com.adaptlearngraph.services.BaselineBlueprintCapacityUseCase;
import com.adaptlearngraph.services.BaselineOccupationCatalogUseCase;
import com.adaptlearngraph.services.BaselineBlueprintUseCase;
import com.adaptlearngraph.repository.BaselineAssessmentDraftStore;
import com.adaptlearngraph.repository.BaselineAnswerReviewAuthorizer;
import com.adaptlearngraph.repository.BaselineAnswerReviewStore;
import com.adaptlearngraph.repository.BaselineAssessmentManagementStore;
import com.adaptlearngraph.repository.BaselineBlueprintStore;
import com.adaptlearngraph.repository.BaselineBlueprintStore.Actor;
import com.adaptlearngraph.repository.BaselineBlueprintStore.ActorPort;
import com.adaptlearngraph.repository.BaselineBlueprintValidationPort;
import com.adaptlearngraph.repository.BaselineOccupationCatalogPort;
import com.adaptlearngraph.repository.TargetRoleCatalogPort;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.neo4j.driver.Driver;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.transaction.PlatformTransactionManager;

@Configuration(proxyBeanMethods = false)
@Profile("local")
@ConditionalOnProperty(prefix = "assessment.baseline.legacy-authoring", name = "enabled", havingValue = "true")
@ConditionalOnProperty(prefix = "catalog.local-actor", name = "enabled", havingValue = "true")
@org.springframework.context.annotation.Import(PersistenceConfiguration.class)
public class LocalBaselineBlueprintConfiguration {
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
            ObjectProvider<BaselineOccupationCatalogPort> occupationCatalog,
            com.adaptlearngraph.repository.ItemVersionJpaRepository items) {
        return new BaselineBlueprintValidationAdapter(catalog, occupationCatalog.getIfAvailable(), items);
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
            prefix = "assessment.baseline.occupation-catalog", name = "enabled", havingValue = "true")
    BaselineAssessmentManagementUseCase baselineAssessmentManagementUseCase(
            ActorPort actor,
            BaselineOccupationCatalogPort catalog,
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
            prefix = "assessment.baseline.occupation-catalog", name = "enabled", havingValue = "true")
    BaselineOccupationCatalogPort baselineOccupationCatalog(Driver driver) {
        return new Neo4jBaselineOccupationCatalogAdapter(driver);
    }

    @Bean
    @ConditionalOnProperty(
            prefix = "assessment.baseline.occupation-catalog", name = "enabled", havingValue = "true")
    BaselineOccupationCatalogUseCase baselineOccupationCatalogUseCase(
            ActorPort actor, BaselineOccupationCatalogPort catalog) {
        return new BaselineOccupationCatalogService(actor, catalog);
    }

    @Bean
    @ConditionalOnProperty(
            prefix = "assessment.baseline.occupation-catalog", name = "enabled", havingValue = "true")
    BaselineBlueprintCapacityUseCase baselineBlueprintCapacityUseCase(
            ActorPort actor,
            BaselineOccupationCatalogPort catalog,
            BaselineBlueprintValidationPort validation) {
        return new BaselineBlueprintCapacityService(actor, catalog, validation);
    }
}
