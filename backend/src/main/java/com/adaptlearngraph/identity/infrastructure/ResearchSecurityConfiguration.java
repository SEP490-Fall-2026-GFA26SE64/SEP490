package com.adaptlearngraph.identity.infrastructure;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.*;
import org.springframework.context.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.web.filter.OncePerRequestFilter;

@Configuration(proxyBeanMethods=false)
@ConditionalOnWebApplication(type=ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(name="research.enabled",havingValue="true")
public class ResearchSecurityConfiguration {
    @Bean @Order(0)
    SecurityFilterChain researchSecurity(HttpSecurity http, Environment environment) throws Exception {
        http.securityMatcher("/api/v1/admin/research/**")
            .authorizeHttpRequests(a -> a.anyRequest().hasRole("ADMIN"))
            .exceptionHandling(e -> e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
                // Keep the permission response on this request instead of redispatching /error
                // through the unrelated default security chain.
                .accessDeniedHandler((request, response, denied) -> response.setStatus(HttpStatus.FORBIDDEN.value())))
            .csrf(c -> c.csrfTokenRepository(new CookieCsrfTokenRepository()));
        // The current portal supplies actor headers only in local development. Production must
        // receive an authenticated ADMIN principal from the owning Identity adapter.
        if (environment.acceptsProfiles(Profiles.of("local"))) {
            http.addFilterBefore(new LocalPortalActorFilter(), AnonymousAuthenticationFilter.class);
        }
        return http.build();
    }

    private static final class LocalPortalActorFilter extends OncePerRequestFilter {
        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                        FilterChain chain) throws ServletException, IOException {
            if (SecurityContextHolder.getContext().getAuthentication() == null) {
                String user = request.getHeader("X-User-Id");
                String role = request.getHeader("X-User-Role");
                if (user != null && !user.isBlank() && user.length() <= 256
                        && List.of("ADMIN", "EMPLOYEE", "DOMAIN_EXPERT", "LD_MANAGER").contains(role == null ? "" : role)) {
                    var context = SecurityContextHolder.createEmptyContext();
                    context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                        user, null, List.of(new SimpleGrantedAuthority("ROLE_" + role))));
                    SecurityContextHolder.setContext(context);
                }
            }
            chain.doFilter(request, response);
        }
    }
}
