package com.adaptlearngraph.services;

import com.adaptlearngraph.jwt.WorkspaceSessions;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Objects;

/** Turns a completed registration session into a workspace session without exposing either principal. */
public class RegistrationWorkspaceEntryService {
    private final WorkspaceAuthenticationUseCase authentication;

    public RegistrationWorkspaceEntryService(WorkspaceAuthenticationUseCase authentication) {
        this.authentication = Objects.requireNonNull(authentication, "authentication");
    }

    public WorkspaceAuthenticationUseCase.Identity enter(HttpServletRequest request) {
        var actor = RegistrationApplicationService.actor(request);
        var principal = authentication.fromRegistration(actor);
        WorkspaceSessions.establish(request, principal);
        return authentication.current(principal);
    }
}