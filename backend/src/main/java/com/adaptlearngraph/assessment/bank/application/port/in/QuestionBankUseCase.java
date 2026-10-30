package com.adaptlearngraph.assessment.bank.application.port.in;

import com.adaptlearngraph.assessment.bank.domain.QuestionBank.*;
import java.util.*;

public interface QuestionBankUseCase {
    record Session(Actor actor, List<Choice> skills, List<Choice> experts, List<Choice> people, int maxImportRows, long maxImportBytes) {}
    record View(UUID id, String name, List<Question> questions, List<Audit> history) {}
    record Save(UUID id, Long expectedRevision, String code, Content content, boolean acknowledgeDuplicates) {}
    record Command(UUID id, long expectedRevision, String action, String reason, UUID owner) {}
    record Bulk(List<Command> questions) {}
    record Preview(List<Row> rows) {}
    record Confirmation(UUID batch, boolean acknowledgeWarnings, boolean confirmSuccessors) {}
    Session session();
    View read();
    View save(Save input);
    View command(Command input);
    View approve(Bulk input);
    ImportBatch preview(Preview input);
    View confirm(Confirmation input);
    List<Notice> notices();
    void markRead(UUID id);
}
