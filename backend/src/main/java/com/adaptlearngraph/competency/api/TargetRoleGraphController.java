package com.adaptlearngraph.competency.api;

import com.adaptlearngraph.competency.application.port.in.GetTargetRoleGraphUseCase;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/organizations/{organizationId}/target-roles/{roleId}/graph")
public class TargetRoleGraphController {

    private final GetTargetRoleGraphUseCase getTargetRoleGraphUseCase;

    public TargetRoleGraphController(GetTargetRoleGraphUseCase getTargetRoleGraphUseCase) {
        this.getTargetRoleGraphUseCase = getTargetRoleGraphUseCase;
    }

    @GetMapping
    public ResponseEntity<TargetRoleGraphResponse> getTargetRoleGraph(
            @PathVariable("organizationId") String organizationId,
            @PathVariable("roleId") String roleId) {
        return getTargetRoleGraphUseCase.getTargetRoleGraph(organizationId, roleId)
                .map(TargetRoleGraphResponse::fromDomain)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
