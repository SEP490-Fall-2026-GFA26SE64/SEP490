package com.adaptlearngraph.catalog.api;

import com.adaptlearngraph.catalog.api.TargetRoleResponseMapper.DetailResponse;
import com.adaptlearngraph.catalog.api.TargetRoleResponseMapper.SummaryResponse;
import com.adaptlearngraph.catalog.application.port.in.TargetRoleQueryUseCase;
import com.adaptlearngraph.catalog.domain.Seniority;
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
@Profile("local & !local-baseline-demo & !prod")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@ConditionalOnProperty(prefix = "catalog.local-actor", name = "enabled", havingValue = "true")
@RequestMapping("/api/v1/employee/target-roles")
public class TargetRoleController {
    private final TargetRoleQueryUseCase queries;

    public TargetRoleController(TargetRoleQueryUseCase queries) {
        this.queries = queries;
    }

    @GetMapping
    public List<SummaryResponse> list(
            @RequestParam(required = false) @Size(max = 100) String search,
            @RequestParam(required = false) Seniority seniority) {
        return queries.listTargetRoles(search, seniority).stream()
                .map(TargetRoleResponseMapper::toResponse)
                .toList();
    }

    @GetMapping("/{roleId}")
    public DetailResponse detail(@PathVariable String roleId) {
        return TargetRoleResponseMapper.toResponse(queries.getTargetRole(roleId));
    }
}
