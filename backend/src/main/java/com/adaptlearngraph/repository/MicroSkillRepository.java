package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.MicroSkill;
import com.adaptlearngraph.entities.domain.MicroSkillId;
import com.adaptlearngraph.entities.domain.SkillStatus;
import java.util.List;
import java.util.Optional;

public interface MicroSkillRepository {
    boolean existsByOrganizationIdAndCode(String organizationId, String code);

    MicroSkill save(MicroSkill microSkill);

    Optional<MicroSkill> findById(String organizationId, MicroSkillId id);

    Optional<MicroSkill> findByCode(String organizationId, String code);

    List<MicroSkill> findAll(String organizationId);

    List<MicroSkill> search(String organizationId, String query, SkillStatus status);

    void delete(String organizationId, MicroSkillId id);

    int countDependencies(String organizationId, MicroSkillId id);
}
