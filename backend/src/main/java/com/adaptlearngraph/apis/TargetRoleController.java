package com.adaptlearngraph.apis;

import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.helper.TargetRoleResponseMapper;
import com.adaptlearngraph.helper.TargetRoleResponseMapper.DetailResponse;
import com.adaptlearngraph.helper.TargetRoleResponseMapper.SummaryResponse;
import com.adaptlearngraph.services.TargetRoleQueryUseCase;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Profile;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@Profile("local & !local-baseline-demo & !workspace-baseline & !prod")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(prefix = "catalog.local-actor", name = "enabled", havingValue = "true")
@RequestMapping(ApiEndpoints.TARGET_ROLE)
public class TargetRoleController {
    private final TargetRoleQueryUseCase queries;

    public TargetRoleController(TargetRoleQueryUseCase queries) {
        this.queries = queries;
    }

    @GetMapping
    public List<SummaryResponse> list(
            @RequestParam(required = false) @Size(max = 100) String search) {
        return queries.listTargetRoles(search).stream()
                .map(TargetRoleResponseMapper::toResponse)
                .toList();
    }

    @GetMapping("/{roleId}")
    public DetailResponse detail(@PathVariable String roleId) {
        return TargetRoleResponseMapper.toResponse(queries.getTargetRole(roleId));
    }
}
