package com.adaptlearngraph.apis;

import com.adaptlearngraph.dtos.SystemStatusResponse;
import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.services.SystemStatusService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@RequestMapping(ApiEndpoints.SYSTEM_STATUS)
public class SystemStatusController {
    private final SystemStatusService service;

    public SystemStatusController(SystemStatusService service) {
        this.service = service;
    }

    @GetMapping("/status")
    public SystemStatusResponse status() {
        return service.status();
    }
}