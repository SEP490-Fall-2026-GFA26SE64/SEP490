package com.adaptlearngraph.subscription.api;

import static org.junit.jupiter.api.Assertions.*;

import com.adaptlearngraph.identity.api.RegistrationController;
import com.adaptlearngraph.identity.api.RegistrationExceptionHandler;
import com.adaptlearngraph.identity.api.RegistrationWorkspaceEntryController;
import com.adaptlearngraph.identity.api.WorkspaceAuthenticationController;
import com.adaptlearngraph.identity.application.port.out.RegistrationSecrets;
import com.adaptlearngraph.identity.infrastructure.RegistrationConfiguration;
import com.adaptlearngraph.identity.infrastructure.SecurityConfiguration;
import com.adaptlearngraph.identity.infrastructure.WorkspaceAuthenticationConfiguration;
import com.adaptlearngraph.subscription.infrastructure.SubscriptionConfiguration;
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
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestComponent;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

@SpringBootTest(classes = SubscriptionPlanApiIntegrationTest.Application.class,
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
                "spring.profiles.active=subscription-test", "spring.flyway.enabled=true",
                "spring.session.jdbc.initialize-schema=never", "spring.session.jdbc.table-name=platform.registration_session",
                "spring.mail.host=127.0.0.1", "registration.mail-from=no-reply@example.test",
                "registration.cookie-secure=false", "registration.mail-worker.enabled=false",
                "subscription.worker.enabled=false",
                "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration"
        })
class SubscriptionPlanApiIntegrationTest {
    private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17.6-alpine");
    private static final String PASSWORD = "isolated subscription password";
    static { POSTGRES.start(); }
    @LocalServerPort private int port;
    @Autowired private ObjectMapper json;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private RegistrationSecrets secrets;
    @Autowired private com.adaptlearngraph.subscription.application.port.out.PaymentOrderStore orders;
    @Autowired private com.adaptlearngraph.subscription.application.port.out.PaymentProcessingStore payments;

