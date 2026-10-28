package com.adaptlearngraph.identity.infrastructure;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;

/** Reuses the main login's explicit local workspace cookie. This is not production authentication. */
@Configuration(proxyBeanMethods = false)
@Profile("local & local-baseline-demo & !prod")
@ConditionalOnProperty(prefix = "assessment.baseline.local-demo", name = "enabled", havingValue = "true")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class ModuleSessionSecurityConfiguration {
    private static final Set<String> PERSONAS = Set.of("ld", "admin", "employee-a", "employee-b", "employee-c",
            "expert-chen", "expert-vance", "expert-rivera", "expert-nguyen");

    @Bean @Order(0)
    SecurityFilterChain moduleSessionSecurity(HttpSecurity http, JdbcTemplate jdbc) throws Exception {
        return http.securityMatcher("/api/v1/module-management/**")
                .addFilterBefore(new WorkspaceSessionFilter(jdbc), AnonymousAuthenticationFilter.class)
                .authorizeHttpRequests(a -> a.anyRequest().authenticated())
                .exceptionHandling(e -> e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                // Existing local login uses a SameSite=Strict cookie. Keep mutations same-origin.
                .csrf(c -> c.disable()).build();
    }

    static final class WorkspaceSessionFilter extends OncePerRequestFilter {
        private final JdbcTemplate jdbc;
        WorkspaceSessionFilter(JdbcTemplate jdbc) { this.jdbc = jdbc; }
        @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                FilterChain chain) throws ServletException, IOException {
            String persona = null;
            if (request.getCookies() != null) for (var cookie : request.getCookies()) {
                if (cookie.getName().equals("baseline_demo_persona")) persona = cookie.getValue();
            }
            // Never fall back to the demo's default L&D persona when the cookie is absent.
            if (persona != null && PERSONAS.contains(persona)) {
                var id = UUID.nameUUIDFromBytes(("LOCAL_BASELINE_DEMO:" + persona).getBytes(StandardCharsets.UTF_8));
                List<Map<String, Object>> accounts = jdbc.queryForList("""
                        SELECT a.organization_id, r.role_code FROM platform.account a
                        JOIN platform.account_role r ON r.account_id=a.account_id
                        WHERE a.account_id=? AND a.identifier=? AND a.active
                          AND a.password_hash='DEMO_NO_PASSWORD_LOGIN'
                        """, id, "local-baseline-demo-" + persona);
                if (!accounts.isEmpty()) {
                    var roles = accounts.stream().map(row -> row.get("role_code").toString())
                            .map(role -> new SimpleGrantedAuthority("ROLE_" + (role.equals("DOMAIN_EXPERT") ? "EXPERT" : role))).toList();
                    var auth = UsernamePasswordAuthenticationToken.authenticated(id.toString(), null, roles);
                    auth.setDetails(Map.of("organizationId", accounts.getFirst().get("organization_id").toString()));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            }
            chain.doFilter(request, response);
        }
    }
}
