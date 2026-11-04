package com.adaptlearngraph.dtos;

import java.util.List;

public record DepartmentResponse(
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

