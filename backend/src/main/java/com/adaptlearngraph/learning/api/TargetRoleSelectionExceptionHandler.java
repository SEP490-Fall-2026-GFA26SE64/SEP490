package com.adaptlearngraph.learning.api;

import com.adaptlearngraph.learning.application.TargetRoleSelectionException;
import jakarta.validation.ConstraintViolationException;
import org.springframework.beans.TypeMismatchException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.ServletRequestBindingException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;

@RestControllerAdvice(assignableTypes = TargetRoleSelectionController.class)
public class TargetRoleSelectionExceptionHandler {
    @ExceptionHandler(TargetRoleSelectionException.class)
    ResponseEntity<ApiError> handleSelectionFailure(TargetRoleSelectionException exception) {
        HttpStatus status = switch (exception.code()) {
            case UNAUTHENTICATED -> HttpStatus.UNAUTHORIZED;
            case FORBIDDEN -> HttpStatus.FORBIDDEN;
            case ROLE_NOT_AVAILABLE -> HttpStatus.NOT_FOUND;
            case CATALOG_UNAVAILABLE, DEPENDENCY_UNAVAILABLE -> HttpStatus.SERVICE_UNAVAILABLE;
            case IDEMPOTENCY_CONFLICT, REQUEST_IN_PROGRESS, STALE_SELECTION,
                    ASSESSMENT_IN_PROGRESS, SELECTION_STATE_CONFLICT -> HttpStatus.CONFLICT;
        };
        return ResponseEntity.status(status).body(new ApiError(exception.code().name(), exception.getMessage()));
    }

    @ExceptionHandler({
            TypeMismatchException.class,
            ConstraintViolationException.class,
            HandlerMethodValidationException.class,
            MethodArgumentNotValidException.class,
            HttpMessageNotReadableException.class,
            ServletRequestBindingException.class,
            TargetRoleSelectionController.InvalidRequestException.class
    })
    ResponseEntity<ApiError> handleInvalidRequest(Exception exception) {
        return ResponseEntity.badRequest().body(new ApiError("INVALID_REQUEST", "Request input is invalid"));
    }

    record ApiError(String code, String message) {}
}
