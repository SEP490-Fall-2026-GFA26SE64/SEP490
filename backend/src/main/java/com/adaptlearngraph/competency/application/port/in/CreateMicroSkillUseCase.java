package com.adaptlearngraph.competency.application.port.in;

import com.adaptlearngraph.competency.domain.MicroSkill;

public interface CreateMicroSkillUseCase {
    MicroSkill createMicroSkill(CreateMicroSkillCommand command);
}
