package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.JobPosition;
import java.util.List;
import java.util.Optional;

public interface JobPositionRepository {
    List<JobPosition> findAllJobPositions(String organizationId);
    Optional<JobPosition> findByIdOrCode(String organizationId, String idOrCode);
    JobPosition save(String organizationId, JobPosition jobPosition);
    void delete(String organizationId, String idOrCode);
}

