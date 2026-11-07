package com.adaptlearngraph.apis;

import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.services.WorkspaceBaselineResourceUseCase;
import com.adaptlearngraph.services.WorkspaceBaselineResourceUseCase.*;
import com.adaptlearngraph.services.AdaptiveBaselineFailures;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.*;
import org.springframework.context.annotation.Profile;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

/** Retained IRT resource-tuple administration; inactive in the rule-assessment workspace. */
@Deprecated
@Profile("local & workspace-baseline & !local-baseline-demo & !prod")
@ConditionalOnProperty(name="assessment.baseline.workspace.enabled",havingValue="true")
@ConditionalOnWebApplication(type=ConditionalOnWebApplication.Type.SERVLET)
@RequestMapping(ApiEndpoints.WORKSPACE_BASELINE_RESOURCE)
public final class WorkspaceBaselineResourceController {
    public record Configure(Tuple expected,Tuple desired) {}
    private final WorkspaceBaselineResourceUseCase resources;
    private final ObjectMapper requests;
    public WorkspaceBaselineResourceController(WorkspaceBaselineResourceUseCase resources,ObjectMapper json) {
        this.resources=resources;
        this.requests=json.copy().enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES,DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
                .enable(com.fasterxml.jackson.core.JsonParser.Feature.STRICT_DUPLICATE_DETECTION);
    }
    @GetMapping public ResponseEntity<Tuple> read(@PathVariable String jobPositionId) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(AdaptiveBaselineFailures.resources(() -> resources.read(jobPositionId)));
    }
    @PutMapping(consumes="application/json") public ResponseEntity<Tuple> configure(@PathVariable String jobPositionId,@RequestBody String body) {
        Configure request;
        if (body.length()>4096) throw new Failure(400,"INVALID_REQUEST");
        try { request=requests.readValue(body,Configure.class); }
        catch(Exception invalid) { throw new Failure(400,"INVALID_REQUEST"); }
        if (request==null) throw new Failure(400,"INVALID_REQUEST");
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(AdaptiveBaselineFailures.resources(() -> resources.configure(jobPositionId,request.expected(),request.desired())));
    }
    @ExceptionHandler(Failure.class) ResponseEntity<Map<String,String>> failure(Failure failure) {
        return ResponseEntity.status(failure.status).cacheControl(CacheControl.noStore()).body(Map.of("code",failure.code));
    }
    @ExceptionHandler({org.springframework.dao.DataAccessException.class,IllegalStateException.class})
    ResponseEntity<Map<String,String>> unavailable(Exception failure) { return failure(new Failure(503,"DEPENDENCY_UNAVAILABLE")); }
    @ExceptionHandler(com.adaptlearngraph.exception.SubscriptionFailure.class)
    ResponseEntity<Map<String,String>> subscription(com.adaptlearngraph.exception.SubscriptionFailure invalid) {
        boolean anonymous=invalid.code()==com.adaptlearngraph.exception.SubscriptionFailure.Code.UNAUTHENTICATED;
        return failure(new Failure(anonymous?401:403,anonymous?"UNAUTHENTICATED":"FORBIDDEN"));
    }
    @ExceptionHandler(com.adaptlearngraph.exception.RegistrationFailure.class)
    ResponseEntity<Map<String,String>> identity(com.adaptlearngraph.exception.RegistrationFailure invalid) {
        boolean anonymous=invalid.code()==com.adaptlearngraph.exception.RegistrationFailure.Code.UNAUTHENTICATED;
        return failure(new Failure(anonymous?401:403,anonymous?"UNAUTHENTICATED":"FORBIDDEN"));
    }
}
