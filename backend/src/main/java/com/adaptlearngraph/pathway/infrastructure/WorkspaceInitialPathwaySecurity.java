package com.adaptlearngraph.pathway.infrastructure;

import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.web.filter.OncePerRequestFilter;

/** Exact pathway routes use real actor checks and retain Spring's session CSRF protection. */
@Configuration(proxyBeanMethods=false)
@Profile("local & workspace-baseline & !local-baseline-demo & !prod")
@ConditionalOnWebApplication(type=ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(name={"pathway.initial.enabled","assessment.baseline.workspace.enabled"},havingValue="true")
public class WorkspaceInitialPathwaySecurity {
    @Bean @Order(-9)
    SecurityFilterChain workspaceInitialPathwayFilterChain(HttpSecurity http,Actors actors,ObjectMapper json) throws Exception {
        return http.securityMatcher("/api/v1/employee/role-gaps","/api/v1/employee/initial-pathway-requests",
                "/api/v1/employee/initial-pathway-requests/*","/api/v1/employee/pathway","/api/v1/employee/pathways/*",
                "/api/v1/expert/initial-pathways","/api/v1/expert/initial-pathways/**")
            .addFilterBefore(new OncePerRequestFilter() {
                @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain)
                        throws ServletException,IOException {
                    try {
                        var actor=actors.require();
                        actor.require(request.getRequestURI().startsWith("/api/v1/expert/")?Role.DOMAIN_EXPERT:Role.EMPLOYEE);
                        chain.doFilter(request,response);
                    } catch(Failure invalid) {
                        response.setStatus(invalid.status());response.setContentType("application/json");
                        response.setHeader("Cache-Control","no-store");
                        json.writeValue(response.getWriter(),Map.of("code",invalid.code()));
                    }
                }
            },AuthorizationFilter.class)
            .authorizeHttpRequests(auth->auth.anyRequest().permitAll())
            .exceptionHandling(errors->errors.accessDeniedHandler((request,response,error)->{
                response.setStatus(403);response.setContentType("application/json");
                json.writeValue(response.getWriter(),Map.of("code","FORBIDDEN"));
            })).build();
    }
}
