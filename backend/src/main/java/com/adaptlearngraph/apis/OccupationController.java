package com.adaptlearngraph.apis;

import com.adaptlearngraph.dtos.OccupationResponse;
import com.adaptlearngraph.dtos.SaveOccupationRequest;
import com.adaptlearngraph.services.OccupationApplicationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Objects;

@RestController
public class OccupationController {
    private final OccupationApplicationService occupations;

    public OccupationController(OccupationApplicationService occupations) {
        this.occupations = Objects.requireNonNull(occupations, "occupations cannot be null");
    }

    @GetMapping("/api/v1/organizations/{organizationId}/occupations")
    public ResponseEntity<List<OccupationResponse>> listOccupationsForOrganization(
            @PathVariable("organizationId") String organizationId) {
        return ResponseEntity.ok(occupations.listOccupations(organizationId));
    }

    @PostMapping("/api/v1/organizations/{organizationId}/occupations")
    public ResponseEntity<OccupationResponse> createOccupation(
            @PathVariable("organizationId") String organizationId,
            @RequestBody SaveOccupationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(occupations.createOccupation(organizationId, request));
    }

    @PutMapping("/api/v1/organizations/{organizationId}/occupations/{id}")
    public ResponseEntity<OccupationResponse> updateOccupation(
            @PathVariable("organizationId") String organizationId,
            @PathVariable("id") String id,
            @RequestBody SaveOccupationRequest request) {
        return ResponseEntity.ok(occupations.updateOccupation(organizationId, id, request));
    }

    @DeleteMapping("/api/v1/organizations/{organizationId}/occupations/{id}")
    public ResponseEntity<Void> deleteOccupation(
            @PathVariable("organizationId") String organizationId,
            @PathVariable("id") String id) {
        occupations.deleteOccupation(organizationId, id);
        return ResponseEntity.noContent().build();
    }
}