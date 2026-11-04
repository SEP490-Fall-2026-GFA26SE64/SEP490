package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.JobPositionResponse;
import com.adaptlearngraph.dtos.SaveJobPositionRequest;
import com.adaptlearngraph.entities.domain.JobPosition;
import java.util.List;
import java.util.Objects;
import org.modelmapper.ModelMapper;

/** DTO boundary of the organization job position catalog API. */
public class JobPositionApplicationService {
    private final GetJobPositionsUseCase jobPositions;
    private final ModelMapper mapper;

    public JobPositionApplicationService(GetJobPositionsUseCase jobPositions, ModelMapper mapper) {
        this.jobPositions = Objects.requireNonNull(jobPositions, "jobPositions");
        this.mapper = Objects.requireNonNull(mapper, "mapper");
    }

    public List<JobPositionResponse> listJobPositions(String organizationId) {
        return jobPositions.listJobPositions(organizationId).stream().map(this::toResponse).toList();
    }

    public JobPositionResponse createJobPosition(String organizationId, SaveJobPositionRequest request) {
        String code = request.code() != null ? request.code().trim() : "";
        String id = request.id() != null && !request.id().isBlank() ? request.id().trim() : code;
        return toResponse(jobPositions.saveJobPosition(organizationId, jobPosition(id, code, request)));
    }

    public JobPositionResponse updateJobPosition(String organizationId, String id, SaveJobPositionRequest request) {
        String code = request.code() != null && !request.code().isBlank() ? request.code().trim() : id;
        return toResponse(jobPositions.saveJobPosition(organizationId, jobPosition(id, code, request)));
    }

    public void deleteJobPosition(String organizationId, String id) {
        jobPositions.deleteJobPosition(organizationId, id);
    }

    private static JobPosition jobPosition(String id, String code, SaveJobPositionRequest request) {
        return new JobPosition(
                id,
                code,
                request.name() != null ? request.name().trim() : "",
                request.jobZone() != null && request.jobZone() > 0 ? request.jobZone() : 4,
                request.interestRealistic() != null ? request.interestRealistic() : 0.0,
                request.interestInvestigative() != null ? request.interestInvestigative() : 0.0,
                request.interestArtistic() != null ? request.interestArtistic() : 0.0,
                request.interestSocial() != null ? request.interestSocial() : 0.0,
                request.interestEnterprising() != null ? request.interestEnterprising() : 0.0,
                request.interestConventional() != null ? request.interestConventional() : 0.0,
                request.status() != null ? request.status() : "ACTIVE",
                request.version() != null ? request.version() : "0.9.0",
                0,
                0);
    }

    private JobPositionResponse toResponse(JobPosition jobPosition) {
        return mapper.map(jobPosition, JobPositionResponse.class);
    }
}

