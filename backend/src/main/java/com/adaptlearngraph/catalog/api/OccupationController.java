package com.adaptlearngraph.catalog.api;

import com.adaptlearngraph.catalog.application.port.in.GetOccupationsUseCase;
import com.adaptlearngraph.catalog.domain.Occupation;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Objects;

@RestController
public class OccupationController {
    private final GetOccupationsUseCase getOccupationsUseCase;

    public OccupationController(GetOccupationsUseCase getOccupationsUseCase) {
        this.getOccupationsUseCase = Objects.requireNonNull(getOccupationsUseCase, "getOccupationsUseCase cannot be null");
    }

    @GetMapping("/api/v1/organizations/{organizationId}/occupations")
    public ResponseEntity<List<OccupationResponse>> listOccupationsForOrganization(
            @PathVariable("organizationId") String organizationId) {
        List<OccupationResponse> response = getOccupationsUseCase.listOccupations(organizationId)
                .stream()
                .map(OccupationResponse::fromDomain)
                .toList();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/v1/occupations")
    public ResponseEntity<List<OccupationResponse>> listOccupations() {
        List<OccupationResponse> response = getOccupationsUseCase.listOccupations()
                .stream()
                .map(OccupationResponse::fromDomain)
                .toList();
        return ResponseEntity.ok(response);
    }

    public record SaveOccupationRequest(
            String id,
            String code,
            String name,
            Integer jobZone,
            Double interestRealistic,
            Double interestInvestigative,
            Double interestArtistic,
            Double interestSocial,
            Double interestEnterprising,
            Double interestConventional,
            String status,
            String version
    ) {}

    @PostMapping("/api/v1/organizations/{organizationId}/occupations")
    public ResponseEntity<OccupationResponse> createOccupation(
            @PathVariable("organizationId") String organizationId,
            @RequestBody SaveOccupationRequest request) {
        String code = request.code() != null ? request.code().trim() : "";
        String id = request.id() != null && !request.id().isBlank() ? request.id().trim() : code;
        Occupation occ = new Occupation(
                id,
                code,
                request.name() != null ? request.name().trim() : "",
                request.jobZone() != null && request.jobZone() > 0 ? request.jobZone() : 4,
                request.interestRealistic() != null ? request.interestRealistic() : 0.0,
                request.interestInvestigative() != null ? request.interestInvestigative() : 0.0,
                request.interestArtistic() != null ? request.interestArtistic() : 0.0,
                request.interestSocial() != null ? request.interestSocial() : 0.0,
                request.interestEnterprising() != null ? request.interestEnterprising() : 0.0,
                request.interestConventional() != null ? request.interestConventional() : 0.0,
                request.status() != null ? request.status() : "ACTIVE",
                request.version() != null ? request.version() : "0.9.0",
                0,
                0
        );
        Occupation saved = getOccupationsUseCase.saveOccupation(organizationId, occ);
        return ResponseEntity.status(HttpStatus.CREATED).body(OccupationResponse.fromDomain(saved));
    }

    @PutMapping("/api/v1/organizations/{organizationId}/occupations/{id}")
    public ResponseEntity<OccupationResponse> updateOccupation(
            @PathVariable("organizationId") String organizationId,
            @PathVariable("id") String id,
            @RequestBody SaveOccupationRequest request) {
        String code = request.code() != null && !request.code().isBlank() ? request.code().trim() : id;
        Occupation occ = new Occupation(
                id,
                code,
                request.name() != null ? request.name().trim() : "",
                request.jobZone() != null && request.jobZone() > 0 ? request.jobZone() : 4,
                request.interestRealistic() != null ? request.interestRealistic() : 0.0,
                request.interestInvestigative() != null ? request.interestInvestigative() : 0.0,
                request.interestArtistic() != null ? request.interestArtistic() : 0.0,
                request.interestSocial() != null ? request.interestSocial() : 0.0,
                request.interestEnterprising() != null ? request.interestEnterprising() : 0.0,
                request.interestConventional() != null ? request.interestConventional() : 0.0,
                request.status() != null ? request.status() : "ACTIVE",
                request.version() != null ? request.version() : "0.9.0",
                0,
                0
        );
        Occupation saved = getOccupationsUseCase.saveOccupation(organizationId, occ);
        return ResponseEntity.ok(OccupationResponse.fromDomain(saved));
    }

    @DeleteMapping("/api/v1/organizations/{organizationId}/occupations/{id}")
    public ResponseEntity<Void> deleteOccupation(
            @PathVariable("organizationId") String organizationId,
            @PathVariable("id") String id) {
        getOccupationsUseCase.deleteOccupation(organizationId, id);
        return ResponseEntity.noContent().build();
    }
}

