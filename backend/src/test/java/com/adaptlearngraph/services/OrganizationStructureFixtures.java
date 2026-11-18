package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.RegistrationDto.DepartmentSheetRow;
import com.adaptlearngraph.dtos.RegistrationDto.JobPositionSheetRow;
import com.adaptlearngraph.dtos.RegistrationDto.LevelSheetRow;
import com.adaptlearngraph.dtos.RegistrationDto.OrganizationStructureRequest;
import com.adaptlearngraph.dtos.RegistrationDto.TargetRoleSheetRow;
import com.adaptlearngraph.entities.domain.OrganizationStructure;
import java.util.List;

/** Small valid organization structure workbook: 2 departments, 2 job positions, 3 target roles, 5 levels. */
public final class OrganizationStructureFixtures {
    private OrganizationStructureFixtures() {
    }

    public static DepartmentSheetRow department(int row, String code) {
        return new DepartmentSheetRow(row, code, code + " name", code + " description");
    }

    public static JobPositionSheetRow job(int row, String department, String code) {
        return new JobPositionSheetRow(row, department, code, code + " name");
    }

    public static TargetRoleSheetRow role(int row, String job, String code) {
        return new TargetRoleSheetRow(row, job, code, code + " name", code + " scope");
    }

    public static LevelSheetRow level(int row, String role, String name, String rank) {
        return new LevelSheetRow(row, role, name, rank);
    }

    public static OrganizationStructureRequest request() {
        return new OrganizationStructureRequest(
                List.of(department(2, "ENG"), department(3, "QA")),
                List.of(job(2, "ENG", "JP-DEV"), job(3, "QA", "JP-QA")),
                List.of(role(2, "JP-DEV", "TR-BE"), role(3, "JP-DEV", "TR-FE"), role(4, "JP-QA", "TR-QA")),
                List.of(level(2, "TR-BE", "Junior", "1"), level(3, "TR-BE", "Senior", "2"), level(4, "TR-FE", "Junior", "1"),
                        level(5, "TR-QA", "Tester", "1"), level(6, "TR-QA", "Lead", "2")));
    }

    public static OrganizationStructure structure() {
        return OrganizationStructureImporter.validate(request());
    }
}
