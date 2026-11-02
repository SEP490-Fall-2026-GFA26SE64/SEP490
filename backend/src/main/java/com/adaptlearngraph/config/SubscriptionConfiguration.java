package com.adaptlearngraph.config;

import com.adaptlearngraph.helper.PayOsPaymentGateway;
import com.adaptlearngraph.jwt.ServletSubscriptionIdentity;
import com.adaptlearngraph.repository.JpaPaymentOrderStore;
import com.adaptlearngraph.repository.JpaPaymentProcessingStore;
import com.adaptlearngraph.repository.JpaSubscriptionPlanStore;
import com.adaptlearngraph.repository.SubscriptionRepositories;
import com.adaptlearngraph.repository.JpaSubscriptionWorkspaceStore;
import com.adaptlearngraph.services.PaymentConfirmationMailWorker;
import com.adaptlearngraph.services.SubscriptionPaymentWorker;
import com.adaptlearngraph.services.RegistrationUseCase;
import com.adaptlearngraph.services.WorkspaceAuthenticationUseCase;
import com.adaptlearngraph.services.SubscriptionCatalogService;
import com.adaptlearngraph.services.SubscriptionLifecycleService;
import com.adaptlearngraph.services.PaymentProcessor;
import com.adaptlearngraph.services.SubscriptionLifecycleUseCase;
import com.adaptlearngraph.helper.PaymentGateway;
import com.adaptlearngraph.repository.PaymentOrderStore;
import com.adaptlearngraph.repository.PaymentProcessingStore;
import com.adaptlearngraph.repository.SubscriptionWorkspaceStore;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import com.adaptlearngraph.services.SubscriptionCatalogUseCase;
import com.adaptlearngraph.repository.SubscriptionIdentity;
import com.adaptlearngraph.repository.SubscriptionPlanStore;
import java.time.Clock;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Configuration(proxyBeanMethods = false)
@Profile("!starter")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@org.springframework.context.annotation.Import(PersistenceConfiguration.class)
public class SubscriptionConfiguration {
    @Bean
    SubscriptionIdentity subscriptionIdentity(RegistrationUseCase registration, WorkspaceAuthenticationUseCase workspace,
            com.adaptlearngraph.entities.IntegrationPolicy policy) {
        return new ServletSubscriptionIdentity(registration, workspace, policy);
    }

    @Bean
    SubscriptionPlanStore subscriptionPlanStore(SubscriptionRepositories data,
            @org.springframework.beans.factory.annotation.Qualifier(com.adaptlearngraph.constants.TransactionManagers.JPA)
            PlatformTransactionManager transactions) {
        return new JpaSubscriptionPlanStore(data.plans(), data.planVersions(), data.audit(), new TransactionTemplate(transactions));
    }

    @Bean
    SubscriptionCatalogUseCase subscriptionCatalog(SubscriptionPlanStore plans, SubscriptionIdentity identity) {
        return new SubscriptionCatalogService(plans, identity, Clock.systemUTC());
    }

    @Bean
    PaymentOrderStore paymentOrders(SubscriptionRepositories data,
            @org.springframework.beans.factory.annotation.Qualifier(com.adaptlearngraph.constants.TransactionManagers.JPA)
            PlatformTransactionManager manager) {
        return new JpaPaymentOrderStore(data,new TransactionTemplate(manager));
    }
    @Bean
    PaymentProcessingStore paymentProcessing(SubscriptionRepositories data,
            @org.springframework.beans.factory.annotation.Qualifier(com.adaptlearngraph.constants.TransactionManagers.JPA)
            PlatformTransactionManager manager,PaymentOrderStore orders,
            com.adaptlearngraph.entities.IntegrationPolicy policy) {
        return new JpaPaymentProcessingStore(data,new TransactionTemplate(manager),orders,policy);
    }
    @Bean
    SubscriptionWorkspaceStore subscriptionWorkspaces(SubscriptionRepositories data,
            @org.springframework.beans.factory.annotation.Qualifier(com.adaptlearngraph.constants.TransactionManagers.JPA)
            PlatformTransactionManager manager,org.springframework.core.env.Environment environment) {
        return new JpaSubscriptionWorkspaceStore(data,new TransactionTemplate(manager),
                com.adaptlearngraph.constants.DevelopmentWorkspace.enabled(environment));
    }
    @Bean(destroyMethod="close")
    @ConditionalOnMissingBean(PaymentGateway.class)
    PayOsPaymentGateway paymentGateway(@Value("${payos.client-id:}") String clientId,@Value("${payos.api-key:}") String key,
            @Value("${payos.checksum-key:}") String checksum,ObjectMapper mapper,
            com.adaptlearngraph.entities.IntegrationPolicy policy) {
        return new PayOsPaymentGateway(policy.payosEnabled() ? clientId : "",
                policy.payosEnabled() ? key : "", policy.payosEnabled() ? checksum : "",mapper);
    }
    @Bean
    PaymentProcessor paymentProcessor(PaymentProcessingStore store,PaymentGateway gateway,
            @Value("${subscription.public-url:http://127.0.0.1:8088}") String publicUrl,
            com.adaptlearngraph.entities.IntegrationPolicy policy) {
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
            com.adaptlearngraph.entities.IntegrationPolicy policy) {
        return new SubscriptionLifecycleService(identity,orders,processing,workspaces,gateway,Clock.systemUTC(),policy);
    }
    @Bean
    @ConditionalOnProperty(name="subscription.worker.enabled",havingValue="true",matchIfMissing=true)
    SubscriptionPaymentWorker subscriptionWorker(PaymentProcessor processor,PaymentProcessingStore processing) {
        return new SubscriptionPaymentWorker(processor,processing,Clock.systemUTC());
    }

    @Bean
    @ConditionalOnProperty(name="subscription.worker.enabled",havingValue="true",matchIfMissing=true)
    PaymentConfirmationMailWorker paymentConfirmationMailWorker(SubscriptionRepositories data,
            @org.springframework.beans.factory.annotation.Qualifier(com.adaptlearngraph.constants.TransactionManagers.JPA) PlatformTransactionManager manager,
            com.adaptlearngraph.helper.TransactionalMailSender mail,
            @Value("${subscription.public-url:http://127.0.0.1:8088}") String publicUrl) {
        return new PaymentConfirmationMailWorker(data.jobs(), data.outbox(), data.orders(), new TransactionTemplate(manager), mail,
                Clock.systemUTC(), publicUrl);
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
