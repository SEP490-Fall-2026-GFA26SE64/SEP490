package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.RegistrationDto.CompletionResponse;
import com.adaptlearngraph.dtos.RegistrationDto.EnrollmentResponse;
import com.adaptlearngraph.dtos.RegistrationDto.ProofRequest;
import com.adaptlearngraph.dtos.RegistrationDto.SignInRequest;
import com.adaptlearngraph.dtos.RegistrationDto.SignupRequest;
import com.adaptlearngraph.dtos.RegistrationDto.ViewResponse;
import com.adaptlearngraph.entities.domain.RegistrationActor;
import com.adaptlearngraph.entities.domain.RegistrationFields;
import com.adaptlearngraph.exception.RegistrationFailure;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.util.List;
import java.util.Objects;
import org.modelmapper.ModelMapper;
import org.springframework.session.FindByIndexNameSessionRepository;

/**
 * DTO boundary of the registration API. The registration actor and the encrypted TOTP enrollment secret are kept in
 * the server-side session and never leave this service.
 */
public class RegistrationApplicationService {
    static final String ACTOR = "REGISTRATION_ACTOR";
    private static final String ENROLLMENT = "REGISTRATION_ENROLLMENT";
    private final RegistrationUseCase registration;
    private final ModelMapper mapper;

    public RegistrationApplicationService(RegistrationUseCase registration, ModelMapper mapper) {
        this.registration = Objects.requireNonNull(registration, "registration");
        this.mapper = Objects.requireNonNull(mapper, "mapper");
    }

    public ViewResponse current(HttpServletRequest request) {
        return view(actor(request));
    }

    public ViewResponse register(SignupRequest input, HttpServletRequest request) {
        var fields = new RegistrationFields(input.organizationName(), input.subdomain(), input.industry(),
                input.headcount(), input.adminName(), input.adminEmail());
        var actor = registration.register(fields, input.password(), request.getRemoteAddr(),
                input.catalogSelection() == null ? List.of() : input.catalogSelection());
        establish(request, actor);
        return view(actor);
    }

    public ViewResponse signIn(SignInRequest input, HttpServletRequest request) {
        var actor = registration.signIn(input.email(), input.password(), request.getRemoteAddr());
        establish(request, actor);
        return view(actor);
    }

    public ViewResponse resend(HttpServletRequest request) {
        var actor = actor(request);
        registration.resend(actor, request.getRemoteAddr());
        return view(actor);
    }

    public ViewResponse verifyEmail(ProofRequest input, HttpServletRequest request) {
        var actor = registration.verifyEmail(actor(request), input.code(), request.getRemoteAddr());
        establish(request, actor);
        return view(actor);
    }

    public EnrollmentResponse prepareEnrollment(HttpServletRequest request) {
        var actor = actor(request);
        HttpSession session = request.getSession(false);
        Object saved = session.getAttribute(ENROLLMENT);
        var enrollment = registration.prepareEnrollment(actor, saved instanceof String value ? value : null);
        session.setAttribute(ENROLLMENT, enrollment.encryptedSecret());
        return mapper.map(enrollment, EnrollmentResponse.class);
    }

    public CompletionResponse confirmEnrollment(ProofRequest input, HttpServletRequest request) {
        var actor = actor(request);
        Object saved = request.getSession(false).getAttribute(ENROLLMENT);
        var result = registration.confirmEnrollment(actor, saved instanceof String value ? value : null,
                input.code(), request.getRemoteAddr());
        establish(request, result.actor());
        return new CompletionResponse(view(result.actor()), result.recoveryCodes());
    }

    public ViewResponse verifyTotp(ProofRequest input, HttpServletRequest request) {
        var actor = registration.verifyTotp(actor(request), input.code(), request.getRemoteAddr());
        establish(request, actor);
        return view(actor);
    }

    public ViewResponse recover(ProofRequest input, HttpServletRequest request) {
        var actor = registration.recover(actor(request), input.code(), request.getRemoteAddr());
        establish(request, actor);
        return view(actor);
    }

    private ViewResponse view(RegistrationActor actor) {
        var view = registration.current(actor);
        return view == null ? null : mapper.map(view, ViewResponse.class);
    }

    static RegistrationActor actor(HttpServletRequest request) {
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
}