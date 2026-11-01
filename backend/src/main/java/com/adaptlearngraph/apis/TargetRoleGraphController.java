package com.adaptlearngraph.apis;

import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.responseDto.TargetRoleGraphResponse;
import com.adaptlearngraph.services.GetTargetRoleGraphUseCase;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiEndpoints.TARGET_ROLE_GRAPH)
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
