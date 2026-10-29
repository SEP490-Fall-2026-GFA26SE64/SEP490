package com.adaptlearngraph.pathway.infrastructure;

import org.springframework.boot.autoconfigure.condition.*;
import org.springframework.context.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

/** Route authentication substitute only. Every use case separately enforces trusted actor/tenant/assignment. */
@Configuration(proxyBeanMethods=false)
@Profile("local-baseline-demo & !workspace-baseline & !prod")
@ConditionalOnWebApplication(type=ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(name={"pathway.initial.enabled","pathway.local-auth-bypass.enabled","assessment.baseline.local-demo.enabled"},havingValue="true")
public class InitialPathwaySecurity {
    private static final String[] COMMANDS={"/api/v1/employee/initial-pathway-requests","/api/v1/expert/initial-pathways/*/inclusions",
            "/api/v1/expert/initial-pathways/*/exclusions","/api/v1/expert/initial-pathways/*/confirmation"};
    @Bean @Order(-2) SecurityFilterChain initialPathwayFilterChain(HttpSecurity http)throws Exception {
        return http.securityMatcher("/api/v1/employee/role-gaps","/api/v1/employee/initial-pathway-requests","/api/v1/employee/initial-pathway-requests/*",
                "/api/v1/employee/pathway","/api/v1/employee/pathways/*","/api/v1/expert/initial-pathways","/api/v1/expert/initial-pathways/**")
            .authorizeHttpRequests(a->a.requestMatchers(HttpMethod.GET,"/api/v1/employee/role-gaps","/api/v1/employee/initial-pathway-requests/*",
                    "/api/v1/employee/pathway","/api/v1/employee/pathways/*","/api/v1/expert/initial-pathways","/api/v1/expert/initial-pathways/*",
                    "/api/v1/expert/initial-pathways/*/validation").permitAll().requestMatchers(HttpMethod.POST,COMMANDS).permitAll().anyRequest().denyAll())
            .csrf(c->c.ignoringRequestMatchers(COMMANDS)).build();
    }
}
