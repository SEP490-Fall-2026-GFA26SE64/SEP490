package com.adaptlearngraph.subscription.infrastructure;

import com.adaptlearngraph.identity.application.port.in.RegistrationUseCase;
import com.adaptlearngraph.identity.application.port.in.WorkspaceAuthenticationUseCase;
import com.adaptlearngraph.identity.domain.RegistrationActor;
import com.adaptlearngraph.identity.domain.WorkspacePrincipal;
import com.adaptlearngraph.subscription.application.port.out.SubscriptionIdentity;
import com.adaptlearngraph.subscription.domain.SubscriptionAccessPolicy.Actor;
import com.adaptlearngraph.subscription.domain.SubscriptionAccessPolicy.Role;
import com.adaptlearngraph.subscription.domain.SubscriptionFailure;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

public final class ServletSubscriptionIdentity implements SubscriptionIdentity {
    private final RegistrationUseCase registration;
    private final WorkspaceAuthenticationUseCase workspace;

    public ServletSubscriptionIdentity(RegistrationUseCase registration, WorkspaceAuthenticationUseCase workspace) {
        this.registration = registration;
        this.workspace = workspace;
    }

    @Override
    public Context current() {
        if (!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes)) throw unauthenticated();
        var request = attributes.getRequest();
        var session = request.getSession(false);
        if (session == null) throw unauthenticated();
        if (request.getRequestURI().startsWith("/api/v1/registration/")) {
            if (!(session.getAttribute("REGISTRATION_ACTOR") instanceof RegistrationActor actor)
                    || actor.scope() != RegistrationActor.Scope.FULL) throw unauthenticated();
            var view = registration.current(actor);
            if (!"COMPLETE".equals(view.stage()) || view.registrationId() == null) throw unauthenticated();
            return new Context(new Actor(actor.accountId(), null, true, false, Set.of(), true), view.registrationId());
        }
        if (!(session.getAttribute("WORKSPACE_PRINCIPAL") instanceof WorkspacePrincipal principal)
                || principal.scope() != WorkspacePrincipal.Scope.FULL) throw unauthenticated();
        var identity = workspace.current(principal);
        if (!"COMPLETE".equals(identity.stage()) || identity.accountId() == null) throw unauthenticated();
        return new Context(new Actor(identity.accountId(), identity.organizationId(), identity.accountActive(),
                identity.membershipActive(), identity.roles().stream().map(Role::valueOf).collect(Collectors.toUnmodifiableSet()),
                identity.mfaVerified()), null);
    }

    private static SubscriptionFailure unauthenticated() {
        return new SubscriptionFailure(SubscriptionFailure.Code.UNAUTHENTICATED,
                "Complete the required authentication before continuing.");
    }
}
