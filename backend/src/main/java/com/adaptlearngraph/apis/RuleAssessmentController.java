package com.adaptlearngraph.apis;

import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.services.RuleAssessmentAttemptService;
import com.adaptlearngraph.services.RuleAssessmentAttemptService.*;
import com.adaptlearngraph.services.AssessmentPolicyService.Failure;
import com.fasterxml.jackson.databind.*;
import java.util.*;
import org.springframework.boot.autoconfigure.condition.*;
import org.springframework.context.annotation.Profile;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

/** Workspace replacement of the old IRT controllers; their profiles are explicitly disjoint. */
@RestController
@Profile("local & workspace-baseline & !prod & !local-baseline-demo")
@ConditionalOnWebApplication(type=ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(name="assessment.baseline.workspace.enabled",havingValue="true")
@RequestMapping(value=ApiEndpoints.ADAPTIVE_ATTEMPT,produces="application/json")
public final class RuleAssessmentController {
    private final RuleAssessmentAttemptService attempts;
    private final ObjectMapper json;
    public RuleAssessmentController(RuleAssessmentAttemptService attempts,ObjectMapper json) {
        this.attempts=attempts;this.json=json.copy().enable(com.fasterxml.jackson.core.JsonParser.Feature.STRICT_DUPLICATE_DETECTION)
                .enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES).enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS);
    }
    @PostMapping(consumes="application/json") public ResponseEntity<View> start(@RequestHeader("Idempotency-Key") UUID key,@RequestBody String body) {
        return ok(attempts.start(decode(body,Start.class),key));
    }
    @GetMapping("/{id}") public ResponseEntity<View> resume(@PathVariable UUID id){return ok(attempts.resume(id));}
    @GetMapping("/context") public ResponseEntity<View> context(@RequestParam UUID selectionId,@RequestParam long selectionRevision,
            @RequestParam com.adaptlearngraph.entities.domain.RuleAssessment.Purpose purpose,@RequestParam(required=false) UUID stepId,
            @RequestParam(required=false) String moduleId,@RequestParam(required=false) Integer moduleRevision){
        return ok(attempts.latest(new Start(purpose,selectionId,selectionRevision,null,stepId,moduleId,moduleRevision)));
    }
    @GetMapping("/{id}/result") public ResponseEntity<View> result(@PathVariable UUID id){return ok(attempts.resume(id));}
    @GetMapping("/history") public ResponseEntity<List<View>> history(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) {
        return ok(attempts.history(page,size));
    }
    @PostMapping(value="/{id}/answers",consumes="application/json") public ResponseEntity<View> answer(@PathVariable UUID id,
            @RequestHeader("Idempotency-Key") UUID key,@RequestBody String body){return ok(attempts.answer(id,decode(body,Answer.class),key));}
    public record Submit(long expectedRevision) {}
    @PostMapping(value="/{id}/submit",consumes="application/json") public ResponseEntity<View> submit(@PathVariable UUID id,
            @RequestHeader("Idempotency-Key") UUID key,@RequestBody String body){return ok(attempts.submit(id,decode(body,Submit.class).expectedRevision(),key));}
    private <T>T decode(String body,Class<T> type) {
        attempts.authorize();if(body==null || body.length()>4096)throw new Failure(400,"INVALID_REQUEST");
        try{T command=json.readValue(body,type);if(command==null)throw new Failure(400,"INVALID_REQUEST");return command;}
        catch(java.io.IOException invalid){throw new Failure(400,"INVALID_REQUEST");}
    }
    private <T>ResponseEntity<T> ok(T value){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(value);}
    @ExceptionHandler(Failure.class) ResponseEntity<Map<String,String>> failure(Failure f){return ResponseEntity.status(f.status).cacheControl(CacheControl.noStore()).body(Map.of("code",f.code));}
    @ExceptionHandler(com.adaptlearngraph.services.RoleBaselineFlow.Failure.class) ResponseEntity<Map<String,String>> selection(com.adaptlearngraph.services.RoleBaselineFlow.Failure f){return failure(new Failure(f.status,f.code));}
    @ExceptionHandler(com.adaptlearngraph.services.AdaptiveAttemptUseCase.Failure.class) ResponseEntity<Map<String,String>> identity(com.adaptlearngraph.services.AdaptiveAttemptUseCase.Failure f){return failure(new Failure(switch(f.code()){case UNAUTHENTICATED->401;case FORBIDDEN->403;default->503;},f.code().name()));}
    @ExceptionHandler({org.springframework.dao.DataAccessException.class,IllegalStateException.class}) ResponseEntity<Map<String,String>> unavailable(Exception f){return failure(new Failure(503,"DEPENDENCY_UNAVAILABLE"));}
    @ExceptionHandler({IllegalArgumentException.class,org.springframework.web.bind.MissingRequestHeaderException.class,
            org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class,
            org.springframework.http.converter.HttpMessageNotReadableException.class}) ResponseEntity<Map<String,String>> invalid(Exception f){return failure(new Failure(400,"INVALID_REQUEST"));}
}
