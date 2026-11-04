package com.adaptlearngraph.dtos;

import java.util.List;

public record SaveDepartmentRequest(
        String id,
        String code,
        String name,
        String description,
        String headOfDepartment,
        String headEmail,
        String status,
        List<String> linkedJobPositions
) {
}

