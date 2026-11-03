package com.adaptlearngraph.apis;

import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.dtos.QuestionBankDto.ImportBatchResponse;
import com.adaptlearngraph.dtos.QuestionBankDto.NoticeResponse;
import com.adaptlearngraph.dtos.QuestionBankDto.PreviewRequest;
import com.adaptlearngraph.dtos.QuestionBankDto.SaveRequest;
import com.adaptlearngraph.dtos.QuestionBankDto.SessionResponse;
import com.adaptlearngraph.dtos.QuestionBankDto.ViewResponse;
import com.adaptlearngraph.services.QuestionBankApplicationService;
import com.adaptlearngraph.services.QuestionBankApplicationService.Failure;
import com.adaptlearngraph.services.QuestionBankUseCase.Bulk;
import com.adaptlearngraph.services.QuestionBankUseCase.Command;
import com.adaptlearngraph.services.QuestionBankUseCase.Confirmation;
import java.util.*;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@Profile("local & workspace-baseline & !prod & !local-baseline-demo")
@RequestMapping(ApiEndpoints.QUESTION_BANK)
public class QuestionBankController {
    private final QuestionBankApplicationService bank;
    public QuestionBankController(QuestionBankApplicationService bank){this.bank=bank;}
    @ModelAttribute void noCache(HttpServletResponse response){response.setHeader("Cache-Control","no-store");}
    @GetMapping("/session") public SessionResponse session(){return bank.session();}
    @GetMapping public ViewResponse read(){return bank.read();}
    @PostMapping("/questions") public ViewResponse save(@RequestBody SaveRequest input){return bank.save(input);}
    @PostMapping("/commands") public ViewResponse command(@RequestBody Command input){return bank.command(input);}
    @PostMapping("/approve") public ViewResponse approve(@RequestBody Bulk input){return bank.approve(input);}
    @PostMapping("/imports/preview") public ImportBatchResponse preview(@RequestBody PreviewRequest input){return bank.preview(input);}
    @PostMapping("/imports/confirm") public ViewResponse confirm(@RequestBody Confirmation input){return bank.confirm(input);}
    @GetMapping("/notifications") public List<NoticeResponse> notices(){return bank.notices();}
    @PostMapping("/notifications/{id}/read") public void markRead(@PathVariable UUID id){bank.markRead(id);}
    @ExceptionHandler(Failure.class) public ResponseEntity<Map<String,String>> failure(Failure e){return ResponseEntity.status(e.status()).header("Cache-Control","no-store").body(Map.of("message",e.getMessage()));}
    @ExceptionHandler({IllegalArgumentException.class,NullPointerException.class}) public ResponseEntity<Map<String,String>> invalid(){return ResponseEntity.badRequest().body(Map.of("message","Invalid Question Bank request"));}
}
