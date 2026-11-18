package com.adaptlearngraph.entities.domain;

/** Catalog boundary failure independent of any assessment or recommendation feature. */
public final class CatalogFailure extends com.adaptlearngraph.exception.CatalogFailure {
    public CatalogFailure(int status,String code) { super(status,code); }
}
