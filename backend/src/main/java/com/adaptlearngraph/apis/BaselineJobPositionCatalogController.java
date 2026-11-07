package com.adaptlearngraph.apis;

import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.services.BaselineBlueprintCapacityUseCase;
import com.adaptlearngraph.services.BaselineBlueprintCapacityUseCase.CapacityDetail;
import com.adaptlearngraph.services.BaselineJobPositionCatalogUseCase;
import com.adaptlearngraph.services.BaselineJobPositionCatalogUseCase.Failure;
import com.adaptlearngraph.services.BaselineJobPositionCatalogUseCase.JobPositionDetail;
import com.adaptlearngraph.services.BaselineJobPositionCatalogUseCase.JobPositionSummary;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Profile("local & !workspace-baseline & !prod")
@ConditionalOnProperty(prefix = "assessment.baseline.legacy-authoring", name = "enabled", havingValue = "true")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(prefix = "assessment.baseline.jobPosition-catalog", name = "enabled", havingValue = "true")
@RequestMapping(ApiEndpoints.BASELINE_JOB_POSITION_CATALOG)
public class BaselineJobPositionCatalogController {
    private final BaselineJobPositionCatalogUseCase catalog;
    private final BaselineBlueprintCapacityUseCase capacity;

    public BaselineJobPositionCatalogController(
            BaselineJobPositionCatalogUseCase catalog, BaselineBlueprintCapacityUseCase capacity) {
        this.catalog = catalog;
        this.capacity = capacity;
    }

    @GetMapping
    List<JobPositionSummary> list() {
        return catalog.listAvailableJobPositions();
    }

    @GetMapping("/{jobPositionId}")
    JobPositionDetail detail(@PathVariable String jobPositionId) {
        return catalog.getAvailableJobPosition(jobPositionId);
    }

    @GetMapping("/{jobPositionId}/capacity")
    CapacityDetail capacity(@PathVariable String jobPositionId) {
        return capacity.getAvailableCapacity(jobPositionId);
    }

    @ExceptionHandler(Failure.class)
    ResponseEntity<ApiError> handleFailure(Failure failure) {
        HttpStatus status = switch (failure.code()) {
            case UNAUTHENTICATED -> HttpStatus.UNAUTHORIZED;
            case FORBIDDEN -> HttpStatus.FORBIDDEN;
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case DEPENDENCY_UNAVAILABLE -> HttpStatus.SERVICE_UNAVAILABLE;
        };
        return ResponseEntity.status(status).body(new ApiError(failure.code().name(), failure.getMessage()));
    }

    @ExceptionHandler(BaselineBlueprintCapacityUseCase.Failure.class)
    ResponseEntity<ApiError> handleCapacityFailure(BaselineBlueprintCapacityUseCase.Failure failure) {
        HttpStatus status = switch (failure.code()) {
            case UNAUTHENTICATED -> HttpStatus.UNAUTHORIZED;
            case FORBIDDEN -> HttpStatus.FORBIDDEN;
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case DEPENDENCY_UNAVAILABLE -> HttpStatus.SERVICE_UNAVAILABLE;
        };
        return ResponseEntity.status(status).body(new ApiError(failure.code().name(), failure.getMessage()));
    }

    record ApiError(String code, String message) {}
}
