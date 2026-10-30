package com.adaptlearngraph.learning.api;

import com.adaptlearngraph.learning.api.TargetRoleSelectionResponseMapper.SelectionResponse;
import com.adaptlearngraph.learning.application.port.in.ChooseTargetRoleCommand;
import com.adaptlearngraph.learning.application.port.in.TargetRoleSelectionUseCase;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@Profile("local & !local-baseline-demo & !workspace-baseline & !prod")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(prefix = "catalog.local-actor", name = "enabled", havingValue = "true")
@RequestMapping("/api/v1/employee/target-role-selection")
public class TargetRoleSelectionController {
    private final TargetRoleSelectionUseCase selections;

    public TargetRoleSelectionController(TargetRoleSelectionUseCase selections) {
        this.selections = selections;
    }

    @GetMapping
    public ResponseEntity<SelectionResponse> current() {
        return selections.getCurrentSelection()
                .map(TargetRoleSelectionResponseMapper::toCurrentResponse)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PutMapping
    public SelectionResponse choose(
            @RequestHeader("Idempotency-Key") @NotBlank String idempotencyKey,
            @Valid @RequestBody ChooseRequest request) {
        return TargetRoleSelectionResponseMapper.toResponse(
                selections.chooseTargetRole(toCommand(request, idempotencyKey)));
    }

    private static ChooseTargetRoleCommand toCommand(ChooseRequest request, String idempotencyKey) {
        try {
            return new ChooseTargetRoleCommand(
                    request.roleId(),
                    request.expectedCurrentSelectionId(),
                    idempotencyKey);
        } catch (IllegalArgumentException invalidInput) {
            throw new InvalidRequestException(invalidInput);
        }
    }

    record ChooseRequest(
            @NotNull UUID roleId,
            UUID expectedCurrentSelectionId) {}

    static final class InvalidRequestException extends RuntimeException {
        InvalidRequestException(IllegalArgumentException cause) {
            super(cause);
        }
    }
}
