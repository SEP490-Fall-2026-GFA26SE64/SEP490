package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.JobPosition;
import java.util.List;
import java.util.Optional;

public interface JobPositionRepository {
    List<JobPosition> findAllJobPositions(String organizationId);
    Optional<JobPosition> findByIdOrCode(String organizationId, String idOrCode);
    JobPosition save(String organizationId, JobPosition jobPosition);
    default JobPosition saveChange(String organizationId, com.adaptlearngraph.entities.domain.JobPositionChange change) {
        throw new com.adaptlearngraph.entities.domain.CatalogFailure(503, "CATALOG_UNAVAILABLE");
    }
    void delete(String organizationId, String idOrCode);
}

