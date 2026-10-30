package com.adaptlearngraph.competency.application.port.out;

import com.adaptlearngraph.competency.domain.PrerequisiteEdge;
import com.adaptlearngraph.competency.domain.SkillStatus;
import java.util.List;

public interface PrerequisiteRepository {
    List<PrerequisiteEdge> findAll(String organizationId);

    List<PrerequisiteEdge> findForRole(String organizationId, String roleId);

    boolean hasPath(String organizationId, String fromSkillId, String toSkillId);

    PrerequisiteEdge savePrerequisite(
            String organizationId,
            String sourceSkillId,
            String targetSkillId,
            double minMastery,
            SkillStatus status);

    void deletePrerequisite(String organizationId, String sourceSkillId, String targetSkillId);
}
