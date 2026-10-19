package com.adaptlearngraph.assessment.infrastructure;

import com.adaptlearngraph.assessment.application.BaselineAssessmentDraftService;
import com.adaptlearngraph.assessment.application.BaselineAnswerReviewService;
import com.adaptlearngraph.assessment.application.BaselineAssessmentManagementService;
import com.adaptlearngraph.assessment.application.BaselineBlueprintCapacityService;
import com.adaptlearngraph.assessment.application.BaselineOccupationCatalogService;
import com.adaptlearngraph.assessment.application.BaselineBlueprintService;
import com.adaptlearngraph.assessment.application.port.in.BaselineAssessmentDraftUseCase;
import com.adaptlearngraph.assessment.application.port.in.BaselineAnswerReviewUseCase;
import com.adaptlearngraph.assessment.application.port.in.BaselineAssessmentManagementUseCase;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintCapacityUseCase;
import com.adaptlearngraph.assessment.application.port.in.BaselineOccupationCatalogUseCase;
import com.adaptlearngraph.assessment.application.port.in.BaselineBlueprintUseCase;
import com.adaptlearngraph.assessment.application.port.out.BaselineAssessmentDraftStore;
import com.adaptlearngraph.assessment.application.port.out.BaselineAnswerReviewAuthorizer;
import com.adaptlearngraph.assessment.application.port.out.BaselineAnswerReviewStore;
import com.adaptlearngraph.assessment.application.port.out.BaselineAssessmentManagementStore;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintStore;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintStore.Actor;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintStore.ActorPort;
import com.adaptlearngraph.assessment.application.port.out.BaselineBlueprintValidationPort;
import com.adaptlearngraph.assessment.application.port.out.BaselineOccupationCatalogPort;
import com.adaptlearngraph.catalog.application.port.out.TargetRoleCatalogPort;
import com.adaptlearngraph.catalog.infrastructure.LocalEmployeeContextProperties;
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
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;

@Configuration(proxyBeanMethods = false)
@Profile("local")
@ConditionalOnProperty(prefix = "catalog.local-actor", name = "enabled", havingValue = "true")
public class LocalBaselineBlueprintConfiguration {
    @Bean
    BaselineBlueprintStore baselineBlueprintStore(NamedParameterJdbcTemplate jdbc) {
        return new JdbcBaselineBlueprintStore(jdbc);
    }

    @Bean
    BaselineAssessmentDraftStore baselineAssessmentDraftStore(NamedParameterJdbcTemplate jdbc) {
        return new JdbcBaselineAssessmentDraftStore(jdbc);
    }

    @Bean
    BaselineAssessmentManagementStore baselineAssessmentManagementStore(
            NamedParameterJdbcTemplate jdbc, ObjectMapper objectMapper) {
        return new JdbcBaselineAssessmentManagementStore(jdbc, objectMapper);
    }

    @Bean
    @ConditionalOnProperty(
            prefix = "assessment.baseline.answer-review", name = "enabled", havingValue = "true")
    BaselineAnswerReviewStore baselineAnswerReviewStore(NamedParameterJdbcTemplate jdbc) {
        return new JdbcBaselineAnswerReviewStore(jdbc);
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
            NamedParameterJdbcTemplate jdbc) {
        return new BaselineBlueprintValidationAdapter(catalog, occupationCatalog.getIfAvailable(), jdbc);
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
