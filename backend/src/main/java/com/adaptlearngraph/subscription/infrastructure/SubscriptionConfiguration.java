package com.adaptlearngraph.subscription.infrastructure;

import com.adaptlearngraph.identity.application.port.in.RegistrationUseCase;
import com.adaptlearngraph.identity.application.port.in.WorkspaceAuthenticationUseCase;
import com.adaptlearngraph.subscription.application.SubscriptionCatalogService;
import com.adaptlearngraph.subscription.application.SubscriptionLifecycleService;
import com.adaptlearngraph.subscription.application.PaymentProcessor;
import com.adaptlearngraph.subscription.application.port.in.SubscriptionLifecycleUseCase;
import com.adaptlearngraph.subscription.application.port.out.PaymentGateway;
import com.adaptlearngraph.subscription.application.port.out.PaymentOrderStore;
import com.adaptlearngraph.subscription.application.port.out.PaymentProcessingStore;
import com.adaptlearngraph.subscription.application.port.out.SubscriptionWorkspaceStore;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import com.adaptlearngraph.subscription.application.port.in.SubscriptionCatalogUseCase;
import com.adaptlearngraph.subscription.application.port.out.SubscriptionIdentity;
import com.adaptlearngraph.subscription.application.port.out.SubscriptionPlanStore;
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
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Configuration(proxyBeanMethods = false)
@Profile("!starter")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class SubscriptionConfiguration {
    @Bean
    SubscriptionIdentity subscriptionIdentity(RegistrationUseCase registration, WorkspaceAuthenticationUseCase workspace,
            com.adaptlearngraph.shared.domain.IntegrationPolicy policy) {
        return new ServletSubscriptionIdentity(registration, workspace, policy);
    }

    @Bean
    SubscriptionPlanStore subscriptionPlanStore(JdbcTemplate jdbc, PlatformTransactionManager transactions) {
        return new JdbcSubscriptionPlanStore(jdbc, new TransactionTemplate(transactions));
    }

    @Bean
    SubscriptionCatalogUseCase subscriptionCatalog(SubscriptionPlanStore plans, SubscriptionIdentity identity) {
        return new SubscriptionCatalogService(plans, identity, Clock.systemUTC());
    }

    @Bean
    PaymentOrderStore paymentOrders(JdbcTemplate jdbc, PlatformTransactionManager manager) {
        return new JdbcPaymentOrderStore(jdbc,new TransactionTemplate(manager));
    }
    @Bean
    PaymentProcessingStore paymentProcessing(JdbcTemplate jdbc,PlatformTransactionManager manager,PaymentOrderStore orders,
            com.adaptlearngraph.shared.domain.IntegrationPolicy policy) {
        return new JdbcPaymentProcessingStore(jdbc,new TransactionTemplate(manager),orders,policy);
    }
    @Bean
    SubscriptionWorkspaceStore subscriptionWorkspaces(JdbcTemplate jdbc,PlatformTransactionManager manager,org.springframework.core.env.Environment environment) {
        return new JdbcSubscriptionWorkspaceStore(jdbc,new TransactionTemplate(manager),
                com.adaptlearngraph.shared.infrastructure.DevelopmentWorkspace.enabled(environment));
    }
    @Bean(destroyMethod="close")
    @ConditionalOnMissingBean(PaymentGateway.class)
    PayOsPaymentGateway paymentGateway(@Value("${payos.client-id:}") String clientId,@Value("${payos.api-key:}") String key,
            @Value("${payos.checksum-key:}") String checksum,ObjectMapper mapper,
            com.adaptlearngraph.shared.domain.IntegrationPolicy policy) {
        return new PayOsPaymentGateway(policy.payosEnabled() ? clientId : "",
                policy.payosEnabled() ? key : "", policy.payosEnabled() ? checksum : "",mapper);
    }
    @Bean
    PaymentProcessor paymentProcessor(PaymentProcessingStore store,PaymentGateway gateway,
            @Value("${subscription.public-url:http://127.0.0.1:8088}") String publicUrl,
            com.adaptlearngraph.shared.domain.IntegrationPolicy policy) {
        var uri=java.net.URI.create(publicUrl);
        if(uri.getHost()==null || uri.getUserInfo()!=null || uri.getQuery()!=null || uri.getFragment()!=null
                || !("https".equals(uri.getScheme()) || ("http".equals(uri.getScheme())
                && java.util.Set.of("127.0.0.1","localhost").contains(uri.getHost())))) {
            throw new IllegalArgumentException("Subscription public URL must use HTTPS or loopback HTTP.");
        }
        return new PaymentProcessor(store,gateway,Clock.systemUTC(),publicUrl,policy);
    }
    @Bean
    SubscriptionLifecycleUseCase subscriptionLifecycle(SubscriptionIdentity identity,PaymentOrderStore orders,
            PaymentProcessingStore processing,SubscriptionWorkspaceStore workspaces,PaymentGateway gateway,
            com.adaptlearngraph.shared.domain.IntegrationPolicy policy) {
        return new SubscriptionLifecycleService(identity,orders,processing,workspaces,gateway,Clock.systemUTC(),policy);
    }
    @Bean
    @ConditionalOnProperty(name="subscription.worker.enabled",havingValue="true",matchIfMissing=true)
    SubscriptionPaymentWorker subscriptionWorker(PaymentProcessor processor,PaymentProcessingStore processing) {
        return new SubscriptionPaymentWorker(processor,processing,Clock.systemUTC());
    }

    @Bean
    @ConditionalOnProperty(name="subscription.worker.enabled",havingValue="true",matchIfMissing=true)
    PaymentConfirmationMailWorker paymentConfirmationMailWorker(JdbcTemplate jdbc, PlatformTransactionManager manager,
            com.adaptlearngraph.shared.infrastructure.mail.TransactionalMailSender mail,
            @Value("${subscription.public-url:http://127.0.0.1:8088}") String publicUrl) {
        return new PaymentConfirmationMailWorker(jdbc, new TransactionTemplate(manager), mail, Clock.systemUTC(), publicUrl);
    }

    @Bean
    @Order(-9)
    SecurityFilterChain subscriptionPlanSecurity(HttpSecurity http) throws Exception {
        return http.securityMatcher("/api/v1/registration/subscription/**",
                        "/api/v1/platform/subscription-plans", "/api/v1/platform/subscription-plans/*",
                        "/api/v1/organizations/*/subscription","/api/v1/organizations/*/subscription/**",
                        "/api/v1/subscription/**","/api/v1/platform/workspaces","/api/v1/platform/workspaces/*/suspension",
                        "/api/v1/payments/payos/webhook")
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers(HttpMethod.GET,"/api/v1/registration/subscription/**","/api/v1/platform/subscription-plans",
                                "/api/v1/organizations/*/subscription","/api/v1/organizations/*/subscription/**",
                                "/api/v1/subscription/**","/api/v1/platform/workspaces").permitAll()
                        .requestMatchers(HttpMethod.POST,"/api/v1/registration/subscription/**","/api/v1/organizations/*/subscription/**",
                                "/api/v1/subscription/**","/api/v1/payments/payos/webhook").permitAll()
                        .requestMatchers(HttpMethod.PUT, "/api/v1/platform/subscription-plans/*",
                                "/api/v1/platform/workspaces/*/suspension","/api/v1/organizations/*/subscription/members/*",
                                "/api/v1/organizations/*/subscription/members/*/profile").permitAll()
                        .anyRequest().denyAll())
                .csrf(csrf->csrf.ignoringRequestMatchers("/api/v1/payments/payos/webhook"))
                .exceptionHandling(exceptions -> exceptions.accessDeniedHandler((request, response, exception) -> {
                    response.setStatus(403);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"code\":\"FORBIDDEN\",\"message\":\"Refresh the page and retry with a valid CSRF token.\"}");
                }))
                .build();
    }
}
