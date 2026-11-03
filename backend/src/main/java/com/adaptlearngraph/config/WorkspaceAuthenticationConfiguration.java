package com.adaptlearngraph.config;

import com.adaptlearngraph.helper.RegistrationMailDelivery;
import com.adaptlearngraph.repository.JpaMemberActivationAdapter;
import com.adaptlearngraph.repository.JpaWorkspaceIdentityStore;
import com.adaptlearngraph.services.MemberActivationMailWorker;
import com.adaptlearngraph.services.WorkspaceAuthenticationService;
import com.adaptlearngraph.services.RegistrationUseCase;
import com.adaptlearngraph.services.WorkspaceAuthenticationUseCase;
import com.adaptlearngraph.repository.RegistrationSecrets;
import com.adaptlearngraph.repository.RegistrationStore;
import com.adaptlearngraph.repository.WorkspaceIdentityStore;
import java.time.Clock;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration(proxyBeanMethods = false)
@Profile("!starter")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@org.springframework.context.annotation.Import(PersistenceConfiguration.class)
public class WorkspaceAuthenticationConfiguration {
    @Bean
    WorkspaceIdentityStore workspaceIdentityStore(com.adaptlearngraph.repository.AccountJpaRepository accounts,
            com.adaptlearngraph.repository.OrganizationMembershipRoleJpaRepository roles,
            com.adaptlearngraph.repository.PlatformAdministratorJpaRepository platformAdministrators,
            com.adaptlearngraph.repository.OrganizationRegistrationJpaRepository registrations,
            com.adaptlearngraph.repository.WorkspaceAccountProfileJpaRepository profiles, RegistrationStore security) {
        return new JpaWorkspaceIdentityStore(accounts, roles, platformAdministrators, registrations, profiles, security);
    }

    @Bean
    JpaMemberActivationAdapter.Repositories memberActivationRepositories(
            com.adaptlearngraph.repository.OrganizationJpaRepository organizations,
            com.adaptlearngraph.repository.WorkspaceActivationJpaRepository activations,
            com.adaptlearngraph.repository.DepartmentReferenceJpaRepository references,
            com.adaptlearngraph.repository.AccountJpaRepository accounts,
            com.adaptlearngraph.repository.WorkspaceAccountProfileJpaRepository profiles,
            com.adaptlearngraph.repository.OrganizationMembershipJpaRepository memberships,
            com.adaptlearngraph.repository.OrganizationMembershipRoleJpaRepository roles,
            com.adaptlearngraph.repository.LearnerStateJpaRepository learners,
            com.adaptlearngraph.repository.OutboxEventJpaRepository outbox,
            com.adaptlearngraph.repository.ProcessingJobJpaRepository jobs) {
        return new JpaMemberActivationAdapter.Repositories(organizations, activations, references, accounts, profiles,
                memberships, roles, learners, outbox, jobs);
    }

    @Bean
    com.adaptlearngraph.services.MemberActivationUseCase memberActivation(JpaMemberActivationAdapter.Repositories repositories,
            @org.springframework.beans.factory.annotation.Qualifier(com.adaptlearngraph.constants.TransactionManagers.JPA)
            org.springframework.transaction.PlatformTransactionManager manager,
            com.adaptlearngraph.repository.SubscriptionIdentity identity,
            com.adaptlearngraph.repository.SubscriptionWorkspaceStore workspaces,
            RegistrationSecrets secrets,RegistrationStore security,RegistrationMailDelivery mail) {
        return new JpaMemberActivationAdapter(repositories,new org.springframework.transaction.support.TransactionTemplate(manager),
                identity,workspaces,secrets,security,mail,Clock.systemUTC());
    }
    @Bean
    @org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name="registration.mail-worker.enabled",havingValue="true",matchIfMissing=true)
    MemberActivationMailWorker activationMailWorker(com.adaptlearngraph.repository.ProcessingJobJpaRepository jobs,
            com.adaptlearngraph.repository.WorkspaceActivationJpaRepository activations,
            @org.springframework.beans.factory.annotation.Qualifier(com.adaptlearngraph.constants.TransactionManagers.JPA)
            org.springframework.transaction.PlatformTransactionManager manager,
            RegistrationSecrets secrets,RegistrationMailDelivery mail,@org.springframework.beans.factory.annotation.Value("${subscription.public-url:http://127.0.0.1:8088}") String publicUrl) {
        return new MemberActivationMailWorker(jobs,activations,new org.springframework.transaction.support.TransactionTemplate(manager),secrets,mail,Clock.systemUTC(),publicUrl);
    }

    @Bean
    WorkspaceAuthenticationUseCase workspaceAuthentication(WorkspaceIdentityStore identities, RegistrationStore security,
            RegistrationSecrets secrets, RegistrationUseCase registration,
            com.adaptlearngraph.entities.domain.IntegrationPolicy policy) {
        return new WorkspaceAuthenticationService(identities, security, secrets, registration, Clock.systemUTC(), policy);
    }

    @Bean
    com.adaptlearngraph.services.RegistrationWorkspaceEntryService registrationWorkspaceEntry(
            WorkspaceAuthenticationUseCase authentication) {
        return new com.adaptlearngraph.services.RegistrationWorkspaceEntryService(authentication);
    }

    @Bean
    @Order(-10)
    SecurityFilterChain workspaceAuthenticationSecurity(HttpSecurity http) throws Exception {
        return http.securityMatcher("/api/v1/workspace-auth/**")
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers(HttpMethod.GET, "/api/v1/workspace-auth/csrf", "/api/v1/workspace-auth/current").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/workspace-auth/sign-in", "/api/v1/workspace-auth/sign-out",
                                "/api/v1/workspace-auth/totp/verify", "/api/v1/workspace-auth/totp/setup",
                                "/api/v1/workspace-auth/totp/confirm", "/api/v1/workspace-auth/recovery",
                                "/api/v1/workspace-auth/activate").permitAll()
                        .anyRequest().denyAll())
                .exceptionHandling(exceptions -> exceptions.accessDeniedHandler((request, response, exception) -> {
                    response.setStatus(403);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"code\":\"FORBIDDEN\",\"message\":\"Refresh the page and retry with a valid CSRF token.\"}");
                }))
                .build();
    }
}
