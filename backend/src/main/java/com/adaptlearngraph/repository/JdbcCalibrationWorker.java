package com.adaptlearngraph.repository;

import com.adaptlearngraph.repository.CalibrationPorts.WorkerLease;
import com.adaptlearngraph.entities.Calibration.*;
import java.sql.Connection;
import javax.sql.DataSource;

/**
 * Global session lock bounds concurrent computation across application instances, without a long transaction.
 * Deliberately plain JDBC (not JPA): {@code pg_try_advisory_lock} is a session-level lock that must stay held on one
 * dedicated pooled connection outside any transaction for the whole computation, which a transaction-scoped
 * EntityManager cannot provide.
 */
public final class JdbcCalibrationWorker {
    private static final long KEY=726490002018L;
    public static WorkerLease acquire(DataSource dataSource) {
        Connection connection=null;
        try {
            connection=dataSource.getConnection();
            if (!connection.getAutoCommit()) throw new java.sql.SQLException("Worker connection must be outside a transaction");
            try (var sql=connection.prepareStatement("SELECT pg_try_advisory_lock(?)")) {
                sql.setQueryTimeout(5); sql.setLong(1,KEY);
                try (var rows=sql.executeQuery()) {
                    if (!rows.next() || !rows.getBoolean(1)) { connection.close(); throw new Failure(Code.RESOURCE_LIMIT); }
                }
            }
            Connection held=connection;
            return ()->{
                try (var sql=held.prepareStatement("SELECT pg_advisory_unlock(?)")) {
                    sql.setQueryTimeout(5); sql.setLong(1,KEY); sql.execute();
                } catch (java.sql.SQLException failure) {
                    try { held.abort(Runnable::run); } catch (java.sql.SQLException ignored) { /* pool evicts aborted connection */ }
                    throw new Failure(Code.DEPENDENCY_UNAVAILABLE);
                } finally { try { held.close(); } catch (java.sql.SQLException ignored) { /* already aborted */ } }
            };
        } catch (java.sql.SQLException failure) {
            if (connection!=null) try { connection.close(); } catch (java.sql.SQLException ignored) { /* no acquired lock */ }
            throw new Failure(Code.DEPENDENCY_UNAVAILABLE);
        }
    }
}
