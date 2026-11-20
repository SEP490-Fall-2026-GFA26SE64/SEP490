package com.adaptlearngraph.apis;

import com.adaptlearngraph.services.SharedSkillAssessmentService;
import com.adaptlearngraph.services.AssessmentPolicyService.Failure;
import java.util.Map;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.DeserializationFeature;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.autoconfigure.condition.*;
import org.springframework.context.annotation.Profile;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@Profile("local & workspace-baseline & !prod & !local-baseline-demo")
@ConditionalOnWebApplication(type=ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(name="assessment.baseline.workspace.enabled",havingValue="true")
@RequestMapping("/api/v1/assessment-policies/SKILL_ASSESSMENT/shared")
public final class SharedSkillAssessmentController {
    private final SharedSkillAssessmentService configurations;
    private final ObjectMapper mapper;
    public SharedSkillAssessmentController(SharedSkillAssessmentService configurations,ObjectMapper mapper){this.configurations=configurations;this.mapper=mapper.copy().enable(com.fasterxml.jackson.core.JsonParser.Feature.STRICT_DUPLICATE_DETECTION).enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS);}
    @GetMapping public ResponseEntity<?> read(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="") String search,@RequestParam(defaultValue="latest") String sort){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(configurations.read(page,search,sort));}
    @PostMapping("/commands") public ResponseEntity<?> command(HttpServletRequest request){
        configurations.authorize();
        try {
            byte[] bytes=request.getInputStream().readNBytes(262145);if(bytes.length>262144)throw new Failure(400,"INVALID_REQUEST");
            var command=mapper.readerFor(SharedSkillAssessmentService.Command.class).with(DeserializationFeature.FAIL_ON_MISSING_CREATOR_PROPERTIES)
                    .with(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES).without(DeserializationFeature.ACCEPT_FLOAT_AS_INT).readValue(bytes);
            return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(configurations.command((SharedSkillAssessmentService.Command)command));
        }catch(java.io.IOException invalid){throw new Failure(400,"INVALID_REQUEST");}
    }
    @ExceptionHandler(Failure.class) public ResponseEntity<?> failure(Failure failure){return ResponseEntity.status(failure.status).cacheControl(CacheControl.noStore()).body(Map.of("code",failure.code));}
    @ExceptionHandler({IllegalArgumentException.class,org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class}) ResponseEntity<?> invalid(Exception failure){return failure(new Failure(400,"INVALID_REQUEST"));}
    @ExceptionHandler({org.springframework.dao.DataAccessException.class,IllegalStateException.class}) ResponseEntity<?> unavailable(Exception failure){return failure(new Failure(503,"DEPENDENCY_UNAVAILABLE"));}
    @ExceptionHandler(com.adaptlearngraph.exception.SubscriptionFailure.class) ResponseEntity<?> subscription(com.adaptlearngraph.exception.SubscriptionFailure f){boolean anonymous=f.code()==com.adaptlearngraph.exception.SubscriptionFailure.Code.UNAUTHENTICATED;return failure(new Failure(anonymous?401:403,anonymous?"UNAUTHENTICATED":"FORBIDDEN"));}
    @ExceptionHandler(com.adaptlearngraph.exception.RegistrationFailure.class) ResponseEntity<?> identity(com.adaptlearngraph.exception.RegistrationFailure f){boolean anonymous=f.code()==com.adaptlearngraph.exception.RegistrationFailure.Code.UNAUTHENTICATED;return failure(new Failure(anonymous?401:403,anonymous?"UNAUTHENTICATED":"FORBIDDEN"));}
}
