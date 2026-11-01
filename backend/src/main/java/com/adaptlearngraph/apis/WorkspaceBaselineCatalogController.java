package com.adaptlearngraph.apis;

import com.adaptlearngraph.services.WorkspaceBaselineCatalogUseCase;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.ExceptionHandler;
import java.util.Map;

@RestController
@Profile("workspace-baseline & local & !prod & !local-baseline-demo")
public final class WorkspaceBaselineCatalogController {
    private final WorkspaceBaselineCatalogUseCase catalog;
    public WorkspaceBaselineCatalogController(WorkspaceBaselineCatalogUseCase catalog) { this.catalog = catalog; }
    @GetMapping("/api/v1/ld/baseline-blueprint-catalog/occupations")
    public ResponseEntity<List<WorkspaceBaselineCatalogUseCase.Occupation>> occupations() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(catalog.occupations());
    }
    @ExceptionHandler({IllegalStateException.class,org.springframework.dao.DataAccessException.class})
    public ResponseEntity<Map<String,String>> unavailable(Exception failure) {
        return ResponseEntity.status(503).cacheControl(CacheControl.noStore()).body(Map.of("code","DEPENDENCY_UNAVAILABLE"));
    }
}
