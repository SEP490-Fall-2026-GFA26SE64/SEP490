package com.adaptlearngraph.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** A write referenced a catalog node owned by another organization; reported as not found to avoid disclosure. */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class CrossTenantWriteException extends RuntimeException {
    public CrossTenantWriteException() {
        super("The requested catalog item was not found in this organization.");
    }
}
