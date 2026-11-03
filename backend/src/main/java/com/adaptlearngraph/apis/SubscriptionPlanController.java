package com.adaptlearngraph.apis;

import com.adaptlearngraph.dtos.SubscriptionDto.SubscriptionPlanResponse;
import com.adaptlearngraph.dtos.SubscriptionDto.UpdatePlanRequest;
import com.adaptlearngraph.services.SubscriptionPlanApplicationService;
import jakarta.validation.Valid;
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
    private final SubscriptionPlanApplicationService catalog;

    public SubscriptionPlanController(SubscriptionPlanApplicationService catalog) {
        this.catalog = catalog;
    }

    @GetMapping("/api/v1/registration/subscription/plans")
    List<SubscriptionPlanResponse> purchasePlans() { return catalog.purchasePlans(); }

    @GetMapping("/api/v1/platform/subscription-plans")
    List<SubscriptionPlanResponse> administrativePlans() { return catalog.administrativePlans(); }

    @GetMapping("/api/v1/organizations/{organizationId}/subscription/plans")
    List<SubscriptionPlanResponse> renewalPlans(@PathVariable UUID organizationId) {
        return catalog.renewalPlans(organizationId);
    }

    @PutMapping("/api/v1/platform/subscription-plans/{planId}")
    SubscriptionPlanResponse update(@PathVariable UUID planId, @Valid @RequestBody UpdatePlanRequest input) {
        return catalog.update(planId, input);
    }

    @ModelAttribute
    void noCache(HttpServletResponse response) { response.setHeader("Cache-Control", "no-store"); }
}