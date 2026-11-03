package com.adaptlearngraph.apis;

import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.dtos.AssessmentPolicyDto.ActivateRequest;
import com.adaptlearngraph.dtos.AssessmentPolicyDto.PageResponse;
import com.adaptlearngraph.dtos.AssessmentPolicyDto.SaveRequest;
import com.adaptlearngraph.dtos.AssessmentPolicyDto.SavedResponse;
import com.adaptlearngraph.dtos.AssessmentPolicyDto.StateResponse;
import com.adaptlearngraph.services.AssessmentPolicyApplicationService;
import com.adaptlearngraph.services.AssessmentPolicyService.Failure;
import com.adaptlearngraph.services.AssessmentPolicyService.Encoding;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.springframework.boot.autoconfigure.condition.*;
import org.springframework.context.annotation.Profile;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@Profile("local & workspace-baseline & !local-baseline-demo & !prod")
@ConditionalOnWebApplication(type=ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(name="assessment.baseline.workspace.enabled",havingValue="true")
@RequestMapping(ApiEndpoints.ASSESSMENT_POLICY)
public final class AssessmentPolicyController {
    private final AssessmentPolicyApplicationService service;private final Encoding json;
    public AssessmentPolicyController(AssessmentPolicyApplicationService service,Encoding json){this.service=service;this.json=json;}
    @GetMapping public ResponseEntity<StateResponse> read(){return response(service.read());}
    @GetMapping("/versions") public ResponseEntity<PageResponse> list(@RequestParam(defaultValue="0")int page,@RequestParam(defaultValue="20")int size){return response(service.list(page,size));}
    @PostMapping(value="/versions",consumes="application/json") public ResponseEntity<SavedResponse> save(jakarta.servlet.http.HttpServletRequest request){
        var r=decode(request,SaveRequest.class);var saved=service.save(r);
        return ResponseEntity.status(saved.noOp()?200:201).cacheControl(CacheControl.noStore()).body(saved);
    }
    @PostMapping(value="/activation",consumes="application/json") public ResponseEntity<StateResponse> activate(jakarta.servlet.http.HttpServletRequest request){var r=decode(request,ActivateRequest.class);return response(service.activate(r));}
    private <T>T decode(jakarta.servlet.http.HttpServletRequest request,Class<T> type){
        service.authorize(); // Trusted authorization precedes parsing/existence/error detail.
        try{
            byte[] bytes=request.getInputStream().readNBytes(4097);
            if(bytes.length>4096)throw new Failure(400,"INVALID_REQUEST");
            String body=StandardCharsets.UTF_8.newDecoder().decode(java.nio.ByteBuffer.wrap(bytes)).toString();
            var value=json.read(body,type);if(value==null)throw new Failure(400,"INVALID_REQUEST");return value;
        }catch(java.io.IOException invalid){throw new Failure(400,"INVALID_REQUEST");}
    }
    private <T>ResponseEntity<T> response(T value){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(value);}
    @ExceptionHandler(Failure.class) ResponseEntity<Map<String,String>> failure(Failure f){return ResponseEntity.status(f.status).cacheControl(CacheControl.noStore()).body(Map.of("code",f.code));}
    @ExceptionHandler({IllegalArgumentException.class,org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class}) ResponseEntity<Map<String,String>> invalid(Exception f){return failure(new Failure(400,"INVALID_REQUEST"));}
    @ExceptionHandler({org.springframework.dao.DataAccessException.class,IllegalStateException.class}) ResponseEntity<Map<String,String>> unavailable(Exception f){return failure(new Failure(503,"DEPENDENCY_UNAVAILABLE"));}
    @ExceptionHandler(com.adaptlearngraph.exception.SubscriptionFailure.class) ResponseEntity<Map<String,String>> subscription(com.adaptlearngraph.exception.SubscriptionFailure f){boolean anonymous=f.code()==com.adaptlearngraph.exception.SubscriptionFailure.Code.UNAUTHENTICATED;return failure(new Failure(anonymous?401:403,anonymous?"UNAUTHENTICATED":"FORBIDDEN"));}
    @ExceptionHandler(com.adaptlearngraph.exception.RegistrationFailure.class) ResponseEntity<Map<String,String>> identity(com.adaptlearngraph.exception.RegistrationFailure f){boolean anonymous=f.code()==com.adaptlearngraph.exception.RegistrationFailure.Code.UNAUTHENTICATED;return failure(new Failure(anonymous?401:403,anonymous?"UNAUTHENTICATED":"FORBIDDEN"));}
}
