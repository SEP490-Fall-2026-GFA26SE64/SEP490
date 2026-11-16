package com.adaptlearngraph.apis;

import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.exception.InitialPathwayFailure;
import com.adaptlearngraph.services.EmployeeDevelopmentReportService;
import java.util.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

/** FR-04.07 read-only L&D Manager monitoring routes; the workspace entitlement filter and service both require LD_MANAGER. */
@RestController
@RequestMapping(value=ApiEndpoints.LD_EMPLOYEE_DEVELOPMENT,produces=MediaType.APPLICATION_JSON_VALUE)
@Profile("local & workspace-baseline & !local-baseline-demo & !prod")
@ConditionalOnProperty(name={"pathway.initial.enabled","assessment.baseline.workspace.enabled"},havingValue="true")
public final class EmployeeDevelopmentController {
    private final EmployeeDevelopmentReportService reports;
    public EmployeeDevelopmentController(EmployeeDevelopmentReportService reports){this.reports=reports;}

    @GetMapping("/employees") ResponseEntity<?> employees(){return ok(reports.employees());}
    @GetMapping("/employees/{accountId}") ResponseEntity<?> employee(@PathVariable UUID accountId){return ok(reports.employee(accountId));}

    private <T>ResponseEntity<T> ok(T value){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(value);}
    @ExceptionHandler(InitialPathwayFailure.class) ResponseEntity<?> failure(InitialPathwayFailure failure){
        return ResponseEntity.status(failure.status()).cacheControl(CacheControl.noStore()).body(Map.of("code",failure.code(),"retryable",failure.retryable(),"correlationId",failure.correlationId()));
    }
    @ExceptionHandler({org.springframework.dao.DataAccessException.class,IllegalStateException.class}) ResponseEntity<?> unavailable(Exception failure){
        org.slf4j.LoggerFactory.getLogger(EmployeeDevelopmentController.class).warn("Employee development report dependency failed",failure);
        return failure(new InitialPathwayFailure(503,"DEPENDENCY_UNAVAILABLE"));
    }
    @ExceptionHandler({IllegalArgumentException.class,org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class})
    ResponseEntity<?> invalid(Exception failure){return failure(new InitialPathwayFailure(400,"INVALID_REQUEST"));}
}
