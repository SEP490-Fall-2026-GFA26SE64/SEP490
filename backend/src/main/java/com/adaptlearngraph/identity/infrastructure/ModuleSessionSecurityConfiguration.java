package com.adaptlearngraph.identity.infrastructure;

import com.adaptlearngraph.identity.domain.RegistrationFailure;
import com.adaptlearngraph.subscription.application.port.out.SubscriptionIdentity;
import com.adaptlearngraph.subscription.application.port.out.SubscriptionWorkspaceStore;
import com.adaptlearngraph.subscription.domain.SubscriptionAccessPolicy.Action;
import com.adaptlearngraph.subscription.domain.SubscriptionAccessPolicy.Role;
import com.adaptlearngraph.subscription.domain.SubscriptionFailure;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Clock;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;

/** Adapts the existing authenticated workspace identity to Module authoring, never a demo persona. */
@Configuration(proxyBeanMethods = false)
@Profile("local & !prod")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class ModuleSessionSecurityConfiguration {
    @Bean @Order(0)
    SecurityFilterChain moduleSessionSecurity(HttpSecurity http, SubscriptionIdentity identity,
            SubscriptionWorkspaceStore workspaces, ObjectMapper json) throws Exception {
        return http.securityMatcher("/api/v1/module-management/**")
                .addFilterBefore(new WorkspaceSessionFilter(identity, workspaces, json), AnonymousAuthenticationFilter.class)
                .authorizeHttpRequests(a -> a.anyRequest().authenticated())
                .exceptionHandling(e -> e.authenticationEntryPoint((request, response, failure) -> response.sendError(401))
                        .accessDeniedHandler((request, response, failure) -> {
                            response.setStatus(403); response.setContentType("application/json");
                            json.writeValue(response.getWriter(), Map.of("message", "Refresh and retry with a valid CSRF token."));
                        }))
                .build();
    }

    static final class WorkspaceSessionFilter extends OncePerRequestFilter {
        private final SubscriptionIdentity identity;
        private final SubscriptionWorkspaceStore workspaces;
        private final ObjectMapper json;
        WorkspaceSessionFilter(SubscriptionIdentity identity, SubscriptionWorkspaceStore workspaces, ObjectMapper json) {
            this.identity = identity; this.workspaces = workspaces; this.json = json;
        }
        // StreamingResponseBody redispatches asynchronously after the request context is cleared.
        // Revalidate the real session/workspace on that dispatch instead of treating it as anonymous.
        @Override protected boolean shouldNotFilterAsyncDispatch() { return false; }
        @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                FilterChain chain) throws ServletException, IOException {
            try {
                var actor = identity.current().actor();
                boolean platformSettings = actor.roles().contains(Role.PLATFORM_ADMINISTRATOR)
                        && request.getRequestURI().equals("/api/v1/module-management/upload-settings");
                if (!platformSettings) workspaces.require(actor, actor.organizationId(), Action.WORKSPACE, Clock.systemUTC().instant());
                if (!platformSettings && (actor.roles().size() != 1 || actor.roles().stream().noneMatch(role ->
                        role == Role.DOMAIN_EXPERT || role == Role.LD_MANAGER || role == Role.EMPLOYEE))) {
                    throw new SubscriptionFailure(SubscriptionFailure.Code.FORBIDDEN, "Expert, L&D or Employee access required.");
                }
                var roles = actor.roles().stream().map(role -> new SimpleGrantedAuthority(
                        "ROLE_" + (role == Role.DOMAIN_EXPERT ? "EXPERT" : role.name()))).toList();
                var auth = UsernamePasswordAuthenticationToken.authenticated(actor.accountId().toString(), null, roles);
                auth.setDetails(Map.of("organizationId", actor.organizationId() == null ? "platform" : actor.organizationId().toString()));
                SecurityContextHolder.getContext().setAuthentication(auth);
                chain.doFilter(request, response);
            } catch (SubscriptionFailure failure) {
                fail(response, failure.code() == SubscriptionFailure.Code.UNAUTHENTICATED ? 401 : 403, failure.getMessage());
            } catch (RegistrationFailure failure) {
                fail(response, failure.code() == RegistrationFailure.Code.UNAUTHENTICATED ? 401 : 403, failure.getMessage());
            }
        }
        private void fail(HttpServletResponse response, int status, String message) throws IOException {
            response.setStatus(status); response.setContentType("application/json"); response.setHeader("Cache-Control", "no-store");
            json.writeValue(response.getWriter(), Map.of("message", message));
        }
    }
}
