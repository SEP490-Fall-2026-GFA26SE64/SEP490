package com.adaptlearngraph.entities.domain;

import java.util.List;

/**
 * Domain entity representing an organizational Department.
 */
public record Department(
        String id,
        String code,
        String name,
        String description,
        String headOfDepartment,
        String headEmail,
        String status,
        String organizationId,
        String createdAt,
        String updatedAt,
        List<String> jobPositionCodes,
        int jobPositionCount
) {
}

