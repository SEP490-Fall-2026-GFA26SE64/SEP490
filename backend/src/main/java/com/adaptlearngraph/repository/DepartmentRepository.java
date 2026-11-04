package com.adaptlearngraph.repository;

import com.adaptlearngraph.entities.domain.Department;
import java.util.List;
import java.util.Optional;

public interface DepartmentRepository {
    List<Department> findAllDepartments(String organizationId);
    Optional<Department> findByIdOrCode(String organizationId, String idOrCode);
    Department save(String organizationId, Department department);
    void delete(String organizationId, String idOrCode);
    void linkJobPosition(String organizationId, String departmentIdOrCode, String jobPositionIdOrCode);
    void unlinkJobPosition(String organizationId, String departmentIdOrCode, String jobPositionIdOrCode);
}

