package com.adaptlearngraph.identity.infrastructure;

import com.adaptlearngraph.identity.application.port.out.RegistrationDelivery;
import com.adaptlearngraph.identity.domain.RegistrationFailure;
import jakarta.mail.MessagingException;
import java.util.UUID;
import com.adaptlearngraph.shared.infrastructure.mail.TransactionalEmail;
import com.adaptlearngraph.shared.infrastructure.mail.TransactionalMailSender;
import java.util.Map;

public final class RegistrationMailDelivery implements RegistrationDelivery {
    private final TransactionalMailSender mail;

    public RegistrationMailDelivery(TransactionalMailSender mail) {
        this.mail = mail;
    }

    @Override
    public void requireConfigured() {
        if (!mail.configured()) {
            throw new RegistrationFailure(RegistrationFailure.Code.SERVICE_UNAVAILABLE,
                    "Registration email delivery is not configured. Contact the service operator.");
        }
    }

    public void send(String recipient, String code, UUID eventId) throws MessagingException {
        requireConfigured();
        mail.send(recipient, TransactionalEmail.render("Verify your Adapt-Learn-Graph registration",
                "Confirm your email to continue setting up your organization's workspace.", code, Map.of(),
                null, null, "Enter the latest six-digit code on your registration page. It expires 10 minutes after the request."
                        + " Never share it with support or in chat. If you did not register, ignore this email."),
                "X-Registration-Event", eventId);
    }

    public void sendActivation(String recipient,String link,UUID eventId) throws MessagingException {
        requireConfigured();
        mail.send(recipient, TransactionalEmail.render("Activate your Adapt-Learn-Graph workspace account",
                "Your organization administrator invited you to a workspace. Set your own password to get started.",
                null, Map.of(), "Activate my account", link,
                "This single-use link expires 10 minutes after the request. Do not share it. If unexpected, ignore this email."),
                "X-Activation-Event", eventId);
    }
}
