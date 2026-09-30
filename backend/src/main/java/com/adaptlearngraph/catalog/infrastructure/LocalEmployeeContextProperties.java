package com.adaptlearngraph.catalog.infrastructure;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("catalog.local-actor")
public record LocalEmployeeContextProperties(
        String accountId,
        String organizationId,
        boolean active,
        String role) {}
