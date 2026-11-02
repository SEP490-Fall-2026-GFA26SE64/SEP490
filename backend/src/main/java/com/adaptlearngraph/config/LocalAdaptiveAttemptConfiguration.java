package com.adaptlearngraph.config;

import com.adaptlearngraph.repository.AdaptiveAttemptContentPort;
import com.adaptlearngraph.repository.AdaptiveAttemptContextPort;
import com.adaptlearngraph.repository.AdaptiveAttemptFinalizationPort;
import com.adaptlearngraph.repository.AdaptiveAttemptPolicyPort;
import com.adaptlearngraph.repository.AdaptiveAttemptScoringPort;
import com.adaptlearngraph.repository.AdaptiveAttemptStore;
import com.adaptlearngraph.repository.AdaptiveBaselineCatalogPort;
import com.adaptlearngraph.repository.AdaptiveBlueprintEligibilityPort;
import com.adaptlearngraph.repository.AdaptiveBlueprintStore;
import com.adaptlearngraph.repository.AdaptiveTechnicalVersionPort;
import com.adaptlearngraph.repository.JpaAdaptiveAttemptContent;
import com.adaptlearngraph.repository.JpaAdaptiveAttemptScoring;
import com.adaptlearngraph.repository.JdbcAdaptiveAttemptStore;
import com.adaptlearngraph.repository.LocalAdaptiveAttemptContext;
import com.adaptlearngraph.repository.PinnedAdaptiveAttemptPolicyAdapter;
import com.adaptlearngraph.services.AdaptiveAttemptAnswerService;
import com.adaptlearngraph.services.AdaptiveAttemptSnapshotResolver;
import com.adaptlearngraph.services.AdaptiveAttemptStartService;
import com.adaptlearngraph.repository.JdbcAdaptiveBlueprintEligibilityAdapter;
import com.adaptlearngraph.services.AdaptiveAttemptUseCase.StartRead;
import com.adaptlearngraph.services.AdaptiveAttemptUseCase.Answering;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import java.util.Optional;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.*;
import org.springframework.context.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/** TMP-REQ002-08. Explicit isolated local/demo identity and four default-off gates; never production auth. */
@Configuration(proxyBeanMethods = false)
@Profile("(local | demo) & !prod & !workspace-baseline")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(prefix = "assessment.baseline.adaptive", name = {"enabled", "persistence.enabled", "eligibility.enabled", "attempts.enabled"}, havingValue = "true")
@org.springframework.context.annotation.Import(PersistenceConfiguration.class)
public class LocalAdaptiveAttemptConfiguration {
    @Bean
    AdaptiveAttemptStore adaptiveAttemptStore(DataSource source, ObjectMapper mapper, AdaptiveBlueprintStore blueprints,
            @org.springframework.beans.factory.annotation.Qualifier(com.adaptlearngraph.constants.TransactionManagers.JPA)
            org.springframework.transaction.PlatformTransactionManager transactionManager) {
        return new JdbcAdaptiveAttemptStore(new NamedParameterJdbcTemplate(source), mapper, transactionManager, blueprints);
    }
    @Bean
    AdaptiveAttemptPolicyPort adaptiveAttemptPolicy(AdaptiveTechnicalVersionPort technical) { return new PinnedAdaptiveAttemptPolicyAdapter(technical); }
    @Bean
    AdaptiveAttemptContentPort adaptiveAttemptContent(com.adaptlearngraph.repository.ItemVersionJpaRepository itemVersions, JdbcAdaptiveBlueprintEligibilityAdapter.Properties settings) {
        return new JpaAdaptiveAttemptContent(itemVersions, settings.questionBankId());
    }
    @Bean
    AdaptiveAttemptContextPort adaptiveAttemptContext(DataSource source, AdaptiveBlueprintStore blueprints,
            AdaptiveBlueprintEligibilityPort eligibility, AdaptiveTechnicalVersionPort technical, AdaptiveBaselineCatalogPort catalog,
            JdbcAdaptiveBlueprintEligibilityAdapter.Properties settings,
            @Value("${assessment.baseline.adaptive.attempts.local-employee-id:#{null}}") UUID employeeId) {
        return new LocalAdaptiveAttemptContext(new NamedParameterJdbcTemplate(source), employeeId, settings.organizationId(),
                settings.occupationIds(), catalog, new AdaptiveAttemptSnapshotResolver(blueprints, eligibility, technical));
    }
    @Bean
    StartRead adaptiveAttemptStartRead(AdaptiveAttemptContextPort context, AdaptiveAttemptStore store,
            AdaptiveAttemptPolicyPort policies, AdaptiveAttemptContentPort content) {
        return new AdaptiveAttemptStartService(context, store, policies, content);
    }
    @Bean
    @ConditionalOnProperty(prefix = "assessment.baseline.adaptive.attempts.answers", name = "enabled", havingValue = "true")
    AdaptiveAttemptScoringPort adaptiveAttemptScoring(com.adaptlearngraph.repository.ItemVersionJpaRepository itemVersions, JdbcAdaptiveBlueprintEligibilityAdapter.Properties settings) {
        return new JpaAdaptiveAttemptScoring(itemVersions, settings.questionBankId());
    }
    @Bean
    @ConditionalOnProperty(prefix = "assessment.baseline.adaptive.attempts.answers", name = "enabled", havingValue = "true")
    Answering adaptiveAttemptAnswering(AdaptiveAttemptContextPort context, AdaptiveAttemptStore store, AdaptiveAttemptPolicyPort policies,
            AdaptiveAttemptContentPort content, AdaptiveAttemptScoringPort scoring, ObjectProvider<AdaptiveAttemptFinalizationPort> finalization) {
        return new AdaptiveAttemptAnswerService(context, store, policies, content, scoring, Optional.ofNullable(finalization.getIfAvailable()));
    }
    @Bean
    @Order(0)
    SecurityFilterChain localAdaptiveAttemptSecurity(HttpSecurity http) throws Exception {
        return http.securityMatcher("/api/v1/employee/baseline-attempts/**")
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers(HttpMethod.GET, "/api/v1/employee/baseline-attempts/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/employee/baseline-attempts/**").permitAll().anyRequest().denyAll())
                .csrf(csrf -> csrf.disable()).build();
    }
}
