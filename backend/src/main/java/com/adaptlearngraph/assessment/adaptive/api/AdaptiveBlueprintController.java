package com.adaptlearngraph.assessment.adaptive.api;

import com.adaptlearngraph.assessment.adaptive.api.AdaptiveBlueprintPayloads.*;
import com.adaptlearngraph.assessment.adaptive.application.port.in.AdaptiveBlueprintUseCase;
import com.adaptlearngraph.assessment.adaptive.application.port.in.AdaptiveBlueprintUseCase.*;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validator;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Profile;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.*;

@RestController
@Profile("(local | demo) & !prod")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(prefix = "assessment.baseline.adaptive", name = {"enabled", "persistence.enabled", "eligibility.enabled"}, havingValue = "true")
@RequestMapping(value = "/api/v1/ld/adaptive-baseline-blueprints/occupations/{occupationId}", produces = "application/json")
public final class AdaptiveBlueprintController {
    private final AdaptiveBlueprintUseCase blueprints;
    private final ObjectMapper requests;
    private final Validator validator;

    public AdaptiveBlueprintController(AdaptiveBlueprintUseCase blueprints, ObjectMapper mapper, Validator validator) {
        this.blueprints = blueprints;
        this.validator = validator;
        this.requests = mapper.copy().enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
                .disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT)
                .enable(JsonParser.Feature.STRICT_DUPLICATE_DETECTION);
        this.requests.setConfig(this.requests.getDeserializationConfig().without(MapperFeature.ALLOW_COERCION_OF_SCALARS));
    }

    @GetMapping
    ResponseEntity<WorkspaceResponse> workspace(@PathVariable String occupationId) {
        return ok(WorkspaceResponse.from(blueprints.getWorkspace(occupationId)));
    }

    @PutMapping(value = "/working", consumes = "application/json")
    ResponseEntity<WorkingResponse> save(@PathVariable String occupationId, @RequestHeader("Idempotency-Key") String key, @RequestBody String body) {
        SaveRequest request = decode(body, SaveRequest.class);
        return ok(WorkingResponse.from(blueprints.save(new Save(occupationId, request.expectedRevision(), key(key), request.configuration().domain()))));
    }

    @PostMapping(value = "/test", consumes = "application/json")
    ResponseEntity<PreviewResponse> test(@PathVariable String occupationId, @RequestBody String body) {
        return ok(PreviewResponse.from(blueprints.testBlueprint(occupationId, decode(body, TestRequest.class).configuration().domain())));
    }

    @PostMapping(value = "/finalize", consumes = "application/json")
    ResponseEntity<VersionResponse> finalizeBlueprint(@PathVariable String occupationId, @RequestHeader("Idempotency-Key") String key, @RequestBody String body) {
        FinalizeRequest request = decode(body, FinalizeRequest.class);
        return ok(VersionResponse.from(blueprints.finalizeBlueprint(new Finalize(occupationId, request.workingRevisionId(),
                request.expectedWorkingRevision(), request.expectedActivationRevision(), key(key)))));
    }

    @PostMapping(value = "/disable", consumes = "application/json")
    ResponseEntity<ActivationResponse> disable(@PathVariable String occupationId, @RequestHeader("Idempotency-Key") String key, @RequestBody String body) {
        DisableRequest request = decode(body, DisableRequest.class);
        return ok(ActivationResponse.from(blueprints.disable(new Disable(occupationId, request.expectedActivationRevision(), key(key), request.reason()))));
    }

    @ExceptionHandler(Failure.class)
    ResponseEntity<ApiError> failure(Failure failure) {
        HttpStatus status = switch (failure.code()) {
            case UNAUTHENTICATED -> HttpStatus.UNAUTHORIZED;
            case FORBIDDEN -> HttpStatus.FORBIDDEN;
            case NOT_FOUND -> HttpStatus.NOT_FOUND;
            case INVALID_REQUEST -> HttpStatus.BAD_REQUEST;
            case CATALOG_REFERENCE_INVALID, INSUFFICIENT_CAPACITY, PARAMETER_COVERAGE_MISSING -> HttpStatus.UNPROCESSABLE_ENTITY;
            case BLUEPRINT_STALE, VERSION_CONFLICT, IDEMPOTENCY_CONFLICT -> HttpStatus.CONFLICT;
            case DEPENDENCY_UNAVAILABLE -> HttpStatus.SERVICE_UNAVAILABLE;
        };
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).body(new ApiError(failure.code().name(),
                failure.getMessage(), failure.shortages().stream().map(ShortageResponse::from).toList()));
    }

    @ExceptionHandler({IllegalArgumentException.class, HttpMessageNotReadableException.class, MissingRequestHeaderException.class})
    ResponseEntity<ApiError> invalid(Exception cause) {
        return failure(new Failure(Code.INVALID_REQUEST, "Invalid adaptive Blueprint request", List.of()));
    }

    private <T> T decode(String body, Class<T> type) {
        if (body.length() > 65_536) throw new IllegalArgumentException("Request too large");
        try {
            T request = requests.readValue(body, type);
            if (request == null || !validator.validate(request).isEmpty()) throw new IllegalArgumentException("Invalid fields");
            return request;
        } catch (JsonProcessingException invalid) { throw new IllegalArgumentException("Invalid JSON", invalid); }
    }

    private static String key(String key) {
        if (key.isBlank() || key.length() > 200 || !key.equals(key.strip()) || key.chars().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException("Invalid idempotency key");
        }
        return key;
    }

    private static <T> ResponseEntity<T> ok(T body) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body); }
}
