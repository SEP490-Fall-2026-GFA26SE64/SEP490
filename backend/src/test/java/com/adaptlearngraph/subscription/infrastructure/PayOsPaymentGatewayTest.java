package com.adaptlearngraph.subscription.infrastructure;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.adaptlearngraph.subscription.application.PaymentProcessor;
import com.adaptlearngraph.subscription.application.port.out.PaymentGateway.CreateRequest;
import com.adaptlearngraph.subscription.application.port.out.PaymentProcessingStore;
import com.adaptlearngraph.subscription.domain.PaymentOrder;
import com.adaptlearngraph.subscription.domain.PlanTerms;
import com.adaptlearngraph.subscription.domain.SubscriptionFailure;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.slf4j.LoggerFactory;
import vn.payos.PayOS;
import vn.payos.core.ClientOptions;

class PayOsPaymentGatewayTest {
    private static final String CHECKSUM = "isolated-test-checksum";
    private final ObjectMapper json = new ObjectMapper();
    private final AtomicInteger calls = new AtomicInteger();
    private final List<String> requests = new CopyOnWriteArrayList<>();
    private HttpServer server;
    private PayOS client;
    private PayOsPaymentGateway gateway;
    private volatile int responseStatus = 200;
    private volatile String responseBody;
    private volatile String createResponseBody;
    private volatile String createRequestBody;

