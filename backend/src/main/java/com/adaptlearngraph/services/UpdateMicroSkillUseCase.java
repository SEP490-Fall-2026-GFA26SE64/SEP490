package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.UpdateMicroSkillCommand;
import com.adaptlearngraph.entities.domain.MicroSkill;

public interface UpdateMicroSkillUseCase {
    MicroSkill updateMicroSkill(UpdateMicroSkillCommand command);
}
