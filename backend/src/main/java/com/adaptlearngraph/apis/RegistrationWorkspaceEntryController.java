package com.adaptlearngraph.apis;

import com.adaptlearngraph.jwt.WorkspaceSessions;
import com.adaptlearngraph.services.WorkspaceAuthenticationUseCase;
import com.adaptlearngraph.entities.domain.RegistrationActor;
import com.adaptlearngraph.exception.RegistrationFailure;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Profile("!starter")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class RegistrationWorkspaceEntryController {
    private final WorkspaceAuthenticationUseCase authentication;

    public RegistrationWorkspaceEntryController(WorkspaceAuthenticationUseCase authentication) {
        this.authentication = authentication;
    }

    @PostMapping("/api/v1/registration/workspace-session")
    WorkspaceAuthenticationUseCase.Identity enter(HttpServletRequest request) {
        var session = request.getSession(false);
        if (session == null || !(session.getAttribute("REGISTRATION_ACTOR") instanceof RegistrationActor actor)) {
            throw new RegistrationFailure(RegistrationFailure.Code.UNAUTHENTICATED, "Sign in to resume registration.");
        }
        var principal = authentication.fromRegistration(actor);
        WorkspaceSessions.establish(request, principal);
        return authentication.current(principal);
    }
}
