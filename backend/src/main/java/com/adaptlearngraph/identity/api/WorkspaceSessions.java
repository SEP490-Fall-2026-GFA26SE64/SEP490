package com.adaptlearngraph.identity.api;

import com.adaptlearngraph.identity.domain.RegistrationFailure;
import com.adaptlearngraph.identity.domain.WorkspacePrincipal;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.session.FindByIndexNameSessionRepository;

final class WorkspaceSessions {
    static final String PRINCIPAL = "WORKSPACE_PRINCIPAL";

    private WorkspaceSessions() {}

    static WorkspacePrincipal principal(HttpServletRequest request) {
        var session = request.getSession(false);
        if (session != null && session.getAttribute(PRINCIPAL) instanceof WorkspacePrincipal principal) return principal;
        throw new RegistrationFailure(RegistrationFailure.Code.UNAUTHENTICATED, "Sign in to continue.");
    }

    static void establish(HttpServletRequest request, WorkspacePrincipal principal) {
        var old = request.getSession(false);
        if (old != null) old.invalidate();
        var session = request.getSession(true);
        session.setMaxInactiveInterval(principal.scope() == WorkspacePrincipal.Scope.FULL ? 1800 : 600);
        session.setAttribute(PRINCIPAL, principal);
        session.setAttribute(FindByIndexNameSessionRepository.PRINCIPAL_NAME_INDEX_NAME, principal.accountId().toString());
    }
}
