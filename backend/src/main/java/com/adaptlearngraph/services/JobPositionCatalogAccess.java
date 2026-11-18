package com.adaptlearngraph.services;

/** Returns the trusted author account; path organization is checked, never treated as authority. */
public interface JobPositionCatalogAccess {
    String requireManager(String organizationId);
}
