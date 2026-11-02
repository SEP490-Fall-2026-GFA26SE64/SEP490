package com.adaptlearngraph.services;

import com.adaptlearngraph.helper.TransactionalEmail;
import com.adaptlearngraph.helper.TransactionalMailSender;
import com.adaptlearngraph.repository.QuestionBankJpaRepository;
import java.util.Map;
import java.util.UUID;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.support.TransactionTemplate;

/** Fenced at-least-once delivery, independent of the committed authoring command. */
public final class QuestionBankMailWorker {
    private final QuestionBankJpaRepository notices;
    private final TransactionTemplate tx;
    private final TransactionalMailSender mail;
    private final String publicUrl;

    public QuestionBankMailWorker(QuestionBankJpaRepository notices, TransactionTemplate tx, TransactionalMailSender mail, String publicUrl) {
        this.notices = notices;
        this.tx = tx;
        this.mail = mail;
        this.publicUrl = publicUrl.replaceAll("/+$", "");
    }

    private record Job(UUID id, UUID lease, String email, String title, String body, int attempts, String role, String slug) {}

    @Scheduled(fixedDelayString = "${question-bank.mail-delay-ms:5000}")
    public void deliver() {
        Job job = tx.execute(status -> {
            var notice = notices.lockNextNotice().map(notices::notice).flatMap(rows -> rows.stream().findFirst()).orElse(null);
            if (notice == null) return null;
            var j = new Job(notice.noticeId(), UUID.randomUUID(), notice.email(), notice.title(), notice.body(), notice.attempts() + 1,
                    notice.role(), notice.slug());
            notices.leaseNotice(j.id(), j.lease());
            return j;
        });
        if (job == null) return;
        String state = "SENT";
        String error = null;
        try {
            if (job.attempts() > 5) throw new IllegalStateException("Retries exhausted");
            mail.send(job.email(), TransactionalEmail.render(job.title(), job.body(), null, Map.of(), "Open Question Bank",
                    publicUrl + com.adaptlearngraph.helper.WorkspaceLinks.path(job.slug(),
                            "LD_MANAGER".equals(job.role()) ? "/ld-manager/question-bank" : "/expert/assessment-bank"),
                    "Sign in to review details. No answer key is included in this notification."), "X-Question-Bank-Notice", job.id());
        } catch (Exception e) {
            state = job.attempts() < 5 ? "RETRY" : "FAILED";
            error = "EMAIL_UNAVAILABLE";
        }
        String result = state;
        String code = error;
        tx.executeWithoutResult(status -> notices.releaseNotice(job.id(), job.lease(), result, code));
    }
}
