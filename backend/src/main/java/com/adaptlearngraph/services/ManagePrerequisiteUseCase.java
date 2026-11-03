package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.CreatePrerequisiteCommand;
import com.adaptlearngraph.entities.domain.PrerequisiteEdge;
import java.util.List;

public interface ManagePrerequisiteUseCase {
    PrerequisiteEdge createPrerequisite(CreatePrerequisiteCommand command);
    void deletePrerequisite(String organizationId, String sourceSkillId, String targetSkillId);
    List<PrerequisiteEdge> listPrerequisites(String organizationId);
}
