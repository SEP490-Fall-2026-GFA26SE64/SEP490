package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.Department;
import com.adaptlearngraph.repository.DepartmentRepository;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

public class DepartmentService implements GetDepartmentsUseCase {
    private final DepartmentRepository departments;

    public DepartmentService(DepartmentRepository departments) {
        this.departments = Objects.requireNonNull(departments, "departments cannot be null");
    }

    @Override
    public List<Department> listDepartments(String organizationId) {
        return departments.findAllDepartments(organizationId);
    }

    @Override
    public Optional<Department> findByIdOrCode(String organizationId, String idOrCode) {
        return departments.findByIdOrCode(organizationId, idOrCode);
    }

    @Override
    public Department saveDepartment(String organizationId, Department department) {
        return departments.save(organizationId, department);
    }

    @Override
    public void deleteDepartment(String organizationId, String idOrCode) {
        departments.delete(organizationId, idOrCode);
    }

    @Override
    public void linkJobPosition(String organizationId, String departmentIdOrCode, String jobPositionIdOrCode) {
        departments.linkJobPosition(organizationId, departmentIdOrCode, jobPositionIdOrCode);
    }

    @Override
    public void unlinkJobPosition(String organizationId, String departmentIdOrCode, String jobPositionIdOrCode) {
        departments.unlinkJobPosition(organizationId, departmentIdOrCode, jobPositionIdOrCode);
    }
}

