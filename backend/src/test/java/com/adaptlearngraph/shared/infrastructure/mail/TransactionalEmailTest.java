package com.adaptlearngraph.shared.infrastructure.mail;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.util.Map;
import java.util.Properties;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;

class TransactionalEmailTest {
    @Test
    void escapesDynamicFieldsAndRetainsTextAlternative() {
        var value = TransactionalEmail.render("Payment received", "Hello <owner>", "123456",
                Map.of("Plan", "<script>alert('x')</script>"), "View order", "https://example.test/order?a=1&b=2", "Keep this receipt.");
        assertTrue(value.html().contains("&lt;script&gt;"));
        assertFalse(value.html().contains("<script>"));
        assertTrue(value.html().contains("a=1&amp;b=2"));
        assertTrue(value.text().contains("123456"));
        assertTrue(value.html().contains("Adapt-Learn-Graph"));
        assertThrows(IllegalArgumentException.class, () -> TransactionalEmail.render("Subject", "Text", null,
                Map.of(), "Open", "javascript:alert(1)", "Guidance"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void sendsMultipartAlternativeWithCorrelationHeader() throws Exception {
        JavaMailSender mail = mock(JavaMailSender.class);
        ObjectProvider<JavaMailSender> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(mail);
        when(provider.getObject()).thenReturn(mail);
        var message = new MimeMessage(Session.getInstance(new Properties()));
        when(mail.createMimeMessage()).thenReturn(message);
        UUID event = UUID.randomUUID();
        new TransactionalMailSender(provider, "sender@example.test", "localhost").send("recipient@example.test",
                TransactionalEmail.render("Verification", "Confirm email", "123456", Map.of(), null, null, "Expires in 10 minutes."),
                "X-Registration-Event", event);
        message.saveChanges();
        var output = new java.io.ByteArrayOutputStream();
        message.writeTo(output);
        String mime = output.toString(java.nio.charset.StandardCharsets.UTF_8);
        assertTrue(mime.contains("multipart/alternative"));
        assertTrue(mime.contains("text/plain"));
        assertTrue(mime.contains("text/html"));
        assertTrue(mime.contains("image/png"));
        assertTrue(mime.contains("Content-ID: <alg-brand-logo>"));
        assertTrue(mime.contains("cid:alg-brand-logo"));
        assertEquals(event.toString(), message.getHeader("X-Registration-Event", null));
        verify(mail).send(message);
    }
}
