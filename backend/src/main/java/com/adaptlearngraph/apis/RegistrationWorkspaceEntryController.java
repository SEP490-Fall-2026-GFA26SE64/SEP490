package com.adaptlearngraph.apis;

import com.adaptlearngraph.services.RegistrationWorkspaceEntryService;
import com.adaptlearngraph.services.WorkspaceAuthenticationUseCase;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Profile("!starter")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class RegistrationWorkspaceEntryController {
    private final RegistrationWorkspaceEntryService entry;

    public RegistrationWorkspaceEntryController(RegistrationWorkspaceEntryService entry) {
        this.entry = entry;
    }

    @PostMapping("/api/v1/registration/workspace-session")
    WorkspaceAuthenticationUseCase.Identity enter(HttpServletRequest request) {
        return entry.enter(request);
    }
}