package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.CreatePrerequisiteCommand;
import com.adaptlearngraph.dtos.CreatePrerequisiteRequest;
import com.adaptlearngraph.dtos.PrerequisiteResponse;
import com.adaptlearngraph.entities.domain.PrerequisiteEdge;
import com.adaptlearngraph.entities.domain.SkillStatus;
import java.util.List;
import java.util.Objects;
import org.modelmapper.ModelMapper;

/** DTO boundary of the prerequisite catalog API; the organization always comes from the request path. */
public class PrerequisiteApplicationService {
    private final ManagePrerequisiteUseCase prerequisites;
    private final ModelMapper mapper;

    public PrerequisiteApplicationService(ManagePrerequisiteUseCase prerequisites, ModelMapper mapper) {
        this.prerequisites = Objects.requireNonNull(prerequisites, "prerequisites");
        this.mapper = Objects.requireNonNull(mapper, "mapper");
    }

    public List<PrerequisiteResponse> listPrerequisites(String organizationId) {
        return prerequisites.listPrerequisites(organizationId).stream().map(this::toResponse).toList();
    }

    public PrerequisiteResponse createPrerequisite(String organizationId, CreatePrerequisiteRequest request) {
        var command = new CreatePrerequisiteCommand(
                organizationId,
                request.sourceSkillId(),
                request.targetSkillId(),
                request.minMastery(),
                request.status() != null ? MicroSkillApplicationService.toDomain(request.status()) : SkillStatus.ACTIVE);
        return toResponse(prerequisites.createPrerequisite(command));
    }

    public void deletePrerequisite(String organizationId, String sourceSkillId, String targetSkillId) {
        prerequisites.deletePrerequisite(organizationId, sourceSkillId, targetSkillId);
    }

    private PrerequisiteResponse toResponse(PrerequisiteEdge edge) {
        return mapper.map(edge, PrerequisiteResponse.class);
    }
}