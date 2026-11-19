package com.adaptlearngraph.services;

import com.adaptlearngraph.entities.domain.QuestionBank.*;
import java.util.*;

public interface QuestionBankUseCase {
    record Session(Actor actor, List<Choice> skills, List<Choice> experts, List<Choice> people, int maxImportRows, long maxImportBytes,List<KnowledgeChoice> knowledge) {}
    record View(UUID id, String name, List<Question> questions, List<Audit> history) {}
    record Save(UUID id, Long expectedRevision, String code, Content content, boolean acknowledgeDuplicates) {}
    record Command(UUID id, long expectedRevision, String action, String reason, UUID owner) {}
    record Bulk(List<Command> questions, boolean markReviewed) {
        public Bulk(List<Command> questions) {
            this(questions, false);
        }
    }
    record Preview(List<Row> rows, String fileHash) {
        public Preview(List<Row> rows) {
            this(rows, null);
        }
    }
    record Confirmation(UUID batch, boolean acknowledgeWarnings, boolean confirmSuccessors, boolean submitForReview, boolean skipDuplicates) {
        public Confirmation(UUID batch, boolean acknowledgeWarnings, boolean confirmSuccessors) {
            this(batch, acknowledgeWarnings, confirmSuccessors, false, false);
        }
        public Confirmation(UUID batch, boolean acknowledgeWarnings, boolean confirmSuccessors, boolean submitForReview) {
            this(batch, acknowledgeWarnings, confirmSuccessors, submitForReview, false);
        }
    }
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
