package com.adaptlearngraph.entities.domain;

/** Catalog boundary failure independent of any assessment or recommendation feature. */
public final class CatalogFailure extends RuntimeException {
    public final int status;
    public final String code;
    public CatalogFailure(int status,String code) { super(code);this.status=status;this.code=code; }
}
