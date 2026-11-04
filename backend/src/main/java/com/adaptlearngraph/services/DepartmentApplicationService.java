package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.DepartmentResponse;
import com.adaptlearngraph.dtos.SaveDepartmentRequest;
import com.adaptlearngraph.entities.domain.Department;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import org.modelmapper.ModelMapper;

/**
 * DTO boundary for organization departments in Neo4j.
 */
public class DepartmentApplicationService {
    private final GetDepartmentsUseCase departments;
    private final ModelMapper mapper;

    public DepartmentApplicationService(GetDepartmentsUseCase departments, ModelMapper mapper) {
        this.departments = Objects.requireNonNull(departments, "departments cannot be null");
        this.mapper = Objects.requireNonNull(mapper, "mapper cannot be null");
    }

    public List<DepartmentResponse> listDepartments(String organizationId) {
        return departments.listDepartments(organizationId).stream()
                .map(this::toResponse)
                .toList();
    }

    public DepartmentResponse getDepartment(String organizationId, String idOrCode) {
        return departments.findByIdOrCode(organizationId, idOrCode)
                .map(this::toResponse)
                .orElse(null);
    }

    public DepartmentResponse createDepartment(String organizationId, SaveDepartmentRequest request) {
        String code = request.code() != null ? request.code().trim() : "";
        String id = request.id() != null && !request.id().isBlank() ? request.id().trim() : ("dept-" + code.toLowerCase());
        Department dept = new Department(
                id,
                code,
                request.name() != null ? request.name().trim() : "",
                request.description() != null ? request.description().trim() : "",
                request.headOfDepartment() != null ? request.headOfDepartment().trim() : "",
                request.headEmail() != null ? request.headEmail().trim() : "",
                request.status() != null ? request.status() : "ACTIVE",
                organizationId,
                Instant.now().toString(),
                Instant.now().toString(),
                request.linkedJobPositions() != null ? request.linkedJobPositions() : List.of(),
                request.linkedJobPositions() != null ? request.linkedJobPositions().size() : 0
        );
        return toResponse(departments.saveDepartment(organizationId, dept));
    }

    public DepartmentResponse updateDepartment(String organizationId, String id, SaveDepartmentRequest request) {
        String code = request.code() != null && !request.code().isBlank() ? request.code().trim() : id;
        Department dept = new Department(
                id,
                code,
                request.name() != null ? request.name().trim() : "",
                request.description() != null ? request.description().trim() : "",
                request.headOfDepartment() != null ? request.headOfDepartment().trim() : "",
                request.headEmail() != null ? request.headEmail().trim() : "",
                request.status() != null ? request.status() : "ACTIVE",
                organizationId,
                null,
                Instant.now().toString(),
                request.linkedJobPositions(),
                request.linkedJobPositions() != null ? request.linkedJobPositions().size() : 0
        );
        return toResponse(departments.saveDepartment(organizationId, dept));
    }

    public void deleteDepartment(String organizationId, String idOrCode) {
        departments.deleteDepartment(organizationId, idOrCode);
    }

    public void linkJobPosition(String organizationId, String departmentIdOrCode, String jobPositionCode) {
        departments.linkJobPosition(organizationId, departmentIdOrCode, jobPositionCode);
    }

    public void unlinkJobPosition(String organizationId, String departmentIdOrCode, String jobPositionCode) {
        departments.unlinkJobPosition(organizationId, departmentIdOrCode, jobPositionCode);
    }

    private DepartmentResponse toResponse(Department dept) {
        return mapper.map(dept, DepartmentResponse.class);
    }
}

