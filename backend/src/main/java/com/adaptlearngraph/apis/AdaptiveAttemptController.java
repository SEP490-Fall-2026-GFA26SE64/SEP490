package com.adaptlearngraph.apis;

import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.services.AdaptiveAttemptUseCase.*;
import com.adaptlearngraph.services.AdaptiveBaselineFailures;
import com.adaptlearngraph.services.AdaptiveBlueprintUseCase;
import com.adaptlearngraph.utility.AdaptiveIrtPolicy;
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
@Profile("(local | demo) & !prod")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(prefix = "assessment.baseline.adaptive", name = {"enabled", "persistence.enabled", "eligibility.enabled", "attempts.enabled"}, havingValue = "true")
@RequestMapping(value = ApiEndpoints.ADAPTIVE_ATTEMPT, produces = "application/json")
public final class AdaptiveAttemptController {
    private final StartRead attempts;
    private final ObjectMapper json = new ObjectMapper().enable(JsonParser.Feature.STRICT_DUPLICATE_DETECTION)
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS);
    public AdaptiveAttemptController(StartRead attempts) { this.attempts = attempts; }
    @PostMapping(consumes = "application/json")
    ResponseEntity<View> start(@RequestHeader("Idempotency-Key") String key, @RequestBody String body) {
        StartTarget target = target(body);
        return ok(AdaptiveBaselineFailures.attemptStart(() -> attempts.startOrResume(target, key)));
    }
    @GetMapping("/{attemptId}")
    ResponseEntity<View> read(@PathVariable UUID attemptId) {
        return ok(AdaptiveBaselineFailures.attemptStart(() -> attempts.resume(attemptId)));
    }
    private StartTarget target(String body) {
        if (body == null || body.length() > 65_536) throw new Failure(Code.INVALID_REQUEST);
        try {
            var root = json.readTree(body);
            if (root == null || !root.isObject() || !root.path("entry").isTextual()) throw new Failure(Code.INVALID_REQUEST);
            return switch (root.get("entry").textValue()) {
                case "SELECTED_ROLE" -> {
                    if (root.size() != 1) throw new Failure(Code.INVALID_REQUEST);
                    yield new SelectedRole();
                }
                case "JOB_POSITION_EXPLORATION" -> {
                    if (root.size() != 2 || !root.path("jobPositionId").isTextual()) throw new Failure(Code.INVALID_REQUEST);
                    yield new Exploration(root.get("jobPositionId").textValue());
                }
                default -> throw new Failure(Code.INVALID_REQUEST);
            };
        } catch (JsonProcessingException | IllegalArgumentException invalid) { throw new Failure(Code.INVALID_REQUEST); }
    }
    private static <T> ResponseEntity<T> ok(T value) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(value); }
    @ExceptionHandler(Failure.class)
    ResponseEntity<Error> failure(Failure failure) { return error(failure.code()); }
    @ExceptionHandler(AdaptiveIrtPolicy.Failure.class)
    ResponseEntity<Error> numerical(AdaptiveIrtPolicy.Failure failure) {
        return error(failure.code() == AdaptiveIrtPolicy.Code.INFEASIBLE_SCOPE ? Code.INFEASIBLE_SCOPE : Code.POLICY_UNAVAILABLE);
    }
    @ExceptionHandler({DataAccessException.class, AdaptiveBlueprintUseCase.Failure.class})
    ResponseEntity<Error> dependency(Exception failure) { return error(Code.DEPENDENCY_UNAVAILABLE); }
    @ExceptionHandler({MissingRequestHeaderException.class, HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    ResponseEntity<Error> invalid(Exception failure) { return error(Code.INVALID_REQUEST); }
    static ResponseEntity<Error> error(Code code) {
        HttpStatus status = switch (code) {
            case INVALID_REQUEST, INVALID_OPTION -> HttpStatus.BAD_REQUEST;
            case UNAUTHENTICATED -> HttpStatus.UNAUTHORIZED;
            case FORBIDDEN -> HttpStatus.FORBIDDEN;
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case POLICY_UNAVAILABLE, INFEASIBLE_SCOPE -> HttpStatus.UNPROCESSABLE_ENTITY;
            case DEPENDENCY_UNAVAILABLE, ASSESSMENT_POLICY_UNAVAILABLE -> HttpStatus.SERVICE_UNAVAILABLE;
            default -> HttpStatus.CONFLICT;
        };
        String message = code == Code.CONFIGURATION_UPDATE_REQUIRED
                ? "This baseline needs an updated JobPosition configuration before new starts. Contact your L&D Manager."
                : "Adaptive baseline request: " + code;
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).body(new Error(code.name(), message));
    }
    public record Error(String code, String message) {}
}
