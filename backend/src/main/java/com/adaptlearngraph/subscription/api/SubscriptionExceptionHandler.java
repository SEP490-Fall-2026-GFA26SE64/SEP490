package com.adaptlearngraph.subscription.api;

import com.adaptlearngraph.identity.domain.RegistrationFailure;
import com.adaptlearngraph.subscription.domain.SubscriptionFailure;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice(basePackages = "com.adaptlearngraph.subscription.api",
        assignableTypes = com.adaptlearngraph.identity.api.MemberActivationController.class)
public class SubscriptionExceptionHandler {
    private static final Logger LOG = LoggerFactory.getLogger(SubscriptionExceptionHandler.class);

    @ExceptionHandler(SubscriptionFailure.class)
    ResponseEntity<ErrorView> policy(SubscriptionFailure failure) {
        HttpStatus status = switch (failure.code()) {
            case INVALID_INPUT -> HttpStatus.BAD_REQUEST;
            case UNAUTHENTICATED -> HttpStatus.UNAUTHORIZED;
            case FORBIDDEN -> HttpStatus.FORBIDDEN;
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case CONFLICT, CAPACITY_EXCEEDED, REFERENCE_DATA_REQUIRED, PAYMENT_EXCEPTION -> HttpStatus.CONFLICT;
            case PROVIDER_UNAVAILABLE, SERVICE_UNAVAILABLE -> HttpStatus.SERVICE_UNAVAILABLE;
        };
        return ResponseEntity.status(status).body(new ErrorView(failure.code().name(), failure.getMessage(), failure.field(), 0));
    }

    @ExceptionHandler(RegistrationFailure.class)
    ResponseEntity<ErrorView> identity(RegistrationFailure failure) {
        HttpStatus status = switch (failure.code()) {
            case UNAUTHENTICATED -> HttpStatus.UNAUTHORIZED;
            case FORBIDDEN -> HttpStatus.FORBIDDEN;
            case RATE_LIMITED -> HttpStatus.TOO_MANY_REQUESTS;
            case SERVICE_UNAVAILABLE -> HttpStatus.SERVICE_UNAVAILABLE;
            case SIGNUP_CONFLICT, SLUG_UNAVAILABLE -> HttpStatus.CONFLICT;
            case INVALID_INPUT, INVALID_PROOF, EXPIRED_PROOF -> HttpStatus.BAD_REQUEST;
        };
        var response = ResponseEntity.status(status);
        if (failure.retryAfterSeconds() > 0) response.header("Retry-After", Long.toString(failure.retryAfterSeconds()));
        return response.body(new ErrorView(failure.code().name(), failure.getMessage(), failure.field(), failure.retryAfterSeconds()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ErrorView> fields(MethodArgumentNotValidException failure) {
        String field = failure.getBindingResult().getFieldErrors().stream().findFirst()
                .map(error -> error.getField()).orElse(null);
        return ResponseEntity.badRequest().body(new ErrorView("INVALID_INPUT", "Check the required field and its value.", field, 0));
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    ResponseEntity<ErrorView> input() {
        return ResponseEntity.badRequest().body(new ErrorView("INVALID_INPUT", "Send a valid subscription request.", null, 0));
    }

    @ExceptionHandler(DataAccessException.class)
    ResponseEntity<ErrorView> storage(DataAccessException failure) {
        LOG.error("Subscription persistence failed ({})", failure.getClass().getSimpleName());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new ErrorView("SERVICE_UNAVAILABLE", "Subscription storage is unavailable. Retry later.", null, 0));
    }

    record ErrorView(String code, String message, String field, long retryAfterSeconds) {}
}
