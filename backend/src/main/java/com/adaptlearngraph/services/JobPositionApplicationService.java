package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.JobPositionResponse;
import com.adaptlearngraph.dtos.SaveJobPositionRequest;
import com.adaptlearngraph.entities.domain.JobPosition;
import com.adaptlearngraph.entities.domain.JobPositionChange;
import com.adaptlearngraph.entities.domain.CatalogFailure;
import java.util.List;
import java.util.Objects;
import org.modelmapper.ModelMapper;

/** DTO boundary of the organization job position catalog API. */
public class JobPositionApplicationService {
    private final GetJobPositionsUseCase jobPositions;
    private final ModelMapper mapper;
    private final JobPositionCatalogAccess access;

    public JobPositionApplicationService(GetJobPositionsUseCase jobPositions, ModelMapper mapper) {
        this(jobPositions, mapper, org -> { throw new CatalogFailure(503, "CATALOG_AUTHORIZATION_UNAVAILABLE"); });
    }
    public JobPositionApplicationService(GetJobPositionsUseCase jobPositions, ModelMapper mapper, JobPositionCatalogAccess access) {
        this.jobPositions = Objects.requireNonNull(jobPositions, "jobPositions");
        this.mapper = Objects.requireNonNull(mapper, "mapper");
        this.access = Objects.requireNonNull(access, "access");
    }

    public List<JobPositionResponse> listJobPositions(String organizationId) {
        return jobPositions.listJobPositions(organizationId).stream().map(this::toResponse).toList();
    }

    public JobPositionResponse createJobPosition(String organizationId, SaveJobPositionRequest request) {
        String author = access.requireManager(organizationId);
        if (request == null) throw new CatalogFailure(400, "INVALID_REQUEST");
        String code = request.code() != null ? request.code().trim() : "";
        String id = request.id() != null && !request.id().isBlank() ? request.id().trim() : code;
        return toResponse(jobPositions.saveChange(organizationId, change(id, code, request, author, true)));
    }

    public JobPositionResponse updateJobPosition(String organizationId, String id, SaveJobPositionRequest request) {
        String author = access.requireManager(organizationId);
        if (request == null) throw new CatalogFailure(400, "INVALID_REQUEST");
        String code = request.code() != null && !request.code().isBlank() ? request.code().trim() : null;
        return toResponse(jobPositions.saveChange(organizationId, change(id, code, request, author, false)));
    }

    public void deleteJobPosition(String organizationId, String id) {
        access.requireManager(organizationId);
        jobPositions.deleteJobPosition(organizationId, id);
    }

    private static JobPositionChange change(String id, String code, SaveJobPositionRequest r, String author, boolean create) {
        if (id == null || id.isBlank() || id.length() > 200 || (create && (code == null || code.isBlank() || r.name() == null || r.name().isBlank()))
                || (code != null && code.length() > 200) || (r.name() != null && (r.name().isBlank() || r.name().length() > 500))
                || (r.description()!=null && r.description().length()>4000)
                || (r.jobZone() != null && r.jobZone() < 1)) throw new CatalogFailure(400, "INVALID_REQUEST");
        return new JobPositionChange(id, code, r.name() == null ? null : r.name().trim(), r.jobZone(), r.status(), r.version(),
                author, create, r.description(), profile(r));
    }

    private static java.util.Map<String,Integer> profile(SaveJobPositionRequest r) {
        var values = new com.fasterxml.jackson.databind.JsonNode[]{r.interestRealistic(),r.interestInvestigative(),
                r.interestArtistic(),r.interestSocial(),r.interestEnterprising(),r.interestConventional()};
        // Omitted fields preserve the profile; explicit six nulls clear it.
        if(java.util.Arrays.stream(values).allMatch(java.util.Objects::isNull)) return null;
        if(java.util.Arrays.stream(values).allMatch(v -> v != null && v.isNull())) return java.util.Map.of();
        var profile = new java.util.LinkedHashMap<String,Integer>();
        var keys = java.util.List.of("interestRealistic","interestInvestigative","interestArtistic","interestSocial","interestEnterprising","interestConventional");
        for(int i=0;i<6;i++) {
            var v=values[i];
            if(v==null || !v.isIntegralNumber() || !v.canConvertToInt() || v.intValue()<0 || v.intValue()>40)
                throw new CatalogFailure(400,"INVALID_RIASEC_PROFILE");
            profile.put(keys.get(i),v.intValue());
        }
        return java.util.Map.copyOf(profile);
    }

    private JobPositionResponse toResponse(JobPosition jobPosition) {
        return mapper.map(jobPosition, JobPositionResponse.class);
    }
}

