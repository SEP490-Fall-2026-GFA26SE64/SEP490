package com.adaptlearngraph.apis;

import com.adaptlearngraph.services.MemberActivationUseCase;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;

@RestController
@Profile("!starter")
@ConditionalOnWebApplication(type=ConditionalOnWebApplication.Type.SERVLET)
public class MemberActivationController {
    private final MemberActivationUseCase activation;
    public MemberActivationController(MemberActivationUseCase activation) { this.activation=activation; }
    @GetMapping("/api/v1/organizations/{organizationId}/subscription/activations")
    List<MemberActivationUseCase.PendingActivation> pending(@PathVariable UUID organizationId) { return activation.pending(organizationId); }
    @PostMapping("/api/v1/organizations/{organizationId}/subscription/activations")
    MemberActivationUseCase.Invitation invite(@PathVariable UUID organizationId,@Valid @RequestBody Invite input) {
        return activation.invite(organizationId,new MemberActivationUseCase.Input(input.fullName(),input.email(),input.roles(),input.departmentId(),input.jobPositionReferenceId(),input.departmentName(),input.jobPositionName()));
    }
    @GetMapping("/api/v1/organizations/{organizationId}/subscription/member-references")
    List<MemberActivationUseCase.Reference> references(@PathVariable UUID organizationId) { return activation.references(organizationId); }
    @PostMapping("/api/v1/workspace-auth/activate")
    void activate(@Valid @RequestBody Activate input,HttpServletRequest request) { activation.activate(input.token(),input.password(),request.getRemoteAddr()); }
    record Invite(@NotBlank @Size(max=120) String fullName,@NotBlank @Size(max=254) String email,@NotEmpty Set<String> roles,
                  @com.fasterxml.jackson.databind.annotation.JsonDeserialize(using = com.adaptlearngraph.dtos.SubscriptionDto.FlexibleUuidDeserializer.class) UUID departmentId,
                  @com.fasterxml.jackson.databind.annotation.JsonDeserialize(using = com.adaptlearngraph.dtos.SubscriptionDto.FlexibleUuidDeserializer.class) UUID jobPositionReferenceId, String departmentName, String jobPositionName) {}
    record Activate(@NotBlank @Size(max=64) String token,@NotBlank @Size(max=256) String password) {
        @Override public String toString() { return "Activation[redacted]"; }
    }
}
