package com.adaptlearngraph.services;

import com.adaptlearngraph.dtos.DepartmentResponse;
import com.adaptlearngraph.dtos.SaveDepartmentRequest;
import com.adaptlearngraph.entities.domain.Department;
import com.adaptlearngraph.repository.DepartmentReferenceJpaRepository;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.modelmapper.ModelMapper;

/**
 * DTO boundary for organization departments in Neo4j.
 */
public class DepartmentApplicationService {
    private final GetDepartmentsUseCase departments;
    private final ModelMapper mapper;
    private final DepartmentReferenceJpaRepository references;
    private final org.springframework.transaction.support.TransactionTemplate txTemplate;

    public DepartmentApplicationService(GetDepartmentsUseCase departments, ModelMapper mapper) {
        this(departments, mapper, null, null);
    }

    public DepartmentApplicationService(GetDepartmentsUseCase departments, ModelMapper mapper,
                                        DepartmentReferenceJpaRepository references) {
        this(departments, mapper, references, null);
    }

    public DepartmentApplicationService(GetDepartmentsUseCase departments, ModelMapper mapper,
                                        DepartmentReferenceJpaRepository references,
                                        org.springframework.transaction.support.TransactionTemplate txTemplate) {
        this.departments = Objects.requireNonNull(departments, "departments cannot be null");
        this.mapper = Objects.requireNonNull(mapper, "mapper cannot be null");
        this.references = references;
        this.txTemplate = txTemplate;
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
        if (references != null && organizationId != null && idOrCode != null) {
            try {
                UUID orgUuid = UUID.fromString(organizationId);
                Department dept = departments.findByIdOrCode(organizationId, idOrCode).orElse(null);
                String deptName = dept != null && dept.name() != null ? dept.name().trim() : idOrCode;
                String code = dept != null && dept.code() != null ? dept.code().trim() : idOrCode;
                String id = dept != null && dept.id() != null ? dept.id().trim() : idOrCode;

                UUID parsedId = null;
                try {
                    parsedId = UUID.fromString(idOrCode);
                } catch (Exception ignored) {}

                Set<UUID> targetDepartmentIds = new HashSet<>();
                if (parsedId != null) {
                    targetDepartmentIds.add(parsedId);
                }
                try {
                    targetDepartmentIds.add(UUID.nameUUIDFromBytes(id.getBytes(StandardCharsets.UTF_8)));
                } catch (Exception ignored) {}
                try {
                    targetDepartmentIds.add(UUID.nameUUIDFromBytes(code.getBytes(StandardCharsets.UTF_8)));
                } catch (Exception ignored) {}
                try {
                    targetDepartmentIds.add(UUID.nameUUIDFromBytes(deptName.getBytes(StandardCharsets.UTF_8)));
                } catch (Exception ignored) {}

                List<UUID> matched = references.findMatchingDepartmentIds(orgUuid, parsedId, deptName);
                if (matched != null) {
                    targetDepartmentIds.addAll(matched);
                }

                java.util.function.Consumer<UUID> cleaner = targetDeptId -> {
                    if (targetDeptId != null) {
                        references.clearMembershipDepartment(orgUuid, targetDeptId);
                        references.clearWorkspaceActivationDepartment(orgUuid, targetDeptId);
                        references.clearWorkspaceBaselineResourceDepartment(orgUuid, targetDeptId);
                        references.deleteJobPositionReferences(orgUuid, targetDeptId);
                        references.deleteDepartmentReference(orgUuid, targetDeptId);
                    }
                };

                if (txTemplate != null) {
                    txTemplate.executeWithoutResult(status -> {
                        for (UUID targetDeptId : targetDepartmentIds) {
                            cleaner.accept(targetDeptId);
                        }
                    });
                } else {
                    for (UUID targetDeptId : targetDepartmentIds) {
                        cleaner.accept(targetDeptId);
                    }
                }
            } catch (Exception ex) {
                System.err.println("Relational delete department error: " + ex.getMessage());
                ex.printStackTrace();
            }
        }
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

