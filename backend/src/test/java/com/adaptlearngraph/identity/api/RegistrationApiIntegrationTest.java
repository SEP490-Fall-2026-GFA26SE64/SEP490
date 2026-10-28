package com.adaptlearngraph.identity.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.adaptlearngraph.identity.application.port.out.RegistrationSecrets;
import com.adaptlearngraph.identity.infrastructure.RegistrationConfiguration;
import com.adaptlearngraph.identity.infrastructure.SecurityConfiguration;
import com.eatthepath.otp.TimeBasedOneTimePasswordGenerator;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestComponent;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

@SpringBootTest(classes = RegistrationApiIntegrationTest.TestApplication.class,
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
                "spring.profiles.active=registration-test", "spring.flyway.enabled=true",
                "spring.session.jdbc.initialize-schema=never",
                "spring.session.jdbc.table-name=platform.registration_session",
                "spring.mail.host=127.0.0.1", "registration.mail-from=no-reply@example.test",
                "registration.cookie-secure=false", "registration.mail-worker.enabled=false",
                "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration"
        })
class RegistrationApiIntegrationTest {
    private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17.6-alpine");
    private static final String PASSWORD = "api registration password";
    static { POSTGRES.start(); }
    @LocalServerPort private int port;
    @Autowired private ObjectMapper json;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private RegistrationSecrets secrets;
    private HttpClient owner;

