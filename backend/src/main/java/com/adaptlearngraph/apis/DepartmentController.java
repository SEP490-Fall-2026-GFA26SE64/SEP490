package com.adaptlearngraph.apis;

import com.adaptlearngraph.dtos.DepartmentResponse;
import com.adaptlearngraph.dtos.LinkJobPositionRequest;
import com.adaptlearngraph.dtos.SaveDepartmentRequest;
import com.adaptlearngraph.services.DepartmentApplicationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Objects;

@RestController
public class DepartmentController {
    private final DepartmentApplicationService departments;

    public DepartmentController(DepartmentApplicationService departments) {
        this.departments = Objects.requireNonNull(departments, "departments cannot be null");
    }

    @GetMapping("/api/v1/organizations/{organizationId}/departments")
    public ResponseEntity<List<DepartmentResponse>> listDepartments(
            @PathVariable("organizationId") String organizationId) {
        return ResponseEntity.ok(departments.listDepartments(organizationId));
    }

    @GetMapping("/api/v1/organizations/{organizationId}/departments/{id}")
    public ResponseEntity<DepartmentResponse> getDepartment(
            @PathVariable("organizationId") String organizationId,
            @PathVariable("id") String id) {
        DepartmentResponse dept = departments.getDepartment(organizationId, id);
        return dept != null ? ResponseEntity.ok(dept) : ResponseEntity.notFound().build();
    }

    @PostMapping("/api/v1/organizations/{organizationId}/departments")
    public ResponseEntity<DepartmentResponse> createDepartment(
            @PathVariable("organizationId") String organizationId,
            @RequestBody SaveDepartmentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(departments.createDepartment(organizationId, request));
    }

    @PutMapping("/api/v1/organizations/{organizationId}/departments/{id}")
    public ResponseEntity<DepartmentResponse> updateDepartment(
            @PathVariable("organizationId") String organizationId,
            @PathVariable("id") String id,
            @RequestBody SaveDepartmentRequest request) {
        return ResponseEntity.ok(departments.updateDepartment(organizationId, id, request));
    }

    @DeleteMapping("/api/v1/organizations/{organizationId}/departments/{id}")
    public ResponseEntity<Void> deleteDepartment(
            @PathVariable("organizationId") String organizationId,
            @PathVariable("id") String id) {
        departments.deleteDepartment(organizationId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/v1/organizations/{organizationId}/departments/{id}/job-positions")
    public ResponseEntity<Void> linkJobPosition(
            @PathVariable("organizationId") String organizationId,
            @PathVariable("id") String id,
            @RequestBody LinkJobPositionRequest request) {
        departments.linkJobPosition(organizationId, id, request.jobPositionCode());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/api/v1/organizations/{organizationId}/departments/{id}/job-positions/{jobPositionCode}")
    public ResponseEntity<Void> unlinkJobPosition(
            @PathVariable("organizationId") String organizationId,
            @PathVariable("id") String id,
            @PathVariable("jobPositionCode") String jobPositionCode) {
        departments.unlinkJobPosition(organizationId, id, jobPositionCode);
        return ResponseEntity.noContent().build();
    }
}

