package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.OccupationResponse;
import com.adaptlearngraph.dtos.SaveOccupationRequest;
import com.adaptlearngraph.entities.domain.Occupation;
import java.util.List;
import java.util.Objects;
import org.modelmapper.ModelMapper;

/** DTO boundary of the organization occupation catalog API. */
public class OccupationApplicationService {
    private final GetOccupationsUseCase occupations;
    private final ModelMapper mapper;

    public OccupationApplicationService(GetOccupationsUseCase occupations, ModelMapper mapper) {
        this.occupations = Objects.requireNonNull(occupations, "occupations");
        this.mapper = Objects.requireNonNull(mapper, "mapper");
    }

    public List<OccupationResponse> listOccupations(String organizationId) {
        return occupations.listOccupations(organizationId).stream().map(this::toResponse).toList();
    }

    public OccupationResponse createOccupation(String organizationId, SaveOccupationRequest request) {
        String code = request.code() != null ? request.code().trim() : "";
        String id = request.id() != null && !request.id().isBlank() ? request.id().trim() : code;
        return toResponse(occupations.saveOccupation(organizationId, occupation(id, code, request)));
    }

    public OccupationResponse updateOccupation(String organizationId, String id, SaveOccupationRequest request) {
        String code = request.code() != null && !request.code().isBlank() ? request.code().trim() : id;
        return toResponse(occupations.saveOccupation(organizationId, occupation(id, code, request)));
    }

    public void deleteOccupation(String organizationId, String id) {
        occupations.deleteOccupation(organizationId, id);
    }

    private static Occupation occupation(String id, String code, SaveOccupationRequest request) {
        return new Occupation(
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

    private OccupationResponse toResponse(Occupation occupation) {
        return mapper.map(occupation, OccupationResponse.class);
    }
}