package com.adaptlearngraph.competency.application;

import com.adaptlearngraph.competency.application.port.in.CreatePrerequisiteCommand;
import com.adaptlearngraph.competency.application.port.in.GetTargetRoleGraphUseCase;
import com.adaptlearngraph.competency.application.port.in.ManagePrerequisiteUseCase;
import com.adaptlearngraph.competency.application.port.out.PrerequisiteRepository;
import com.adaptlearngraph.competency.application.port.out.TargetRoleGraphPort;
import com.adaptlearngraph.competency.domain.PrerequisiteCycleException;
import com.adaptlearngraph.competency.domain.PrerequisiteEdge;
import com.adaptlearngraph.competency.domain.TargetRoleGraph;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

public class PrerequisiteService implements ManagePrerequisiteUseCase, GetTargetRoleGraphUseCase {
    private final PrerequisiteRepository prerequisiteRepository;
    private final TargetRoleGraphPort targetRoleGraphPort;

    public PrerequisiteService(
            PrerequisiteRepository prerequisiteRepository,
            TargetRoleGraphPort targetRoleGraphPort) {
        this.prerequisiteRepository = Objects.requireNonNull(prerequisiteRepository, "prerequisiteRepository cannot be null");
        this.targetRoleGraphPort = Objects.requireNonNull(targetRoleGraphPort, "targetRoleGraphPort cannot be null");
    }

    @Override
    public PrerequisiteEdge createPrerequisite(CreatePrerequisiteCommand command) {
        Objects.requireNonNull(command, "command cannot be null");
        if (command.sourceSkillId().equals(command.targetSkillId())) {
            throw new IllegalArgumentException("Self-referencing prerequisite is not allowed: a micro-skill cannot be a prerequisite of itself.");
        }
        if (command.minMastery() < 0.0 || command.minMastery() > 1.0) {
            throw new IllegalArgumentException("minMastery must be between 0.0 and 1.0, was " + command.minMastery());
        }

        // Anti-cycle guard: if target already reaches source through any existing prerequisite chain, adding source -> target creates a cycle
        boolean wouldCycle = prerequisiteRepository.hasPath(command.organizationId(), command.targetSkillId(), command.sourceSkillId());
        if (wouldCycle) {
            throw new PrerequisiteCycleException(
                    "Adding prerequisite from skill " + command.sourceSkillId() + " to " + command.targetSkillId()
                            + " introduces a cyclic dependency in the prerequisite graph.");
        }

        return prerequisiteRepository.savePrerequisite(
                command.organizationId(),
                command.sourceSkillId(),
                command.targetSkillId(),
                command.minMastery(),
                command.status());
    }

    @Override
    public void deletePrerequisite(String organizationId, String sourceSkillId, String targetSkillId) {
        Objects.requireNonNull(organizationId, "organizationId cannot be null");
        Objects.requireNonNull(sourceSkillId, "sourceSkillId cannot be null");
        Objects.requireNonNull(targetSkillId, "targetSkillId cannot be null");
        prerequisiteRepository.deletePrerequisite(organizationId, sourceSkillId, targetSkillId);
    }

    @Override
    public List<PrerequisiteEdge> listPrerequisites(String organizationId) {
        Objects.requireNonNull(organizationId, "organizationId cannot be null");
        return prerequisiteRepository.findAll(organizationId);
    }

    @Override
    public Optional<TargetRoleGraph> getTargetRoleGraph(String organizationId, String roleId) {
        Objects.requireNonNull(organizationId, "organizationId cannot be null");
        Objects.requireNonNull(roleId, "roleId cannot be null");
        return targetRoleGraphPort.findTargetRoleGraph(organizationId, roleId);
    }
}
