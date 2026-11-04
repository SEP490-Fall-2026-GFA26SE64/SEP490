package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.Department;
import java.util.List;
import java.util.Optional;

public interface GetDepartmentsUseCase {
    List<Department> listDepartments(String organizationId);
    Optional<Department> findByIdOrCode(String organizationId, String idOrCode);
    Department saveDepartment(String organizationId, Department department);
    void deleteDepartment(String organizationId, String idOrCode);
    void linkJobPosition(String organizationId, String departmentIdOrCode, String jobPositionIdOrCode);
    void unlinkJobPosition(String organizationId, String departmentIdOrCode, String jobPositionIdOrCode);
}

