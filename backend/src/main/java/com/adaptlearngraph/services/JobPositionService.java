package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.JobPosition;
import com.adaptlearngraph.repository.JobPositionRepository;
import java.util.List;
import java.util.Objects;

public class JobPositionService implements GetJobPositionsUseCase {
    private final JobPositionRepository repository;

    public JobPositionService(JobPositionRepository repository) {
        this.repository = Objects.requireNonNull(repository, "repository cannot be null");
    }

    @Override
    public List<JobPosition> listJobPositions(String organizationId) {
        return repository.findAllJobPositions(organizationId);
    }

    @Override
    public JobPosition saveJobPosition(String organizationId, JobPosition jobPosition) {
        return repository.save(organizationId, jobPosition);
    }

    @Override
    public void deleteJobPosition(String organizationId, String idOrCode) {
        repository.delete(organizationId, idOrCode);
    }
}

