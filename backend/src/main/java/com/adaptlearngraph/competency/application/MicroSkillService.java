package com.adaptlearngraph.competency.application;

import com.adaptlearngraph.competency.application.port.in.CreateMicroSkillCommand;
import com.adaptlearngraph.competency.application.port.in.CreateMicroSkillUseCase;
import com.adaptlearngraph.competency.application.port.out.MicroSkillRepository;
import com.adaptlearngraph.competency.domain.MicroSkill;

import java.util.Objects;

public class MicroSkillService implements CreateMicroSkillUseCase {
    private final MicroSkillRepository microSkillRepository;

    public MicroSkillService(MicroSkillRepository microSkillRepository) {
        this.microSkillRepository = Objects.requireNonNull(microSkillRepository, "microSkillRepository cannot be null");
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
}
