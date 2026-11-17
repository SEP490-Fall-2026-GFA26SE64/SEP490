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
    private final com.fasterxml.jackson.databind.ObjectMapper json;

    public JobPositionController(JobPositionApplicationService jobPositions, com.fasterxml.jackson.databind.ObjectMapper json) {
        this.jobPositions = Objects.requireNonNull(jobPositions, "jobPositions cannot be null");
        this.json = json.copy().enable(com.fasterxml.jackson.core.JsonParser.Feature.STRICT_DUPLICATE_DETECTION)
                .enable(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES,
                        com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
                .disable(com.fasterxml.jackson.databind.DeserializationFeature.ACCEPT_FLOAT_AS_INT)
                .disable(com.fasterxml.jackson.databind.MapperFeature.ALLOW_COERCION_OF_SCALARS);
    }

    @GetMapping({"/api/v1/organizations/{organizationId}/job-positions", "/api/v1/organizations/{organizationId}/job-positions"})
    public ResponseEntity<List<JobPositionResponse>> listJobPositionsForOrganization(
            @PathVariable("organizationId") String organizationId) {
        return ResponseEntity.ok(jobPositions.listJobPositions(organizationId));
    }

    @PostMapping({"/api/v1/organizations/{organizationId}/job-positions", "/api/v1/organizations/{organizationId}/job-positions"})
    public ResponseEntity<JobPositionResponse> createJobPosition(
            @PathVariable("organizationId") String organizationId,
            @RequestBody String body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(jobPositions.createJobPosition(organizationId, decode(body)));
    }

    @PutMapping({"/api/v1/organizations/{organizationId}/job-positions/{id}", "/api/v1/organizations/{organizationId}/job-positions/{id}"})
    public ResponseEntity<JobPositionResponse> updateJobPosition(
            @PathVariable("organizationId") String organizationId,
            @PathVariable("id") String id,
            @RequestBody String body) {
        return ResponseEntity.ok(jobPositions.updateJobPosition(organizationId, id, decode(body)));
    }

    @DeleteMapping({"/api/v1/organizations/{organizationId}/job-positions/{id}", "/api/v1/organizations/{organizationId}/job-positions/{id}"})
    public ResponseEntity<Void> deleteJobPosition(
            @PathVariable("organizationId") String organizationId,
            @PathVariable("id") String id) {
        jobPositions.deleteJobPosition(organizationId, id);
        return ResponseEntity.noContent().build();
    }
    private SaveJobPositionRequest decode(String body) {
        if(body==null || body.length()>16384) throw new com.adaptlearngraph.entities.domain.CatalogFailure(400,"INVALID_REQUEST");
        try {
            var tree=json.readTree(body);
            if(tree==null || !tree.isObject()) throw new java.io.IOException("Object required");
            return json.treeToValue(tree,SaveJobPositionRequest.class);
        } catch(java.io.IOException invalid) { throw new com.adaptlearngraph.entities.domain.CatalogFailure(400,"INVALID_REQUEST"); }
    }
    @ExceptionHandler(com.adaptlearngraph.entities.domain.CatalogFailure.class)
    ResponseEntity<java.util.Map<String,String>> failure(com.adaptlearngraph.entities.domain.CatalogFailure e) {
        return ResponseEntity.status(e.status).cacheControl(org.springframework.http.CacheControl.noStore()).body(java.util.Map.of("code",e.code));
    }
    @ExceptionHandler({org.springframework.dao.DataAccessException.class,org.springframework.transaction.TransactionException.class})
    ResponseEntity<java.util.Map<String,String>> unavailable(Exception e) {
        return failure(new com.adaptlearngraph.entities.domain.CatalogFailure(503,"CATALOG_UNAVAILABLE"));
    }
}

