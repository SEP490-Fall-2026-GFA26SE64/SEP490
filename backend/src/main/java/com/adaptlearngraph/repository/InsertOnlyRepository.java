package com.adaptlearngraph.repository;

import java.util.List;

/**
 * Insert-only repository fragment. {@code insert} always uses {@code EntityManager.persist} and flushes immediately,
 * so an existing id fails with a constraint violation instead of being merged (overwritten), and database
 * constraints/triggers fire at the same point as the former JDBC INSERT.
 */
public interface InsertOnlyRepository<T> {
    <S extends T> S insert(S entity);

    <S extends T> List<S> insertAll(Iterable<S> entities);
}
