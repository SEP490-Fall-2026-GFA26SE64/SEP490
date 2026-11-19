package com.adaptlearngraph.apis;

import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.services.AssessmentPolicyService.Failure;
import com.adaptlearngraph.services.ScopedAssessmentPolicyService;
import java.util.*;
import org.springframework.boot.autoconfigure.condition.*;
import org.springframework.context.annotation.Profile;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@Profile("local & workspace-baseline & !local-baseline-demo & !prod")
@ConditionalOnWebApplication(type=ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(name="assessment.baseline.workspace.enabled",havingValue="true")
@RequestMapping(ApiEndpoints.SCOPED_ASSESSMENT_POLICY)
public final class AssessmentPolicyController {
    private static final org.slf4j.Logger log=org.slf4j.LoggerFactory.getLogger(AssessmentPolicyController.class);
    private final ScopedAssessmentPolicyService rules;
    private final com.fasterxml.jackson.databind.ObjectMapper mapper;
    public AssessmentPolicyController(ScopedAssessmentPolicyService rules,
            com.fasterxml.jackson.databind.ObjectMapper mapper){
        this.rules=rules;this.mapper=mapper;
    }
    @GetMapping("/{purpose}/scopes") public ResponseEntity<?> directory(@PathVariable String purpose,
            @RequestParam(defaultValue="") String search,@RequestParam(defaultValue="") String owner,@RequestParam(defaultValue="") String level,
            @RequestParam(defaultValue="") String status,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) {
        return response(rules.directoryHttp(purpose,search,owner,level,status,page,size));
    }
    @GetMapping("/{purpose}/scopes/{key}") public ResponseEntity<?> workspace(@PathVariable String purpose,@PathVariable String key,
            @RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return response(rules.readHttp(purpose,key,page,size));}
    @PostMapping("/{purpose}/scopes/{key}/draft") public ResponseEntity<?> create(@PathVariable String purpose,@PathVariable String key,jakarta.servlet.http.HttpServletRequest request){
        return response(rules.createHttp(purpose,key,decodeRules(purpose,request,ScopedAssessmentPolicyService.Create.class)));
    }
    @PutMapping("/{purpose}/scopes/{key}/draft") public ResponseEntity<?> save(@PathVariable String purpose,@PathVariable String key,jakarta.servlet.http.HttpServletRequest request){
        return response(rules.saveHttp(purpose,key,decodeRules(purpose,request,ScopedAssessmentPolicyService.Save.class)));
    }
    @PutMapping("/{purpose}/scopes/{key}/draft/editor") public ResponseEntity<?> saveEditor(@PathVariable String purpose,@PathVariable String key,jakarta.servlet.http.HttpServletRequest request){
        return response(rules.saveEditorHttp(purpose,key,decodeRules(purpose,request,ScopedAssessmentPolicyService.SaveEditor.class)));
    }
    @PostMapping("/{purpose}/scopes/{key}/activation") public ResponseEntity<?> activate(@PathVariable String purpose,@PathVariable String key,jakarta.servlet.http.HttpServletRequest request){
        return response(rules.activateHttp(purpose,key,decodeRules(purpose,request,ScopedAssessmentPolicyService.Activate.class)));
    }
    @PostMapping("/{purpose}/scopes/{key}/completion") public ResponseEntity<?> complete(@PathVariable String purpose,@PathVariable String key,jakarta.servlet.http.HttpServletRequest request){
        return response(rules.completeHttp(purpose,key,decodeRules(purpose,request,ScopedAssessmentPolicyService.Complete.class)));
    }
    @PostMapping("/{purpose}/scopes/{key}/abandonment") public ResponseEntity<?> abandon(@PathVariable String purpose,@PathVariable String key,jakarta.servlet.http.HttpServletRequest request){
        return response(rules.abandonHttp(purpose,key,decodeRules(purpose,request,ScopedAssessmentPolicyService.Abandon.class)));
    }
    private <T>T decodeRules(String purpose,jakarta.servlet.http.HttpServletRequest request,Class<T> type) {
        rules.authorizeHttp(purpose);
        try {
            byte[] bytes=request.getInputStream().readNBytes(262145);
            if(bytes.length>262144)throw new Failure(400,"INVALID_REQUEST");
            T value=mapper.readerFor(type).with(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_MISSING_CREATOR_PROPERTIES)
                    .with(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                    .without(com.fasterxml.jackson.databind.DeserializationFeature.ACCEPT_FLOAT_AS_INT).readValue(bytes);
            if(value==null)throw new Failure(400,"INVALID_REQUEST");return value;
        }catch(java.io.IOException invalid){throw new Failure(400,"INVALID_REQUEST");}
    }
    private <T>ResponseEntity<T> response(T value){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(value);}
    @ExceptionHandler(Failure.class) ResponseEntity<Map<String,Object>> failure(Failure f){return ResponseEntity.status(f.status).cacheControl(CacheControl.noStore()).body(Map.of("code",f.code,"details",f.details));}
    @ExceptionHandler({IllegalArgumentException.class,org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class}) ResponseEntity<Map<String,Object>> invalid(Exception f){return failure(new Failure(400,"INVALID_REQUEST"));}
    @ExceptionHandler({org.springframework.dao.DataAccessException.class,IllegalStateException.class}) ResponseEntity<Map<String,Object>> unavailable(Exception f){
        log.warn("Assessment configuration dependency failed",f);
        return failure(new Failure(503,"DEPENDENCY_UNAVAILABLE"));
    }
    @ExceptionHandler(com.adaptlearngraph.exception.SubscriptionFailure.class) ResponseEntity<Map<String,Object>> subscription(com.adaptlearngraph.exception.SubscriptionFailure f){boolean anonymous=f.code()==com.adaptlearngraph.exception.SubscriptionFailure.Code.UNAUTHENTICATED;return failure(new Failure(anonymous?401:403,anonymous?"UNAUTHENTICATED":"FORBIDDEN"));}
    @ExceptionHandler(com.adaptlearngraph.exception.RegistrationFailure.class) ResponseEntity<Map<String,Object>> identity(com.adaptlearngraph.exception.RegistrationFailure f){boolean anonymous=f.code()==com.adaptlearngraph.exception.RegistrationFailure.Code.UNAUTHENTICATED;return failure(new Failure(anonymous?401:403,anonymous?"UNAUTHENTICATED":"FORBIDDEN"));}
}
