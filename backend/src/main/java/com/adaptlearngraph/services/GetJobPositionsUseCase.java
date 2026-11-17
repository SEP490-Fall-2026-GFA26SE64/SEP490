package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.JobPosition;
import java.util.List;

public interface GetJobPositionsUseCase {
    List<JobPosition> listJobPositions(String organizationId);
    JobPosition saveJobPosition(String organizationId, JobPosition jobPosition);
    default JobPosition saveChange(String organizationId, com.adaptlearngraph.entities.domain.JobPositionChange change) {
        throw new com.adaptlearngraph.entities.domain.CatalogFailure(503, "CATALOG_UNAVAILABLE");
    }
    void deleteJobPosition(String organizationId, String idOrCode);
}

