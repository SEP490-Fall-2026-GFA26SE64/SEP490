package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.CreateMicroSkillCommand;
import com.adaptlearngraph.entities.MicroSkill;

public interface CreateMicroSkillUseCase {
    MicroSkill createMicroSkill(CreateMicroSkillCommand command);
}
