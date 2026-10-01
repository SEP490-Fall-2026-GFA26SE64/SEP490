package com.adaptlearngraph.competency.application.port.in;

import com.adaptlearngraph.competency.domain.MicroSkill;

import java.util.List;

public interface GetMicroSkillsUseCase {
    List<MicroSkill> listMicroSkills(String organizationId);
}
