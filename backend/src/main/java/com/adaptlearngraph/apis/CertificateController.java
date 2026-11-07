package com.adaptlearngraph.apis;

import com.adaptlearngraph.entities.domain.CertificateCatalog;
import com.adaptlearngraph.exception.InitialPathwayFailure;
import com.adaptlearngraph.repository.InitialPathwayPorts.Receipt;
import com.adaptlearngraph.services.*;
import com.fasterxml.jackson.databind.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController @RequestMapping("/api/v1")
@Profile("local & workspace-baseline & !local-baseline-demo & !prod")
@ConditionalOnProperty(name={"pathway.initial.enabled","assessment.baseline.workspace.enabled"},havingValue="true")
public final class CertificateController {
    private final CertificateCatalogService catalog;private final CertificateSubmissionService submissions;private final CertificateReviewService review;private final ObjectMapper json;
    public CertificateController(CertificateCatalogService catalog,CertificateSubmissionService submissions,CertificateReviewService review,ObjectMapper json){
        this.catalog=catalog;this.submissions=submissions;this.review=review;this.json=json.copy().enable(com.fasterxml.jackson.core.JsonParser.Feature.STRICT_DUPLICATE_DETECTION)
                .enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES).enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS);
    }
    @GetMapping("/expert/certificates")ResponseEntity<?> catalog(@RequestParam(defaultValue="0")int offset,@RequestParam(defaultValue="20")int limit){return ok(catalog.list(offset,limit));}
    @PostMapping(value="/expert/certificates",consumes="application/json")ResponseEntity<?> create(@RequestHeader("Idempotency-Key")UUID key,@RequestBody String body){return ResponseEntity.status(201).cacheControl(CacheControl.noStore()).body(catalog.create(key,parse(body,CertificateCatalog.Create.class)));}
    @GetMapping("/employee/pathways/{request}/certificate-submissions")ResponseEntity<?> history(@PathVariable UUID request,@RequestParam UUID stepId,
            @RequestParam(defaultValue="0")int offset,@RequestParam(defaultValue="20")int limit){return ok(submissions.history(request,stepId,offset,limit));}
    @PostMapping(value="/employee/pathways/{request}/certificate-submissions",consumes="application/json")ResponseEntity<?> submit(@PathVariable UUID request,@RequestHeader("Idempotency-Key")String key,@RequestBody String body){return receipt(submissions.submit(request,key,parse(body,CertificateSubmissionService.Submit.class)));}
    @PostMapping(value="/employee/pathways/{request}/certificate-uploads",consumes="multipart/form-data")ResponseEntity<?> upload(@PathVariable UUID request,@RequestHeader("Idempotency-Key")String key,
            @RequestParam long revision,@RequestParam String contentHash,@RequestParam UUID stepId,@RequestParam String sha256,@RequestParam("file")MultipartFile file){
        return receipt(submissions.upload(request,key,new CertificateSubmissionService.Expected(revision,contentHash,stepId),file.getOriginalFilename(),file.getSize(),sha256,file));
    }
    @GetMapping("/expert/certificate-submissions")ResponseEntity<?> queue(@RequestParam(defaultValue="0")int offset,@RequestParam(defaultValue="20")int limit){return ok(review.queue(offset,limit));}
    @GetMapping("/expert/certificate-submissions/{id}")ResponseEntity<?> detail(@PathVariable UUID id){return ok(review.detail(id));}
    @PostMapping(value="/expert/certificate-submissions/{id}/decision",consumes="application/json")ResponseEntity<?> decide(@PathVariable UUID id,@RequestHeader("Idempotency-Key")String key,@RequestBody String body){return receipt(review.decide(id,key,parse(body,CertificateReviewService.Decide.class)));}
    @GetMapping({"/employee/certificate-submissions/{id}/file","/expert/certificate-submissions/{id}/file"})ResponseEntity<InputStreamResource> file(@PathVariable UUID id){
        var download=review.file(id);var input=download.open().get();
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header("X-Content-Type-Options","nosniff")
                .header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename(download.filename(),StandardCharsets.UTF_8).build().toString())
                .contentType(MediaType.parseMediaType(download.mediaType())).contentLength(download.byteSize()).body(new InputStreamResource(input));
    }
    private <T>T parse(String body,Class<T> type){if(body.length()>16384)throw new InitialPathwayFailure(400,"INVALID_REQUEST");try{T value=json.readValue(body,type);if(value==null)throw new IllegalArgumentException();return value;}catch(Exception invalid){throw new InitialPathwayFailure(400,"INVALID_REQUEST");}}
    private ResponseEntity<String> receipt(Receipt result){return ResponseEntity.status(result.status()).cacheControl(CacheControl.noStore()).contentType(MediaType.APPLICATION_JSON).body(result.responseJson());}
    private <T>ResponseEntity<T> ok(T value){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(value);}
    @ExceptionHandler(InitialPathwayFailure.class)ResponseEntity<?> failure(InitialPathwayFailure failure){return ResponseEntity.status(failure.status()).cacheControl(CacheControl.noStore()).body(Map.of("code",failure.code(),"retryable",failure.retryable(),"correlationId",failure.correlationId()));}
    @ExceptionHandler(ModuleAuthoringService.Failure.class)ResponseEntity<?> storage(ModuleAuthoringService.Failure failure){return failure(new InitialPathwayFailure(failure.status(),failure.status()==413?"FILE_EXCEEDS_CURRENT_UPLOAD_LIMIT":failure.status()>=500?"PRIVATE_UPLOAD_UNAVAILABLE":"PRIVATE_UPLOAD_REJECTED"));}
    @ExceptionHandler(RoleBaselineFlow.Failure.class)ResponseEntity<?> selection(RoleBaselineFlow.Failure failure){return failure(new InitialPathwayFailure(failure.status,failure.code));}
    @ExceptionHandler({org.springframework.dao.DataAccessException.class,IllegalStateException.class})ResponseEntity<?> unavailable(Exception failure){return failure(new InitialPathwayFailure(503,"DEPENDENCY_UNAVAILABLE"));}
    @ExceptionHandler({IllegalArgumentException.class,org.springframework.web.bind.MissingRequestHeaderException.class,org.springframework.web.bind.MissingServletRequestParameterException.class,
            org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class,org.springframework.web.multipart.support.MissingServletRequestPartException.class})ResponseEntity<?> invalid(Exception failure){return failure(new InitialPathwayFailure(400,"INVALID_REQUEST"));}
}
