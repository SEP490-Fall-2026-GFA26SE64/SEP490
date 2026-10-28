package com.adaptlearngraph.shared.infrastructure.mail;

import jakarta.mail.MessagingException;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.MailPreparationException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;

public final class TransactionalMailSender {
    private final ObjectProvider<JavaMailSender> sender;
    private final String from;
    private final String host;

    public TransactionalMailSender(ObjectProvider<JavaMailSender> sender, String from, String host) {
        this.sender = sender;
        this.from = from;
        this.host = host;
    }

    public boolean configured() {
        return sender.getIfAvailable() != null && from != null && !from.isBlank() && host != null && !host.isBlank();
    }

    public void send(String recipient, TransactionalEmail content, String eventHeader, UUID eventId) throws MessagingException {
        if (!configured()) throw new MailPreparationException("Transactional email delivery is not configured.");
        JavaMailSender mail = sender.getObject();
        var message = mail.createMimeMessage();
        var helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setFrom(from);
        helper.setTo(recipient);
        helper.setSubject(content.subject());
        helper.setText(content.text(), content.html());
        helper.addInline("alg-brand-logo", new org.springframework.core.io.ClassPathResource("mail/brand-logo.png"), "image/png");
        message.setHeader(eventHeader, eventId.toString());
        message.setHeader("Message-ID", "<" + eventId + "@adapt-learn-graph>");
        mail.send(message);
    }
}
