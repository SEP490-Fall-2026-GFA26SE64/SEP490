package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.CompetencyRecord;
import java.util.List;

public interface ManageCompetencyUseCase {
    List<CompetencyRecord> listCompetencies(String organizationId, String search);

    default List<CompetencyRecord> listCompetencies(String organizationId, String search, String departmentId, String jobPositionCode) {
        return listCompetencies(organizationId, search);
    }

    CompetencyRecord createCompetency(String organizationId, String code, String name, String description, List<String> skillIds, String levelId);

    default CompetencyRecord createCompetency(String organizationId, String code, String name, String description, List<String> skillIds, String levelId,
            String departmentId, String departmentName, String jobPositionCode, String jobPositionTitle) {
        return createCompetency(organizationId, code, name, description, skillIds, levelId);
    }

    CompetencyRecord updateCompetency(String organizationId, String id, String code, String name, String description, List<String> skillIds);

    default CompetencyRecord updateCompetency(String organizationId, String id, String code, String name, String description, List<String> skillIds,
            String departmentId, String departmentName, String jobPositionCode, String jobPositionTitle) {
        return updateCompetency(organizationId, id, code, name, description, skillIds);
    }

    void deleteCompetency(String organizationId, String id);
}
