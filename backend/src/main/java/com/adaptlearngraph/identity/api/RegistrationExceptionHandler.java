package com.adaptlearngraph.identity.api;

import com.adaptlearngraph.identity.domain.RegistrationFailure;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = {
        RegistrationController.class, WorkspaceAuthenticationController.class, RegistrationWorkspaceEntryController.class,MemberActivationController.class})
public class RegistrationExceptionHandler {
    private static final Logger LOG = LoggerFactory.getLogger(RegistrationExceptionHandler.class);

    @ExceptionHandler(RegistrationFailure.class)
    ResponseEntity<ErrorView> policyFailure(RegistrationFailure failure) {
        HttpStatus status = switch (failure.code()) {
            case INVALID_INPUT, INVALID_PROOF, EXPIRED_PROOF -> HttpStatus.BAD_REQUEST;
            case SIGNUP_CONFLICT, SLUG_UNAVAILABLE -> HttpStatus.CONFLICT;
            case UNAUTHENTICATED -> HttpStatus.UNAUTHORIZED;
            case FORBIDDEN -> HttpStatus.FORBIDDEN;
            case RATE_LIMITED -> HttpStatus.TOO_MANY_REQUESTS;
            case SERVICE_UNAVAILABLE -> HttpStatus.SERVICE_UNAVAILABLE;
        };
        var headers = new HttpHeaders();
        if (failure.retryAfterSeconds() > 0) headers.set(HttpHeaders.RETRY_AFTER, Long.toString(failure.retryAfterSeconds()));
        return new ResponseEntity<>(new ErrorView(failure.code().name(), failure.getMessage(),
                failure.field(), failure.retryAfterSeconds()), headers, status);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ErrorView> invalidFields(MethodArgumentNotValidException failure) {
        var field = failure.getBindingResult().getFieldErrors().stream().findFirst();
        return ResponseEntity.badRequest().body(new ErrorView("INVALID_INPUT", "Check the required field and its length.",
                field.map(error -> error.getField()).orElse(null), 0));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ErrorView> invalidJson() {
        return ResponseEntity.badRequest().body(new ErrorView("INVALID_INPUT", "Send a valid request.", null, 0));
    }

    @ExceptionHandler(DataAccessException.class)
    ResponseEntity<ErrorView> persistenceUnavailable(DataAccessException failure) {
        LOG.error("Registration persistence failed ({})", failure.getClass().getSimpleName());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new ErrorView("SERVICE_UNAVAILABLE", "Registration storage is unavailable. Retry later.", null, 0));
    }

    record ErrorView(String code, String message, String field, long retryAfterSeconds) {}
}
