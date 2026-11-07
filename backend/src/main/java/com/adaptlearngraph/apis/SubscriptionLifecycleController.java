package com.adaptlearngraph.apis;

import com.adaptlearngraph.dtos.SubscriptionDto.MemberAccessRequest;
import com.adaptlearngraph.dtos.SubscriptionDto.MemberProfileRequest;
import com.adaptlearngraph.dtos.SubscriptionDto.MemberResponse;
import com.adaptlearngraph.dtos.SubscriptionDto.OrderRequest;
import com.adaptlearngraph.dtos.SubscriptionDto.OrderStatusResponse;
import com.adaptlearngraph.dtos.SubscriptionDto.SummaryResponse;
import com.adaptlearngraph.dtos.SubscriptionDto.SuspensionRequest;
import com.adaptlearngraph.dtos.SubscriptionDto.WorkspaceResponse;
import com.adaptlearngraph.services.PaymentProcessor;
import com.adaptlearngraph.services.SubscriptionLifecycleApplicationService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;

@RestController
@Profile("!starter")
@ConditionalOnWebApplication(type=ConditionalOnWebApplication.Type.SERVLET)
public class SubscriptionLifecycleController {
    private final SubscriptionLifecycleApplicationService lifecycle;
    private final PaymentProcessor payments;
    public SubscriptionLifecycleController(SubscriptionLifecycleApplicationService lifecycle,PaymentProcessor payments) {
        this.lifecycle=lifecycle; this.payments=payments;
    }
    @ModelAttribute void noCache(HttpServletResponse response) { response.setHeader("Cache-Control","no-store"); }
    @GetMapping("/api/v1/subscription/access")
    void access() { lifecycle.requireWorkspace(); }
    @PostMapping("/api/v1/registration/subscription/orders")
    OrderStatusResponse purchase(@Valid @RequestBody OrderRequest input) { return lifecycle.create(null,input); }
    @PostMapping("/api/v1/organizations/{organizationId}/subscription/orders")
    OrderStatusResponse renew(@PathVariable UUID organizationId,@Valid @RequestBody OrderRequest input) {
        return lifecycle.create(organizationId,input);
    }
    @GetMapping("/api/v1/registration/subscription/current")
    OrderStatusResponse currentPurchase() { return lifecycle.current(null); }
    @GetMapping("/api/v1/organizations/{organizationId}/subscription/current-order")
    OrderStatusResponse currentRenewal(@PathVariable UUID organizationId) { return lifecycle.current(organizationId); }
    @GetMapping({"/api/v1/registration/subscription/orders/{orderId}","/api/v1/subscription/orders/{orderId}"})
    OrderStatusResponse status(@PathVariable UUID orderId) { return lifecycle.status(orderId); }
    @PostMapping({"/api/v1/registration/subscription/orders/{orderId}/reconcile","/api/v1/subscription/orders/{orderId}/reconcile"})
    OrderStatusResponse reconcile(@PathVariable UUID orderId) { return lifecycle.reconcile(orderId); }
    @GetMapping("/api/v1/organizations/{organizationId}/subscription")
    SummaryResponse summary(@PathVariable UUID organizationId) { return lifecycle.summary(organizationId); }
    @PostMapping("/api/v1/payments/payos/webhook")
    void webhook(@RequestBody String payload) { payments.webhook(payload); }
    @GetMapping("/api/v1/platform/workspaces")
    List<WorkspaceResponse> workspaces() { return lifecycle.workspaces(); }
    @PutMapping("/api/v1/platform/workspaces/{organizationId}/suspension")
    void suspend(@PathVariable UUID organizationId,@Valid @RequestBody SuspensionRequest input) { lifecycle.suspend(organizationId,input.suspended()); }
    @GetMapping("/api/v1/organizations/{organizationId}/subscription/members")
    List<MemberResponse> members(@PathVariable UUID organizationId) { return lifecycle.members(organizationId); }
    @PutMapping("/api/v1/organizations/{organizationId}/subscription/members/{membershipId}")
    void member(@PathVariable UUID organizationId,@PathVariable UUID membershipId,@Valid @RequestBody MemberAccessRequest input) {
        lifecycle.changeMember(organizationId,membershipId,input);
    }
    @PutMapping("/api/v1/organizations/{organizationId}/subscription/members/{membershipId}/profile")
    MemberResponse profile(@PathVariable UUID organizationId,@PathVariable UUID membershipId,@Valid @RequestBody MemberProfileRequest input) {
        return lifecycle.updateMember(organizationId,membershipId,input);
    }
}