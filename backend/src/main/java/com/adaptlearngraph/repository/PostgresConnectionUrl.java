package com.adaptlearngraph.repository;

/** Repository fragment exposing the JDBC URL of the connection bound to the current JPA transaction. */
public interface PostgresConnectionUrl {
    /** URL reported by the driver for the connection the enclosing (or a new) JPA transaction runs on. */
    String connectionUrl();
}