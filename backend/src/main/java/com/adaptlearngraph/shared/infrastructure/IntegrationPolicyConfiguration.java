package com.adaptlearngraph.shared.infrastructure;

import com.adaptlearngraph.shared.domain.IntegrationPolicy;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;

@Configuration(proxyBeanMethods = false)
public class IntegrationPolicyConfiguration {
    @Bean
    IntegrationPolicy integrationPolicy(
            @Value("${payos.enabled:true}") boolean payos,
            @Value("${registration.email-verification-enabled:true}") boolean email,
            @Value("${registration.mfa-enabled:true}") boolean mfa,
            Environment environment) {
        var policy = new IntegrationPolicy(payos, email, mfa);
        policy.requireAllowedEnvironment(environment.acceptsProfiles(Profiles.of("local", "dev")),
                environment.acceptsProfiles(Profiles.of("prod", "production")));
        if (!policy.equals(IntegrationPolicy.ENABLED)) {
            LoggerFactory.getLogger(getClass()).warn(
                    "DEVELOPMENT ONLY: PayOS enabled={}, email verification enabled={}, MFA enabled={}", payos, email, mfa);
        }
        return policy;
    }
}
