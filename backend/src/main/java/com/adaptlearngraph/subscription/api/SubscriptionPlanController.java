package com.adaptlearngraph.subscription.api;

import com.adaptlearngraph.subscription.application.port.in.SubscriptionCatalogUseCase;
import com.adaptlearngraph.subscription.domain.PlanTerms;
import com.adaptlearngraph.subscription.domain.SubscriptionPlan;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Profile("!starter")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class SubscriptionPlanController {
    private final SubscriptionCatalogUseCase catalog;

    public SubscriptionPlanController(SubscriptionCatalogUseCase catalog) {
        this.catalog = catalog;
    }

    @GetMapping("/api/v1/registration/subscription/plans")
    List<PlanView> purchasePlans() { return catalog.plans().stream().map(PlanView::from).toList(); }

    @GetMapping("/api/v1/platform/subscription-plans")
    List<PlanView> administrativePlans() { return catalog.administrativePlans().stream().map(PlanView::from).toList(); }

    @GetMapping("/api/v1/organizations/{organizationId}/subscription/plans")
    List<PlanView> renewalPlans(@PathVariable UUID organizationId) {
        return catalog.organizationPlans(organizationId).stream().map(PlanView::from).toList();
    }

    @PutMapping("/api/v1/platform/subscription-plans/{planId}")
    PlanView update(@PathVariable UUID planId, @Valid @RequestBody UpdatePlan input) {
        return PlanView.from(catalog.update(planId, input.expectedVersionId(), new PlanTerms(input.name(), input.description(),
                input.priceVnd(), input.currency(), input.durationMonths(), input.employeeSeats())));
    }

    @ModelAttribute
    void noCache(HttpServletResponse response) { response.setHeader("Cache-Control", "no-store"); }

    record PlanView(UUID planId, String code, UUID versionId, long revision, PlanTerms terms) {
        static PlanView from(SubscriptionPlan plan) {
            return new PlanView(plan.planId(), plan.code(), plan.versionId(), plan.revision(), plan.terms());
        }
    }

    record UpdatePlan(@NotNull UUID expectedVersionId, @NotBlank String name, @NotBlank String description,
                      @com.fasterxml.jackson.databind.annotation.JsonDeserialize(using=WholeLong.class) @Positive long priceVnd,
                      @NotBlank String currency,
                      @com.fasterxml.jackson.databind.annotation.JsonDeserialize(using=WholeInteger.class) @Positive int durationMonths,
                      @com.fasterxml.jackson.databind.annotation.JsonDeserialize(using=WholeInteger.class) @Positive int employeeSeats) {}

    public static final class WholeLong extends com.fasterxml.jackson.databind.JsonDeserializer<Long> {
        @Override
        public Long deserialize(com.fasterxml.jackson.core.JsonParser parser,com.fasterxml.jackson.databind.DeserializationContext context)
                throws java.io.IOException {
            if(parser.currentToken()!=com.fasterxml.jackson.core.JsonToken.VALUE_NUMBER_INT)
                return context.reportInputMismatch(Long.class,"A whole JSON number is required.");
            return parser.getLongValue();
        }
    }
    public static final class WholeInteger extends com.fasterxml.jackson.databind.JsonDeserializer<Integer> {
        @Override
        public Integer deserialize(com.fasterxml.jackson.core.JsonParser parser,com.fasterxml.jackson.databind.DeserializationContext context)
                throws java.io.IOException {
            if(parser.currentToken()!=com.fasterxml.jackson.core.JsonToken.VALUE_NUMBER_INT)
                return context.reportInputMismatch(Integer.class,"A whole JSON number is required.");
            return parser.getIntValue();
        }
    }
}
