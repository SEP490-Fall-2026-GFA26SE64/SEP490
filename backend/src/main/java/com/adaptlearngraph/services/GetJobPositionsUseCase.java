package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.JobPosition;
import java.util.List;

public interface GetJobPositionsUseCase {
    List<JobPosition> listJobPositions(String organizationId);
    JobPosition saveJobPosition(String organizationId, JobPosition jobPosition);
    void deleteJobPosition(String organizationId, String idOrCode);
}

