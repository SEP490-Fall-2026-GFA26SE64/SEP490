package com.adaptlearngraph.pathway.infrastructure;

import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.adaptlearngraph.subscription.application.port.out.SubscriptionIdentity;
import com.adaptlearngraph.subscription.application.port.out.SubscriptionWorkspaceStore;
import com.adaptlearngraph.subscription.domain.SubscriptionAccessPolicy;
import com.adaptlearngraph.subscription.domain.SubscriptionFailure;
import com.adaptlearngraph.identity.domain.RegistrationFailure;
import java.time.Clock;

/** Uses the real server session, live membership and entitlement. No persona/header fallback. */
final class WorkspacePathwayActors implements Actors {
    private final SubscriptionIdentity identity;
    private final SubscriptionWorkspaceStore workspaces;
    WorkspacePathwayActors(SubscriptionIdentity identity, SubscriptionWorkspaceStore workspaces) {
        this.identity=identity; this.workspaces=workspaces;
    }
    @Override public Actor require() {
        try {
            var trusted=identity.current().actor();
            if(trusted.organizationId()==null || trusted.roles().size()!=1) throw new Failure(403,"FORBIDDEN");
            Role role;
            if(trusted.roles().contains(SubscriptionAccessPolicy.Role.EMPLOYEE)) role=Role.EMPLOYEE;
            else if(trusted.roles().contains(SubscriptionAccessPolicy.Role.DOMAIN_EXPERT)) role=Role.DOMAIN_EXPERT;
            else throw new Failure(403,"FORBIDDEN");
            workspaces.require(trusted,trusted.organizationId(),SubscriptionAccessPolicy.Action.WORKSPACE,Clock.systemUTC().instant());
            return new Actor(trusted.organizationId(),trusted.accountId(),role);
        } catch(SubscriptionFailure invalid) {
            throw new Failure(invalid.code()==SubscriptionFailure.Code.UNAUTHENTICATED?401:403,"UNAUTHORIZED_WORKSPACE");
        } catch(RegistrationFailure invalid) {
            throw new Failure(invalid.code()==RegistrationFailure.Code.UNAUTHENTICATED?401:403,"UNAUTHORIZED_WORKSPACE");
        }
    }
}
