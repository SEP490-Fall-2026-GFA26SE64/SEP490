package com.adaptlearngraph.competency.application.port.out;

import com.adaptlearngraph.competency.domain.MicroSkill;
import com.adaptlearngraph.competency.domain.MicroSkillId;

import java.util.Optional;

public interface MicroSkillRepository {
    boolean existsByOrganizationIdAndCode(String organizationId, String code);

    MicroSkill save(MicroSkill microSkill);

    Optional<MicroSkill> findById(String organizationId, MicroSkillId id);

    Optional<MicroSkill> findByCode(String organizationId, String code);
}
