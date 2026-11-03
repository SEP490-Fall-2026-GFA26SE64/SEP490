package com.adaptlearngraph.helper;

import static org.assertj.core.api.Assertions.assertThat;

import com.adaptlearngraph.dtos.SubscriptionDto.MemberResponse;
import com.adaptlearngraph.dtos.SubscriptionDto.OrderStatusResponse;
import com.adaptlearngraph.dtos.SubscriptionDto.PaidPeriodResponse;
import com.adaptlearngraph.dtos.SubscriptionDto.PaymentOrderResponse;
import com.adaptlearngraph.dtos.SubscriptionDto.PlanTermsResponse;
import com.adaptlearngraph.dtos.SubscriptionDto.SubscriptionPlanResponse;
import com.adaptlearngraph.dtos.SubscriptionDto.SummaryResponse;
import com.adaptlearngraph.dtos.SubscriptionDto.WorkspaceResponse;
import com.adaptlearngraph.dtos.SubscriptionDto.WorkspaceSetupResponse;
import com.adaptlearngraph.entities.domain.PaymentOrder;
import com.adaptlearngraph.entities.domain.PlanTerms;
import com.adaptlearngraph.entities.domain.SubscriptionPlan;
import com.adaptlearngraph.repository.SubscriptionWorkspaceStore.Member;
import com.adaptlearngraph.repository.SubscriptionWorkspaceStore.PaidPeriod;
import com.adaptlearngraph.repository.SubscriptionWorkspaceStore.Setup;
import com.adaptlearngraph.repository.SubscriptionWorkspaceStore.Summary;
import com.adaptlearngraph.repository.SubscriptionWorkspaceStore.Workspace;
import com.adaptlearngraph.services.SubscriptionLifecycleUseCase.Status;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.modelmapper.ModelMapper;

class SubscriptionMappingsTest {
    private static final Pattern SENSITIVE = Pattern.compile(
            "(?i).*(signature|checksum|secret|apikey|clientid|token|password|hash|createdby).*");
    private static final PlanTerms TERMS = new PlanTerms("Growth", "Growth plan", 12_000_000L, "VND", 12, 50);
    private static final PlanTermsResponse TERMS_RESPONSE =
            new PlanTermsResponse("Growth", "Growth plan", 12_000_000L, "VND", 12, 50);
    private final ModelMapper mapper = ModelMapperFactory.create(List.of(new SubscriptionMappings()));
    private final ObjectMapper json = new ObjectMapper().findAndRegisterModules();

    @Test
    void mapsPlansWithoutTheirAuditActor() throws Exception {
        UUID planId = UUID.randomUUID();
        UUID versionId = UUID.randomUUID();
        UUID createdBy = UUID.randomUUID();
        var plan = new SubscriptionPlan(planId, "GROWTH", versionId, 3, TERMS, Instant.parse("2026-11-01T00:00:00Z"), createdBy);

        SubscriptionPlanResponse response = mapper.map(plan, SubscriptionPlanResponse.class);

        assertThat(response).isEqualTo(new SubscriptionPlanResponse(planId, "GROWTH", versionId, 3, TERMS_RESPONSE));
        assertThat(componentNames(SubscriptionPlanResponse.class)).containsExactly("planId", "code", "versionId", "revision", "terms");
        assertThat(json.writeValueAsString(response)).doesNotContain(createdBy.toString()).contains("\"priceVnd\":12000000");
    }

    @Test
    void mapsEveryPaymentOrderValueAndNoProviderCredential() throws Exception {
        PaymentOrder order = order();

        PaymentOrderResponse response = mapper.map(order, PaymentOrderResponse.class);

        assertThat(response).isEqualTo(new PaymentOrderResponse(order.orderId(), order.intentId(), "PURCHASE",
                order.registrationId(), order.organizationId(), order.ownerAccountId(), order.planId(), order.planVersionId(),
                TERMS_RESPONSE, 987_654L, "PAID", "link-123", "https://pay.example.test/link-123", 12_000_000L,
                order.createdAt(), order.expiresAt(), order.confirmedAt(), null, 2));
        assertNoSensitiveComponents(PaymentOrderResponse.class);
        assertNoSensitiveComponents(PlanTermsResponse.class);
        assertThat(json.writeValueAsString(response)).doesNotContainIgnoringCase("signature").doesNotContainIgnoringCase("checksum");
    }

