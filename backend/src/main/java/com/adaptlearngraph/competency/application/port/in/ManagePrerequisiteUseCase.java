package com.adaptlearngraph.competency.application.port.in;

import com.adaptlearngraph.competency.domain.PrerequisiteEdge;
import java.util.List;

public interface ManagePrerequisiteUseCase {
    PrerequisiteEdge createPrerequisite(CreatePrerequisiteCommand command);
    void deletePrerequisite(String organizationId, String sourceSkillId, String targetSkillId);
    List<PrerequisiteEdge> listPrerequisites(String organizationId);
}
