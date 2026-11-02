package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.OutboxEventEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

public interface OutboxEventJpaRepository extends Repository<OutboxEventEntity, UUID>, InsertOnlyRepository<OutboxEventEntity> {
    /** Status of the job handling the newest event of this type for the aggregate. */
    @Query("""
            select j.status from OutboxEventEntity e
            join ProcessingJobEntity j on j.eventId = e.eventId and j.handler = :type
            where e.eventType = :type and e.aggregateId = :aggregateId
            order by e.sourceRevision desc
            """)
    List<String> latestJobStatus(@Param("type") String eventType, @Param("aggregateId") UUID aggregateId, Pageable first);
}
