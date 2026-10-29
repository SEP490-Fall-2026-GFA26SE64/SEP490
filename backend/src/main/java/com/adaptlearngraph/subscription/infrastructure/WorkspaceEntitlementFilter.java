package com.adaptlearngraph.subscription.infrastructure;

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
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Clock;
import java.util.Collections;
import java.util.Enumeration;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.filter.OncePerRequestFilter;

public final class WorkspaceEntitlementFilter extends OncePerRequestFilter {
    private final SubscriptionIdentity identity;
    private final SubscriptionWorkspaceStore workspaces;
    private final ObjectMapper json;
    private final Clock clock;
    private final com.adaptlearngraph.catalog.application.port.out.TargetRoleRepository targetRoles;
    public WorkspaceEntitlementFilter(SubscriptionIdentity identity,SubscriptionWorkspaceStore workspaces,ObjectMapper json,Clock clock,
            com.adaptlearngraph.catalog.application.port.out.TargetRoleRepository targetRoles) {
        this.identity=identity; this.workspaces=workspaces; this.json=json; this.clock=clock; this.targetRoles=targetRoles;
    }
    @Override
    protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws ServletException,IOException {
        try {
            var actor=identity.current().actor();
            String path=request.getRequestURI();
            boolean employee=path.startsWith("/api/v1/employee/");
            boolean baselineManager=path.startsWith("/api/v1/ld/");
            UUID organization=employee || baselineManager?actor.organizationId():organization(path);
            workspaces.require(actor,organization,Action.WORKSPACE,clock.instant());
            String role;
            if(employee) {
                if(!actor.roles().contains(Role.EMPLOYEE)) throw forbidden();
                role="EMPLOYEE";
            } else if (baselineManager) {
                if (!actor.roles().contains(Role.LD_MANAGER)) throw forbidden();
                role="LD_MANAGER";
            } else {
                boolean manager=actor.roles().contains(Role.LD_MANAGER);
                boolean expert=actor.roles().contains(Role.DOMAIN_EXPERT);
                if(!manager && !expert && !actor.roles().contains(Role.ORGANIZATION_ADMINISTRATOR)) throw forbidden();
                role=manager?"LD_MANAGER":expert?"DOMAIN_EXPERT":"ORGANIZATION_ADMINISTRATOR";
                boolean write=!request.getMethod().equals("GET") && !request.getMethod().equals("HEAD");
                if(write && path.contains("/target-roles") && request.getMethod().equals("POST") && !manager) throw forbidden();
                if(write && (path.contains("/micro-skills") || path.contains("/prerequisites")) && !expert) throw forbidden();
                if(write && (path.contains("/micro-skills") || path.contains("/prerequisites"))) role="DOMAIN_EXPERT";
                if(expert && !manager && path.contains("/target-roles/")) {
                    String id=path.substring(path.indexOf("/target-roles/")+"/target-roles/".length()).split("/",2)[0];
                    var target=targetRoles.findById(organization.toString(),
                            new com.adaptlearngraph.catalog.domain.TargetRoleId(UUID.fromString(id))).orElseThrow(WorkspaceEntitlementFilter::forbidden);
                    if(!actor.accountId().toString().equalsIgnoreCase(target.getAssignedExpertId())) throw forbidden();
                }
            }
            // Legacy controllers keep their wire signatures, but these two headers are replaced by server authority.
            String trustedRole=role;
            chain.doFilter(new HttpServletRequestWrapper(request) {
                @Override public String getHeader(String name) {
                    if("X-User-Role".equalsIgnoreCase(name)) return trustedRole;
                    if("X-User-Id".equalsIgnoreCase(name)) return actor.accountId().toString();
                    return super.getHeader(name);
                }
                @Override public Enumeration<String> getHeaders(String name) {
                    if("X-User-Role".equalsIgnoreCase(name) || "X-User-Id".equalsIgnoreCase(name))
                        return Collections.enumeration(java.util.List.of(getHeader(name)));
                    return super.getHeaders(name);
                }
            },response);
        } catch(SubscriptionFailure failure) {
            int status=failure.code()==SubscriptionFailure.Code.UNAUTHENTICATED?401:403;
            fail(response,status,failure.code().name(),failure.getMessage());
        } catch(RegistrationFailure failure) {
            fail(response,failure.code()==RegistrationFailure.Code.UNAUTHENTICATED?401:403,failure.code().name(),failure.getMessage());
        } catch(IllegalArgumentException invalid) {
            fail(response,400,"INVALID_INPUT","Invalid organization identifier.");
        }
    }
    private static UUID organization(String path) {
        return UUID.fromString(path.substring("/api/v1/organizations/".length()).split("/",2)[0]);
    }
    private void fail(HttpServletResponse response,int status,String code,String message) throws IOException {
        response.setStatus(status); response.setContentType("application/json");
        response.setHeader("Cache-Control","no-store");
        json.writeValue(response.getWriter(),Map.of("code",code,"message",message));
    }
    private static SubscriptionFailure forbidden() { return new SubscriptionFailure(SubscriptionFailure.Code.FORBIDDEN,"This workspace operation is not permitted for your role."); }
}
