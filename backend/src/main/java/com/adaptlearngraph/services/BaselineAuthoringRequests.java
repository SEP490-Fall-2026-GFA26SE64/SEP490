package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.BaselineAuthoringDto.RoleRequest;
import com.adaptlearngraph.dtos.BaselineAuthoringDto.SkillRequest;
import com.adaptlearngraph.entities.domain.BaselineBlueprint.RoleConfig;
import com.adaptlearngraph.entities.domain.BaselineBlueprint.SkillConfig;
import com.adaptlearngraph.services.BaselineBlueprintUseCase.BlueprintDraft;
import java.util.List;

/** Explicit translation of baseline blueprint request bodies into the immutable draft value. */
final class BaselineAuthoringRequests {
    private BaselineAuthoringRequests() {
    }

    static BlueprintDraft draft(String name, String occupationId, String occupationNameSnapshot, List<RoleRequest> roles) {
        return new BlueprintDraft(name, occupationId, occupationNameSnapshot,
                roles.stream().map(BaselineAuthoringRequests::role).toList());
    }

    private static RoleConfig role(RoleRequest role) {
        return new RoleConfig(role.roleId(), role.roleNameSnapshot(), role.enabled(), role.easyScoreWeight(),
                role.mediumScoreWeight(), role.hardScoreWeight(),
                role.skills().stream().map(BaselineAuthoringRequests::skill).toList());
    }

    private static SkillConfig skill(SkillRequest skill) {
        return new SkillConfig(skill.microSkillId(), skill.microSkillNameSnapshot(), skill.easyQuestionCount(),
                skill.mediumQuestionCount(), skill.hardQuestionCount());
    }
}