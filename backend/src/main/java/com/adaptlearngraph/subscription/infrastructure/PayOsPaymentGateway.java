package com.adaptlearngraph.subscription.infrastructure;

import com.adaptlearngraph.subscription.application.port.out.PaymentGateway;
import com.adaptlearngraph.subscription.domain.SubscriptionFailure;
import com.adaptlearngraph.subscription.domain.BillingCalendar;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import okhttp3.OkHttpClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import vn.payos.PayOS;
import vn.payos.core.ClientOptions;
import vn.payos.exception.APIException;
import vn.payos.exception.NotFoundException;
import vn.payos.exception.PayOSException;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkRequest;
import vn.payos.model.webhooks.WebhookData;
import vn.payos.util.DataConverterUtils;

public final class PayOsPaymentGateway implements PaymentGateway, AutoCloseable {
    private static final Logger LOG = LoggerFactory.getLogger(PayOsPaymentGateway.class);
    private final PayOS client;
    private final ObjectMapper json;

    public PayOsPaymentGateway(String clientId, String apiKey, String checksumKey, ObjectMapper json) {
        this.json = json;
        this.client = blank(clientId) || blank(apiKey) || blank(checksumKey) ? null :
                new PayOS(ClientOptions.builder().clientId(clientId).apiKey(apiKey).checksumKey(checksumKey)
                        .baseURL("https://api-merchant.payos.vn").maxRetries(0).timeoutMs(15_000)
                        .logLevel(ClientOptions.LogLevel.NONE)
                        .httpClient(new OkHttpClient.Builder().followRedirects(false).followSslRedirects(false)
                                .callTimeout(java.time.Duration.ofSeconds(15)).build()).build());
    }

    PayOsPaymentGateway(PayOS testClient, ObjectMapper json) {
        this.client = testClient;
        this.json = json;
    }

    @Override
    public void requireConfigured() {
        if (client == null) throw unavailable("payOS is not configured. Contact the platform operator.");
    }

