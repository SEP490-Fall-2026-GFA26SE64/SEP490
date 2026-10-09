package com.adaptlearngraph.competency.application;

import com.adaptlearngraph.competency.application.port.in.CreateMicroSkillCommand;
import com.adaptlearngraph.competency.application.port.in.CreateMicroSkillUseCase;
import com.adaptlearngraph.competency.application.port.in.DeleteMicroSkillUseCase;
import com.adaptlearngraph.competency.application.port.in.GetMicroSkillsUseCase;
import com.adaptlearngraph.competency.application.port.in.UpdateMicroSkillCommand;
import com.adaptlearngraph.competency.application.port.in.UpdateMicroSkillUseCase;
import com.adaptlearngraph.competency.application.port.out.MicroSkillRepository;
import com.adaptlearngraph.competency.domain.MicroSkill;
import com.adaptlearngraph.competency.domain.MicroSkillId;
import com.adaptlearngraph.competency.domain.MicroSkillInUseException;
import com.adaptlearngraph.competency.domain.SkillStatus;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.Optional;

public class MicroSkillService
        implements CreateMicroSkillUseCase, GetMicroSkillsUseCase, UpdateMicroSkillUseCase, DeleteMicroSkillUseCase {
    private final MicroSkillRepository microSkillRepository;

    public MicroSkillService(MicroSkillRepository microSkillRepository) {
        this.microSkillRepository = Objects.requireNonNull(microSkillRepository, "microSkillRepository cannot be null");
    }

    @Override
    public List<MicroSkill> listMicroSkills(String organizationId) {
        Objects.requireNonNull(organizationId, "organizationId cannot be null");
        return microSkillRepository.findAll(organizationId);
    }

    @Override
    public List<MicroSkill> searchMicroSkills(String organizationId, String query, String macroCode, SkillStatus status) {
        Objects.requireNonNull(organizationId, "organizationId cannot be null");
        return microSkillRepository.search(organizationId, query, macroCode, status);
    }

    @Override
    public Optional<MicroSkill> getMicroSkill(String organizationId, String skillId) {
        Objects.requireNonNull(organizationId, "organizationId cannot be null");
        Objects.requireNonNull(skillId, "skillId cannot be null");
        return microSkillRepository.findById(organizationId, MicroSkillId.fromString(skillId));
    }

    @Override
    public MicroSkill createMicroSkill(CreateMicroSkillCommand command) {
        Objects.requireNonNull(command, "command cannot be null");
        String normalizedCode = command.code() != null ? command.code().trim().toUpperCase() : "";
        if (microSkillRepository.existsByOrganizationIdAndCode(command.organizationId(), normalizedCode)) {
            throw new DuplicateMicroSkillException(command.organizationId(), normalizedCode);
        }

        MicroSkill skill = MicroSkill.createNew(
                command.organizationId(),
                command.code(),
                command.name(),
                command.description(),
                command.macroCompetencyCode());

        return microSkillRepository.save(skill);
    }

    @Override
    public MicroSkill updateMicroSkill(UpdateMicroSkillCommand command) {
        Objects.requireNonNull(command, "command cannot be null");
        MicroSkillId id = MicroSkillId.fromString(command.skillId());
        MicroSkill existing = microSkillRepository.findById(command.organizationId(), id)
                .orElseThrow(() -> new NoSuchElementException("MicroSkill not found with id: " + command.skillId()));

        MicroSkill updated = existing.update(
                command.name(),
                command.description(),
                command.macroCompetencyCode(),
                command.status());

        return microSkillRepository.save(updated);
    }

    @Override
    public void deleteMicroSkill(String organizationId, String skillId) {
        Objects.requireNonNull(organizationId, "organizationId cannot be null");
        Objects.requireNonNull(skillId, "skillId cannot be null");
        MicroSkillId id = MicroSkillId.fromString(skillId);
        MicroSkill existing = microSkillRepository.findById(organizationId, id)
                .orElseThrow(() -> new NoSuchElementException("MicroSkill not found with id: " + skillId));

        int dependencies = microSkillRepository.countDependencies(organizationId, id);
        if (dependencies > 0) {
            throw new MicroSkillInUseException(
                    "Cannot delete micro-skill " + existing.getCode() + " because it is currently referenced by "
                            + dependencies + " active role requirements, prerequisites, or module outcomes.");
        }

        microSkillRepository.delete(organizationId, id);
    }
}
