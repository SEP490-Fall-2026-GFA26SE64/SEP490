package com.adaptlearngraph.apis;

import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.services.PlatformCatalogService;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Profile;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** Public, read-only platform template used by the registration catalog picker. Contains no organization data. */
@RestController
@Profile("!starter")
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class PlatformCatalogController {
    private final PlatformCatalogService catalog;

    public PlatformCatalogController(PlatformCatalogService catalog) {
        this.catalog = catalog;
    }

    @GetMapping(ApiEndpoints.PLATFORM_CATALOG)
    ResponseEntity<PlatformCatalogService.Graph> graph() {
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(5, TimeUnit.MINUTES).cachePublic()).body(catalog.graph());
    }

    @PostMapping(ApiEndpoints.REGISTRATION_CATALOG_CLOSURE)
    ResponseEntity<ClosureView> closure(@RequestBody Selection input) {
        var closure = catalog.closure(input == null ? List.of() : input.nodeIds());
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(new ClosureView(closure.templateVersion(),
                closure.selected(), closure.nodeCount(), closure.relationshipCount(), closure.nodesByLabel()));
    }

    record Selection(@Size(max = PlatformCatalogService.MAX_SELECTION) List<String> nodeIds) {
    }

    record ClosureView(String templateVersion, List<String> selected, int nodeCount, int relationshipCount,
                       Map<String, Integer> nodesByLabel) {
    }
}