    @Configuration(proxyBeanMethods = false)
    @TestComponent
    @EnableAutoConfiguration
    @Import({RegistrationConfiguration.class, RegistrationController.class,
            RegistrationExceptionHandler.class, SecurityConfiguration.class})
    static class TestApplication {}

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("registration.encryption-key", () -> Base64.getEncoder().encodeToString("e".repeat(32).getBytes(StandardCharsets.UTF_8)));
        registry.add("registration.hmac-key", () -> Base64.getEncoder().encodeToString("h".repeat(32).getBytes(StandardCharsets.UTF_8)));
    }

    @AfterAll
    static void stop() { POSTGRES.stop(); }

    @BeforeEach
    void setUp() { owner = browser(); }

    @Test
    void requiresCsrfAndDoesNotExposeOwnerDataToAnotherBrowser() throws Exception {
        String email = email();
        var csrf = get(owner, "/csrf");
        assertThat(csrf.statusCode()).isEqualTo(200);
        String cookie = csrf.headers().firstValue("set-cookie").orElseThrow();
        assertThat(cookie).contains("REGISTRATION_SESSION=", "HttpOnly", "SameSite=Lax", "Path=/api/v1/registration");
        assertThat(csrf.headers().firstValue("cache-control").orElseThrow()).contains("no-store");
        var noCsrf = owner.send(HttpRequest.newBuilder(uri(""))
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(signup(email))).build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(noCsrf.statusCode()).isEqualTo(403);
        assertThat(post(owner, "", signup(email)).statusCode()).isEqualTo(201);
        assertThat(body(get(owner, "/current")).path("stage").asText()).isEqualTo("VERIFY_EMAIL");
        var outsider = browser();
        assertThat(get(outsider, "/current").statusCode()).isEqualTo(401);
        assertThat(post(outsider, "/email/resend", "{}").statusCode()).isEqualTo(401);
        assertThat(post(owner, "/totp/setup", "{}").statusCode()).isEqualTo(403);
        String outsiderEmail = email();
        assertThat(post(outsider, "", signup(outsiderEmail)).statusCode()).isEqualTo(201);
        UUID ownerAccount = jdbc.queryForObject("SELECT account_id FROM platform.account WHERE normalized_identifier = ?",
                UUID.class, email);
        JsonNode isolated = body(get(outsider, "/current?accountId=" + ownerAccount + "&organizationId=" + UUID.randomUUID()));
        assertThat(isolated.path("email").asText()).isEqualTo(outsiderEmail);
        assertThat(isolated.path("fields").isNull()).isTrue();
        assertThat(body(get(owner, "/current")).path("email").asText()).isEqualTo(email);
        assertThat(post(owner, "/sign-out", "{}").statusCode()).isEqualTo(204);
        assertThat(get(owner, "/current").statusCode()).isEqualTo(401);
    }

    @Test
    void completesEmailAndMfaWithDurableRotatedSessionsAndRecovery() throws Exception {
        String email = email();
        get(owner, "/csrf");
        assertThat(post(owner, "", signup(email)).statusCode()).isEqualTo(201);
        UUID account = jdbc.queryForObject("SELECT account_id FROM platform.account WHERE normalized_identifier = ?",
                UUID.class, email);
        String encryptedCode = jdbc.queryForObject("""
                SELECT payload ->> 'encryptedCode' FROM platform.outbox_event WHERE aggregate_id = ?
                """, String.class, account);
        String code = secrets.decrypt(encryptedCode, "email:" + account + ":1");
        var verification = post(owner, "/email/verify", json.writeValueAsString(Map.of("code", code)));
        assertThat(verification.statusCode()).isEqualTo(200);
        assertThat(verification.headers().firstValue("set-cookie")).isPresent();
        var setup = body(post(owner, "/totp/setup", "{}"));
        String secret = decodeBase32(setup.path("manualSecret").asText());
        var completed = post(owner, "/totp/confirm", json.writeValueAsString(Map.of("code", totp(secret))));
        assertThat(completed.statusCode()).isEqualTo(200);
        JsonNode completion = body(completed);
        assertThat(completion.path("registration").path("stage").asText()).isEqualTo("COMPLETE");
        assertThat(completion.path("recoveryCodes")).hasSize(10);
        assertThat(get(owner, "/current").body()).doesNotContain("passwordHash", "manualSecret", "recoveryCodes", "encrypted");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM platform.registration_session WHERE principal_name = ?",
                Integer.class, account.toString())).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT max_inactive_interval FROM platform.registration_session WHERE principal_name = ?",
                Integer.class, account.toString())).isEqualTo(1800);

        HttpClient recoveryBrowser = browser();
        assertThat(post(recoveryBrowser, "/sign-in",
                json.writeValueAsString(Map.of("email", email, "password", PASSWORD))).statusCode()).isEqualTo(200);
        var recovery = post(recoveryBrowser, "/recovery",
                json.writeValueAsString(Map.of("code", completion.path("recoveryCodes").get(0).asText())));
        assertThat(recovery.statusCode()).isEqualTo(200);
        assertThat(body(recovery).path("stage").asText()).isEqualTo("SETUP_MFA_RECOVERY");
        assertThat(get(owner, "/current").statusCode()).isEqualTo(401);
        assertThat(post(recoveryBrowser, "/totp/verify", "{\"code\":\"123456\"}").statusCode()).isEqualTo(403);
        var replacement = body(post(recoveryBrowser, "/totp/setup", "{}"));
        String nextSecret = decodeBase32(replacement.path("manualSecret").asText());
        assertThat(post(recoveryBrowser, "/totp/confirm",
                json.writeValueAsString(Map.of("code", totp(nextSecret)))).statusCode()).isEqualTo(200);
        assertThat(body(get(recoveryBrowser, "/current")).path("fields").path("adminEmail").asText()).isEqualTo(email);

        var unrelated = recoveryBrowser.send(HttpRequest.newBuilder(
                URI.create("http://127.0.0.1:" + port + "/api/v1/employee/target-role-selection")).GET().build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(unrelated.statusCode()).isIn(401, 403);
    }

    @Test
    void invalidInputAndDuplicateSignupNeverOverwriteStoredCredentials() throws Exception {
        String email = email();
        assertThat(post(owner, "", signup(email).replace("API Test Organization", "")).statusCode()).isEqualTo(400);
        assertThat(post(owner, "", signup(email)).statusCode()).isEqualTo(201);
        String hash = jdbc.queryForObject("SELECT password_hash FROM platform.account WHERE normalized_identifier = ?",
                String.class, email);
        assertThat(post(browser(), "", signup(email).replace(PASSWORD, "replacement password")).statusCode()).isEqualTo(409);
        assertThat(jdbc.queryForObject("SELECT password_hash FROM platform.account WHERE normalized_identifier = ?",
                String.class, email)).isEqualTo(hash);
        assertThat(post(browser(), "/sign-in", json.writeValueAsString(Map.of("email", email, "password", "wrong")))
                .statusCode()).isEqualTo(401);
    }

    @Test
    void restrictedSessionExpiresAfterTenIdleMinutesWithoutDeletingRegistration() throws Exception {
        String email = email();
        assertThat(post(owner, "", signup(email)).statusCode()).isEqualTo(201);
        UUID account = jdbc.queryForObject("SELECT account_id FROM platform.account WHERE normalized_identifier = ?",
                UUID.class, email);
        assertThat(jdbc.queryForObject("SELECT max_inactive_interval FROM platform.registration_session WHERE principal_name = ?",
                Integer.class, account.toString())).isEqualTo(600);
        long now = System.currentTimeMillis();
        jdbc.update("""
                UPDATE platform.registration_session SET last_access_time = ?, expiry_time = ? WHERE principal_name = ?
                """, now - 601_000, now - 1000, account.toString());
        assertThat(get(owner, "/current").statusCode()).isEqualTo(401);
        assertThat(post(owner, "/sign-in", json.writeValueAsString(Map.of("email", email, "password", PASSWORD)))
                .statusCode()).isEqualTo(200);
        assertThat(body(get(owner, "/current")).path("stage").asText()).isEqualTo("VERIFY_EMAIL");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM platform.organization_registration WHERE account_id = ?",
                Integer.class, account)).isEqualTo(1);
    }

    private HttpResponse<String> get(HttpClient browser, String path) throws Exception {
        return browser.send(HttpRequest.newBuilder(uri(path)).GET().build(), HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> post(HttpClient browser, String path, String payload) throws Exception {
        JsonNode csrf = body(get(browser, "/csrf"));
        return browser.send(HttpRequest.newBuilder(uri(path)).header("Content-Type", "application/json")
                .header(csrf.path("headerName").asText(), csrf.path("token").asText())
                .POST(HttpRequest.BodyPublishers.ofString(payload)).build(), HttpResponse.BodyHandlers.ofString());
    }

    private URI uri(String path) { return URI.create("http://127.0.0.1:" + port + "/api/v1/registration" + path); }
    private JsonNode body(HttpResponse<String> response) throws Exception { return json.readTree(response.body()); }
    private String signup(String email) throws Exception {
        return json.writeValueAsString(Map.of("organizationName", "API Test Organization", "adminName", "API Owner",
                "adminEmail", email, "password", PASSWORD));
    }
    private static String email() { return UUID.randomUUID() + "@example.test"; }
    private static HttpClient browser() {
        return HttpClient.newBuilder().cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL)).build();
    }
    private static String totp(String secret) throws Exception {
        return new TimeBasedOneTimePasswordGenerator().generateOneTimePasswordString(
                new SecretKeySpec(Base64.getDecoder().decode(secret), "HmacSHA1"), Instant.now());
    }
    private static String decodeBase32(String encoded) {
        var bytes = new java.io.ByteArrayOutputStream();
        int buffer = 0;
        int bits = 0;
        for (char character : encoded.toCharArray()) {
            buffer = (buffer << 5) | "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(character);
            bits += 5;
            if (bits >= 8) {
                bytes.write((buffer >>> (bits - 8)) & 255);
                bits -= 8;
            }
        }
        return Base64.getEncoder().encodeToString(bytes.toByteArray());
    }
}
