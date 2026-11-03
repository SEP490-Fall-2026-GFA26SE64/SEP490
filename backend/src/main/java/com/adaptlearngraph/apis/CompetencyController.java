package com.adaptlearngraph.apis;

import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.dtos.CompetencyDto.CompetencyResponse;
import com.adaptlearngraph.dtos.CompetencyDto.CreateCompetencyRequest;
import com.adaptlearngraph.dtos.CompetencyDto.UpdateCompetencyRequest;
import com.adaptlearngraph.services.CompetencyApplicationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping(ApiEndpoints.COMPETENCY)
public class CompetencyController {
    private final CompetencyApplicationService competencies;

    public CompetencyController(CompetencyApplicationService competencies) {
        this.competencies = Objects.requireNonNull(competencies, "competencies cannot be null");
    }

    @GetMapping
    public ResponseEntity<List<CompetencyResponse>> listCompetencies(
            @PathVariable("organizationId") String organizationId,
            @RequestParam(value = "search", required = false) String search) {
        return ResponseEntity.ok(competencies.listCompetencies(organizationId, search));
    }

    @PostMapping
    public ResponseEntity<CompetencyResponse> createCompetency(
            @PathVariable("organizationId") String organizationId,
            @RequestBody CreateCompetencyRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(competencies.createCompetency(organizationId, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CompetencyResponse> updateCompetency(
            @PathVariable("organizationId") String organizationId,
            @PathVariable("id") String id,
            @RequestBody UpdateCompetencyRequest request) {
        return ResponseEntity.ok(competencies.updateCompetency(organizationId, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCompetency(
            @PathVariable("organizationId") String organizationId,
            @PathVariable("id") String id) {
        competencies.deleteCompetency(organizationId, id);
        return ResponseEntity.noContent().build();
    }
}