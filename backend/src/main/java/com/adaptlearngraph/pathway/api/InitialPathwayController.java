package com.adaptlearngraph.pathway.api;

import com.adaptlearngraph.pathway.application.*;
import com.adaptlearngraph.pathway.application.InitialPathwayPorts.*;
import com.fasterxml.jackson.databind.*;
import java.util.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@Profile("((local-baseline-demo & !workspace-baseline) | (local & workspace-baseline & !local-baseline-demo)) & !prod")
@ConditionalOnProperty(name="pathway.initial.enabled",havingValue="true")
@org.springframework.boot.autoconfigure.condition.ConditionalOnExpression("${assessment.baseline.workspace.enabled:false} or (${pathway.local-auth-bypass.enabled:false} and ${assessment.baseline.local-demo.enabled:false})")
public final class InitialPathwayController {
    private final RoleGapPreview gaps;private final InitialPathwayAdmission admission;private final InitialPathwayReview review;
    private final InitialPathwayView view;private final ObjectMapper json;
    public InitialPathwayController(RoleGapPreview gaps,InitialPathwayAdmission admission,InitialPathwayReview review,InitialPathwayView view,ObjectMapper json) {
        this.gaps=gaps;this.admission=admission;this.review=review;this.view=view;this.json=json;
    }
    @GetMapping("/employee/role-gaps") ResponseEntity<?> gaps(@RequestParam String roleId,@RequestParam String levelId) { return ok(gaps.preview(roleId,levelId)); }
    @PostMapping("/employee/initial-pathway-requests") ResponseEntity<?> confirm(@RequestHeader("Idempotency-Key")String key,@RequestBody String body) {
        return outcome(admission.confirm(key,parse(body,InitialPathwayAdmission.Confirm.class)));
    }
    @GetMapping("/employee/initial-pathway-requests/{id}") ResponseEntity<?> request(@PathVariable UUID id) { return ok(view.request(id)); }
    @GetMapping("/employee/pathway") ResponseEntity<?> current() { return ok(view.current()); }
    @GetMapping("/employee/pathways/{id}") ResponseEntity<?> archived(@PathVariable UUID id) { return ok(view.archived(id)); }
    @GetMapping("/expert/initial-pathways") ResponseEntity<?> queue(@RequestParam(defaultValue="0")int offset,@RequestParam(defaultValue="20")int limit) { return ok(review.queue(offset,limit)); }
    @GetMapping("/expert/initial-pathways/{id}") ResponseEntity<?> detail(@PathVariable UUID id) { return ok(review.detail(id)); }
    @GetMapping("/expert/initial-pathways/{id}/validation") ResponseEntity<?> validation(@PathVariable UUID id) { return ok(review.validate(id)); }
    @PostMapping("/expert/initial-pathways/{id}/inclusions") ResponseEntity<?> include(@PathVariable UUID id,@RequestHeader("Idempotency-Key")String key,@RequestBody String body) {
        return outcome(review.edit(id,key,parse(body,InitialPathwayReview.Edit.class),true));
    }
    @PostMapping("/expert/initial-pathways/{id}/exclusions") ResponseEntity<?> exclude(@PathVariable UUID id,@RequestHeader("Idempotency-Key")String key,@RequestBody String body) {
        return outcome(review.edit(id,key,parse(body,InitialPathwayReview.Edit.class),false));
    }
    @PostMapping("/expert/initial-pathways/{id}/confirmation") ResponseEntity<?> approve(@PathVariable UUID id,@RequestHeader("Idempotency-Key")String key,@RequestBody String body) {
        return outcome(review.confirm(id,key,parse(body,InitialPathwayReview.Expected.class)));
    }
    private <T> T parse(String body,Class<T> type) {
        if(body.length()>16384)throw new Failure(400,"INVALID_REQUEST");
        try { var value=json.readerFor(type).with(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES).readValue(body);if(value==null)throw new Failure(400,"INVALID_REQUEST");return type.cast(value); }
        catch(Failure failure){throw failure;}catch(Exception invalid){throw new Failure(400,"INVALID_REQUEST");}
    }
    private ResponseEntity<String> outcome(Receipt r) { return ResponseEntity.status(r.status()).cacheControl(CacheControl.noStore()).contentType(MediaType.APPLICATION_JSON).body(r.responseJson()); }
    private <T> ResponseEntity<T> ok(T body) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body); }
    @ExceptionHandler(Failure.class) ResponseEntity<?> failure(Failure e) {
        return ResponseEntity.status(e.status()).cacheControl(CacheControl.noStore()).body(Map.of("code",e.code(),"retryable",e.retryable(),"correlationId",e.correlationId()));
    }
    @ExceptionHandler(com.adaptlearngraph.learning.application.RoleBaselineFlow.Failure.class)
    ResponseEntity<?> selectionFailure(com.adaptlearngraph.learning.application.RoleBaselineFlow.Failure e) { return failure(new Failure(e.status,e.code)); }
    @ExceptionHandler({org.springframework.dao.DataAccessException.class,IllegalStateException.class})
    ResponseEntity<?> unavailable(Exception e) { return failure(new Failure(503,"DEPENDENCY_UNAVAILABLE")); }
    @ExceptionHandler({IllegalArgumentException.class,org.springframework.web.bind.MissingRequestHeaderException.class,
            org.springframework.web.bind.MissingServletRequestParameterException.class,org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class})
    ResponseEntity<?> invalid(Exception e) { return failure(new Failure(400,"INVALID_REQUEST")); }
}
