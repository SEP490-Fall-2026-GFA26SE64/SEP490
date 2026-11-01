package com.adaptlearngraph.config;

import com.adaptlearngraph.jwt.WorkspaceEntitlementFilter;
import com.adaptlearngraph.dtos.EmployeeActorContext;
import com.adaptlearngraph.services.TargetRoleQueryService;
import com.adaptlearngraph.services.TargetRoleQueryUseCase;
import com.adaptlearngraph.repository.EmployeeContextPort;
import com.adaptlearngraph.repository.TargetRoleCatalogPort;
import com.adaptlearngraph.repository.SubscriptionIdentity;
import com.adaptlearngraph.repository.SubscriptionWorkspaceStore;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;

@Configuration(proxyBeanMethods=false)
@Profile("!starter")
@ConditionalOnWebApplication(type=ConditionalOnWebApplication.Type.SERVLET)
public class WorkspaceEntitlementConfiguration {
    @Bean
    @Primary
    EmployeeContextPort trustedEmployeeContext(SubscriptionIdentity identity) {
        return () -> {
            var actor=identity.current().actor();
            if(actor.organizationId()==null) return Optional.empty();
            return Optional.of(new EmployeeActorContext(actor.accountId().toString(),actor.organizationId().toString(),
                    actor.accountActive() && actor.membershipActive(),
                    actor.roles().stream().map(Enum::name).collect(Collectors.toUnmodifiableSet())));
        };
    }
    @Bean
    @Primary
    TargetRoleQueryUseCase trustedTargetRoleQuery(EmployeeContextPort context,TargetRoleCatalogPort catalog) {
        return new TargetRoleQueryService(context,catalog);
    }
    @Bean
    @Order(-8)
    SecurityFilterChain protectedWorkspace(HttpSecurity http,SubscriptionIdentity identity,SubscriptionWorkspaceStore workspaces,ObjectMapper json,
            com.adaptlearngraph.repository.TargetRoleRepository targets) throws Exception {
        return http.securityMatcher("/api/v1/employee/**","/api/v1/organizations/**","/api/v1/ld/**")
                .addFilterBefore(new WorkspaceEntitlementFilter(identity,workspaces,json,Clock.systemUTC(),targets),AuthorizationFilter.class)
                .authorizeHttpRequests(auth->auth.anyRequest().permitAll())
                .exceptionHandling(errors->errors.accessDeniedHandler((request,response,failure)->{
                    response.setStatus(403); response.setContentType("application/json");
                    json.writeValue(response.getWriter(),java.util.Map.of("code","FORBIDDEN","message","Refresh and retry with a valid CSRF token."));
                })).build();
    }
}
