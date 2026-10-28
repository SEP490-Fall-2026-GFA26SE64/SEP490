package com.adaptlearngraph.subscription.api;

import com.adaptlearngraph.subscription.application.PaymentProcessor;
import com.adaptlearngraph.subscription.application.port.in.SubscriptionLifecycleUseCase;
import com.adaptlearngraph.subscription.application.port.out.PaymentOrderStore.Command;
import com.adaptlearngraph.subscription.application.port.out.SubscriptionWorkspaceStore.*;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;

@RestController
@Profile("!starter")
@ConditionalOnWebApplication(type=ConditionalOnWebApplication.Type.SERVLET)
public class SubscriptionLifecycleController {
    private final SubscriptionLifecycleUseCase lifecycle;
    private final PaymentProcessor payments;
    public SubscriptionLifecycleController(SubscriptionLifecycleUseCase lifecycle,PaymentProcessor payments) {
        this.lifecycle=lifecycle; this.payments=payments;
    }
    @ModelAttribute void noCache(HttpServletResponse response) { response.setHeader("Cache-Control","no-store"); }
    @GetMapping("/api/v1/subscription/access")
    void access() { lifecycle.requireWorkspace(); }
    @PostMapping("/api/v1/registration/subscription/orders")
    SubscriptionLifecycleUseCase.Status purchase(@Valid @RequestBody OrderInput input) { return lifecycle.create(input.command(null)); }
    @PostMapping("/api/v1/organizations/{organizationId}/subscription/orders")
    SubscriptionLifecycleUseCase.Status renew(@PathVariable UUID organizationId,@Valid @RequestBody OrderInput input) {
        return lifecycle.create(input.command(organizationId));
    }
    @GetMapping("/api/v1/registration/subscription/current")
    SubscriptionLifecycleUseCase.Status currentPurchase() { return lifecycle.current(null); }
    @GetMapping("/api/v1/organizations/{organizationId}/subscription/current-order")
    SubscriptionLifecycleUseCase.Status currentRenewal(@PathVariable UUID organizationId) { return lifecycle.current(organizationId); }
    @GetMapping({"/api/v1/registration/subscription/orders/{orderId}","/api/v1/subscription/orders/{orderId}"})
    SubscriptionLifecycleUseCase.Status status(@PathVariable UUID orderId) { return lifecycle.status(orderId); }
    @PostMapping({"/api/v1/registration/subscription/orders/{orderId}/reconcile","/api/v1/subscription/orders/{orderId}/reconcile"})
    SubscriptionLifecycleUseCase.Status reconcile(@PathVariable UUID orderId) { return lifecycle.reconcile(orderId); }
    @GetMapping("/api/v1/organizations/{organizationId}/subscription")
    Summary summary(@PathVariable UUID organizationId) { return lifecycle.summary(organizationId); }
    @PostMapping("/api/v1/payments/payos/webhook")
    void webhook(@RequestBody String payload) { payments.webhook(payload); }
    @GetMapping("/api/v1/platform/workspaces")
    List<Workspace> workspaces() { return lifecycle.workspaces(); }
    @PutMapping("/api/v1/platform/workspaces/{organizationId}/suspension")
    void suspend(@PathVariable UUID organizationId,@RequestBody Suspension input) { lifecycle.suspend(organizationId,input.suspended()); }
    @GetMapping("/api/v1/organizations/{organizationId}/subscription/members")
    List<Member> members(@PathVariable UUID organizationId) { return lifecycle.members(organizationId); }
    @PutMapping("/api/v1/organizations/{organizationId}/subscription/members/{membershipId}")
    void member(@PathVariable UUID organizationId,@PathVariable UUID membershipId,@Valid @RequestBody MemberInput input) {
        lifecycle.changeMember(organizationId,membershipId,input.active(),input.roles(),input.revision());
    }
    @PutMapping("/api/v1/organizations/{organizationId}/subscription/members/{membershipId}/profile")
    Member profile(@PathVariable UUID organizationId,@PathVariable UUID membershipId,@Valid @RequestBody ProfileInput input) {
        return lifecycle.updateMember(organizationId,membershipId,new com.adaptlearngraph.subscription.domain.MemberProfileUpdate(
                input.fullName(),input.roles(),input.departmentId(),input.occupationReferenceId(),input.revision()));
    }
    record OrderInput(@NotNull UUID planId,@NotNull UUID expectedVersionId,@NotNull UUID idempotencyKey,UUID replacesOrderId) {
        Command command(UUID organization) { return new Command(organization,planId,expectedVersionId,idempotencyKey,replacesOrderId); }
    }
    record Suspension(boolean suspended) {}
    record MemberInput(boolean active,@NotNull Set<String> roles,long revision) {}
    record ProfileInput(@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=120) String fullName,
                        @NotNull Set<String> roles,UUID departmentId,UUID occupationReferenceId,long revision) {}
}
