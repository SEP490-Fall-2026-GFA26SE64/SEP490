package com.adaptlearngraph.apis;

import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.exception.RegistrationFailure;
import com.adaptlearngraph.jwt.WorkspaceSessions;
import com.adaptlearngraph.services.PasswordResetUseCase;
import com.adaptlearngraph.services.WorkspaceAuthenticationUseCase;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@Profile("!starter")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@RequestMapping(ApiEndpoints.WORKSPACE_AUTHENTICATION)
public class WorkspaceAuthenticationController {
    private static final String ENROLLMENT = "WORKSPACE_ENROLLMENT";
    private final WorkspaceAuthenticationUseCase authentication;
    private final PasswordResetUseCase passwordReset;

    public WorkspaceAuthenticationController(WorkspaceAuthenticationUseCase authentication,
                                             PasswordResetUseCase passwordReset) {
        this.authentication = authentication;
        this.passwordReset = passwordReset;
    }

    @ModelAttribute
    void noCache(HttpServletResponse response) { response.setHeader("Cache-Control", "no-store"); }

    @GetMapping("/csrf")
    CsrfView csrf(CsrfToken token) { return new CsrfView(token.getHeaderName(), token.getToken()); }

    @GetMapping("/current")
    WorkspaceAuthenticationUseCase.Identity current(HttpServletRequest request) {
        return authentication.current(WorkspaceSessions.principal(request));
    }

    @PostMapping("/sign-in")
    WorkspaceAuthenticationUseCase.Identity signIn(@Valid @RequestBody SignIn input, HttpServletRequest request) {
        var principal = authentication.signIn(input.email(), input.password(), request.getRemoteAddr());
        WorkspaceSessions.establish(request, principal);
        return authentication.current(principal);
    }

    @PostMapping("/totp/verify")
    WorkspaceAuthenticationUseCase.Identity verify(@Valid @RequestBody Proof input, HttpServletRequest request) {
        var principal = authentication.verifyTotp(WorkspaceSessions.principal(request), input.code(), request.getRemoteAddr());
        WorkspaceSessions.establish(request, principal);
        return authentication.current(principal);
    }

    @PostMapping("/totp/setup")
    EnrollmentView setup(HttpServletRequest request) {
        var principal = WorkspaceSessions.principal(request);
        var session = request.getSession(false);
        var result = authentication.prepareEnrollment(principal, (String) session.getAttribute(ENROLLMENT));
        session.setAttribute(ENROLLMENT, result.encryptedSecret());
        return new EnrollmentView(result.manualSecret(), result.email());
    }

    @PostMapping("/totp/confirm")
    CompletionView confirm(@Valid @RequestBody Proof input, HttpServletRequest request) {
        var result = authentication.confirmEnrollment(WorkspaceSessions.principal(request),
                (String) request.getSession(false).getAttribute(ENROLLMENT), input.code(), request.getRemoteAddr());
        WorkspaceSessions.establish(request, result.principal());
        return new CompletionView(authentication.current(result.principal()), result.recoveryCodes());
    }

    @PostMapping("/recovery")
    WorkspaceAuthenticationUseCase.Identity recover(@Valid @RequestBody Proof input, HttpServletRequest request) {
        var principal = authentication.recover(WorkspaceSessions.principal(request), input.code(), request.getRemoteAddr());
        WorkspaceSessions.establish(request, principal);
        return authentication.current(principal);
    }

    @PostMapping("/sign-out")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void signOut(HttpServletRequest request) {
        var session = request.getSession(false);
        if (session != null) session.invalidate();
    }

    @PostMapping("/forgot-password")
    @ResponseStatus(HttpStatus.ACCEPTED)
    void forgotPassword(@Valid @RequestBody ForgotPassword input, HttpServletRequest request) {
        passwordReset.requestReset(input.email(), request.getRemoteAddr());
    }

    @PostMapping("/reset-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void resetPassword(@Valid @RequestBody ResetPassword input, HttpServletRequest request) {
        passwordReset.resetPassword(input.token(), input.password(), request.getRemoteAddr());
        var session = request.getSession(false);
        if (session != null) session.invalidate();
    }

    @PostMapping("/change-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void changePassword(@Valid @RequestBody ChangePassword input, HttpServletRequest request) {
        var principal = WorkspaceSessions.principal(request);
        if (principal == null) {
            throw new RegistrationFailure(RegistrationFailure.Code.UNAUTHENTICATED, "Sign in to change password.");
        }
        passwordReset.changePassword(principal.accountId(), input.currentPassword(), input.newPassword());
        var session = request.getSession(false);
        if (session != null) session.invalidate();
    }

    record ForgotPassword(@NotBlank @Size(max = 254) String email) {
        @Override public String toString() { return "ForgotPassword[redacted]"; }
    }
    record ResetPassword(@NotBlank @Size(max = 64) String token, @NotBlank @Size(max = 256) String password) {
        @Override public String toString() { return "ResetPassword[redacted]"; }
    }
    record ChangePassword(@NotBlank @Size(max = 256) String currentPassword, @NotBlank @Size(max = 256) String newPassword) {
        @Override public String toString() { return "ChangePassword[redacted]"; }
    }
    record SignIn(@NotNull @Size(max = 254) String email, @NotNull @Size(max = 256) String password) {
        @Override public String toString() { return "SignIn[redacted]"; }
    }
    record Proof(@NotNull @Size(max = 64) String code) {
        @Override public String toString() { return "Proof[redacted]"; }
    }
    record CsrfView(String headerName, String token) {}
    record EnrollmentView(String manualSecret, String email) {
        @Override public String toString() { return "EnrollmentView[redacted]"; }
    }
    record CompletionView(WorkspaceAuthenticationUseCase.Identity identity, java.util.List<String> recoveryCodes) {
        @Override public String toString() { return "CompletionView[redacted]"; }
    }
}
