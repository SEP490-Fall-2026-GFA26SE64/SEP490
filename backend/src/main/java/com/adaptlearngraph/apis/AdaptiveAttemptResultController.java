package com.adaptlearngraph.apis;

import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.services.AdaptiveAttemptUseCase.*;
import java.util.List;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.*;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataAccessException;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/** REQ-009 Employee-safe result/history API; trusted actor and tenant come from the server context. */
@RestController
@Profile("(local | demo) & !prod & !workspace-baseline")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(prefix = "assessment.baseline.adaptive", name = {"enabled", "persistence.enabled", "eligibility.enabled", "attempts.enabled", "attempts.finalization.enabled"}, havingValue = "true")
@RequestMapping(value = ApiEndpoints.ADAPTIVE_ATTEMPT_RESULT, produces = "application/json")
public final class AdaptiveAttemptResultController {
    private final Results results;
    public AdaptiveAttemptResultController(Results results) { this.results = results; }

    @GetMapping("/history")
    ResponseEntity<List<Result>> history() { return ok(results.history()); }

    @GetMapping("/{attemptId}/result")
    ResponseEntity<Result> result(@PathVariable UUID attemptId) { return ok(results.result(attemptId)); }

    @ExceptionHandler(Failure.class)
    ResponseEntity<AdaptiveAttemptController.Error> failure(Failure failure) {
        return AdaptiveAttemptController.error(failure.code());
    }

    @ExceptionHandler(DataAccessException.class)
    ResponseEntity<AdaptiveAttemptController.Error> dependency(Exception failure) {
        return AdaptiveAttemptController.error(Code.DEPENDENCY_UNAVAILABLE);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<AdaptiveAttemptController.Error> invalid(Exception failure) {
        return AdaptiveAttemptController.error(Code.INVALID_REQUEST);
    }

    private static <T> ResponseEntity<T> ok(T value) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(value);
    }
}
