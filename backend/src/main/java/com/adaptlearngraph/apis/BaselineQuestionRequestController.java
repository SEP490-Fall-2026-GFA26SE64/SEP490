package com.adaptlearngraph.apis;

import com.adaptlearngraph.services.BaselineQuestionRequestService;
import com.adaptlearngraph.services.ScopedAssessmentPolicyService;
import com.adaptlearngraph.entities.domain.QuestionBank.Failure;
import java.util.*;
import org.springframework.context.annotation.Profile;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@Profile("local & workspace-baseline & !prod & !local-baseline-demo")
@RequestMapping("/api/v1/baseline-question-requests")
public final class BaselineQuestionRequestController {
    private final BaselineQuestionRequestService requests;
    public BaselineQuestionRequestController(BaselineQuestionRequestService requests){this.requests=requests;}
    @GetMapping("/bulk-template") public ResponseEntity<?> template(){return response(requests.template().orElse(null));}
    @PutMapping("/bulk-template") public ResponseEntity<?> template(@RequestBody ScopedAssessmentPolicyService.BulkTemplate body){requests.template(body);return response(Map.of("saved",true));}
    private ResponseEntity<?> response(Object body){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body);}
    @ExceptionHandler(Failure.class) public ResponseEntity<?> failure(Failure f){return ResponseEntity.status(f.status()).cacheControl(CacheControl.noStore()).body(Map.of("code",f.getMessage()));}
}
