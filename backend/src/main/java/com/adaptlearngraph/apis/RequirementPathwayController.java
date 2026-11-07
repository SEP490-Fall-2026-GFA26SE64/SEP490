package com.adaptlearngraph.apis;

import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.exception.InitialPathwayFailure;
import com.adaptlearngraph.repository.InitialPathwayPorts.Receipt;
import com.adaptlearngraph.services.*;
import com.fasterxml.jackson.databind.*;
import java.util.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

/** Requirement pathway routes; trusted session, organization, role and CSRF filters remain the boundary. */
@RestController
@RequestMapping(ApiEndpoints.INITIAL_PATHWAY)
@Profile("local & workspace-baseline & !local-baseline-demo & !prod")
@ConditionalOnProperty(name={"pathway.initial.enabled","assessment.baseline.workspace.enabled"},havingValue="true")
public final class RequirementPathwayController {
    private final RequirementPathwayAdmissionService admission;private final RequirementPathwayView view;
    private final RequirementPathwayReviewService review;private final ObjectMapper json;
    public RequirementPathwayController(RequirementPathwayAdmissionService admission,RequirementPathwayView view,RequirementPathwayReviewService review,ObjectMapper json){
        this.admission=admission;this.view=view;this.review=review;this.json=json.copy().enable(com.fasterxml.jackson.core.JsonParser.Feature.STRICT_DUPLICATE_DETECTION)
                .enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES).enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS);
    }
    @GetMapping("/employee/role-gaps") ResponseEntity<?> preview(@RequestParam String roleId,@RequestParam String levelId){return ok(admission.preview(roleId,levelId));}
    @PostMapping("/employee/initial-pathway-requests") ResponseEntity<?> confirm(@RequestHeader("Idempotency-Key")String key,@RequestBody String body){return receipt(admission.confirm(key,parse(body,RequirementPathwayAdmissionService.Confirm.class)));}
    @GetMapping("/employee/initial-pathway-requests/{id}") ResponseEntity<?> status(@PathVariable UUID id){return ok(view.own(id));}
    @PostMapping("/employee/initial-pathway-requests/{id}/retry") ResponseEntity<?> retry(@PathVariable UUID id,@RequestHeader("Idempotency-Key")String key){return receipt(admission.retry(id,key));}
    @GetMapping("/employee/pathway") ResponseEntity<?> current(){return ok(view.current().orElse(null));}
    @GetMapping("/employee/pathways/{id}") ResponseEntity<?> own(@PathVariable UUID id){return ok(view.own(id));}
    @GetMapping("/expert/initial-pathways") ResponseEntity<?> queue(@RequestParam(defaultValue="0")int offset,@RequestParam(defaultValue="20")int limit){return ok(review.queue(offset,limit));}
    @GetMapping("/expert/initial-pathways/{id}") ResponseEntity<?> detail(@PathVariable UUID id){return ok(review.detail(id));}
    @GetMapping("/expert/initial-pathways/{id}/validation") ResponseEntity<?> validate(@PathVariable UUID id){return ok(review.detail(id).validation());}
    @PostMapping("/expert/initial-pathways/{id}/module-selection/check") ResponseEntity<?> checkSelection(@PathVariable UUID id,@RequestBody String body){return ok(review.checkSelection(id,parse(body,RequirementPathwayReviewService.Selection.class)));}
    @PostMapping("/expert/initial-pathways/{id}/module-selection") ResponseEntity<?> saveSelection(@PathVariable UUID id,@RequestHeader("Idempotency-Key")String key,@RequestBody String body){return receipt(review.saveSelection(id,key,parse(body,RequirementPathwayReviewService.Selection.class)));}
    @PostMapping("/expert/initial-pathways/{id}/confirmation") ResponseEntity<?> approve(@PathVariable UUID id,@RequestHeader("Idempotency-Key")String key,@RequestBody String body){return receipt(review.approve(id,key,parse(body,RequirementPathwayReviewService.Expected.class)));}
    @PostMapping("/expert/initial-pathways/{id}/bypasses") ResponseEntity<?> bypass(@PathVariable UUID id,@RequestHeader("Idempotency-Key")String key,@RequestBody String body){return receipt(review.bypass(id,key,parse(body,RequirementPathwayReviewService.Bypass.class)));}
    @PostMapping("/expert/initial-pathways/{id}/refresh") ResponseEntity<?> refresh(@PathVariable UUID id,@RequestHeader("Idempotency-Key")String key,@RequestBody String body){return receipt(review.refresh(id,key,parse(body,RequirementPathwayReviewService.Expected.class)));}
    private <T>T parse(String body,Class<T> type){
        if(body.length()>262144)throw new InitialPathwayFailure(400,"INVALID_REQUEST");
        try{var value=json.readerFor(type).with(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES).readValue(body);if(value==null)throw new IllegalArgumentException();return type.cast(value);}
        catch(Exception invalid){throw new InitialPathwayFailure(400,"INVALID_REQUEST");}
    }
    private ResponseEntity<String> receipt(Receipt result){return ResponseEntity.status(result.status()).contentType(MediaType.APPLICATION_JSON).cacheControl(CacheControl.noStore()).body(result.responseJson());}
    private <T>ResponseEntity<T> ok(T value){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(value);}
    @ExceptionHandler(InitialPathwayFailure.class)ResponseEntity<?> failure(InitialPathwayFailure failure){return ResponseEntity.status(failure.status()).cacheControl(CacheControl.noStore()).body(Map.of("code",failure.code(),"retryable",failure.retryable(),"correlationId",failure.correlationId()));}
    @ExceptionHandler(RoleBaselineFlow.Failure.class)ResponseEntity<?> selection(RoleBaselineFlow.Failure failure){return failure(new InitialPathwayFailure(failure.status,failure.code));}
    @ExceptionHandler({org.springframework.dao.DataAccessException.class,IllegalStateException.class})ResponseEntity<?> unavailable(Exception failure){
        org.slf4j.LoggerFactory.getLogger(RequirementPathwayController.class).warn("Requirement Pathway dependency failed",failure);
        return failure(new InitialPathwayFailure(503,"DEPENDENCY_UNAVAILABLE"));
    }
    @ExceptionHandler({IllegalArgumentException.class,org.springframework.web.bind.MissingRequestHeaderException.class,org.springframework.web.bind.MissingServletRequestParameterException.class,
            org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class})ResponseEntity<?> invalid(Exception failure){return failure(new InitialPathwayFailure(400,"INVALID_REQUEST"));}
}
