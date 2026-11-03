package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.CompetencyDto.CompetencyResponse;
import com.adaptlearngraph.dtos.CompetencyDto.CreateCompetencyRequest;
import com.adaptlearngraph.dtos.CompetencyDto.UpdateCompetencyRequest;
import com.adaptlearngraph.entities.domain.CompetencyRecord;
import java.util.List;
import java.util.Objects;
import org.modelmapper.ModelMapper;

/** DTO boundary of the organization competency catalog API. */
public class CompetencyApplicationService {
    private final ManageCompetencyUseCase competencies;
    private final ModelMapper mapper;

    public CompetencyApplicationService(ManageCompetencyUseCase competencies, ModelMapper mapper) {
        this.competencies = Objects.requireNonNull(competencies, "competencies");
        this.mapper = Objects.requireNonNull(mapper, "mapper");
    }

    public List<CompetencyResponse> listCompetencies(String organizationId, String search) {
        return competencies.listCompetencies(organizationId, search).stream().map(this::toResponse).toList();
    }

    public CompetencyResponse createCompetency(String organizationId, CreateCompetencyRequest request) {
        return toResponse(competencies.createCompetency(organizationId, request.code(), request.name(),
                request.description(), request.skillIds(), request.levelId()));
    }

    public CompetencyResponse updateCompetency(String organizationId, String id, UpdateCompetencyRequest request) {
        return toResponse(competencies.updateCompetency(organizationId, id, request.code(), request.name(),
                request.description(), request.skillIds()));
    }

    public void deleteCompetency(String organizationId, String id) {
        competencies.deleteCompetency(organizationId, id);
    }

    private CompetencyResponse toResponse(CompetencyRecord record) {
        return mapper.map(record, CompetencyResponse.class);
    }
}