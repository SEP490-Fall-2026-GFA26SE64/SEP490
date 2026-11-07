package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.CreatePrerequisiteCommand;
import com.adaptlearngraph.entities.domain.PrerequisiteEdge;
import java.util.List;

public interface ManagePrerequisiteUseCase {
    PrerequisiteEdge createPrerequisite(CreatePrerequisiteCommand command);
    PrerequisiteEdge reversePrerequisite(CreatePrerequisiteCommand command);
    void deletePrerequisite(String organizationId, String sourceSkillId, String targetSkillId);
    void deletePrerequisite(String organizationId,String sourceSkillId,String targetSkillId,String dependentLevel,String prerequisiteLevel);
    List<PrerequisiteEdge> listPrerequisites(String organizationId);
}
