package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.hibernate.Session;
import org.springframework.transaction.annotation.Transactional;

/**
 * Spring Data fragment implementation for {@link PostgresConnectionUrl}. Connection metadata has no JPA equivalent, so it
 * is read through Hibernate's work API on the very connection that executes the transaction's statements.
 */
public class PostgresConnectionUrlImpl implements PostgresConnectionUrl {
    @PersistenceContext
    private EntityManager entityManager;

    @Override
    @Transactional(TransactionManagers.JPA)
    public String connectionUrl() {
        return entityManager.unwrap(Session.class).doReturningWork(connection -> connection.getMetaData().getURL());
    }
}