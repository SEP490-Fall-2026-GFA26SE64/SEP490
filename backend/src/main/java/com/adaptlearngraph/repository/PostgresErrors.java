package com.adaptlearngraph.repository;

import java.sql.SQLException;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DuplicateKeyException;

/** Classifies PostgreSQL failures surfaced through JPA the same way the former JDBC adapters did. */
public final class PostgresErrors {
    private static final String UNIQUE_VIOLATION = "23505";

    private PostgresErrors() {
    }

    public static boolean isUniqueViolation(Throwable failure) {
        for (Throwable cause = failure; cause != null; cause = cause.getCause()) {
            if (cause instanceof DuplicateKeyException) return true;
            if (cause instanceof SQLException sql && UNIQUE_VIOLATION.equals(sql.getSQLState())) return true;
        }
        return false;
    }

    public static boolean isUniqueViolation(DataAccessException failure) {
        return isUniqueViolation((Throwable) failure);
    }
}
