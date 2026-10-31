package com.adaptlearngraph.identity.infrastructure;

import com.adaptlearngraph.identity.application.WorkspaceAuthenticationService;
import com.adaptlearngraph.identity.application.port.in.RegistrationUseCase;
import com.adaptlearngraph.identity.application.port.in.WorkspaceAuthenticationUseCase;
import com.adaptlearngraph.identity.application.port.out.RegistrationSecrets;
import com.adaptlearngraph.identity.application.port.out.RegistrationStore;
import com.adaptlearngraph.identity.application.port.out.WorkspaceIdentityStore;
import java.time.Clock;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration(proxyBeanMethods = false)
@Profile("!starter")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class WorkspaceAuthenticationConfiguration {
    @Bean
    WorkspaceIdentityStore workspaceIdentityStore(JdbcTemplate jdbc, RegistrationStore security) {
        return new JdbcWorkspaceIdentityStore(jdbc, security);
    }

    @Bean
    com.adaptlearngraph.identity.application.port.in.MemberActivationUseCase memberActivation(JdbcTemplate jdbc,
            org.springframework.transaction.PlatformTransactionManager manager,
            com.adaptlearngraph.subscription.application.port.out.SubscriptionIdentity identity,
            com.adaptlearngraph.subscription.application.port.out.SubscriptionWorkspaceStore workspaces,
            RegistrationSecrets secrets,RegistrationStore security,RegistrationMailDelivery mail) {
        return new JdbcMemberActivationAdapter(jdbc,new org.springframework.transaction.support.TransactionTemplate(manager),
                identity,workspaces,secrets,security,mail,Clock.systemUTC());
    }
    @Bean
    @org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name="registration.mail-worker.enabled",havingValue="true",matchIfMissing=true)
    MemberActivationMailWorker activationMailWorker(JdbcTemplate jdbc,org.springframework.transaction.PlatformTransactionManager manager,
            RegistrationSecrets secrets,RegistrationMailDelivery mail,@org.springframework.beans.factory.annotation.Value("${subscription.public-url:http://127.0.0.1:8088}") String publicUrl) {
        return new MemberActivationMailWorker(jdbc,new org.springframework.transaction.support.TransactionTemplate(manager),secrets,mail,Clock.systemUTC(),publicUrl);
    }

    @Bean
    WorkspaceAuthenticationUseCase workspaceAuthentication(WorkspaceIdentityStore identities, RegistrationStore security,
            RegistrationSecrets secrets, RegistrationUseCase registration,
            com.adaptlearngraph.shared.domain.IntegrationPolicy policy) {
        return new WorkspaceAuthenticationService(identities, security, secrets, registration, Clock.systemUTC(), policy);
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
