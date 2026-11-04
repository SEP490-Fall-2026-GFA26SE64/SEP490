package com.adaptlearngraph.apis;

import com.adaptlearngraph.dtos.JobPositionResponse;
import com.adaptlearngraph.dtos.SaveJobPositionRequest;
import com.adaptlearngraph.services.JobPositionApplicationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Objects;

@RestController
public class JobPositionController {
    private final JobPositionApplicationService jobPositions;

    public JobPositionController(JobPositionApplicationService jobPositions) {
        this.jobPositions = Objects.requireNonNull(jobPositions, "jobPositions cannot be null");
    }

    @GetMapping({"/api/v1/organizations/{organizationId}/job-positions", "/api/v1/organizations/{organizationId}/job-positions"})
    public ResponseEntity<List<JobPositionResponse>> listJobPositionsForOrganization(
            @PathVariable("organizationId") String organizationId) {
        return ResponseEntity.ok(jobPositions.listJobPositions(organizationId));
    }

    @PostMapping({"/api/v1/organizations/{organizationId}/job-positions", "/api/v1/organizations/{organizationId}/job-positions"})
    public ResponseEntity<JobPositionResponse> createJobPosition(
            @PathVariable("organizationId") String organizationId,
            @RequestBody SaveJobPositionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(jobPositions.createJobPosition(organizationId, request));
    }

    @PutMapping({"/api/v1/organizations/{organizationId}/job-positions/{id}", "/api/v1/organizations/{organizationId}/job-positions/{id}"})
    public ResponseEntity<JobPositionResponse> updateJobPosition(
            @PathVariable("organizationId") String organizationId,
            @PathVariable("id") String id,
            @RequestBody SaveJobPositionRequest request) {
        return ResponseEntity.ok(jobPositions.updateJobPosition(organizationId, id, request));
    }

    @DeleteMapping({"/api/v1/organizations/{organizationId}/job-positions/{id}", "/api/v1/organizations/{organizationId}/job-positions/{id}"})
    public ResponseEntity<Void> deleteJobPosition(
            @PathVariable("organizationId") String organizationId,
            @PathVariable("id") String id) {
        jobPositions.deleteJobPosition(organizationId, id);
        return ResponseEntity.noContent().build();
    }
}

