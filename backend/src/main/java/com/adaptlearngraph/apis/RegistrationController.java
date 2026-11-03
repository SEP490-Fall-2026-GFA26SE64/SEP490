package com.adaptlearngraph.apis;

import com.adaptlearngraph.dtos.RegistrationDto.CompletionResponse;
import com.adaptlearngraph.dtos.RegistrationDto.EnrollmentResponse;
import com.adaptlearngraph.dtos.RegistrationDto.ProofRequest;
import com.adaptlearngraph.dtos.RegistrationDto.SignInRequest;
import com.adaptlearngraph.dtos.RegistrationDto.SignupRequest;
import com.adaptlearngraph.dtos.RegistrationDto.ViewResponse;
import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.services.RegistrationApplicationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.http.HttpStatus;
import org.springframework.context.annotation.Profile;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Profile("!starter")
@RequestMapping(ApiEndpoints.REGISTRATION)
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class RegistrationController {
    private final RegistrationApplicationService registration;

    public RegistrationController(RegistrationApplicationService registration) {
        this.registration = registration;
    }

    @GetMapping("/csrf")
    CsrfView csrf(CsrfToken token) { return new CsrfView(token.getHeaderName(), token.getToken()); }

    @GetMapping("/current")
    ViewResponse current(HttpServletRequest request) {
        return registration.current(request);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ViewResponse register(@Valid @RequestBody SignupRequest input, HttpServletRequest request) {
        return registration.register(input, request);
    }

    @PostMapping("/sign-in")
    ViewResponse signIn(@Valid @RequestBody SignInRequest input, HttpServletRequest request) {
        return registration.signIn(input, request);
    }

    @PostMapping("/email/resend")
    ViewResponse resend(HttpServletRequest request) {
        return registration.resend(request);
    }

    @PostMapping("/email/verify")
    ViewResponse verifyEmail(@Valid @RequestBody ProofRequest input, HttpServletRequest request) {
        return registration.verifyEmail(input, request);
    }

    @PostMapping("/totp/setup")
    EnrollmentResponse enrollment(HttpServletRequest request) {
        return registration.prepareEnrollment(request);
    }

    @PostMapping("/totp/confirm")
    CompletionResponse confirmEnrollment(@Valid @RequestBody ProofRequest input, HttpServletRequest request) {
        return registration.confirmEnrollment(input, request);
    }

    @PostMapping("/totp/verify")
    ViewResponse verifyTotp(@Valid @RequestBody ProofRequest input, HttpServletRequest request) {
        return registration.verifyTotp(input, request);
    }

    @PostMapping("/recovery")
    ViewResponse recover(@Valid @RequestBody ProofRequest input, HttpServletRequest request) {
        return registration.recover(input, request);
    }

    @PostMapping("/sign-out")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void signOut(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();
    }

    record CsrfView(String headerName, String token) {}
}