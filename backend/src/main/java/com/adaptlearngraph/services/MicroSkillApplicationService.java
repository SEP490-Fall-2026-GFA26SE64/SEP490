package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.CreateMicroSkillCommand;
import com.adaptlearngraph.dtos.CreateMicroSkillRequest;
import com.adaptlearngraph.dtos.MicroSkillResponse;
import com.adaptlearngraph.dtos.SkillStatusDto;
import com.adaptlearngraph.dtos.UpdateMicroSkillCommand;
import com.adaptlearngraph.dtos.UpdateMicroSkillRequest;
import com.adaptlearngraph.entities.domain.MicroSkill;
import com.adaptlearngraph.entities.domain.SkillStatus;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import org.modelmapper.ModelMapper;

/** DTO boundary of the micro-skill catalog API; organization and skill ids always come from the request path. */
public class MicroSkillApplicationService {
    private final CreateMicroSkillUseCase createMicroSkill;
    private final GetMicroSkillsUseCase getMicroSkills;
    private final UpdateMicroSkillUseCase updateMicroSkill;
    private final DeleteMicroSkillUseCase deleteMicroSkill;
    private final ModelMapper mapper;

    public MicroSkillApplicationService(CreateMicroSkillUseCase createMicroSkill, GetMicroSkillsUseCase getMicroSkills,
            UpdateMicroSkillUseCase updateMicroSkill, DeleteMicroSkillUseCase deleteMicroSkill, ModelMapper mapper) {
        this.createMicroSkill = Objects.requireNonNull(createMicroSkill, "createMicroSkill");
        this.getMicroSkills = Objects.requireNonNull(getMicroSkills, "getMicroSkills");
        this.updateMicroSkill = Objects.requireNonNull(updateMicroSkill, "updateMicroSkill");
        this.deleteMicroSkill = Objects.requireNonNull(deleteMicroSkill, "deleteMicroSkill");
        this.mapper = Objects.requireNonNull(mapper, "mapper");
    }

    public List<MicroSkillResponse> searchMicroSkills(String organizationId, String query,
            SkillStatusDto status) {
        return getMicroSkills.searchMicroSkills(organizationId, query, toDomain(status)).stream()
                .map(this::toResponse)
                .toList();
    }

    public Optional<MicroSkillResponse> getMicroSkill(String organizationId, String id) {
        return getMicroSkills.getMicroSkill(organizationId, id).map(this::toResponse);
    }

    public MicroSkillResponse createMicroSkill(String organizationId, CreateMicroSkillRequest request) {
        var command = new CreateMicroSkillCommand(
                organizationId,
                request.code(),
                request.name(),
                request.description(),
                request.provision());
        return toResponse(createMicroSkill.createMicroSkill(command));
    }

    public MicroSkillResponse updateMicroSkill(String organizationId, String id, UpdateMicroSkillRequest request) {
        var command = new UpdateMicroSkillCommand(
                organizationId,
                id,
                request.name(),
                request.description(),
                request.status() != null ? toDomain(request.status()) : SkillStatus.ACTIVE,
                request.provision(),
                request.expectedVersion());
        return toResponse(updateMicroSkill.updateMicroSkill(command));
    }

    public void deleteMicroSkill(String organizationId, String id) {
        deleteMicroSkill.deleteMicroSkill(organizationId, id);
    }

    static SkillStatus toDomain(SkillStatusDto status) {
        return status == null ? null : SkillStatus.valueOf(status.name());
    }

    private MicroSkillResponse toResponse(MicroSkill skill) {
        return new MicroSkillResponse(
                skill.getId().toString(),
                skill.getOrganizationId(),
                skill.getCode(),
                skill.getName(),
                skill.getDescription(),
                skill.getStatus().name(),
                skill.getCreatedAt(),
                skill.getUpdatedAt(),
                skill.getVersion(),
                skill.getProvision().moduleOnlyKnowledgeLevels(),
                skill.getProvision().certificateOnlyKnowledgeLevels(),
                skill.getProvision().foundationOutcomeCodes(),
                skill.getProvision().intermediateOutcomeCodes(),
                skill.getProvision().advancedOutcomeCodes());
    }
}
