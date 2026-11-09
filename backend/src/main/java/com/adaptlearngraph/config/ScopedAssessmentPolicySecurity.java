package com.adaptlearngraph.config;

import com.adaptlearngraph.endpoints.ApiEndpoints;
import org.springframework.boot.autoconfigure.condition.*;
import org.springframework.context.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

/** Exact configuration routes retain session CSRF; the service checks trusted tenant membership and purpose ownership. */
@Configuration(proxyBeanMethods=false)
@Profile("local & workspace-baseline & !local-baseline-demo & !prod")
@ConditionalOnWebApplication(type=ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(name="assessment.baseline.workspace.enabled",havingValue="true")
public class ScopedAssessmentPolicySecurity {
    @Bean @Order(-12)
    SecurityFilterChain scopedAssessmentPolicyFilterChain(HttpSecurity http) throws Exception {
        return http.securityMatcher(ApiEndpoints.SCOPED_ASSESSMENT_POLICY+"/**")
                .authorizeHttpRequests(auth->auth.anyRequest().permitAll()).build();
    }
}
