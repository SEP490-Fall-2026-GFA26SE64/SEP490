package com.adaptlearngraph.apis;

import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.dtos.CompetencyDto.CompetencyResponse;
import com.adaptlearngraph.dtos.CompetencyDto.CreateCompetencyRequest;
import com.adaptlearngraph.dtos.CompetencyDto.UpdateCompetencyRequest;
import com.adaptlearngraph.services.ManageCompetencyUseCase;
import com.adaptlearngraph.entities.CompetencyRecord;
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
    private final ManageCompetencyUseCase manageCompetencyUseCase;

    public CompetencyController(ManageCompetencyUseCase manageCompetencyUseCase) {
        this.manageCompetencyUseCase = Objects.requireNonNull(manageCompetencyUseCase, "manageCompetencyUseCase cannot be null");
    }

    @GetMapping
    public ResponseEntity<List<CompetencyResponse>> listCompetencies(
            @PathVariable("organizationId") String organizationId,
            @RequestParam(value = "search", required = false) String search) {
        List<CompetencyResponse> list = manageCompetencyUseCase.listCompetencies(organizationId, search)
                .stream()
                .map(CompetencyResponse::fromDomain)
                .toList();
        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<CompetencyResponse> createCompetency(
            @PathVariable("organizationId") String organizationId,
            @RequestBody CreateCompetencyRequest request) {
        CompetencyRecord created = manageCompetencyUseCase.createCompetency(
                organizationId,
                request.code(),
                request.name(),
                request.description(),
                request.skillIds(),
                request.levelId()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(CompetencyResponse.fromDomain(created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CompetencyResponse> updateCompetency(
            @PathVariable("organizationId") String organizationId,
            @PathVariable("id") String id,
            @RequestBody UpdateCompetencyRequest request) {
        CompetencyRecord updated = manageCompetencyUseCase.updateCompetency(
                organizationId,
                id,
                request.code(),
                request.name(),
                request.description(),
                request.skillIds()
        );
        return ResponseEntity.ok(CompetencyResponse.fromDomain(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCompetency(
            @PathVariable("organizationId") String organizationId,
            @PathVariable("id") String id) {
        manageCompetencyUseCase.deleteCompetency(organizationId, id);
        return ResponseEntity.noContent().build();
    }
}
