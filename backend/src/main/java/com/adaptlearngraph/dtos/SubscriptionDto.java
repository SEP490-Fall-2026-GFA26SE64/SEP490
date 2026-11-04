package com.adaptlearngraph.dtos;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/** Request and response bodies of the subscription plan, order, billing, workspace and member APIs. */
public final class SubscriptionDto {
    private SubscriptionDto() {}

    public record PlanTermsResponse(String name, String description, long priceVnd, String currency,
                                    int durationMonths, int employeeSeats) {}

    public record SubscriptionPlanResponse(UUID planId, String code, UUID versionId, long revision, PlanTermsResponse terms) {}

    /** Mirrors the payment order exposed before the DTO boundary; provider credentials and webhook signatures never reach it. */
    public record PaymentOrderResponse(UUID orderId, UUID intentId, String kind, UUID registrationId,
                                       UUID organizationId, UUID ownerAccountId, UUID planId, UUID planVersionId,
                                       PlanTermsResponse terms, long providerOrderCode, String paymentStatus,
                                       String paymentLinkId, String checkoutUrl, Long observedPaidAmount,
                                       Instant createdAt, Instant expiresAt, Instant confirmedAt,
                                       String failureCode, int attempt) {}

    public record WorkspaceSetupResponse(UUID organizationId, String state, Instant readyAt, String failureCode) {}

    public record OrderStatusResponse(PaymentOrderResponse order, String applicationState, WorkspaceSetupResponse workspace) {}

    public record PaidPeriodResponse(UUID periodId, Instant startsAt, Instant endsAt, PlanTermsResponse terms) {}

    public record SummaryResponse(UUID organizationId, String organizationName, String workspaceStatus,
                                  String subscriptionStatus, PaidPeriodResponse current, PaidPeriodResponse scheduled,
                                  int usedSeats, int allocatedSeats, int admissionLimit,
                                  List<PaymentOrderResponse> paymentHistory) {}

    public record WorkspaceResponse(UUID organizationId, String name, String status, String setupState) {}

    public record MemberResponse(UUID membershipId, UUID accountId, String fullName, String email, boolean active,
                                 Set<String> roles, UUID departmentId,
                                 @JsonProperty("jobPositionReferenceId") UUID occupationReferenceId,
                                 long revision,
                                 String departmentName,
                                 @JsonProperty("jobPositionName") String occupationName,
                                 boolean accountActive) {
        public UUID jobPositionReferenceId() { return occupationReferenceId; }
        public String jobPositionName() { return occupationName; }
    }

    public record OrderRequest(@NotNull UUID planId, @NotNull UUID expectedVersionId, @NotNull UUID idempotencyKey,
                               UUID replacesOrderId) {}

    public record SuspensionRequest(boolean suspended) {}

    public record MemberAccessRequest(boolean active, @NotNull Set<String> roles, long revision) {}

    public record MemberProfileRequest(@NotBlank @Size(max = 120) String fullName, @NotNull Set<String> roles,
                                       @JsonDeserialize(using = FlexibleUuidDeserializer.class) UUID departmentId,
                                       @JsonDeserialize(using = FlexibleUuidDeserializer.class)
                                       @JsonAlias("jobPositionReferenceId") UUID occupationReferenceId,
                                       long revision,
                                       String departmentName,
                                       @JsonAlias("jobPositionName") String occupationName) {
        public UUID jobPositionReferenceId() { return occupationReferenceId; }
        public String jobPositionName() { return occupationName; }
    }

    public static final class FlexibleUuidDeserializer extends JsonDeserializer<UUID> {
        @Override
        public UUID deserialize(JsonParser parser, DeserializationContext context) throws IOException {
            String text = parser.getValueAsString();
            if (text == null || text.isBlank()) return null;
            text = text.trim();
            try {
                return UUID.fromString(text);
            } catch (IllegalArgumentException ex) {
                return UUID.nameUUIDFromBytes(text.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            }
        }
    }

    public record UpdatePlanRequest(@NotNull UUID expectedVersionId, @NotBlank String name, @NotBlank String description,
                                    @JsonDeserialize(using = WholeLong.class) @Positive long priceVnd,
                                    @NotBlank String currency,
                                    @JsonDeserialize(using = WholeInteger.class) @Positive int durationMonths,
                                    @JsonDeserialize(using = WholeInteger.class) @Positive int employeeSeats) {}

    public static final class WholeLong extends JsonDeserializer<Long> {
        @Override
        public Long deserialize(JsonParser parser, DeserializationContext context) throws IOException {
            if (parser.currentToken() != JsonToken.VALUE_NUMBER_INT)
                return context.reportInputMismatch(Long.class, "A whole JSON number is required.");
            return parser.getLongValue();
        }
    }

    public static final class WholeInteger extends JsonDeserializer<Integer> {
        @Override
        public Integer deserialize(JsonParser parser, DeserializationContext context) throws IOException {
            if (parser.currentToken() != JsonToken.VALUE_NUMBER_INT)
                return context.reportInputMismatch(Integer.class, "A whole JSON number is required.");
            return parser.getIntValue();
        }
    }
}
