package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.InitialPathwayRevisionEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/** Immutable initial pathway revisions (trigger initial_pathway_revision_immutable), scoped by organization and learner. */
public interface InitialPathwayRevisionJpaRepository extends Repository<InitialPathwayRevisionEntity, InitialPathwayRevisionEntity.Key>,
        InsertOnlyRepository<InitialPathwayRevisionEntity> {

    record Content(String content, String contentHash, Short formatVersion) {}

    @Query("""
            select new com.adaptlearngraph.repository.InitialPathwayRevisionJpaRepository$Content(v.content, v.contentHash, v.formatVersion)
            from InitialPathwayRevisionEntity v
            where v.organizationId = :org and v.learnerId = :learner and v.requestId = :id and v.revision = :revision
            """)
    List<Content> content(@Param("org") UUID organizationId, @Param("learner") UUID learnerId, @Param("id") UUID requestId,
            @Param("revision") long revision);
}
