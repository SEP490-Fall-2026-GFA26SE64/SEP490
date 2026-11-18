package com.adaptlearngraph.exception;

/** HTTP-safe catalog failure, independent of persistence and domain model types. */
public class CatalogFailure extends RuntimeException {
    public final int status;
    public final String code;
    public CatalogFailure(int status,String code) { super(code);this.status=status;this.code=code; }
}
