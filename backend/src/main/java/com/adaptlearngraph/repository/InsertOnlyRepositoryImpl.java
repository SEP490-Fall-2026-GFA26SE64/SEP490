package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.ArrayList;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;

/** Spring Data fragment implementation for {@link InsertOnlyRepository}. */
public class InsertOnlyRepositoryImpl<T> implements InsertOnlyRepository<T> {
    @PersistenceContext
    private EntityManager entityManager;

    @Override
    @Transactional(TransactionManagers.JPA)
    public <S extends T> S insert(S entity) {
        entityManager.persist(entity);
        entityManager.flush();
        return entity;
    }

    @Override
    @Transactional(TransactionManagers.JPA)
    public <S extends T> List<S> insertAll(Iterable<S> entities) {
        var inserted = new ArrayList<S>();
        for (S entity : entities) {
            entityManager.persist(entity);
            inserted.add(entity);
        }
        entityManager.flush();
        return inserted;
    }
}
