package com.adaptlearngraph.apis;

import com.adaptlearngraph.dtos.GraphBenchmarkDto.*;
import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.services.PlatformGraphBenchmarkService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@RequestMapping(ApiEndpoints.PLATFORM_BENCHMARK)
public class PlatformGraphBenchmarkController {

    private final PlatformGraphBenchmarkService service;

    public PlatformGraphBenchmarkController(PlatformGraphBenchmarkService service) {
        this.service = service;
    }

    @GetMapping("/overview")
    public ResponseEntity<OverviewResponse> overview() {
        return ResponseEntity.ok(service.overview());
    }

    @GetMapping("/fixtures")
    public ResponseEntity<java.util.List<FixturePreviewItem>> getFixturePairs(
            @RequestParam(defaultValue = "1k") String scale,
            @RequestParam(defaultValue = "1") int setIndex,
            @RequestParam(defaultValue = "50") int limit
    ) {
        return ResponseEntity.ok(service.getFixturePairs(scale, setIndex, limit));
    }

    @PostMapping("/run")
    public ResponseEntity<BenchmarkResponse> runBenchmark(@RequestBody(required = false) BenchmarkRequest request) {
        return ResponseEntity.ok(service.runBenchmark(request));
    }
}

