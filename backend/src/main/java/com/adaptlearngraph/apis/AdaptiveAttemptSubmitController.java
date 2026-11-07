package com.adaptlearngraph.apis;

import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.services.AdaptiveAttemptUseCase.*;
import com.adaptlearngraph.services.AdaptiveBaselineFailures;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.*;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.*;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataAccessException;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestController
@Profile("(local | demo) & !prod & !workspace-baseline")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(prefix = "assessment.baseline.adaptive", name = {"enabled", "persistence.enabled", "eligibility.enabled", "attempts.enabled", "attempts.finalization.enabled"}, havingValue = "true")
@RequestMapping(value = ApiEndpoints.ADAPTIVE_ATTEMPT_SUBMIT, produces = "application/json")
public final class AdaptiveAttemptSubmitController {
    private final Submitting attempts;
    private final ObjectMapper json = new ObjectMapper().enable(JsonParser.Feature.STRICT_DUPLICATE_DETECTION)
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS);
    public AdaptiveAttemptSubmitController(Submitting attempts) { this.attempts = attempts; }
    @PostMapping(consumes = "application/json")
    ResponseEntity<View> submit(@PathVariable UUID attemptId, @RequestHeader("Idempotency-Key") String key, @RequestBody String body) {
        Submit command = decode(attemptId, key, body);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(AdaptiveBaselineFailures.attemptStore(() -> attempts.submit(command)));
    }
    private Submit decode(UUID attemptId, String key, String body) {
        if (body == null || body.length() > 65_536) throw new Failure(Code.INVALID_REQUEST);
        try {
            var root = json.readTree(body);
            if (root == null || !root.isObject() || root.size() != 1 || !root.path("expectedRevision").isIntegralNumber()
                    || !root.path("expectedRevision").canConvertToLong()) throw new Failure(Code.INVALID_REQUEST);
            return new Submit(attemptId, root.path("expectedRevision").longValue(), key);
        } catch (JsonProcessingException invalid) { throw new Failure(Code.INVALID_REQUEST); }
    }
    @ExceptionHandler(Failure.class)
    ResponseEntity<AdaptiveAttemptController.Error> failure(Failure failure) { return AdaptiveAttemptController.error(failure.code()); }
    @ExceptionHandler(DataAccessException.class)
    ResponseEntity<AdaptiveAttemptController.Error> dependency(Exception failure) { return AdaptiveAttemptController.error(Code.DEPENDENCY_UNAVAILABLE); }
    @ExceptionHandler({MissingRequestHeaderException.class, HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    ResponseEntity<AdaptiveAttemptController.Error> invalid(Exception failure) { return AdaptiveAttemptController.error(Code.INVALID_REQUEST); }
}
