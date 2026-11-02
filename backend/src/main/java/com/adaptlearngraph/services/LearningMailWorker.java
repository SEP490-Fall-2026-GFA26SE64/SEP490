package com.adaptlearngraph.services;


import com.adaptlearngraph.helper.TransactionalEmail;
import com.adaptlearngraph.helper.TransactionalMailSender;
import com.adaptlearngraph.repository.LearningNotificationJpaRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.*;

/**
 * Durable at-least-once SMTP delivery; stable Message-ID permits downstream deduplication. The notification row has no
 * lease columns, so the claimed row stays locked (FOR UPDATE SKIP LOCKED) for the send and the fenced release.
 */
public final class LearningMailWorker {
    private final LearningNotificationJpaRepository notifications;
    private final TransactionTemplate transaction;
    private final TransactionalMailSender mail;
    private final String publicUrl;

    public LearningMailWorker(
            LearningNotificationJpaRepository notifications,
            TransactionTemplate transaction,
            TransactionalMailSender mail,
            String publicUrl) {
        this.notifications = notifications;
        this.transaction = transaction;
        this.mail = mail;
        this.publicUrl = publicUrl;
    }

    @Scheduled(fixedDelayString = "${learning.mail.delay-ms:5000}")
    public void deliver() {
        if (!mail.configured()) return;
        transaction.execute(
                status -> {
                    var job =
                            notifications.lockNextMail()
                                    .flatMap(id -> notifications.mailJob(id).stream().findFirst())
                                    .orElse(null);
                    if (job == null) return null;
                    try {
                        String path =
                                job.kind().equals("CONTENT_ISSUE")
                                        ? "/expert/modules"
                                        : "/employee/modules/"
                                                + java.net.URLEncoder.encode(
                                                        job.moduleId(),
                                                        java.nio.charset.StandardCharsets.UTF_8);
                        mail.send(
                                job.recipient(),
                                TransactionalEmail.render(
                                        job.title(),
                                        job.body(),
                                        null,
                                        Map.of("Module", job.moduleId()),
                                        "Open / Mở nội dung",
                                        publicUrl + com.adaptlearngraph.helper.WorkspaceLinks.path(job.slug(), path),
                                        "Sign in to review this update. / Đăng nhập để xem thông"
                                            + " báo."),
                                "X-Learning-Event",
                                job.id());
                        notifications.markMailSent(job.id(), job.attempts());
                    } catch (Exception e) {
                        notifications.scheduleMailRetry(job.id(), job.attempts());
                    }
                    return null;
                });
    }
}