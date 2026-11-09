package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.CreatePrerequisiteCommand;
import com.adaptlearngraph.repository.PrerequisiteRepository;
import com.adaptlearngraph.repository.TargetRoleGraphPort;
import com.adaptlearngraph.exception.PrerequisiteCycleException;
import com.adaptlearngraph.entities.domain.PrerequisiteEdge;
import com.adaptlearngraph.entities.domain.KnowledgeLevel;
import com.adaptlearngraph.entities.domain.TargetRoleGraph;
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
        var dependent=KnowledgeLevel.valueOf(command.dependentKnowledgeLevel());
        var prerequisite=KnowledgeLevel.valueOf(command.prerequisiteKnowledgeLevel());
        if (command.sourceSkillId().equals(command.targetSkillId()) && dependent==prerequisite) {
            throw new IllegalArgumentException("Self-referencing prerequisite is not allowed: a micro-skill cannot be a prerequisite of itself.");
        }
        // The repository serializes the scoped catalog and checks exact-pair cycles in the write transaction.
        return prerequisiteRepository.savePrerequisite(
                command.organizationId(),
                command.sourceSkillId(),
                command.targetSkillId(),
                dependent, prerequisite,
                command.status());
    }

    @Override
    public void deletePrerequisite(String organizationId, String sourceSkillId, String targetSkillId) {
        Objects.requireNonNull(organizationId, "organizationId cannot be null");
        Objects.requireNonNull(sourceSkillId, "sourceSkillId cannot be null");
        Objects.requireNonNull(targetSkillId, "targetSkillId cannot be null");
        prerequisiteRepository.deletePrerequisite(organizationId, sourceSkillId, targetSkillId);
    }
    @Override public PrerequisiteEdge reversePrerequisite(CreatePrerequisiteCommand command) {
        return prerequisiteRepository.reversePrerequisite(command.organizationId(),command.sourceSkillId(),command.targetSkillId(),
                KnowledgeLevel.valueOf(command.dependentKnowledgeLevel()),KnowledgeLevel.valueOf(command.prerequisiteKnowledgeLevel()));
    }

    @Override public void deletePrerequisite(String organizationId,String sourceSkillId,String targetSkillId,String dependentLevel,String prerequisiteLevel) {
        KnowledgeLevel dep = (dependentLevel != null && !dependentLevel.isBlank()) ? KnowledgeLevel.valueOf(dependentLevel) : null;
        KnowledgeLevel prereq = (prerequisiteLevel != null && !prerequisiteLevel.isBlank()) ? KnowledgeLevel.valueOf(prerequisiteLevel) : null;
        prerequisiteRepository.deletePrerequisite(Objects.requireNonNull(organizationId),Objects.requireNonNull(sourceSkillId),Objects.requireNonNull(targetSkillId),
                dep, prereq);
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
