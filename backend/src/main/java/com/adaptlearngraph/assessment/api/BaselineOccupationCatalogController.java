package com.adaptlearngraph.assessment.api;

import com.adaptlearngraph.assessment.application.port.in.BaselineOccupationCatalogUseCase;
import com.adaptlearngraph.assessment.application.port.in.BaselineOccupationCatalogUseCase.Failure;
import com.adaptlearngraph.assessment.application.port.in.BaselineOccupationCatalogUseCase.OccupationDetail;
import com.adaptlearngraph.assessment.application.port.in.BaselineOccupationCatalogUseCase.OccupationSummary;
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
@Profile("local")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(prefix = "assessment.baseline.occupation-catalog", name = "enabled", havingValue = "true")
@RequestMapping("/api/v1/ld/baseline-blueprint-catalog/occupations")
public class BaselineOccupationCatalogController {
    private final BaselineOccupationCatalogUseCase catalog;

    public BaselineOccupationCatalogController(BaselineOccupationCatalogUseCase catalog) {
        this.catalog = catalog;
    }

    @GetMapping
    List<OccupationSummary> list() {
        return catalog.listAvailableOccupations();
    }

    @GetMapping("/{occupationId}")
    OccupationDetail detail(@PathVariable String occupationId) {
        return catalog.getAvailableOccupation(occupationId);
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

    record ApiError(String code, String message) {}
}