    @Test
    void mapsOrderStatusIncludingNullOrderAndWorkspace() {
        PaymentOrder order = order();
        var setup = new Setup(UUID.randomUUID(), "READY", Instant.parse("2026-11-02T00:00:00Z"), null);

        OrderStatusResponse populated = mapper.map(new Status(order, "APPLIED", setup), OrderStatusResponse.class);
        OrderStatusResponse empty = mapper.map(new Status(null, "NOT_APPLIED", null), OrderStatusResponse.class);

        assertThat(populated.order()).isEqualTo(mapper.map(order, PaymentOrderResponse.class));
        assertThat(populated.applicationState()).isEqualTo("APPLIED");
        assertThat(populated.workspace()).isEqualTo(new WorkspaceSetupResponse(setup.organizationId(), "READY", setup.readyAt(), null));
        assertThat(empty).isEqualTo(new OrderStatusResponse(null, "NOT_APPLIED", null));
    }

    @Test
    void mapsBillingSummaryWorkspacesAndMembersOfTheRequestedOrganizationOnly() throws Exception {
        UUID organizationId = UUID.randomUUID();
        var current = new PaidPeriod(UUID.randomUUID(), Instant.parse("2026-01-01T00:00:00Z"), Instant.parse("2027-01-01T00:00:00Z"), TERMS);
        PaymentOrder order = order();
        var summary = new Summary(organizationId, "Acme", "ACTIVE", "ACTIVE", current, null, 7, 50, 50, List.of(order));

        SummaryResponse response = mapper.map(summary, SummaryResponse.class);

        assertThat(response).isEqualTo(new SummaryResponse(organizationId, "Acme", "ACTIVE", "ACTIVE",
                new PaidPeriodResponse(current.periodId(), current.startsAt(), current.endsAt(), TERMS_RESPONSE), null,
                7, 50, 50, List.of(mapper.map(order, PaymentOrderResponse.class))));
        assertNoSensitiveComponents(SummaryResponse.class);

        var workspace = new Workspace(organizationId, "Acme", "ACTIVE", "READY");
        assertThat(mapper.map(workspace, WorkspaceResponse.class))
                .isEqualTo(new WorkspaceResponse(organizationId, "Acme", "ACTIVE", "READY"));

        var member = new Member(UUID.randomUUID(), UUID.randomUUID(), "Ada Lovelace", "ada@example.test", true,
                Set.of("EMPLOYEE"), UUID.randomUUID(), UUID.randomUUID(), 4, "Engineering", "Backend Engineer", true);
        MemberResponse mapped = mapper.map(member, MemberResponse.class);
        assertThat(mapped).isEqualTo(new MemberResponse(member.membershipId(), member.accountId(), "Ada Lovelace",
                "ada@example.test", true, Set.of("EMPLOYEE"), member.departmentId(), member.occupationReferenceId(), 4,
                "Engineering", "Backend Engineer", true));
        assertNoSensitiveComponents(MemberResponse.class);
        assertThat(json.writeValueAsString(mapped)).doesNotContainIgnoringCase("password").doesNotContainIgnoringCase("totp");
    }

    private static PaymentOrder order() {
        return new PaymentOrder(UUID.randomUUID(), UUID.randomUUID(), "PURCHASE", UUID.randomUUID(), UUID.randomUUID(),
                UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), TERMS, 987_654L, "PAID", "link-123",
                "https://pay.example.test/link-123", 12_000_000L, Instant.parse("2026-11-01T01:00:00Z"),
                Instant.parse("2026-11-01T01:15:00Z"), Instant.parse("2026-11-01T01:05:00Z"), null, 2);
    }

    private static void assertNoSensitiveComponents(Class<? extends Record> type) {
        assertThat(componentNames(type)).noneMatch(name -> SENSITIVE.matcher(name).matches());
    }

    private static List<String> componentNames(Class<? extends Record> type) {
        return Arrays.stream(type.getRecordComponents()).map(component -> component.getName()).toList();
    }
}
