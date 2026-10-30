package com.adaptlearngraph.identity.infrastructure;

import com.adaptlearngraph.identity.application.RegistrationService;
import com.adaptlearngraph.identity.application.port.in.RegistrationUseCase;
import com.adaptlearngraph.identity.application.port.out.RegistrationSecrets;
import com.adaptlearngraph.identity.application.port.out.RegistrationStore;
import java.time.Clock;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.session.web.http.CookieSerializer;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.context.annotation.Profile;
import org.springframework.transaction.support.TransactionTemplate;

@Configuration(proxyBeanMethods = false)
@Profile("!starter")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@EnableScheduling
@org.springframework.context.annotation.Import(com.adaptlearngraph.shared.infrastructure.IntegrationPolicyConfiguration.class)
public class RegistrationConfiguration {
    @Bean
    RegistrationSecrets registrationSecrets(
            @Value("${registration.encryption-key:}") String encryptionKey,
            @Value("${registration.hmac-key:}") String hmacKey) {
        return new RegistrationCryptography(encryptionKey, hmacKey);
    }

    @Bean
    RegistrationStore registrationStore(JdbcTemplate jdbc, PlatformTransactionManager manager) {
        return new JdbcRegistrationStore(jdbc, new TransactionTemplate(manager));
    }

    @Bean
    com.adaptlearngraph.shared.infrastructure.mail.TransactionalMailSender transactionalMailSender(ObjectProvider<JavaMailSender> sender,
            @Value("${registration.mail-from:}") String from,
            @Value("${spring.mail.host:}") String host) {
        return new com.adaptlearngraph.shared.infrastructure.mail.TransactionalMailSender(sender, from, host);
    }

    @Bean
    RegistrationMailDelivery registrationDelivery(com.adaptlearngraph.shared.infrastructure.mail.TransactionalMailSender mail) {
        return new RegistrationMailDelivery(mail);
    }

    @Bean
    RegistrationUseCase registrationUseCase(RegistrationStore store, RegistrationSecrets secrets,
                                           RegistrationMailDelivery delivery,
                                           com.adaptlearngraph.shared.domain.IntegrationPolicy policy) {
        return new RegistrationService(store, secrets, delivery, Clock.systemUTC(), policy);
    }

    @Bean
    @ConditionalOnProperty(name = {"registration.mail-worker.enabled", "registration.email-verification-enabled"},
            havingValue = "true", matchIfMissing = true)
    RegistrationMailWorker registrationMailWorker(JdbcTemplate jdbc, RegistrationStore store,
            RegistrationSecrets secrets, RegistrationMailDelivery delivery) {
        return new RegistrationMailWorker(jdbc, store, secrets, delivery, Clock.systemUTC());
    }

    @Bean
    CookieSerializer registrationCookieSerializer(@Value("${registration.cookie-secure:true}") boolean secure) {
        return new ScopedSessionCookieSerializer(secure);
    }

    @Bean
    @Order(0)
    SecurityFilterChain registrationSecurity(HttpSecurity http) throws Exception {
        return http.securityMatcher("/api/v1/registration", "/api/v1/registration/**")
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers(HttpMethod.GET, "/api/v1/registration/csrf", "/api/v1/registration/current").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/registration", "/api/v1/registration/sign-in",
                                "/api/v1/registration/sign-out", "/api/v1/registration/email/resend",
                                "/api/v1/registration/email/verify", "/api/v1/registration/totp/setup",
                                "/api/v1/registration/totp/confirm", "/api/v1/registration/totp/verify",
                                "/api/v1/registration/recovery", "/api/v1/registration/workspace-session").permitAll()
                        .anyRequest().denyAll())
                .exceptionHandling(exceptions -> exceptions.accessDeniedHandler((request, response, exception) -> {
                    response.setStatus(403);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"code\":\"FORBIDDEN\",\"message\":\"Refresh the page and retry with a valid CSRF token.\"}");
                }))
                .build();
    }
}
