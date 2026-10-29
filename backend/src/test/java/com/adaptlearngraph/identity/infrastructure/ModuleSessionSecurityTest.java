package com.adaptlearngraph.identity.infrastructure;

import com.adaptlearngraph.subscription.application.port.out.SubscriptionIdentity;
import com.adaptlearngraph.subscription.application.port.out.SubscriptionWorkspaceStore;
import com.adaptlearngraph.subscription.domain.SubscriptionAccessPolicy.Actor;
import com.adaptlearngraph.subscription.domain.SubscriptionAccessPolicy.Role;
import com.adaptlearngraph.subscription.domain.SubscriptionFailure;
import jakarta.servlet.http.Cookie;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.Authentication;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ModuleSessionSecurityTest.Endpoint.class)
@Import({ModuleSessionSecurityConfiguration.class, SecurityConfiguration.class, ModuleSessionSecurityTest.Endpoint.class})
@ActiveProfiles("local")
class ModuleSessionSecurityTest {
    @Autowired MockMvc mvc;
    @MockitoBean SubscriptionIdentity identity;
    @MockitoBean SubscriptionWorkspaceStore workspaces;
    final UUID account = UUID.randomUUID(), organization = UUID.randomUUID();
    @RestController static class Endpoint {
        @GetMapping("/api/v1/module-management/assets/test")
        org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody media(Authentication auth) {
            String value = "media:" + auth.getName();
            return out -> { out.write(value.getBytes(java.nio.charset.StandardCharsets.UTF_8)); out.flush(); };
        }
        @RequestMapping(value="/api/v1/module-management/session", method={RequestMethod.GET, RequestMethod.POST})
        Map<String, Object> session(Authentication auth) {
            return Map.of("id", auth.getName(), "roles", auth.getAuthorities().stream().map(Object::toString).toList(), "details", auth.getDetails());
        }
    }
    @Test void authorizedAsyncMediaDispatchKeepsTrustedManagerIdentity() throws Exception {
        actor(Role.LD_MANAGER);
        var initial = mvc.perform(get("/api/v1/module-management/assets/test")).andExpect(request().asyncStarted()).andReturn();
        mvc.perform(asyncDispatch(initial)).andExpect(status().isOk()).andExpect(content().string("media:" + account));
        verify(workspaces, atLeast(2)).require(any(), eq(organization), any(), any());
    }
    @Test void asyncMediaDispatchStillRejectsRevokedSession() throws Exception {
        when(identity.current()).thenThrow(new SubscriptionFailure(SubscriptionFailure.Code.UNAUTHENTICATED, "Session revoked"));
        mvc.perform(get("/api/v1/module-management/session").with(request -> { request.setDispatcherType(jakarta.servlet.DispatcherType.ASYNC); return request; }))
                .andExpect(status().isUnauthorized());
    }
    @Test void asyncMediaDispatchStillEnforcesWorkspacePolicy() throws Exception {
        doThrow(new SubscriptionFailure(SubscriptionFailure.Code.FORBIDDEN, "Workspace suspended")).when(workspaces).require(any(), any(), any(), any());
        mvc.perform(get("/api/v1/module-management/session").with(request -> { request.setDispatcherType(jakarta.servlet.DispatcherType.ASYNC); return request; }))
                .andExpect(status().isForbidden());
    }
    @Test void asyncClientRoleHeadersCannotElevateEmployee() throws Exception {
        actor(Role.EMPLOYEE);
        mvc.perform(get("/api/v1/module-management/session").header("X-User-Role", "LD_MANAGER").with(request -> { request.setDispatcherType(jakarta.servlet.DispatcherType.ASYNC); return request; }))
                .andExpect(status().isOk()).andExpect(jsonPath("$.roles[0]").value("ROLE_EMPLOYEE"));
        verify(workspaces).require(any(), eq(organization), any(), any());
    }
    void actor(Role role) {
        when(identity.current()).thenReturn(new SubscriptionIdentity.Context(new Actor(account, organization, true, true, Set.of(role), false), null));
    }
    @BeforeEach void setup() { actor(Role.DOMAIN_EXPERT); }
    @Test void realWorkspaceExpertUsesTrustedAccountOrganizationAndRole() throws Exception {
        mvc.perform(get("/api/v1/module-management/session").header("X-User-Role", "LD_MANAGER"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(account.toString()))
                .andExpect(jsonPath("$.roles[0]").value("ROLE_EXPERT"))
                .andExpect(jsonPath("$.details.organizationId").value(organization.toString()));
        verify(workspaces).require(any(), eq(organization), any(), any());
    }
    @Test void managerAndEmployeeUseTheirActualRoles() throws Exception {
        actor(Role.LD_MANAGER);
        mvc.perform(get("/api/v1/module-management/session")).andExpect(status().isOk()).andExpect(jsonPath("$.roles[0]").value("ROLE_LD_MANAGER"));
        actor(Role.EMPLOYEE);
        mvc.perform(get("/api/v1/module-management/session")).andExpect(status().isOk()).andExpect(jsonPath("$.roles[0]").value("ROLE_EMPLOYEE"));
    }
    @Test void demoCookieBasicAndSpoofedHeadersCannotCreateAWorkspaceIdentity() throws Exception {
        when(identity.current()).thenThrow(new SubscriptionFailure(SubscriptionFailure.Code.UNAUTHENTICATED, "Sign in"));
        mvc.perform(get("/api/v1/module-management/session").cookie(new Cookie("baseline_demo_persona", "ld"))
                .header("X-User-Role", "LD_MANAGER").header("Authorization", "Basic ZXhwZXJ0LWE6bW9kdWxlLWxvY2FsLW9ubHk="))
                .andExpect(status().isUnauthorized()).andExpect(header().doesNotExist("WWW-Authenticate"));
    }
    @Test void expiredOrSuspendedWorkspaceIsDenied() throws Exception {
        doThrow(new SubscriptionFailure(SubscriptionFailure.Code.FORBIDDEN, "Workspace suspended"))
                .when(workspaces).require(any(), any(), any(), any());
        mvc.perform(get("/api/v1/module-management/session")).andExpect(status().isForbidden());
    }
    @Test void administratorCannotBecomeExpertByChangingClientRole() throws Exception {
        actor(Role.ORGANIZATION_ADMINISTRATOR);
        mvc.perform(get("/api/v1/module-management/session").header("X-User-Role", "EXPERT")).andExpect(status().isForbidden());
    }
    @Test void mutationsRequireCsrfAndAcceptTheSharedSessionToken() throws Exception {
        mvc.perform(post("/api/v1/module-management/session")).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/module-management/session").with(csrf())).andExpect(status().isOk());
    }
    @Test void revokedSessionCannotReusePreviousRequestAuthentication() throws Exception {
        mvc.perform(get("/api/v1/module-management/session")).andExpect(status().isOk());
        when(identity.current()).thenThrow(new SubscriptionFailure(SubscriptionFailure.Code.UNAUTHENTICATED, "Session revoked"));
        mvc.perform(get("/api/v1/module-management/session")).andExpect(status().isUnauthorized());
    }
}
