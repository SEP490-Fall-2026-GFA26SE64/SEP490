package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.CompetencyRecord;
import java.util.List;
import java.util.Optional;

public interface CompetencyRepository {
    List<CompetencyRecord> findAllCompetencies(String organizationId, String search);
    Optional<CompetencyRecord> findById(String organizationId, String id);
    boolean existsByOrganizationIdAndCode(String organizationId, String code);
    boolean existsByOrganizationIdAndCodeAndIdNot(String organizationId, String code, String id);
    CompetencyRecord save(String organizationId, CompetencyRecord record, List<String> skillIds, String levelId);
    void deleteById(String organizationId, String id);
}
