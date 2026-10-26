package com.adaptlearngraph.assessment.adaptive.attempt.api;

import com.adaptlearngraph.assessment.adaptive.attempt.application.port.in.AdaptiveAttemptUseCase.*;
import com.adaptlearngraph.assessment.adaptive.attempt.application.port.out.AdaptiveAttemptStore;
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

/** Separate opt-in answer capability; no submit/finalization endpoint is introduced here. */
@RestController
@Profile("(local | demo) & !prod")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(prefix = "assessment.baseline.adaptive", name = {"enabled", "persistence.enabled", "eligibility.enabled", "attempts.enabled", "attempts.answers.enabled"}, havingValue = "true")
@RequestMapping(value = "/api/v1/employee/baseline-attempts/{attemptId}/answers", produces = "application/json")
public final class AdaptiveAttemptAnswerController {
    private final Answering attempts;
    private final ObjectMapper json = new ObjectMapper().enable(JsonParser.Feature.STRICT_DUPLICATE_DETECTION)
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS);
    public AdaptiveAttemptAnswerController(Answering attempts) { this.attempts = attempts; }
    @PostMapping(consumes = "application/json")
    ResponseEntity<View> answer(@PathVariable UUID attemptId, @RequestHeader("Idempotency-Key") String key, @RequestBody String body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(attempts.answer(decode(attemptId, key, body)));
    }
    private Answer decode(UUID attemptId, String key, String body) {
        if (body == null || body.length() > 65_536) throw new Failure(Code.INVALID_REQUEST);
        try {
            var root = json.readTree(body);
            if (root == null || !root.isObject() || root.size() != 4
                    || !root.path("expectedRevision").isIntegralNumber() || !root.path("expectedRevision").canConvertToLong()
                    || !root.path("position").isIntegralNumber() || !root.path("position").canConvertToInt()
                    || !root.path("itemVersionId").isTextual() || !root.path("selectedOptionId").isTextual()) throw new Failure(Code.INVALID_REQUEST);
            String rawId = root.get("itemVersionId").textValue();
            UUID item = UUID.fromString(rawId);
            if (!item.toString().equalsIgnoreCase(rawId)) throw new Failure(Code.INVALID_REQUEST);
            return new Answer(attemptId, root.get("expectedRevision").longValue(), root.get("position").intValue(),
                    item, root.get("selectedOptionId").textValue(), key);
        } catch (JsonProcessingException | IllegalArgumentException invalid) { throw new Failure(Code.INVALID_REQUEST); }
    }
    @ExceptionHandler(Failure.class)
    ResponseEntity<AdaptiveAttemptController.Error> failure(Failure failure) { return AdaptiveAttemptController.error(failure.code()); }
    @ExceptionHandler(AdaptiveAttemptStore.Failure.class)
    ResponseEntity<AdaptiveAttemptController.Error> store(AdaptiveAttemptStore.Failure failure) {
        return AdaptiveAttemptController.error(Code.valueOf(failure.code().name()));
    }
    @ExceptionHandler(DataAccessException.class)
    ResponseEntity<AdaptiveAttemptController.Error> dependency(Exception failure) { return AdaptiveAttemptController.error(Code.DEPENDENCY_UNAVAILABLE); }
    @ExceptionHandler({MissingRequestHeaderException.class, HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    ResponseEntity<AdaptiveAttemptController.Error> invalid(Exception failure) { return AdaptiveAttemptController.error(Code.INVALID_REQUEST); }
}
