package com.adaptlearngraph.assessment.bank.api;

import com.adaptlearngraph.assessment.bank.application.port.in.QuestionBankUseCase;
import com.adaptlearngraph.assessment.bank.application.port.in.QuestionBankUseCase.*;
import com.adaptlearngraph.assessment.bank.domain.QuestionBank.*;
import java.util.*;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@Profile("local & workspace-baseline & !prod & !local-baseline-demo")
@RequestMapping("/api/v1/question-bank")
public class QuestionBankController {
    private final QuestionBankUseCase bank;
    public QuestionBankController(QuestionBankUseCase bank){this.bank=bank;}
    @ModelAttribute void noCache(HttpServletResponse response){response.setHeader("Cache-Control","no-store");}
    @GetMapping("/session") public Session session(){return bank.session();}
    @GetMapping public View read(){return bank.read();}
    @PostMapping("/questions") public View save(@RequestBody Save input){return bank.save(input);}
    @PostMapping("/commands") public View command(@RequestBody Command input){return bank.command(input);}
    @PostMapping("/approve") public View approve(@RequestBody Bulk input){return bank.approve(input);}
    @PostMapping("/imports/preview") public ImportBatch preview(@RequestBody Preview input){return bank.preview(input);}
    @PostMapping("/imports/confirm") public View confirm(@RequestBody Confirmation input){return bank.confirm(input);}
    @GetMapping("/notifications") public List<Notice> notices(){return bank.notices();}
    @PostMapping("/notifications/{id}/read") public void markRead(@PathVariable UUID id){bank.markRead(id);}
    @ExceptionHandler(Failure.class) public ResponseEntity<Map<String,String>> failure(Failure e){return ResponseEntity.status(e.status()).header("Cache-Control","no-store").body(Map.of("message",e.getMessage()));}
    @ExceptionHandler({IllegalArgumentException.class,NullPointerException.class}) public ResponseEntity<Map<String,String>> invalid(){return ResponseEntity.badRequest().body(Map.of("message","Invalid Question Bank request"));}
}
