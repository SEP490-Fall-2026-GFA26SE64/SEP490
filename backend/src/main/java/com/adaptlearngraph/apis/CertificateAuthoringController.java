package com.adaptlearngraph.apis;
import com.adaptlearngraph.services.*;
import com.adaptlearngraph.services.CertificateAuthoringService.*;
import com.adaptlearngraph.exception.InitialPathwayFailure;
import java.util.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.context.annotation.Profile;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

@RestController
@RequestMapping("/api/v1")
@Profile("local & workspace-baseline & !local-baseline-demo & !prod")
@ConditionalOnProperty(name={"pathway.initial.enabled","assessment.baseline.workspace.enabled"},havingValue="true")
public final class CertificateAuthoringController {
 private final CertificateAuthoringService service;private final CertificateImportService imports;
 public CertificateAuthoringController(CertificateAuthoringService service){this.service=service;this.imports=new CertificateImportService(service);}
 private <T> ResponseEntity<T> ok(T v){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(v);}
 @GetMapping({"/expert/certificate-definitions","/ld-manager/certificate-definitions"})ResponseEntity<?> directory(){return ok(service.directory());}
 @GetMapping("/expert/certificate-definitions/template")ResponseEntity<byte[]> template(){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=Certificate_Import_Template.xlsx").contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).body(imports.template());}
 @PostMapping(value="/expert/certificate-definitions/preview",consumes="multipart/form-data")ResponseEntity<?> preview(@RequestPart("file")MultipartFile file){return ok(imports.preview(file));}
 @PostMapping("/expert/certificate-definitions/submit")ResponseEntity<?> submit(@RequestHeader("Idempotency-Key")UUID key,@RequestBody List<Selection> rows){return ok(service.submitSelections(key,rows));}
 @PutMapping("/expert/certificate-definitions/{id}")ResponseEntity<?> edit(@PathVariable UUID id,@RequestBody Edit edit){return ok(service.edit(id,edit));}
 public record Revision(long revision){}
 @PostMapping("/expert/certificate-definitions/{id}/submit")ResponseEntity<?> resubmit(@PathVariable UUID id,@RequestBody Revision r){return ok(service.resubmit(id,r.revision()));}
 @PostMapping("/ld-manager/certificate-definitions/{id}/viewed")ResponseEntity<?> viewed(@PathVariable UUID id,@RequestBody Revision r){return ok(service.viewed(id,r.revision()));}
 @PostMapping("/ld-manager/certificate-definitions/decisions")ResponseEntity<?> decide(@RequestBody List<Decision> rows){return ok(service.decide(rows));}
 @ExceptionHandler(InitialPathwayFailure.class)ResponseEntity<?> failure(InitialPathwayFailure f){return ResponseEntity.status(f.status()).cacheControl(CacheControl.noStore()).body(Map.of("code",f.code()));}
 @ExceptionHandler(com.adaptlearngraph.entities.domain.QuestionBank.Failure.class)ResponseEntity<?> staff(com.adaptlearngraph.entities.domain.QuestionBank.Failure f){return ResponseEntity.status(f.status()).body(Map.of("code",f.getMessage()));}
 @ExceptionHandler({IllegalArgumentException.class,org.springframework.http.converter.HttpMessageNotReadableException.class})ResponseEntity<?> invalid(Exception e){return ResponseEntity.badRequest().body(Map.of("code","INVALID_REQUEST"));}
 @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)ResponseEntity<?> duplicate(org.springframework.dao.DataIntegrityViolationException e){
  for(Throwable cause=e;cause!=null;cause=cause.getCause())if(cause instanceof java.sql.SQLException sql && "23505".equals(sql.getSQLState()) && sql.getMessage()!=null && sql.getMessage().contains("certificate_authoring_open_scope"))return ResponseEntity.status(409).body(Map.of("code","CERTIFICATE_CONFLICT_RELOAD"));
  org.slf4j.LoggerFactory.getLogger(CertificateAuthoringController.class).error("Certificate persistence failed",e);
  return ResponseEntity.status(500).body(Map.of("code","CERTIFICATE_SAVE_FAILED"));
 }
}
