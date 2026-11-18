package com.adaptlearngraph.apis;

import com.adaptlearngraph.endpoints.ApiEndpoints;
import com.adaptlearngraph.responseDto.OrganizationKnowledgeGraphResponse;
import com.adaptlearngraph.services.OrganizationKnowledgeGraphService;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/** Read-only knowledge graph of the caller's organization; WorkspaceEntitlementFilter admits Organization Administrators only. */
@RestController
public class OrganizationKnowledgeGraphController {
    private final OrganizationKnowledgeGraphService graphs;

    public OrganizationKnowledgeGraphController(OrganizationKnowledgeGraphService graphs) {
        this.graphs = graphs;
    }

    @GetMapping(ApiEndpoints.ORGANIZATION_KNOWLEDGE_GRAPH)
    public ResponseEntity<OrganizationKnowledgeGraphResponse> graph(@PathVariable("organizationId") String organizationId) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(OrganizationKnowledgeGraphResponse.fromDomain(graphs.graph(UUID.fromString(organizationId))));
    }
}
