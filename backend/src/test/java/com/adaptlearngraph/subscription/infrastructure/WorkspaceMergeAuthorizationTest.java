package com.adaptlearngraph.subscription.infrastructure;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.adaptlearngraph.catalog.application.port.out.TargetRoleRepository;
import com.adaptlearngraph.catalog.domain.TargetRole;
import com.adaptlearngraph.catalog.domain.TargetRoleId;
import com.adaptlearngraph.subscription.application.port.out.SubscriptionIdentity;
import com.adaptlearngraph.subscription.application.port.out.SubscriptionWorkspaceStore;
import com.adaptlearngraph.subscription.domain.SubscriptionAccessPolicy.Actor;
import com.adaptlearngraph.subscription.domain.SubscriptionAccessPolicy.Role;
import com.adaptlearngraph.subscription.domain.SubscriptionFailure;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Clock;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class WorkspaceMergeAuthorizationTest {
    private final UUID account = UUID.randomUUID(), organization = UUID.randomUUID();
    private final SubscriptionIdentity identity = mock(SubscriptionIdentity.class);
    private final SubscriptionWorkspaceStore workspaces = mock(SubscriptionWorkspaceStore.class);
    private final TargetRoleRepository roles = mock(TargetRoleRepository.class);
    private final WorkspaceEntitlementFilter filter = new WorkspaceEntitlementFilter(
            identity, workspaces, new ObjectMapper(), Clock.systemUTC(), roles);

    private void actor(Role role) {
        when(identity.current()).thenReturn(new SubscriptionIdentity.Context(
                new Actor(account, organization, true, true, Set.of(role), false), null));
    }

    @Test void expertCanCreateRoleAndCannotForgeManagerHeaders() throws Exception {
        actor(Role.DOMAIN_EXPERT);
        var request = new MockHttpServletRequest("POST", "/api/v1/organizations/" + organization + "/target-roles");
        request.addHeader("X-User-Role", "LD_MANAGER");
        request.addHeader("X-User-Id", UUID.randomUUID().toString());
        var chain = mock(FilterChain.class);
        doAnswer(call -> {
            var trusted = (HttpServletRequest) call.getArgument(0);
            assertEquals("DOMAIN_EXPERT", trusted.getHeader("X-User-Role"));
            assertEquals(account.toString(), trusted.getHeader("X-User-Id"));
            return null;
        }).when(chain).doFilter(any(), any());
        filter.doFilter(request, new MockHttpServletResponse(), chain);
        verify(chain).doFilter(any(), any());
        verify(workspaces).require(any(), eq(organization), any(), any());
    }

    @Test void stableStringRoleIdentifierKeepsAssignmentChecks() throws Exception {
        actor(Role.DOMAIN_EXPERT);
        var role = mock(TargetRole.class);
        when(role.getAssignedExpertId()).thenReturn(account.toString());
        when(roles.findById(organization.toString(), TargetRoleId.fromString("ROLE-JAVA#1.0"))).thenReturn(Optional.of(role));
        var chain = mock(FilterChain.class);
        var response = new MockHttpServletResponse();
        filter.doFilter(new MockHttpServletRequest("PUT", "/api/v1/organizations/" + organization + "/target-roles/ROLE-JAVA#1.0"), response, chain);
        assertEquals(200, response.getStatus());
        verify(chain).doFilter(any(), any());
    }

    @Test void differentAssignedExpertIsDenied() throws Exception {
        actor(Role.DOMAIN_EXPERT);
        var role = mock(TargetRole.class);
        when(role.getAssignedExpertId()).thenReturn(UUID.randomUUID().toString());
        when(roles.findById(anyString(), any())).thenReturn(Optional.of(role));
        var chain = mock(FilterChain.class);
        var response = new MockHttpServletResponse();
        filter.doFilter(new MockHttpServletRequest("PUT", "/api/v1/organizations/" + organization + "/target-roles/role"), response, chain);
        assertEquals(403, response.getStatus());
        verifyNoInteractions(chain);
    }

    @Test void employeeCanReadCatalogWithTrustedEmployeeIdentity() throws Exception {
        actor(Role.EMPLOYEE);
        var chain = mock(FilterChain.class);
        var response = new MockHttpServletResponse();
        var request = new MockHttpServletRequest("GET", "/api/v1/organizations/" + organization + "/modules");
        request.addHeader("X-User-Role", "LD_MANAGER");
        doAnswer(call -> {
            var trusted = (HttpServletRequest) call.getArgument(0);
            assertEquals("EMPLOYEE", trusted.getHeader("X-User-Role"));
            assertEquals(account.toString(), trusted.getHeader("X-User-Id"));
            return null;
        }).when(chain).doFilter(any(), any());
        filter.doFilter(request, response, chain);
        assertEquals(200, response.getStatus());
        verify(chain).doFilter(any(), any());
        verify(workspaces).require(any(), eq(organization), any(), any());
    }

    @Test void employeeCannotWriteCatalogEvenWithForgedManagerHeader() throws Exception {
        actor(Role.EMPLOYEE);
        for (var method : new String[]{"POST", "PUT", "PATCH", "DELETE"}) {
            var request = new MockHttpServletRequest(method, "/api/v1/organizations/" + organization + "/modules");
            request.addHeader("X-User-Role", "LD_MANAGER");
            var chain = mock(FilterChain.class);
            var response = new MockHttpServletResponse();
            filter.doFilter(request, response, chain);
            assertEquals(403, response.getStatus(), method);
            verifyNoInteractions(chain);
        }
    }

    @Test void workspaceDenialStopsCrossOrganizationRequest() throws Exception {
        actor(Role.DOMAIN_EXPERT);
        doThrow(new SubscriptionFailure(SubscriptionFailure.Code.FORBIDDEN, "Organization denied"))
                .when(workspaces).require(any(), any(), any(), any());
        var chain = mock(FilterChain.class);
        var response = new MockHttpServletResponse();
        filter.doFilter(new MockHttpServletRequest("GET", "/api/v1/organizations/" + UUID.randomUUID() + "/modules"), response, chain);
        assertEquals(403, response.getStatus());
        verifyNoInteractions(chain);
    }
}