    @BeforeEach
    void start() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            calls.incrementAndGet();
            requests.add(exchange.getRequestMethod() + " " + exchange.getRequestURI().getPath());
            String requestBody = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            boolean create = "POST".equals(exchange.getRequestMethod());
            if (create) createRequestBody = requestBody;
            byte[] body = (create && createResponseBody != null ? createResponseBody : responseBody)
                    .getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(responseStatus, body.length);
            try (var output = exchange.getResponseBody()) { output.write(body); }
        });
        server.start();
        client = new PayOS(ClientOptions.builder().clientId("isolated-client").apiKey("isolated-key")
                .checksumKey(CHECKSUM).baseURL("http://127.0.0.1:" + server.getAddress().getPort())
                .timeoutMs(2000).maxRetries(0).logLevel(ClientOptions.LogLevel.NONE).build());
        gateway = new PayOsPaymentGateway(client, json);
    }

    @AfterEach
    void stop() {
        gateway.close();
        server.stop(0);
    }

    @Test
    void verifiesRealSdkWebhookSignatureAndRejectsTampering() throws Exception {
        Map<String, Object> data = webhookData();
        String signature = client.getCrypto().createSignatureFromObj(data, CHECKSUM);
        String body = json.writeValueAsString(Map.of("code", "00", "desc", "success", "success", true,
                "data", data, "signature", signature));
        var verified = gateway.verifyWebhook(body);
        assertEquals(123L, verified.orderCode());
        assertEquals("link-123", verified.paymentLinkId());
        assertEquals("VND", verified.currency());
        assertEquals(4_900_000L, verified.amount());
        assertEquals("PAID", verified.status());
        assertEquals("transfer-123", verified.reference());
        assertEquals(Instant.parse("2026-10-22T12:00:00Z"), verified.providerPaidAt());
        assertEquals(64, verified.payloadDigest().length());
        data.put("amount", 1);
        String tampered = json.writeValueAsString(Map.of("data", data, "signature", signature));
        assertEquals(SubscriptionFailure.Code.INVALID_INPUT,
                assertThrows(SubscriptionFailure.class, () -> gateway.verifyWebhook(tampered)).code());
        assertEquals(0, calls.get());
    }

    @Test
    void createsOnlyFromMatchingSignedProviderResponse() throws Exception {
        Map<String, Object> data = checkoutData();
        responseBody = envelope(data);
        var receipt = gateway.create(new CreateRequest(123, 4_900_000, "Starter", Instant.now().plusSeconds(1800),
                "https://example.test/status", "https://example.test/status"));
        assertEquals("PENDING", receipt.status());
        var payload = json.readTree(createRequestBody);
        assertEquals("Starter", payload.path("items").get(0).path("name").asText());
        assertEquals(1, payload.path("items").get(0).path("quantity").asInt());
        assertEquals(4_900_000L, payload.path("items").get(0).path("price").asLong());
        assertEquals("STA000123", payload.path("description").asText());
        assertEquals("VND", receipt.currency());
        assertNull(receipt.paidAmount());
        assertEquals(1, calls.get());
        data.put("amount", 1);
        responseBody = envelope(data);
        assertEquals(SubscriptionFailure.Code.PAYMENT_EXCEPTION, assertThrows(SubscriptionFailure.class, () ->
                gateway.create(new CreateRequest(123, 4_900_000, "Starter", Instant.now().plusSeconds(1800),
                        "https://example.test/status", "https://example.test/status"))).code());
    }

    @Test
    void queryCannotInventCurrencyOrRebindAVerifiedPaymentLink() throws Exception {
        Map<String, Object> data = Map.of("id", "link-123", "orderCode", 123L, "amount", 4_900_000L,
                "amountPaid", 4_900_000L, "amountRemaining", 0, "status", "PAID",
                "createdAt", "2026-10-22T12:00:00Z", "transactions", java.util.List.of());
        responseBody = envelope(data);
        var unknownCurrency = gateway.query(123, null, null).orElseThrow();
        assertNull(unknownCurrency.currency());
        assertEquals("VND", gateway.query(123, "link-123", "VND").orElseThrow().currency());
        assertEquals(SubscriptionFailure.Code.PAYMENT_EXCEPTION,
                assertThrows(SubscriptionFailure.class, () -> gateway.query(123, "another-link", "VND")).code());
    }

    @ParameterizedTest
    @ValueSource(strings = {"Growth", "Enterprise with a long descriptive name", "\u0110\u1ed9i ng\u0169", "\u5b66\u4e60"})
    void preservesFullPlanNameAndBoundsTransferMemo(String name) throws Exception {
        responseBody = envelope(checkoutData());
        gateway.create(new CreateRequest(123, 4_900_000, name, Instant.now().plusSeconds(1800),
                "https://example.test/status", "https://example.test/status"));
        var payload = json.readTree(createRequestBody);
        assertEquals(name, payload.path("items").get(0).path("name").asText());
        assertTrue(payload.path("description").asText().matches("[A-Z0-9]{3}[0-9]{6}"));
    }

    @ParameterizedTest
    @CsvSource({"200, 101", "404, 101"})
    void recognizesMissingOrderWithoutInventingPaymentEvidence(int httpStatus, String code) throws Exception {
        responseStatus = httpStatus;
        responseBody = json.writeValueAsString(Map.of("code", code, "desc", "Payment link does not exist"));
        assertTrue(gateway.query(123, null, null).isEmpty());
        assertEquals(List.of("GET /v2/payment-requests/123"), requests);
    }

    @ParameterizedTest
    @CsvSource({"200, 99", "401, 101", "403, 101", "429, 101", "500, 101"})
    void otherProviderFailuresDoNotMeanTheOrderIsMissing(int httpStatus, String code) throws Exception {
        responseStatus = httpStatus;
        responseBody = json.writeValueAsString(Map.of("code", code, "desc", "Provider failure"));
        assertEquals(SubscriptionFailure.Code.PROVIDER_UNAVAILABLE,
                assertThrows(SubscriptionFailure.class, () -> gateway.query(123, null, null)).code());
        assertEquals(1, calls.get());
    }

    @Test
    void missingCodeForPreviouslyVerifiedLinkRemainsUncertain() {
        responseBody = "{\"code\":\"101\",\"desc\":\"Payment link does not exist\",\"data\":null}";
        assertEquals(SubscriptionFailure.Code.PROVIDER_UNAVAILABLE,
                assertThrows(SubscriptionFailure.class, () -> gateway.query(123, "link-123", "VND")).code());
        assertEquals(1, calls.get());
    }

    @Test
    void missingCodeOnCreateIsStillAProviderFailure() {
        responseBody = "{\"code\":\"101\",\"desc\":\"Payment link does not exist\",\"data\":null}";
        assertEquals(SubscriptionFailure.Code.PROVIDER_UNAVAILABLE, assertThrows(SubscriptionFailure.class, () ->
                gateway.create(new CreateRequest(123, 4_900_000, "Starter", Instant.now().plusSeconds(1800),
                        "https://example.test/status", "https://example.test/status"))).code());
        assertEquals(List.of("POST /v2/payment-requests"), requests);
    }

    @Test
    void failureLogsContainOnlySafeProviderMetadata() throws Exception {
        Logger logger = (Logger) LoggerFactory.getLogger(PayOsPaymentGateway.class);
        var appender = new ListAppender<ILoggingEvent>();
        appender.start();
        logger.addAppender(appender);
        try {
            responseBody = json.writeValueAsString(Map.of("code", "99", "desc", "private-provider-detail"));
            assertThrows(SubscriptionFailure.class, () -> gateway.query(123, null, null));
            assertEquals(1, appender.list.size());
            String logged = appender.list.getFirst().getFormattedMessage();
            assertTrue(logged.contains("HTTP=200"));
            assertTrue(logged.contains("providerCode=99"));
            assertFalse(logged.contains("private-provider-detail"));
            assertNull(appender.list.getFirst().getThrowableProxy());

            responseBody = json.writeValueAsString(Map.of("code", "101\nprivate-value", "desc", "private-detail"));
            assertThrows(SubscriptionFailure.class, () -> gateway.query(123, null, null));
            assertEquals(2, appender.list.size());
            String sanitized = appender.list.getLast().getFormattedMessage();
            assertTrue(sanitized.contains("providerCode=unavailable"));
            assertFalse(sanitized.contains("private"));
            assertFalse(sanitized.contains("\n"));
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"{", "{}", "{\"code\":\"00\",\"data\":null}"})
    void malformedQueryResponseDoesNotMeanMissingOrPaid(String body) {
        responseBody = body;
        assertEquals(SubscriptionFailure.Code.PROVIDER_UNAVAILABLE,
                assertThrows(SubscriptionFailure.class, () -> gateway.query(123, null, null)).code());
        assertEquals(1, calls.get());
    }

    @ParameterizedTest
    @CsvSource({"1800, false", "0, false", "-1, false", "1800, true"})
    void processorCreatesFromRealSdkMissingResponseOnlyForUnexpiredUnknownLink(
            long secondsToExpiry, boolean knownLink) throws Exception {
        Instant now = Instant.parse("2026-10-26T11:00:00Z");
        Instant expiry = now.plusSeconds(secondsToExpiry);
        var order = new PaymentOrder(UUID.randomUUID(), UUID.randomUUID(), "PURCHASE", UUID.randomUUID(),
                null, UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                new PlanTerms("Starter", "Description", 4_900_000, "VND", 1, 20), 123, "UNKNOWN",
                knownLink ? "link-123" : null, null, null, expiry.minusSeconds(1800), expiry,
                null, "PROVIDER_UNAVAILABLE", 1);
        var store = mock(PaymentProcessingStore.class);
        var work = new PaymentProcessingStore.Work(UUID.randomUUID(), "lease", "PAYMENT_CREATE", 2, order);
        when(store.claim(now)).thenReturn(Optional.of(work));
        responseBody = "{\"code\":\"101\",\"desc\":\"Payment link does not exist\",\"data\":null}";
        var data = checkoutData();
        data.put("expiredAt", expiry.getEpochSecond());
        createResponseBody = envelope(data);
        var processor = new PaymentProcessor(store, gateway, Clock.fixed(now, ZoneOffset.UTC), "https://example.test");

        assertTrue(processor.processNext());

        if (secondsToExpiry > 0 && !knownLink) {
            assertEquals(List.of("GET /v2/payment-requests/123", "POST /v2/payment-requests"), requests);
            var sent = json.readTree(createRequestBody);
            assertEquals(123L, sent.get("orderCode").longValue());
            assertEquals(4_900_000L, sent.get("amount").longValue());
            assertEquals(expiry.getEpochSecond(), sent.get("expiredAt").longValue());
            String callback = "https://example.test/guest/payment-result?order=" + order.orderId();
            assertEquals(callback, sent.get("returnUrl").textValue());
            assertEquals(callback, sent.get("cancelUrl").textValue());
            verify(store).record(argThat(observation -> observation.orderCode() == 123
                    && observation.amount() == 4_900_000L && observation.paidAmount() == null
                    && "PENDING".equals(observation.status()) && "VND".equals(observation.currency())
                    && "link-123".equals(observation.paymentLinkId())
                    && "https://pay.payos.vn/web/link-123".equals(observation.checkoutUrl())), eq(now));
            verify(store).finish(work, now);
            verify(store, never()).retry(any(), any(), any());
        } else {
            assertEquals(List.of("GET /v2/payment-requests/123"), requests);
            assertNull(createRequestBody);
            verify(store, never()).record(any(), any());
            verify(store, never()).finish(any(), any());
            verify(store).retry(work, "PROVIDER_UNAVAILABLE", now);
        }
    }

    @Test
    void rejectsForgedServerResponseSignature() throws Exception {
        Map<String, Object> data = Map.of("id", "link-123", "orderCode", 123L, "amount", 4_900_000L,
                "amountPaid", 4_900_000L, "amountRemaining", 0, "status", "PAID",
                "createdAt", "2026-10-22T12:00:00Z", "transactions", java.util.List.of());
        responseBody = json.writeValueAsString(Map.of("code", "00", "desc", "success",
                "data", data, "signature", "0".repeat(64)));
        assertEquals(SubscriptionFailure.Code.PROVIDER_UNAVAILABLE,
                assertThrows(SubscriptionFailure.class, () -> gateway.query(123, "link-123", "VND")).code());
    }

    @Test
    void acceptsSignedNullableOptionalFieldsWithoutInventingPaymentSuccess() throws Exception {
        Map<String, Object> data = webhookData();
        data.put("counterAccountName", null);
        data.put("code", "01");
        data.put("desc", "unsuccessful");
        String payload = json.writeValueAsString(Map.of("data", data,
                "signature", client.getCrypto().createSignatureFromObj(data, CHECKSUM)));
        var observation = gateway.verifyWebhook(payload);
        assertEquals("UNSUCCESSFUL", observation.status());
        assertNull(observation.paidAmount());
        assertEquals(0, calls.get());
    }

    @Test
    void providerFailureDoesNotBlindlyRetryCreateOrReturnSuccess() {
        responseStatus = 500;
        responseBody = "{\"code\":\"99\",\"desc\":\"isolated provider outage\"}";
        assertEquals(SubscriptionFailure.Code.PROVIDER_UNAVAILABLE, assertThrows(SubscriptionFailure.class, () ->
                gateway.create(new CreateRequest(123, 4_900_000, "Starter", Instant.now().plusSeconds(1800),
                        "https://example.test/status", "https://example.test/status"))).code());
        assertEquals(1, calls.get());
    }

    @Test
    void missingConfigurationAndMalformedPayloadFailExplicitly() {
        try (var missing = new PayOsPaymentGateway("", "", "", json)) {
            assertEquals(SubscriptionFailure.Code.PROVIDER_UNAVAILABLE,
                    assertThrows(SubscriptionFailure.class, missing::requireConfigured).code());
        }
        assertEquals(SubscriptionFailure.Code.INVALID_INPUT,
                assertThrows(SubscriptionFailure.class, () -> gateway.verifyWebhook("{")).code());
    }

    private String envelope(Map<String, Object> data) throws Exception {
        return json.writeValueAsString(Map.of("code", "00", "desc", "success", "data", data,
                "signature", client.getCrypto().createSignatureFromObj(data, CHECKSUM)));
    }

    private static Map<String, Object> checkoutData() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("bin", "970000");
        data.put("accountNumber", "isolated-account");
        data.put("accountName", "Isolated account");
        data.put("amount", 4_900_000L);
        data.put("description", "ALG000123");
        data.put("orderCode", 123L);
        data.put("currency", "VND");
        data.put("paymentLinkId", "link-123");
        data.put("status", "PENDING");
        data.put("checkoutUrl", "https://pay.payos.vn/web/link-123");
        data.put("qrCode", "isolated-qr");
        return data;
    }

    private static Map<String, Object> webhookData() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("orderCode", 123L);
        data.put("amount", 4_900_000L);
        data.put("description", "ALG000123");
        data.put("accountNumber", "isolated-account");
        data.put("reference", "transfer-123");
        data.put("transactionDateTime", "2026-10-22 19:00:00");
        data.put("currency", "VND");
        data.put("paymentLinkId", "link-123");
        data.put("code", "00");
        data.put("desc", "success");
        return data;
    }
}