    @Configuration(proxyBeanMethods = false)
    @TestComponent
    @EnableAutoConfiguration
    @Import({RegistrationConfiguration.class, RegistrationController.class, RegistrationExceptionHandler.class,
            SecurityConfiguration.class, WorkspaceAuthenticationConfiguration.class, WorkspaceAuthenticationController.class,
            RegistrationWorkspaceEntryController.class, SubscriptionConfiguration.class, SubscriptionPlanController.class,
            SubscriptionExceptionHandler.class,SubscriptionLifecycleController.class,
            com.adaptlearngraph.identity.api.MemberActivationController.class})
    static class Application {}

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("registration.encryption-key", () -> Base64.getEncoder().encodeToString("e".repeat(32).getBytes(StandardCharsets.UTF_8)));
        registry.add("registration.hmac-key", () -> Base64.getEncoder().encodeToString("h".repeat(32).getBytes(StandardCharsets.UTF_8)));
    }

    @AfterAll static void stop() { POSTGRES.stop(); }

    @Test
    void administratorCanUpdateOwnProfileButCannotChangeEmailOrAnotherOrganization() throws Exception {
        var owner=fixture(false);
        enableSubscription(owner);
        var other=fixture(false);
        var browser=signedIn(owner);
        UUID member=jdbc.queryForObject("SELECT membership_id FROM platform.organization_membership WHERE account_id=?",UUID.class,owner.id());
        String path="/api/v1/organizations/"+owner.organizationId()+"/subscription/members/"+member+"/profile";
        var input=Map.of("fullName","Updated by real API","roles",java.util.List.of("ORGANIZATION_ADMINISTRATOR"),
                "revision",0,"email","must-not-change@example.test");
        var missingCsrf=browser.send(HttpRequest.newBuilder(uri(path)).header("Content-Type","application/json")
                .PUT(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(input))).build(),HttpResponse.BodyHandlers.ofString());
        assertEquals(403,missingCsrf.statusCode());
        var updated=send(browser,"PUT",path,input);
        assertEquals(200,updated.statusCode(),updated.body());
        assertEquals("Updated by real API",body(updated).path("fullName").asText());
        assertEquals(owner.email(),body(updated).path("email").asText());
        assertTrue(body(updated).path("departmentId").isNull());
        assertTrue(body(updated).path("occupationName").isNull());
        assertEquals(1,body(updated).path("revision").asInt());
        assertEquals("Updated by real API",body(get(browser,"/api/v1/workspace-auth/current")).path("fullName").asText());
        assertEquals(409,send(browser,"PUT",path,input).statusCode());
        UUID foreignMember=jdbc.queryForObject("SELECT membership_id FROM platform.organization_membership WHERE account_id=?",UUID.class,other.id());
        assertEquals(403,send(browser,"PUT","/api/v1/organizations/"+other.organizationId()+"/subscription/members/"+foreignMember+"/profile",input).statusCode());
        assertEquals(401,send(browser(),"PUT",path,input).statusCode());
        assertEquals("Isolated Administrator",jdbc.queryForObject("SELECT admin_name FROM platform.organization_registration WHERE account_id=?",String.class,owner.id()));
    }

    @Test
    void pendingActivationsAreVisibleWithoutExposingSecretsOrCountingASeat() throws Exception {
        var owner=fixture(false);
        enableSubscription(owner);
        var browser=signedIn(owner);
        String base="/api/v1/organizations/"+owner.organizationId()+"/subscription";
        var invite=send(browser,"POST",base+"/activations",Map.of("fullName","Awaiting Activation",
                "email",UUID.randomUUID()+"@example.test","roles",java.util.List.of("LD_MANAGER")));
        assertEquals(200,invite.statusCode(),invite.body());
        var pending=get(browser,base+"/activations");
        assertEquals(200,pending.statusCode());
        var row=body(pending).get(0);
        assertEquals("Awaiting Activation",row.path("fullName").asText());
        assertEquals("PENDING",row.path("state").asText());
        assertEquals("PENDING",row.path("deliveryStatus").asText());
        assertTrue(row.path("departmentId").isNull());
        assertFalse(row.has("proofHash"));
        assertFalse(row.has("proof_hash"));
        assertFalse(row.has("encryptedToken"));
        assertEquals(0,body(get(browser,base)).path("usedSeats").asInt());
        assertEquals(1,body(get(browser,base+"/members")).size());
        UUID activation=UUID.fromString(row.path("activationId").asText());
        jdbc.update("UPDATE platform.workspace_activation SET expires_at=now()-interval '1 minute',last_sent_at=now()-interval '11 minutes' WHERE activation_id=?",activation);
        assertEquals("EXPIRED",body(get(browser,base+"/activations")).get(0).path("state").asText());
        var resend=send(browser,"POST",base+"/activations",Map.of("fullName","Awaiting Activation",
                "email",row.path("email").asText(),"roles",java.util.List.of("LD_MANAGER")));
        assertEquals(200,resend.statusCode(),resend.body());
        assertEquals(1,body(get(browser,base+"/activations")).size());
        assertEquals("PENDING",body(get(browser,base+"/activations")).get(0).path("state").asText());
        var another=fixture(false);
        assertEquals(403,get(signedIn(another),base+"/activations").statusCode());
        jdbc.update("UPDATE platform.organization SET status='SUSPENDED' WHERE organization_id=?",owner.organizationId());
        assertEquals(403,get(browser,base+"/activations").statusCode());
        assertEquals(403,get(browser,base+"/members").statusCode());
        assertEquals(200,get(browser,base).statusCode());
    }

    private void enableSubscription(Account account) {
        jdbc.update("INSERT INTO platform.subscription(subscription_id,organization_id,created_at) VALUES (?,?,now())",
                UUID.randomUUID(),account.organizationId());
        UUID registration=jdbc.queryForObject("SELECT registration_id FROM platform.organization_registration WHERE account_id=?",UUID.class,account.id());
        var terms=jdbc.queryForMap("SELECT plan_id,current_version_id FROM platform.subscription_plan WHERE code='starter'");
        var context=new com.adaptlearngraph.subscription.application.port.out.SubscriptionIdentity.Context(
                new com.adaptlearngraph.subscription.domain.SubscriptionAccessPolicy.Actor(account.id(),null,true,false,java.util.Set.of(),true),registration);
        var now=Instant.now();
        var order=orders.create(context,new com.adaptlearngraph.subscription.application.port.out.PaymentOrderStore.Command(
                null,(UUID)terms.get("plan_id"),(UUID)terms.get("current_version_id"),UUID.randomUUID(),null),now);
        payments.record(new com.adaptlearngraph.subscription.application.port.out.PaymentGateway.Observation(order.providerOrderCode(),
                "api-test-link-"+order.providerOrderCode(),order.terms().priceVnd(),null,"VND","PAID","api-test-reference-"+order.providerOrderCode(),
                null,now,"WEBHOOK",java.util.HexFormat.of().formatHex(java.nio.ByteBuffer.allocate(32).putLong(order.providerOrderCode()).array())),now);
        payments.apply(order.orderId(),now);
    }

    @Test
    void requiresRealPlatformPasswordAndCsrfThenPreservesVersionsAndPrivateMetadata() throws Exception {
        var browser = browser();
        assertEquals(401, get(browser, "/api/v1/platform/subscription-plans").statusCode());
        var account = fixture(true);
        var password = send(browser, "POST", "/api/v1/workspace-auth/sign-in",
                Map.of("email", account.email(), "password", PASSWORD));
        assertEquals(200, password.statusCode(), password.body());
        assertEquals("COMPLETE", body(password).path("stage").asText());
        assertFalse(body(password).path("mfaVerified").asBoolean());
        assertTrue(body(password).path("organizationId").isNull());
        var response = get(browser, "/api/v1/platform/subscription-plans");
        assertEquals(200, response.statusCode(), response.body());
        assertEquals("no-store", response.headers().firstValue("Cache-Control").orElseThrow());
        var plan = body(response).get(0);
        assertFalse(plan.has("createdBy"));
        assertFalse(plan.has("createdAt"));
        var edit = Map.of("expectedVersionId", plan.path("versionId").asText(), "name", "Edited Starter",
                "description", "Edited subscription description", "priceVnd", 4_900_001,
                "currency", "VND", "durationMonths", 2, "employeeSeats", 21);
        String path = "/api/v1/platform/subscription-plans/" + plan.path("planId").asText();
        var missingCsrf = browser.send(HttpRequest.newBuilder(uri(path)).header("Content-Type", "application/json")
                .PUT(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(edit))).build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(403, missingCsrf.statusCode());
        var updated = send(browser, "PUT", path, edit);
        assertEquals(200, updated.statusCode(), updated.body());
        assertEquals(2, body(updated).path("revision").asInt());
        assertEquals(21, body(updated).path("terms").path("employeeSeats").asInt());
        assertEquals(409, send(browser, "PUT", path, edit).statusCode());
        var fractional=new java.util.LinkedHashMap<String,Object>(edit);
        fractional.put("expectedVersionId",body(updated).path("versionId").asText());
        fractional.put("priceVnd",4900000.5);
        assertEquals(400,send(browser,"PUT",path,fractional).statusCode());
        fractional.put("priceVnd","4900001");
        assertEquals(400,send(browser,"PUT",path,fractional).statusCode());
        assertEquals(4_900_000L, jdbc.queryForObject(
                "SELECT price_vnd FROM platform.subscription_plan_version WHERE version_id = ?", Long.class,
                UUID.fromString(plan.path("versionId").asText())));
    }

    @Test
    void organizationAdministratorCannotEditPlatformPlansOrReadOtherOrganizationRoutes() throws Exception {
        var first = fixture(false);
        var second = fixture(false);
        var browser = signedIn(first);
        assertEquals(200, get(browser, "/api/v1/organizations/" + first.organizationId() + "/subscription/plans").statusCode());
        assertEquals(403, get(browser, "/api/v1/organizations/" + second.organizationId() + "/subscription/plans").statusCode());
        assertEquals(403, get(browser, "/api/v1/platform/subscription-plans").statusCode());
        var forged = browser.send(HttpRequest.newBuilder(uri("/api/v1/platform/subscription-plans"))
                .header("X-User-Role", "PLATFORM_ADMINISTRATOR").GET().build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(403, forged.statusCode());
    }

    @Test
    void revokingPlatformAuthorityTakesEffectWithoutTrustingSessionRoleCopies() throws Exception {
        var account = fixture(true);
        var browser = signedIn(account);
        assertEquals(200, get(browser, "/api/v1/platform/subscription-plans").statusCode());
        jdbc.update("DELETE FROM platform.platform_administrator WHERE account_id = ?", account.id());
        assertEquals(401, get(browser, "/api/v1/platform/subscription-plans").statusCode());
    }

    private Account fixture(boolean platform) {
        UUID id = UUID.randomUUID();
        UUID organization = platform ? null : UUID.randomUUID();
        String email = id + "@example.test";
        if (organization != null) jdbc.update(
                "INSERT INTO platform.organization(organization_id, code, name) VALUES (?, ?, ?)",
                organization, "ORG_" + organization.toString().toUpperCase(), "Isolated Organization");
        jdbc.update("""
                INSERT INTO platform.account(account_id, organization_id, identifier, normalized_identifier, password_hash)
                VALUES (?, ?, ?, ?, ?)
                """, id, organization, email, email, secrets.hashPassword(PASSWORD));
        String secret = secrets.newTotpSecret();
        if (!platform) {
            jdbc.update("INSERT INTO platform.workspace_account_profile(account_id, full_name, email_verified_at) VALUES (?, ?, now())",
                    id, "Isolated Administrator");
            jdbc.update("INSERT INTO platform.account_totp(account_id, encrypted_secret, enabled_at, last_used_step) VALUES (?, ?, now(), 0)",
                    id, secrets.encrypt(secret, "totp:" + id));
        }
        if (platform) {
            jdbc.update("INSERT INTO platform.platform_administrator(account_id, granted_at, grant_source) VALUES (?, now(), 'OPERATOR')", id);
        } else {
            UUID registration = UUID.randomUUID();
            jdbc.update("""
                    INSERT INTO platform.organization_registration(registration_id, account_id, organization_name,
                        workspace_slug, admin_name, state, email_verified_at, completed_at, created_at, updated_at)
                    VALUES (?, ?, 'Isolated Organization', ?, 'Isolated Administrator', 'REGISTERED', now(), now(), now(), now())
                    """, registration, id, "org-" + organization);
            jdbc.update("""
                    INSERT INTO platform.organization_workspace(workspace_id, organization_id, registration_id, slug,
                        setup_state, created_at, ready_at) VALUES (?, ?, ?, ?, 'READY', now(), now())
                    """, UUID.randomUUID(), organization, registration, "org-" + organization);
            UUID member = UUID.randomUUID();
            new org.springframework.transaction.support.TransactionTemplate(
                    new org.springframework.jdbc.datasource.DataSourceTransactionManager(jdbc.getDataSource())).executeWithoutResult(tx -> {
                jdbc.update("""
                        INSERT INTO platform.organization_membership(membership_id, account_id, organization_id, active, created_at, updated_at)
                        VALUES (?, ?, ?, true, now(), now())
                        """, member, id, organization);
                jdbc.update("INSERT INTO platform.organization_membership_role VALUES (?, 'ORGANIZATION_ADMINISTRATOR')", member);
            });
        }
        return new Account(id, organization, email, secret);
    }

    private HttpClient signedIn(Account account) throws Exception {
        var browser = browser();
        var result = send(browser, "POST", "/api/v1/workspace-auth/sign-in", Map.of("email", account.email(), "password", PASSWORD));
        assertEquals(200, result.statusCode(), result.body());
        if (account.organizationId() != null) verifyMfa(browser, account);
        return browser;
    }

    private void verifyMfa(HttpClient browser, Account account) throws Exception {
        String code = new TimeBasedOneTimePasswordGenerator().generateOneTimePasswordString(
                new SecretKeySpec(Base64.getDecoder().decode(account.secret()), "HmacSHA1"), Instant.now());
        var result = send(browser, "POST", "/api/v1/workspace-auth/totp/verify", Map.of("code", code));
        assertEquals(200, result.statusCode(), result.body());
        assertEquals("COMPLETE", body(result).path("stage").asText());
    }

    private HttpResponse<String> get(HttpClient browser, String path) throws Exception {
        return browser.send(HttpRequest.newBuilder(uri(path)).GET().build(), HttpResponse.BodyHandlers.ofString());
    }
    private HttpResponse<String> send(HttpClient browser, String method, String path, Object payload) throws Exception {
        var csrf = body(get(browser, "/api/v1/workspace-auth/csrf"));
        return browser.send(HttpRequest.newBuilder(uri(path)).header("Content-Type", "application/json")
                .header(csrf.path("headerName").asText(), csrf.path("token").asText())
                .method(method, HttpRequest.BodyPublishers.ofString(json.writeValueAsString(payload))).build(),
                HttpResponse.BodyHandlers.ofString());
    }
    private JsonNode body(HttpResponse<String> response) throws Exception { return json.readTree(response.body()); }
    private URI uri(String path) { return URI.create("http://127.0.0.1:" + port + path); }
    private static HttpClient browser() {
        return HttpClient.newBuilder().cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL)).build();
    }
    private record Account(UUID id, UUID organizationId, String email, String secret) {
        @Override public String toString() { return "Account[isolated fixture]"; }
    }
}
