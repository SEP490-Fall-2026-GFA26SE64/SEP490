package com.adaptlearngraph.competency.application.port.out;

import com.adaptlearngraph.competency.domain.MicroSkill;
import com.adaptlearngraph.competency.domain.MicroSkillId;
import com.adaptlearngraph.competency.domain.SkillStatus;
import java.util.List;
import java.util.Optional;

public interface MicroSkillRepository {
    boolean existsByOrganizationIdAndCode(String organizationId, String code);

    MicroSkill save(MicroSkill microSkill);

    Optional<MicroSkill> findById(String organizationId, MicroSkillId id);

    Optional<MicroSkill> findByCode(String organizationId, String code);

    List<MicroSkill> findAll(String organizationId);

    List<MicroSkill> search(String organizationId, String query, String macroCode, SkillStatus status);

    void delete(String organizationId, MicroSkillId id);

    int countDependencies(String organizationId, MicroSkillId id);
}
