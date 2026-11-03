package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.CreateMicroSkillCommand;
import com.adaptlearngraph.entities.domain.MicroSkill;

public interface CreateMicroSkillUseCase {
    MicroSkill createMicroSkill(CreateMicroSkillCommand command);
}
