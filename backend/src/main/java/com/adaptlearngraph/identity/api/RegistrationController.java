package com.adaptlearngraph.identity.api;

import com.adaptlearngraph.identity.application.port.in.RegistrationUseCase;
import com.adaptlearngraph.identity.domain.RegistrationActor;
import com.adaptlearngraph.identity.domain.RegistrationFailure;
import com.adaptlearngraph.identity.domain.RegistrationFields;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.http.HttpStatus;
import org.springframework.context.annotation.Profile;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Profile("!starter")
@RequestMapping("/api/v1/registration")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class RegistrationController {
    private static final String ACTOR = "REGISTRATION_ACTOR";
    private static final String ENROLLMENT = "REGISTRATION_ENROLLMENT";
    private final RegistrationUseCase registration;

    public RegistrationController(RegistrationUseCase registration) {
        this.registration = registration;
    }

    @GetMapping("/csrf")
    CsrfView csrf(CsrfToken token) { return new CsrfView(token.getHeaderName(), token.getToken()); }

    @GetMapping("/current")
    RegistrationUseCase.View current(HttpServletRequest request) {
        return registration.current(actor(request));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    RegistrationUseCase.View register(@Valid @RequestBody Signup input, HttpServletRequest request) {
        var fields = new RegistrationFields(input.organizationName(), input.subdomain(), input.industry(),
                input.headcount(), input.adminName(), input.adminEmail());
        var actor = registration.register(fields, input.password(), request.getRemoteAddr());
        establish(request, actor);
        return registration.current(actor);
    }

    @PostMapping("/sign-in")
    RegistrationUseCase.View signIn(@Valid @RequestBody SignIn input, HttpServletRequest request) {
        var actor = registration.signIn(input.email(), input.password(), request.getRemoteAddr());
        establish(request, actor);
        return registration.current(actor);
    }

    @PostMapping("/email/resend")
    RegistrationUseCase.View resend(HttpServletRequest request) {
        var actor = actor(request);
        registration.resend(actor, request.getRemoteAddr());
        return registration.current(actor);
    }

    @PostMapping("/email/verify")
    RegistrationUseCase.View verifyEmail(@Valid @RequestBody Proof input, HttpServletRequest request) {
        var actor = registration.verifyEmail(actor(request), input.code(), request.getRemoteAddr());
        establish(request, actor);
        return registration.current(actor);
    }

    @PostMapping("/totp/setup")
    EnrollmentView enrollment(HttpServletRequest request) {
        var actor = actor(request);
        HttpSession session = request.getSession(false);
        Object saved = session.getAttribute(ENROLLMENT);
        var enrollment = registration.prepareEnrollment(actor, saved instanceof String value ? value : null);
        session.setAttribute(ENROLLMENT, enrollment.encryptedSecret());
        return new EnrollmentView(enrollment.manualSecret(), enrollment.email());
    }

    @PostMapping("/totp/confirm")
    CompletionView confirmEnrollment(@Valid @RequestBody Proof input, HttpServletRequest request) {
        var actor = actor(request);
        Object saved = request.getSession(false).getAttribute(ENROLLMENT);
        var result = registration.confirmEnrollment(actor, saved instanceof String value ? value : null,
                input.code(), request.getRemoteAddr());
        establish(request, result.actor());
        return new CompletionView(registration.current(result.actor()), result.recoveryCodes());
    }

    @PostMapping("/totp/verify")
    RegistrationUseCase.View verifyTotp(@Valid @RequestBody Proof input, HttpServletRequest request) {
        var actor = registration.verifyTotp(actor(request), input.code(), request.getRemoteAddr());
        establish(request, actor);
        return registration.current(actor);
    }

    @PostMapping("/recovery")
    RegistrationUseCase.View recover(@Valid @RequestBody Proof input, HttpServletRequest request) {
        var actor = registration.recover(actor(request), input.code(), request.getRemoteAddr());
        establish(request, actor);
        return registration.current(actor);
    }

    @PostMapping("/sign-out")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void signOut(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();
    }

    private static RegistrationActor actor(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null && session.getAttribute(ACTOR) instanceof RegistrationActor actor) return actor;
        throw new RegistrationFailure(RegistrationFailure.Code.UNAUTHENTICATED, "Sign in to resume registration.");
    }

    private static void establish(HttpServletRequest request, RegistrationActor actor) {
        HttpSession previous = request.getSession(false);
        if (previous != null) previous.invalidate();
        HttpSession session = request.getSession(true);
        session.setMaxInactiveInterval(actor.scope() == RegistrationActor.Scope.FULL ? 1800 : 600);
        session.setAttribute(ACTOR, actor);
        session.setAttribute(FindByIndexNameSessionRepository.PRINCIPAL_NAME_INDEX_NAME, actor.accountId().toString());
    }

    record Signup(@NotNull @Size(max = 200) String organizationName, @Size(max = 63) String subdomain,
                  @Size(max = 100) String industry, @Size(max = 100) String headcount,
                  @NotNull @Size(max = 120) String adminName, @NotNull @Size(max = 254) String adminEmail,
                  @NotNull @Size(max = 256) String password) {
        @Override public String toString() { return "Signup[redacted]"; }
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
    record CompletionView(RegistrationUseCase.View registration, List<String> recoveryCodes) {
        @Override public String toString() { return "CompletionView[redacted]"; }
    }
}
