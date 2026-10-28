package com.adaptlearngraph.assessment.api;

import com.adaptlearngraph.assessment.adaptive.application.port.in.WorkspaceBaselineCatalogUseCase;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Profile("workspace-baseline & local & !prod & !local-baseline-demo")
public final class WorkspaceBaselineCatalogController {
    private final WorkspaceBaselineCatalogUseCase catalog;
    public WorkspaceBaselineCatalogController(WorkspaceBaselineCatalogUseCase catalog) { this.catalog = catalog; }
    @GetMapping("/api/v1/ld/baseline-blueprint-catalog/occupations")
    public ResponseEntity<List<WorkspaceBaselineCatalogUseCase.Occupation>> occupations() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(catalog.occupations());
    }
}
