package com.adaptlearngraph.catalog.api;

import com.adaptlearngraph.catalog.application.TargetRoleQueryException;
import jakarta.validation.ConstraintViolationException;
import org.springframework.beans.TypeMismatchException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;

@RestControllerAdvice(assignableTypes = TargetRoleController.class)
public class TargetRoleExceptionHandler {
    @ExceptionHandler(TargetRoleQueryException.class)
    ResponseEntity<ApiError> handleQueryFailure(TargetRoleQueryException exception) {
        HttpStatus status = switch (exception.code()) {
            case UNAUTHENTICATED -> HttpStatus.UNAUTHORIZED;
            case FORBIDDEN -> HttpStatus.FORBIDDEN;
            case INVALID_REQUEST -> HttpStatus.BAD_REQUEST;
            case ROLE_NOT_AVAILABLE -> HttpStatus.NOT_FOUND;
            case CATALOG_UNAVAILABLE -> HttpStatus.SERVICE_UNAVAILABLE;
        };
        return ResponseEntity.status(status).body(new ApiError(exception.code().name(), exception.getMessage()));
    }

    @ExceptionHandler({TypeMismatchException.class, ConstraintViolationException.class,
            HandlerMethodValidationException.class})
    ResponseEntity<ApiError> handleInvalidRequest(Exception exception) {
        return ResponseEntity.badRequest().body(new ApiError("INVALID_REQUEST", "Request parameters are invalid"));
    }

    record ApiError(String code, String message) {}
}
