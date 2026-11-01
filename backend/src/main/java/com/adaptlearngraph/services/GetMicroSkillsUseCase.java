package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.MicroSkill;
import com.adaptlearngraph.entities.SkillStatus;
import java.util.List;
import java.util.Optional;

public interface GetMicroSkillsUseCase {
    List<MicroSkill> listMicroSkills(String organizationId);
    List<MicroSkill> searchMicroSkills(String organizationId, String query, String macroCode, SkillStatus status);
    Optional<MicroSkill> getMicroSkill(String organizationId, String skillId);
}
