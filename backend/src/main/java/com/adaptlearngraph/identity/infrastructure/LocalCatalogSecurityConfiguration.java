package com.adaptlearngraph.identity.infrastructure;

import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;

@Configuration(proxyBeanMethods = false)
@Profile("local")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class LocalCatalogSecurityConfiguration {

    @Bean
    @Order(1)
    SecurityFilterChain localTargetRoleSecurity(HttpSecurity http) throws Exception {
        return http
                .securityMatcher(
                        "/api/v1/employee/target-roles",
                        "/api/v1/employee/target-roles/**",
                        "/api/v1/employee/target-role-selection",
                        "/api/v1/employee/target-role-selection/**",
                        "/api/v1/ld/baseline-blueprint-catalog/occupations",
                        "/api/v1/ld/baseline-blueprint-catalog/occupations/**",
                        "/api/v1/ld/baseline-blueprints",
                        "/api/v1/ld/baseline-blueprints/**",
                        "/api/v1/ld/baseline-assessments",
                        "/api/v1/ld/baseline-assessments/**")
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers(HttpMethod.GET,
                                "/api/v1/employee/target-roles",
                                "/api/v1/employee/target-roles/**",
                                "/api/v1/employee/target-role-selection",
                                "/api/v1/employee/target-role-selection/**")
                        .permitAll()
                        .requestMatchers(HttpMethod.PUT,
                                "/api/v1/employee/target-role-selection")
                        .permitAll()
                        .requestMatchers(HttpMethod.GET,
                                "/api/v1/ld/baseline-blueprint-catalog/occupations",
                                "/api/v1/ld/baseline-blueprint-catalog/occupations/**",
                                "/api/v1/ld/baseline-blueprints/**",
                                "/api/v1/ld/baseline-assessments",
                                "/api/v1/ld/baseline-assessments/**")
                        .permitAll()
                        .requestMatchers(HttpMethod.POST,
                                "/api/v1/ld/baseline-blueprints",
                                "/api/v1/ld/baseline-blueprints/**",
                                "/api/v1/ld/baseline-assessments/**")
                        .permitAll()
                        .requestMatchers(HttpMethod.PUT,
                                "/api/v1/ld/baseline-blueprints/**",
                                "/api/v1/ld/baseline-assessments/**")
                        .permitAll()
                        .anyRequest().denyAll())
                .csrf(csrf -> csrf.ignoringRequestMatchers(
                        "/api/v1/employee/target-role-selection",
                        "/api/v1/ld/baseline-blueprints",
                        "/api/v1/ld/baseline-blueprints/**",
                        "/api/v1/ld/baseline-assessments/**"))
                .build();
    }

    @Bean
    @Order(2)
    SecurityFilterChain localOrganizationManagementSecurity(HttpSecurity http) throws Exception {
        return http
                .securityMatcher("/api/v1/organizations/**", "/error")
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers("/api/v1/organizations/**", "/error").permitAll()
                        .anyRequest().denyAll())
                .build();
    }
}
