package com.adaptlearngraph.repository;

import com.adaptlearngraph.constants.TransactionManagers;
import com.adaptlearngraph.entities.PathwayRevisionEntity;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/** Legacy published pathways, keyed by learner; content stays frozen by the pathway_content_frozen trigger. */
public interface PathwayRevisionJpaRepository extends Repository<PathwayRevisionEntity, UUID> {

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional(TransactionManagers.JPA)
    @Query("""
            update PathwayRevisionEntity p set p.status = 'SUPERSEDED'
            where p.learnerId = :learner and p.selectionId = :selection and p.status = 'PUBLISHED_CURRENT'
            """)
    int supersedeCurrent(@Param("learner") UUID learnerId, @Param("selection") UUID selectionId);

    @Query("""
            select count(p) > 0 from PathwayRevisionEntity p
            where p.learnerId = :learner and p.selectionId <> :selection and p.status = 'PUBLISHED_CURRENT'
            """)
    boolean hasOtherCurrent(@Param("learner") UUID learnerId, @Param("selection") UUID selectionId);

    @Query("select count(p) > 0 from PathwayRevisionEntity p where p.learnerId = :learner and p.status = 'PUBLISHED_CURRENT'")
    boolean hasCurrent(@Param("learner") UUID learnerId);
}
