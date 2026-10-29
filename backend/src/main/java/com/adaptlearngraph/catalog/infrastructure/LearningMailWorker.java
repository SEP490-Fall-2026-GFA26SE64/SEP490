package com.adaptlearngraph.catalog.infrastructure;

import com.adaptlearngraph.shared.infrastructure.mail.*;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.*;

/** Durable at-least-once SMTP delivery; stable Message-ID permits downstream deduplication. */
public final class LearningMailWorker {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transaction;
    private final TransactionalMailSender mail;
    private final String publicUrl;

    public LearningMailWorker(
            JdbcTemplate jdbc,
            TransactionTemplate transaction,
            TransactionalMailSender mail,
            String publicUrl) {
        this.jdbc = jdbc;
        this.transaction = transaction;
        this.mail = mail;
        this.publicUrl = publicUrl;
    }

    @Scheduled(fixedDelayString = "${learning.mail.delay-ms:5000}")
    public void deliver() {
        if (!mail.configured()) return;
        transaction.execute(
                status -> {
                    var jobs =
                            jdbc.query(
                                    "SELECT n.id,n.kind,n.module_id,n.title,n.body,a.identifier"
                                        + " FROM platform.learning_notification n JOIN"
                                        + " platform.account a ON a.account_id::text=n.recipient_id"
                                        + " AND a.organization_id::text=n.organization_id WHERE"
                                        + " n.mail_sent_at IS NULL AND n.mail_attempts<8 AND"
                                        + " n.mail_next_attempt<=now() AND a.active ORDER BY"
                                        + " n.created_at LIMIT 1 FOR UPDATE OF n SKIP LOCKED",
                                    (r, n) ->
                                            new Job(
                                                    r.getObject(1, UUID.class),
                                                    r.getString(2),
                                                    r.getString(3),
                                                    r.getString(4),
                                                    r.getString(5),
                                                    r.getString(6)));
                    if (jobs.isEmpty()) return null;
                    Job j = jobs.getFirst();
                    try {
                        String path =
                                j.kind().equals("CONTENT_ISSUE")
                                        ? "/expert/modules"
                                        : "/employee/modules/"
                                                + java.net.URLEncoder.encode(
                                                        j.module(),
                                                        java.nio.charset.StandardCharsets.UTF_8);
                        mail.send(
                                j.recipient(),
                                TransactionalEmail.render(
                                        j.title(),
                                        j.body(),
                                        null,
                                        Map.of("Module", j.module()),
                                        "Open / Mở nội dung",
                                        publicUrl + path,
                                        "Sign in to review this update. / Đăng nhập để xem thông"
                                            + " báo."),
                                "X-Learning-Event",
                                j.id());
                        jdbc.update(
                                "UPDATE platform.learning_notification SET"
                                    + " mail_sent_at=now(),mail_attempts=mail_attempts+1,mail_error=NULL"
                                    + " WHERE id=?",
                                j.id());
                    } catch (Exception e) {
                        jdbc.update(
                                "UPDATE platform.learning_notification SET"
                                    + " mail_attempts=mail_attempts+1,mail_next_attempt=now()+interval"
                                    + " '1 minute'*(mail_attempts+1),mail_error='SMTP_UNAVAILABLE'"
                                    + " WHERE id=?",
                                j.id());
                    }
                    return null;
                });
    }

    private record Job(
            UUID id, String kind, String module, String title, String body, String recipient) {}
}
