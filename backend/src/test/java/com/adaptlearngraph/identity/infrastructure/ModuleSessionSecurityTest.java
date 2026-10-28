package com.adaptlearngraph.identity.infrastructure;

import jakarta.servlet.http.Cookie;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ModuleSessionSecurityTest.Endpoint.class)
@Import({ModuleSessionSecurityConfiguration.class, SecurityConfiguration.class, ModuleSessionSecurityTest.Endpoint.class})
@ActiveProfiles({"local", "local-baseline-demo"})
@TestPropertySource(properties = "assessment.baseline.local-demo.enabled=true")
class ModuleSessionSecurityTest {
    @Autowired MockMvc mvc;
    @MockitoBean JdbcTemplate jdbc;
    @RestController static class Endpoint {
        @GetMapping("/api/v1/module-management/session")
        Map<String, Object> session(Authentication auth) {
            return Map.of("id", auth.getName(), "roles", auth.getAuthorities().stream().map(Object::toString).toList(), "details", auth.getDetails());
        }
    }
    @Test void missingCookieAndRetiredBasicAccountsCannotAccess() throws Exception {
        mvc.perform(get("/api/v1/module-management/session")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/module-management/session").header("Authorization", "Basic ZXhwZXJ0LWE6bW9kdWxlLWxvY2FsLW9ubHk="))
                .andExpect(status().isUnauthorized()).andExpect(header().doesNotExist("WWW-Authenticate"));
        verifyNoInteractions(jdbc);
    }
    @Test void unknownPersonaCannotBecomeLdOrTrustClientRoleHeaders() throws Exception {
        mvc.perform(get("/api/v1/module-management/session").cookie(new Cookie("baseline_demo_persona", "expert-a"))
                .header("X-User-Role", "LD_MANAGER")).andExpect(status().isUnauthorized());
        verifyNoInteractions(jdbc);
    }
    @Test void activeExpertUsesServerAccountIdOrganizationAndRoles() throws Exception {
        var org = UUID.randomUUID();
        when(jdbc.queryForList(anyString(), any(Object[].class))).thenReturn(List.of(Map.of("organization_id", org, "role_code", "DOMAIN_EXPERT")));
        mvc.perform(get("/api/v1/module-management/session").cookie(new Cookie("baseline_demo_persona", "expert-chen")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.roles[0]").value("ROLE_EXPERT"))
                .andExpect(jsonPath("$.details.organizationId").value(org.toString()));
    }
    @Test void inactiveOrMissingAccountIsDenied() throws Exception {
        when(jdbc.queryForList(anyString(), any(Object[].class))).thenReturn(List.of());
        mvc.perform(get("/api/v1/module-management/session").cookie(new Cookie("baseline_demo_persona", "expert-chen")))
                .andExpect(status().isUnauthorized());
    }
    @Test void cookieRemovalDoesNotReusePreviousRequestIdentity() throws Exception {
        when(jdbc.queryForList(anyString(), any(Object[].class))).thenReturn(List.of(Map.of("organization_id", UUID.randomUUID(), "role_code", "LD_MANAGER")));
        mvc.perform(get("/api/v1/module-management/session").cookie(new Cookie("baseline_demo_persona", "ld")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.roles[0]").value("ROLE_LD_MANAGER"));
        mvc.perform(get("/api/v1/module-management/session")).andExpect(status().isUnauthorized());
    }
}
