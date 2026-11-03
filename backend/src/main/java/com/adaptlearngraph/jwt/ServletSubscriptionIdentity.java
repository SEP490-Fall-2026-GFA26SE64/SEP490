package com.adaptlearngraph.jwt;

import com.adaptlearngraph.services.RegistrationUseCase;
import com.adaptlearngraph.services.WorkspaceAuthenticationUseCase;
import com.adaptlearngraph.entities.domain.RegistrationActor;
import com.adaptlearngraph.entities.domain.WorkspacePrincipal;
import com.adaptlearngraph.repository.SubscriptionIdentity;
import com.adaptlearngraph.entities.domain.SubscriptionAccessPolicy.Actor;
import com.adaptlearngraph.entities.domain.SubscriptionAccessPolicy.Role;
import com.adaptlearngraph.exception.SubscriptionFailure;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

public final class ServletSubscriptionIdentity implements SubscriptionIdentity {
    private final RegistrationUseCase registration;
    private final WorkspaceAuthenticationUseCase workspace;
    private final com.adaptlearngraph.entities.domain.IntegrationPolicy policy;

    public ServletSubscriptionIdentity(RegistrationUseCase registration, WorkspaceAuthenticationUseCase workspace) {
        this(registration, workspace, com.adaptlearngraph.entities.domain.IntegrationPolicy.ENABLED);
    }

    public ServletSubscriptionIdentity(RegistrationUseCase registration, WorkspaceAuthenticationUseCase workspace,
            com.adaptlearngraph.entities.domain.IntegrationPolicy policy) {
        this.registration = registration;
        this.workspace = workspace;
        this.policy = policy;
    }

    @Override
    public Context current() {
        if (!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes)) throw unauthenticated();
        var request = attributes.getRequest();
        var session = request.getSession(false);
        if (session == null) throw unauthenticated();
        if (request.getRequestURI().startsWith("/api/v1/registration/")) {
            if (!(session.getAttribute("REGISTRATION_ACTOR") instanceof RegistrationActor actor)) throw unauthenticated();
            var view = registration.current(actor);
            if (!"COMPLETE".equals(view.stage()) || view.registrationId() == null) throw unauthenticated();
            return new Context(new Actor(actor.accountId(), null, true, false, Set.of(), actor.mfaVerified(),
                    policy.mfaEnabled()), view.registrationId());
        }
        if (!(session.getAttribute("WORKSPACE_PRINCIPAL") instanceof WorkspacePrincipal principal)) throw unauthenticated();
        var identity = workspace.current(principal);
        if (!"COMPLETE".equals(identity.stage()) || identity.accountId() == null) throw unauthenticated();
        return new Context(new Actor(identity.accountId(), identity.organizationId(), identity.accountActive(),
                identity.membershipActive(), identity.roles().stream().map(Role::valueOf).collect(Collectors.toUnmodifiableSet()),
                identity.mfaVerified(), policy.mfaEnabled()), null);
    }

    private static SubscriptionFailure unauthenticated() {
        return new SubscriptionFailure(SubscriptionFailure.Code.UNAUTHENTICATED,
                "Complete the required authentication before continuing.");
    }
}