    @Override
    public Observation create(CreateRequest request) {
        requireConfigured();
        if (request.orderCode() <= 0 || request.amount() <= 0 || blank(request.planName()) || request.expiresAt() == null
                || request.expiresAt().getEpochSecond() > Integer.MAX_VALUE) {
            throw new SubscriptionFailure(SubscriptionFailure.Code.INVALID_INPUT, "Invalid provider order or expiry.");
        }
        String marker = java.text.Normalizer.normalize(request.planName(), java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toUpperCase(java.util.Locale.ROOT).replaceAll("[^A-Z0-9]", "");
        marker = (marker + "ALG").substring(0, 3);
        String memo = String.format(java.util.Locale.ROOT, "%s%06d", marker, request.orderCode() % 1_000_000);
        try {
            var result = client.paymentRequests().create(CreatePaymentLinkRequest.builder()
                    .orderCode(request.orderCode()).amount(request.amount()).description(memo)
                    .item(vn.payos.model.v2.paymentRequests.PaymentLinkItem.builder()
                            .name(request.planName()).quantity(1).price(request.amount()).build())
                    .expiredAt(request.expiresAt().getEpochSecond())
                    .returnUrl(request.returnUrl()).cancelUrl(request.cancelUrl()).build());
            if (result.getOrderCode() == null || result.getOrderCode() != request.orderCode()
                    || result.getAmount() == null || result.getAmount() != request.amount()
                    || !"VND".equals(result.getCurrency()) || blank(result.getPaymentLinkId())
                    || result.getStatus() == null || !validCheckout(result.getCheckoutUrl())
                    || (result.getExpiredAt() != null && result.getExpiredAt() != request.expiresAt().getEpochSecond())) {
                throw mismatch("The provider checkout response does not match the stored order.");
            }
            var fields = facts(result.getOrderCode(), result.getPaymentLinkId(), result.getAmount(),
                    null, result.getCurrency(), result.getStatus().name(), null);
            return new Observation(result.getOrderCode(), result.getPaymentLinkId(), result.getAmount(), null,
                    result.getCurrency(), result.getStatus().name(), null, result.getCheckoutUrl(), null,
                    "CREATE", digest(fields));
        } catch (PayOSException failure) {
            throw providerFailure("create", failure);
        }
    }

    @Override
    public Optional<Observation> query(long orderCode, String verifiedLinkId, String verifiedCurrency) {
        requireConfigured();
        try {
            var result = client.paymentRequests().get(orderCode);
            if (result.getOrderCode() == null || result.getOrderCode() != orderCode || blank(result.getId())
                    || result.getAmount() == null || result.getAmountPaid() == null
                    || result.getAmountRemaining() == null || result.getStatus() == null
                    || (verifiedLinkId != null && !verifiedLinkId.equals(result.getId()))) {
                throw mismatch("The provider status response does not match the stored order.");
            }
            String currency = verifiedLinkId != null && verifiedLinkId.equals(result.getId()) ? verifiedCurrency : null;
            var fields = facts(orderCode, result.getId(), result.getAmount(), result.getAmountPaid(),
                    currency, result.getStatus().name(), null);
            return Optional.of(new Observation(orderCode, result.getId(), result.getAmount(), result.getAmountPaid(),
                    currency, result.getStatus().name(), null, null, null, "QUERY", digest(fields)));
        } catch (NotFoundException notFound) {
            return Optional.empty();
        } catch (APIException failure) {
            if (verifiedLinkId == null && failure.getStatusCode().filter(status -> status == 200).isPresent()
                    && failure.getErrorCode().filter("101"::equals).isPresent()) {
                return Optional.empty();
            }
            throw providerFailure("query", failure);
        } catch (PayOSException failure) {
            throw providerFailure("query", failure);
        }
    }

    @Override
    public Observation verifyWebhook(String payload) {
        requireConfigured();
        if (payload == null || payload.getBytes(StandardCharsets.UTF_8).length > 262_144) {
            throw new SubscriptionFailure(SubscriptionFailure.Code.INVALID_INPUT, "Invalid webhook payload size.");
        }
        try {
            var root = json.readTree(payload);
            if (root == null || !root.isObject() || !root.path("data").isObject()
                    || !root.path("signature").isTextual()
                    || !root.path("signature").asText().matches("[a-fA-F0-9]{64}")) {
                throw new IllegalArgumentException("Invalid webhook envelope");
            }
            var data = root.path("data");
            // Verify the original fields before SDK DTO conversion adds absent nullable properties.
            String expected = client.getCrypto().createSignatureFromObj(data, client.getOptions().getChecksumKey());
            if (!MessageDigest.isEqual(HexFormat.of().parseHex(expected),
                    HexFormat.of().parseHex(root.path("signature").asText()))) {
                throw new IllegalArgumentException("Invalid webhook signature");
            }
            if (!data.path("orderCode").isIntegralNumber() || !data.path("amount").isIntegralNumber()) {
                throw new IllegalArgumentException("Invalid webhook numeric fields");
            }
            WebhookData result = DataConverterUtils.normalize(data, WebhookData.class);
            if (result.getOrderCode() == null || result.getOrderCode() <= 0 || result.getAmount() == null
                    || result.getAmount() < 0 || blank(result.getPaymentLinkId()) || blank(result.getReference())
                    || blank(result.getCurrency()) || blank(result.getCode())) {
                throw new SubscriptionFailure(SubscriptionFailure.Code.INVALID_INPUT, "Incomplete verified webhook data.");
            }
            String status = "00".equals(result.getCode()) ? "PAID" : "UNSUCCESSFUL";
            Instant providerPaidAt = providerTime(result.getTransactionDateTime());
            var fields = facts(result.getOrderCode(), result.getPaymentLinkId(), result.getAmount(), null,
                    result.getCurrency(), status, result.getReference());
            fields.put("providerPaidAt", providerPaidAt == null ? null : providerPaidAt.toString());
            return new Observation(result.getOrderCode(), result.getPaymentLinkId(), result.getAmount(), null,
                    result.getCurrency(), status, result.getReference(), null, providerPaidAt, "WEBHOOK", digest(fields));
        } catch (JsonProcessingException | PayOSException | IllegalArgumentException invalid) {
            LOG.warn("Rejected payOS webhook ({})", invalid.getClass().getSimpleName());
            throw new SubscriptionFailure(SubscriptionFailure.Code.INVALID_INPUT, "Webhook authenticity or format is invalid.");
        }
    }

    private static Map<String, Object> facts(long code, String link, Long amount, Long paid,
                                            String currency, String status, String reference) {
        Map<String, Object> fields = new LinkedHashMap<>();
        fields.put("orderCode", code);
        fields.put("paymentLinkId", link);
        fields.put("amount", amount);
        fields.put("amountPaid", paid);
        fields.put("currency", currency);
        fields.put("status", status);
        fields.put("reference", reference);
        return fields;
    }

    private String digest(Map<String, Object> fields) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(json.writeValueAsBytes(fields)));
        } catch (NoSuchAlgorithmException | JsonProcessingException impossible) {
            throw new IllegalStateException("Cannot encode verified payment evidence.", impossible);
        }
    }

    private static boolean validCheckout(String value) {
        if (blank(value)) return false;
        try {
            URI uri = URI.create(value);
            return "https".equals(uri.getScheme()) && "pay.payos.vn".equals(uri.getHost())
                    && uri.getUserInfo() == null && (uri.getPort() == -1 || uri.getPort() == 443);
        } catch (IllegalArgumentException invalidUri) {
            return false;
        }
    }

    private static Instant providerTime(String value) {
        if (blank(value)) return null;
        try {
            return LocalDateTime.parse(value, DateTimeFormatter.ofPattern("uuuu-MM-dd HH:mm:ss")
                    .withResolverStyle(ResolverStyle.STRICT)).atZone(BillingCalendar.ZONE).toInstant();
        } catch (DateTimeParseException invalidTime) {
            throw new SubscriptionFailure(SubscriptionFailure.Code.INVALID_INPUT,
                    "The provider transaction timestamp has an unsupported format.");
        }
    }

    private static SubscriptionFailure providerFailure(String operation, PayOSException failure) {
        Integer status = null;
        String code = "unavailable";
        if (failure instanceof APIException apiFailure) {
            status = apiFailure.getStatusCode().orElse(null);
            code = apiFailure.getErrorCode().filter(value -> value.matches("[0-9]{1,10}")).orElse("unavailable");
        }
        LOG.warn("payOS {} was not confirmed ({}; HTTP={}; providerCode={})",
                operation, failure.getClass().getSimpleName(), status, code);
        return unavailable("payOS did not confirm the operation. Reconcile the existing order before retrying.");
    }
    private static SubscriptionFailure unavailable(String message) {
        return new SubscriptionFailure(SubscriptionFailure.Code.PROVIDER_UNAVAILABLE, message);
    }
    private static SubscriptionFailure mismatch(String message) {
        return new SubscriptionFailure(SubscriptionFailure.Code.PAYMENT_EXCEPTION, message);
    }
    private static boolean blank(String value) { return value == null || value.isBlank(); }

    @Override
    public void close() {
        if (client != null) client.close();
    }
}
