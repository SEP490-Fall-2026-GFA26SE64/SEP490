package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.PrerequisiteEdge;
import com.adaptlearngraph.entities.domain.SkillStatus;
import com.adaptlearngraph.entities.domain.KnowledgeLevel;
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

    default PrerequisiteEdge savePrerequisite(String organizationId,String dependentSkillId,String prerequisiteSkillId,
            KnowledgeLevel dependentLevel,KnowledgeLevel prerequisiteLevel,SkillStatus status) {
        throw new UnsupportedOperationException("Exact prerequisite persistence is unavailable");
    }
    default void deletePrerequisite(String organizationId,String dependentSkillId,String prerequisiteSkillId,
            KnowledgeLevel dependentLevel,KnowledgeLevel prerequisiteLevel) {
        throw new UnsupportedOperationException("Exact prerequisite persistence is unavailable");
    }
    default PrerequisiteEdge reversePrerequisite(String organizationId,String dependentSkillId,String prerequisiteSkillId,
            KnowledgeLevel dependentLevel,KnowledgeLevel prerequisiteLevel) {
        throw new UnsupportedOperationException("Exact prerequisite reversal is unavailable");
    }
}
